# Wekbench — FPSO / Oil & Gas Procurement Compliance Knowledge Base
### The domain grounding for the RFQ Intelligence ("Bid Engineer") agent

This is the encoded domain knowledge that lets Wekbench read an oil & gas / FPSO RFQ and
flag the technical specs and certifications that actually govern each line item — so the
right questions get asked **during quotation**, not discovered after the PO is issued.
It is the agent's foundation and a human reference. It is **not** engineering sign-off:
the agent surfaces likely requirements and questions; a competent person confirms them.

Context: built for Western Premium's work with FPSO operators (MODEC, Tullow). The core
failure mode it targets — raised at MODEC's vendor forum — is that vendors don't ask
technical/cert questions at quote time, then execute the PO wrongly or late (e.g., a bolt
delivered without the required certification). Operators are now scoring this via vendor
**performance-management trackers**, so first-time-right execution is a measured KPI.

---

## 0. How the agent uses this KB
For each RFQ line item, the agent: (1) classifies the item type; (2) maps it to the
applicable standards/certs below; (3) checks what the RFQ *specifies* vs what's *missing*;
(4) generates the precise clarifying questions to send the buyer; (5) lists the certificate
documents the supplier must deliver; (6) emits a compliance checklist that travels with the
quote → PO. **The agent never assumes** zone, service, flag state, or cert level — those are
buyer-confirmed inputs.

---

