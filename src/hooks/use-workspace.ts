import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useWorkspaceId() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["workspace-id", user?.id],
    enabled: !!user && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });
}
