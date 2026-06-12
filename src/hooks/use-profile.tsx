import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type WorkspaceProfile = {
  fullName: string;
  firstName: string;
  initials: string;
  role: string | null;
  companyName: string | null;
  accountType: "vendor" | "buyer";
  country: string | null;
};

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function useProfile() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user && !loading,
    queryFn: async (): Promise<WorkspaceProfile | null> => {
      if (!user) return null;
      const [{ data: profile }, { data: ws }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, company_name, role")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("workspaces")
          .select("name, account_type, country")
          .eq("owner_id", user.id)
          .maybeSingle(),
      ]);
      const fullName =
        profile?.full_name?.trim() ||
        (user.email ? user.email.split("@")[0] : "There");
      const firstName = fullName.split(/\s+/)[0] ?? fullName;
      return {
        fullName,
        firstName,
        initials: deriveInitials(fullName),
        role: profile?.role ?? null,
        companyName: ws?.name?.trim() || profile?.company_name?.trim() || null,
        accountType: (ws?.account_type as "vendor" | "buyer") ?? "vendor",
        country: ws?.country ?? null,
      };
    },
  });
}
