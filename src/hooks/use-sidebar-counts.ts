import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";

export type SidebarCounts = {
  inbox: number;
  quotes: number;
  orders: number;
  reviewQueue: number;
};

export function useSidebarCounts(): SidebarCounts {
  const { data: workspaceId } = useWorkspaceId();
  const queryClient = useQueryClient();

  const { data } = useQuery<SidebarCounts>({
    queryKey: ["sidebar-counts", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const ws = workspaceId!;
      const [inboxRes, quotesRes, ordersRes, reviewRes] = await Promise.all([
        supabase
          .from("inbound_emails")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws)
          .in("extraction_status", ["pending", "running", "failed"]),
        supabase
          .from("extracted_documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws)
          .eq("status", "pending_review")
          .in("doc_type", ["rfq", "rfq_amendment"]),
        supabase
          .from("extracted_documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws)
          .eq("status", "pending_review")
          .in("doc_type", ["purchase_order", "po_amendment"]),
        supabase
          .from("extracted_documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws)
          .eq("status", "pending_review"),
      ]);
      return {
        inbox: inboxRes.count ?? 0,
        quotes: quotesRes.count ?? 0,
        orders: ordersRes.count ?? 0,
        reviewQueue: reviewRes.count ?? 0,
      };
    },
  });

  useEffect(() => {
    if (!workspaceId) return;
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ["sidebar-counts", workspaceId] });

    const channel = supabase
      .channel(`sidebar-counts-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inbound_emails", filter: `workspace_id=eq.${workspaceId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "extracted_documents", filter: `workspace_id=eq.${workspaceId}` },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  return data ?? { inbox: 0, quotes: 0, orders: 0, reviewQueue: 0 };
}
