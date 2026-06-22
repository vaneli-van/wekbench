# Wekbench — Vendor-Owned OEM Price Books

**Status:** Draft spec for review (pre-build)
**Author:** Product/Engineering
**Context:** RFQ → quote pricing must be accurate to each vendor's *own* OEM contract. OEM pricing is a private price book per partner agreement, not a public fact, so Wekbench draws price from vendor-supplied data — never scraped universal pricing.

---

## 1. Principle

A vendor (e.g. Western Premium) onboards the OEMs they are authorized for, attaches their contracted pricing, and Wekbench prices RFQ lines from **that vendor's own data first**. Each vendor's pricing is private, tenant-scoped, and never visible to any other workspace.

The uploaded price file is treated as a **cache on top of a discount schedule**, not as the whole truth. This is the central design decision and is what lets us price OEM products that aren't line-items in the uploaded list (see §4).

### Two tiers — resolved per OEM, not per account
- **Authorized distributor:** has a contract (discount schedule and/or price file) for an OEM → contract pricing.
- **General business / retail buyer:** no contract for that OEM → public/retail pricing fallback.

A single vendor is usually *both* — contracted for some OEMs (APC, Eaton), retail for others. So the tier is a property of the (vendor, OEM) pair, decided at resolution time.

---

## 2. Data model

All `oem_*` tables below are **tenant-scoped** (`workspace_id`, RLS via `is_workspace_member`). `regional_sources` is the only shared/global table (no secret pricing in it).

### oem_suppliers — a vendor's relationship with an OEM
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| workspace_id | uuid | RLS scope |
| name | text | "Schneider Electric (APC)" |
| brand | text | normalized brand key for matching ("apc","schneider") |
| region | text | "MEA", "West Africa" |
| partner_id | text | the vendor's partner/account number with the OEM |
| relationship | text | `authorized_distributor` \| `certified_partner` \| `reseller` |
| currency | text | default price currency (USD/EUR) |
| primary_contact_name / _email / _phone | text | for quote-requests + future punchout |
| portal_url | text | OEM partner portal |
| notes | text | |

### oem_price_books — one uploaded price file / release
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| workspace_id | uuid | |
| oem_supplier_id | uuid fk | |
| label | text | "MEA R2 S2 CERT SRVC PARTNER USD" |
| scope_note | text | e.g. "service/spare parts only — subset of full catalogue" |
| source_file_path | text | private storage bucket |
| currency | text | |
| effective_from / effective_to | date | drives staleness |
| status | text | `active` \| `expired` \| `draft` |
| column_mapping | jsonb | saved importer mapping (see §5) |
| row_count | int | |
| uploaded_at | timestamptz | |

### oem_price_items — normalized rows from a price book
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| workspace_id / price_book_id / oem_supplier_id | uuid | |
| part_number | text | as printed |
| normalized_part | text | upper/stripped for matching |
| model | text | |
| description | text | |
| category | text | for discount-schedule lookups |
| unit_price | numeric | the contract price |
| list_price | numeric null | if the file carries list too |
| currency | text | |
| uom | text | each / pack / metre |
| weight_kg / dims | numeric / text | feeds shipping (already in quote pipeline) |
| upc | text | |
| supersedes / superseded_by | text null | cross-reference for discontinued parts |
| raw | jsonb | original row, for audit |

### oem_discount_schedules — the generalization
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| workspace_id / oem_supplier_id | uuid | |
| category | text | OEM product family/category, or `ALL` |
| discount_pct | numeric | e.g. 32.5 = 32.5% off list |
| basis | text | `off_list` (default) |
| effective_from / effective_to | date | |
| notes | text | |

> This table is what answers "the product isn't in my uploaded list." If the vendor's contract is "X% off APC list for category Y," any in-catalogue APC product can be priced as `list_price × (1 − discount)`.

### regional_sources — shared fallback directory (no secret pricing)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| brand | text | "apc" |
| region | text | "West Africa" |
| source_name | text | "Redington", "Mindware", "Logicom" |
| type | text | `authorized_distributor` \| `retailer` |
| contact / url | text | where to request a price |

### price_requests — quote requests to the OEM/distributor
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| workspace_id / quote_id / quote_line_item_id | uuid | |
| oem_supplier_id | uuid null | |
| part_number / description | text | |
| status | text | `requested` \| `quoted` \| `declined` |
| quoted_price | numeric null | |
| contact_used | text | |
| requested_at / responded_at | timestamptz | |

### Additions to `quote_line_items`
| column | type | notes |
|---|---|---|
| price_source | text | provenance enum (see §3) |
| price_provisional | bool | true = "estimate, verify before sending" |
| price_book_id | uuid null | which book priced it |
| list_price | numeric null | when derived |
| discount_pct_applied | numeric null | when derived |
| _ai_confidence_ | numeric | **already exists** — reused for match confidence |

---

## 3. Price-source provenance (never invent a price)

Every priced line carries a `price_source`, surfaced in the builder, and a binding-vs-provisional flag:

| price_source | meaning | binding? |
|---|---|---|
| `contract_list` | exact match in the vendor's price book | ✅ firm |
| `contract_superseded` | matched via supersession to a successor part | ✅ firm |
| `vendor_entered` | the vendor typed the contracted price | ✅ firm |
| `derived_discount` | `list × (1 − contracted discount)` | ⚠️ provisional |
| `historical` | reused a previously confirmed price (agent memory) | ⚠️ provisional |
| `retail_public` | public/retail aggregator price (non-contract tier) | ⚠️ provisional |
| `quote_pending` | price requested from OEM/distributor, awaiting reply | ⏳ none yet |
| `unpriced` | product info only, no price path | — |