## 1. The clarification inputs the buyer must confirm (drives everything)
Before quoting, these answers determine which standards apply. If the RFQ doesn't state
them, the agent asks:
- **Hazardous-area zone** of the install location (Zone 0 / 1 / 2) → fixes Ex equipment category.
- **H₂S / sour service?** (and partial pressure) → triggers NACE MR0175 / ISO 15156 and material grade (e.g., B7M vs B7).
- **Design temperature & pressure** + **ASME pressure class** (150–2500#) → flange/valve/piping rating, low-temp grade (A320 L7).
- **Service: upstream production vs refining/downstream** → MR0175 vs MR0103.
- **Flag state / classification society** (ABS, DNV, Lloyd's, BV, ClassNK) → which type/unit approval and SOLAS/MED vs USCG.
- **Certification level required**: EN 10204 **3.1** (default offshore) vs **3.2** (third-party witnessed, critical items).
- **Inspection class / ITP**: required hold & witness points, **FAT/SAT**, third-party (TPI) attendance.
- **Documentation / VDRL**: data books, drawings-for-approval, timeline.
- **Offshore duty**: IP/NEMA rating, salt/UV, coating exposure zone.

---

## 2. Equipment category → what to flag (the decision logic)
| If the line item is… | Flag / require |
|---|---|
| Any metallic pressure-containing or structural part | EN 10204 **3.1** mill cert (3.2 if critical) + heat traceability; **PMI** if alloy-critical |
| Electrical / instrument / lighting / motor / junction box in a hazardous area | **ATEX** (EU) and/or **IECEx** Ex certificate; zone↔category match; **IP66** min (IEC 60529); IEC 60079 protection type |
| Wetted/process part in H₂S service | **NACE MR0175 / ISO 15156** compliance (or MR0103 downstream); hardness-tested certs |
| Welded pressure piping/vessel | **ASME BPVC Sec IX** WPS/PQR/WPQ; NDT reports (RT/UT/MT/PT) + technician certs |
| Structural steel weld (topsides) | **AWS D1.1** WPS/PQR/welder quals |
| Valve | Right API spec (6D pipeline, 600/602/623 process); pressure class; trim; NACE if sour; fire-safe (API 607/6FA) if required |
| Flange / piping | **ASME B16.5** (≤24") / **B16.47** (≥26"); class & face (RF/RTJ); **B31.3** conformance |
| Pump / mechanical seal | **API 610** (pump) + **API 682** (seal plan) |
| Pressure vessel | **ASME VIII** Div 1/2 (U-stamp) **or** **PED** (CE) per market; relief valves API 520/526/527 |
| Coated / painted item | **NORSOK M-501** system by exposure zone (or **ISO 12944** CX); surface-prep + DFT records |
| Bolting / fasteners | **ASTM A193** (B7 / **B7M** sour) / **A320 L7** (low-temp) / **A194** nuts; **NORSOK L-005**; 3.1 MTC; NACE if sour; PTFE/Xylan coating cert offshore |
| Reusable container / basket / skid lifted offshore | **DNV-ST-E271** (2.7-1) / **E273** (2.7-3) / **EN 12079**; CCU plate + periodic-inspection status |
| Lifting accessory (sling, shackle, hook, padeye) | **LOLER** test cert with unique ID + WLL marking; DNV type approval |
| Lifesaving / firefighting / nav / radio | **SOLAS** + **MED Wheelmark** (EU flag) or **USCG**; Notified-Body type-exam (no self-declaration) |
| Wellhead / Xmas tree / subsea / flexible / BOP | **API 6A** (PSL level + material class), **17** series (subsea/flexibles), **API 53** (BOP) — usually subsea, less common on topsides |

---

## 3. Standards reference (grouped)

**Classification, marine safety & handling**
- **Class society rules & Type Approval** (ABS, DNV, Lloyd's, BV, ClassNK; harmonized via IACS). *Type Approval* = pre-certified design; *unit/product certificate* = the specific item. Deliver TAC and/or unit certificate + Manufacturing Survey Report. [ABS](https://ww2.eagle.org/en/Products-and-Services/vendor-certification/type-approval.html)
- **SOLAS** (IMO) — fire (II-2), lifesaving (III/LSA), navigation (V), radio (IV). EU flag → **MED Wheelmark** via Notified Body; or USCG. Match cert to the actual flag state. [LR MED](https://www.lr.org/en/services/classification-certification/materials-equipment-components-product-certification/marine-equipment-directive/)
- **2009 MODU Code** (IMO Res. A.1023(26)) — mobile units; partial/by-analogy for production FPSOs — confirm with buyer.
- **Offshore containers/units** — **DNV-ST-E271** (2.7-1), **DNV-ST-E273** (2.7-3), **EN 12079**, ISO 10855. CCU certificate + plate + 4-yearly re-inspection. [DNV E271](https://www.dnv.com/energy/standards-guidelines/dnv-st-e271-offshore-containers/)
- **LOLER 1998** — lifting gear in use; individual test cert + WLL marking. [Green Pin/DNV TA](https://www.greenpin.com/sites/default/files/2021-07/DNV%20Type%20Approval%20TAS000033J%20ST-E271%20and%20E273%20GPG%20and%20GPP%20shackles.pdf)
- **MARPOL** — OWS (15 ppm, MEPC.107(49)), sewage, incinerators; IMO type-approval. [DNV MED](https://www.dnv.com/services/eu-marine-equipment-directive-med--2819/)

**Hazardous area, electrical & instrumentation**
- **ATEX 2014/34/EU** (mandatory EU) + **IECEx** (international, >50 countries), both on **IEC 60079** series; deliver EU-Type Exam cert / IECEx CoC + ExTR. Best practice dual ATEX+IECEx. [ATEX vs IECEx](https://www.motioncontroltips.com/atex-and-iecex-classifications-and-markings-explained/)
- **Ex zones → category**: Zone 0→Cat 1, Zone 1→Cat 2, Zone 2→Cat 3. Buyer states zone. [categories](https://exknowledge.com/pages/atex-equipment-categories.html)
- **IP ingress (IEC 60529)** — offshore min **IP66**; dual IP66/IP67 if submersible. [IEC 60529](https://e-labsinc.com/specs-ies-60529.shtml)
- **IEC 61892** (offshore unit electrical; Part 7 hazardous areas), **IEC 61508/61511** (functional safety / SIS, SIL). [IEC 61892-7](https://webstore.iec.ch/en/publication/27009)

**Material traceability, metallurgy & corrosion**
- **EN 10204 MTCs** — 2.1 (declaration), 2.2 (non-specific, *breaks heat traceability — avoid for pressure parts*), **3.1** (heat-specific, offshore default), **3.2** (3.1 + third-party countersignature). [EN 10204](https://www.mtr.ai/blog/en-10204-types-explained)
- **PMI (Positive Material Identification)** — XRF/OES verification (API 578); report supplements MTC. [PMI](https://www.piping-world.com/guidelines-for-positive-material-identification-pmi)
- **NACE MR0175 / ISO 15156** — sour (H₂S) service material limits; parts 1 (general), 2 (CS/low-alloy), 3 (CRAs). **NACE MR0103** for refining/downstream. [MR0175](https://webstore.ansi.org/standards/nace/nacemr0175iso15156)

**Welding & NDT**
- **ASME BPVC Sec IX** (pressure) / **AWS D1.1** (structural) — WPS, PQR, WPQ. NDT: RT/UT/MT/PT + technician certs (ASNT SNT-TC-1A / ISO 9712). [ASME IX](https://mewelding.com/welding-procedure-qualification/)

**Coatings**
- **NORSOK M-501** (7 systems by exposure zone) / **ISO 12944-9 CX** (offshore) — qualified system + surface-prep + DFT records. [NORSOK M-501](https://www.stacoat.com/STACbase/Norsok%20M-501%20e.pdf)

**Bolting/fasteners**
- **ASTM A193 (B7/B7M/B16), A320 (L7 low-temp), A194 (nuts)**; **NORSOK L-005** compact flanges. B7M = sour grade (hardness-controlled). Deliver 3.1 MTC + NACE if sour + coating cert. [sour bolting](https://torqbolt.com/nace-mr-0175-iso-15156-2-mr-0173-sour-service-compliance-bolting-fasteners)

**Valves, flanges, piping, pressure & API**
- **API 6A** (wellhead, PSL 1–4 + material class), **6D** (pipeline valves), **600/602/623** (process gate/compact/globe), **610/682** (pumps/seals), **17** series (subsea), **53** (BOP). [API 682](https://www.api.org/~/media/files/publications/whats%20new/682%20e4%20pa.pdf)
- **ASME B16.5 / B16.47** flanges (classes 150–2500), **B31.3** process piping, **ASME VIII** vessels, **PED** (EU), relief valves **API 520/526/527**. [B16.5/47](https://apiint.com/blog/understanding-ansi-asme-b16-5-and-b16-47-standards/)

**Vendor quality & pre-qualification**
- **ISO 9001 / 14001 / 45001** baseline. **Achilles Oil & Gas** register (merged **JQS** + **FPAL**), aligned to **NORSOK S-006** / **IOGP 423**; majors run their own supplier registration. [Achilles](https://www.achilles.com/prequalified-supplier-network/)

---

## 4. Commonly-missed certs (the agent's high-value catches)
1. **EN 10204 3.1 vs 3.2** — accepting 2.2 loses heat traceability; over-specifying 3.2 adds cost.
2. **ATEX/IECEx Ex certificate** for any electrical item in a Zone 1/2 area — near-universal on FPSO topsides, frequently omitted from RFQs.
3. **NACE MR0175 / sour-service material** (e.g., **B7M** bolting, not B7) when H₂S present.
4. **Individual lifting-gear test certificate with unique ID** — not just a generic type approval.
5. **Flag-state match** on SOLAS/MED (Wheelmark vs USCG vs the FPSO's flag).
6. **Class Type Approval validity date** — expired TACs are rejected at delivery.
7. **CCU 4-yearly re-inspection status** for reused offshore containers.
8. **WPS/PQR + welder cert validity** and **NDT operator level** for welded items.
9. **PMI** for alloy-critical parts.

---

## 5. Operator RFQ → PO process (where the agent fits)
Material Requisition (**MR**) + datasheets + **ITP/QAP** (hold/witness points) + **VDRL**
issued → vendor quote → **technical bid evaluation / technical query (TBE/TQ)** ← *this is
the step vendors skip; the agent owns it* → commercial alignment → PO → kickoff/pre-inspection
meeting → drawing approval → manufacture → **FAT** / inspection release → ship. Root causes
of wrong/late POs: scope/qty/spec mismatch, suppliers not quoting the same scope, inspection
class/ITP & documentation deliverables not confirmed at quote, ambiguous material/NACE spec.
[procurement QA/QC](https://nwh.qa/a-practical-procurement-qa-qc-guide-for-epc-refineries-lng-and-power-plants-nwh/)

---

## 6. Worked example — "a bolt for the FPSO"
RFQ line: *"M24 stud bolts, qty 200, for FPSO process flange."* The agent flags missing
inputs and asks: **(1)** design temp & pressure + ASME class? **(2)** sour service / H₂S?
→ if yes, grade **B7M** (not B7), NACE MR0175 compliant; **(3)** low temperature? → A320 **L7**;
**(4)** coating required? → PTFE/Xylan offshore + coating cert; **(5)** cert level? → EN 10204
**3.1** MTC with heat number (3.2 if critical); **(6)** PMI required? Supplier must then deliver:
grade-correct studs/nuts (A193/A194 or A320), 3.1 MTC, NACE statement if sour, coating cert,
PMI report if specified. *This is the difference between a PO that executes first-time and the
MODEC failure case.*

---

## 7. Data-quality & scope notes
- Standard numbers above are verified against the cited sources; **applicability** (e.g.,
  SOLAS/MODU to a *production* FPSO vs a ship/MODU, MR0175 vs MR0103, NDT technician cert
  standard) is project- and flag-state-specific — the agent surfaces these as questions, not
  assertions.
- This KB is living: tune it against MODEC's actual vendor-performance criteria and VDRL once
  the forum notes are available, and extend per other operators (Tullow, etc.).
