import { useEffect, useState } from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/signin", replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Accept any pending invites for this email, so invited users join the
        // inviter's workspace instead of being pushed into onboarding.
        try {
          await supabase.rpc("claim_workspace_invites");
        } catch {
          // non-critical; continue resolving the workspace
        }

        // Resolve the workspace via membership first, then ownership.
        const { data: role } = await supabase
          .from("user_roles")
          .select("workspace_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        let wsId: string | null = role?.workspace_id ?? null;
        if (!wsId) {
          const { data: owned } = await supabase
            .from("workspaces")
            .select("id")
            .eq("owner_id", user.id)
            .maybeSingle();
          wsId = owned?.id ?? null;
        }
        if (cancelled) return;
        if (!wsId) {
          navigate({ to: "/onboarding", replace: true });
          return;
        }
        const { data: ws } = await supabase
          .from("workspaces")
          .select("onboarding_completed_at")
          .eq("id", wsId)
          .maybeSingle();
        if (cancelled) return;
        if (!ws?.onboarding_completed_at) {
          navigate({ to: "/onboarding", replace: true });
        } else {
          setChecking(false);
        }
      } catch {
        // Never leave the user stuck on the spinner — let them into the app.
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  if (loading || !user || checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