Hard rule: a **derived** price never renders as a confirmed contract price. Provisional lines show a "verify before sending" marker and block one-click send-to-buyer until acknowledged (ties to the "never invent commercial facts" success criterion).

---

## 4. Price-resolution ladder

For each RFQ line, once the OEM/brand is detected:

1. **Exact contract match** — find `oem_price_items` in the vendor's active book for that OEM where `normalized_part`/model matches. Match confidence written to `ai_confidence`. → `contract_list`.
2. **Supersession** — if the requested part is `superseded_by` a part that *is* in the book, price the successor. → `contract_superseded` (+ note).
3. **Discount-schedule derivation** — if the vendor has a discount schedule for (OEM, category) and a **list price** is obtainable (from the file's `list_price`, a content syndicator, or an aggregator), compute `list × (1 − discount)`. → `derived_discount`, provisional.
4. **Historical reuse** — a previously confirmed price for this part in this workspace (agent memory). → `historical`, provisional.
5. **Quote request** — none of the above: create a `price_request` to the OEM/distributor contact, set the line `quote_pending`, and show full product info + datasheet + regional sources meanwhile.
6. **Manual entry** — vendor types the price → `vendor_entered`; offer "save to price book" so it backfills `oem_price_items` for next time (**capture-on-use flywheel**).

If no OEM/brand is detected at all, the line goes to the existing public sourcing router (retail tier) and, failing that, `unpriced` with info + regional sources.

All firm and derived prices feed the **existing** `unit_cost` → margin → FX(→ GH₵) pipeline unchanged. The price book is **cost**; the vendor's margin is applied on top as today.

---

## 5. AI-assisted importer (the real engineering cost)

Every OEM's file has a different layout, so the importer is mapping-driven, not a fixed parser:

1. Vendor uploads xlsx/csv (e.g. the APC `…CERT SRVC PARTNER USD` file).
2. AI inspects the header + sample rows and **proposes a column mapping**: which column is part_number, model, description, unit_price, list_price, uom, weight, dims, upc, category, supersedes.
3. Vendor confirms/adjusts the mapping (one screen).
4. Mapping saved on `oem_price_books.column_mapping`; rows normalized into `oem_price_items`.
5. **Re-uploads reuse the saved mapping** → a new "R2 S2" release is one click.
6. (v2) If the file ships a `_chg`/changes sheet, diff against the prior book to flag price moves.

The APC file is the canonical first test: it carries part, model, price (USD), weight, dims, UPC — and is explicitly a *service-parts subset*, which is exactly why §4 steps 2–6 matter.

---

## 6. Matching RFQ line → part

The buyer writes free text ("APC Smart-UPS 3000VA"); we must land on the right part in the vendor's book. Same fuzzy-match problem as today's sourcing, now against a private catalogue. Reuse the existing matcher + the **confidence flags** already built — low-confidence matches get the amber "review" treatment so the estimator verifies before the price is trusted.

---

## 7. Router integration

Add a **private-price-book adapter** to the existing sourcing router, ranked **above** the public adapters (Nexar/OEMsecrets/SITC). Classifier detects the brand → routes to the vendor's matching `oem_supplier`/book → returns an offer tagged with `price_source` and confidence. No book/brand match → existing public adapters → unpriced fallback. This mirrors the SITC table-backed adapter pattern, so it slots into the current architecture with no router rewrite.

---

## 8. Guardrails

- **Confidentiality / tenant isolation:** all `oem_*` tenant tables RLS-scoped to `is_workspace_member`; uploaded files in a private, workspace-scoped storage bucket; price books never feed the shared catalogue or another workspace's results. (Hard line — these files are NDA'd.)
- **Staleness:** `effective_to` drives an "expired book" warning; firm pricing is blocked on an expired book (falls through to derivation/quote-request, clearly labeled).
- **Currency:** books in USD/EUR convert via the existing FX → GH₵ helper, with provenance.
- **Margin unchanged:** book price = `unit_cost`; the existing margin/tax pipeline applies on top.
- **Never invent:** provisional vs firm labeling per §3; derived prices always say "estimate, verify."

---

## 9. Build phases

- **P0 — Schema & storage:** `oem_suppliers`, `oem_price_books`, `oem_price_items`, `oem_discount_schedules`, `price_requests`, `quote_line_items` provenance columns; RLS; private bucket.
- **P1 — Importer:** AI-assisted column mapping + saved mappings; ingest the APC file end-to-end as proof.
- **P2 — Resolution ladder in the router:** contract match → supersession → discount derivation; `price_source` + provisional labels on the quote line; brand-aware routing.
- **P3 — Unpriced fallback:** `regional_sources` directory + `price_requests` flow + vendor-entered price with capture-on-use backfill.
- **P4 — Punchout / ordering:** place the order through Wekbench via the OEM/distributor (eProcurement/cXML).

---

## 10. Open decisions (need your input before P0 freezes)

1. **Discount granularity** — per OEM *category*, or per finer product-family code? Drives whether derivation is reliable. (APC has product families; need the taxonomy the vendor's contract uses.)
2. **List-price source for derivation** — when the file lacks list prices, where do we pull list from per OEM (content syndicator vs aggregator vs OEM site)? Has cost/coverage implications.
3. **regional_sources ownership** — curated by Wekbench centrally (shared), or maintained per vendor? Likely seed centrally per region, let vendors add.
4. **Match-confirm UX** — auto-apply above a confidence threshold vs always require a click on the first match of a new part.
5. **Currency** — one currency per book (simpler) vs per-item (some files mix). APC file is single-currency (USD), so per-book is fine to start.
