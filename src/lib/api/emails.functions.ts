import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEYWORD_GROUPS: { category: string; words: string[] }[] = [
  { category: "RFQ", words: ["rfq", "request for quote", "request for quotation", "quotation", "quote request", "rfq#"] },
  { category: "Purchase order", words: ["purchase order", "p.o.", "po number", "po#", "po no", " po "] },
  { category: "Amendment", words: ["amendment", "amended", "revised", "revision", "change order", "addendum", "updated order"] },
  { category: "Invoice", words: ["invoice", "remittance", "payment advice", "proforma"] },
  { category: "Delivery", words: ["delivery", "shipment", "dispatch", "waybill", "proof of delivery", "consignment"] },
];

function categorize(text: string): string | null {
  const t = ` ${(text || "").toLowerCase()} `;
  for (const g of KEYWORD_GROUPS) {
    if (g.words.some((w) => t.includes(w))) return g.category;
  }
  return null;
}

/**
 * Recent captured emails that match the procurement keyword categories
 * (RFQ / PO / amendment / invoice / delivery), newest first.
 */
export const listInboundHighlights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("inbound_emails")
      .select("id, from_address, from_name, subject, text_body, received_at, extraction_status")
      .order("received_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emails = ((data ?? []) as any[])
      .map((e) => {
        const category = categorize(`${e.subject ?? ""} ${String(e.text_body ?? "").slice(0, 600)}`);
        return {
          id: e.id as string,
          from: (e.from_name as string) || (e.from_address as string) || "Unknown sender",
          subject: (e.subject as string) || "(no subject)",
          receivedAt: e.received_at as string,
          extractionStatus: e.extraction_status as string | null,
          category,
        };
      })
      .filter((e) => e.category)
      .slice(0, 8);

    return { emails };
  });
