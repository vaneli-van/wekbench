import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AtSign,
  Copy,
  CheckCircle2,
  Inbox,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const INBOUND_DOMAIN = "wekbench.com";

type InboundAddress = {
  id: string;
  workspace_id: string;
  local_part: string;
  full_address: string;
  label: string | null;
  buyer_label: string | null;
  active: boolean;
  created_at: string;
};

function useWorkspaceId() {
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

function useInboundAddresses(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["inbound-addresses", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<InboundAddress[]> => {
      const { data, error } = await supabase
        .from("inbound_addresses")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InboundAddress[];
    },
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 shrink-0"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function NewAddressForm({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [localPart, setLocalPart] = useState("");
  const [buyerLabel, setBuyerLabel] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const normalized = localPart.trim().toLowerCase();
      if (!/^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$/.test(normalized)) {
        throw new Error(
          "Use lowercase letters, numbers, dots, dashes or underscores (2–64 chars).",
        );
      }
      const fullAddress = `${normalized}@${INBOUND_DOMAIN}`;
      const { error } = await supabase.from("inbound_addresses").insert({
        workspace_id: workspaceId,
        local_part: normalized,
        full_address: fullAddress,
        buyer_label: buyerLabel.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Capture address created");
      setLocalPart("");
      setBuyerLabel("");
      qc.invalidateQueries({ queryKey: ["inbound-addresses", workspaceId] });
    },
    onError: (e: Error) => {
      toast.error(e.message.includes("duplicate") ? "That address is already taken." : e.message);
    },
  });

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Plus className="size-5" />
        </span>
        <div>
          <h3 className="font-semibold">Provision a new capture address</h3>
          <p className="text-sm text-muted-foreground">
            Give each buyer a unique inbox so RFQs route to the right account automatically.
          </p>
        </div>
      </div>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-[1.5fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div>
          <Label htmlFor="local-part" className="text-xs">Address</Label>
          <div className="mt-1 flex items-stretch rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
            <Input
              id="local-part"
              value={localPart}
              onChange={(e) => setLocalPart(e.target.value)}
              placeholder="meridian.rfq"
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span className="flex items-center px-3 text-sm text-muted-foreground border-l border-input">
              @{INBOUND_DOMAIN}
            </span>
          </div>
        </div>
        <div>
          <Label htmlFor="buyer-label" className="text-xs">Buyer label (optional)</Label>
          <Input
            id="buyer-label"
            value={buyerLabel}
            onChange={(e) => setBuyerLabel(e.target.value)}
            placeholder="Meridian Trading Co."
            className="mt-1"
          />
        </div>
        <Button type="submit" disabled={create.isPending || !localPart.trim()}>
          {create.isPending ? "Creating…" : "Create"}
        </Button>
      </form>
    </Card>
  );
}

function AddressRow({ address }: { address: InboundAddress }) {
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: async (active: boolean) => {
      const { error } = await supabase
        .from("inbound_addresses")
        .update({ active })
        .eq("id", address.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbound-addresses", address.workspace_id] });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("inbound_addresses")
        .delete()
        .eq("id", address.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Address removed");
      qc.invalidateQueries({ queryKey: ["inbound-addresses", address.workspace_id] });
    },
  });

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium truncate">{address.buyer_label ?? address.local_part}</p>
        <code className="text-xs text-muted-foreground truncate block">{address.full_address}</code>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Switch
            checked={address.active}
            onCheckedChange={(v) => toggle.mutate(v)}
            aria-label="Routing active"
          />
          <Badge
            variant="outline"
            className={
              address.active
                ? "border-success/30 bg-success/10 text-success"
                : "border-border bg-muted text-muted-foreground"
            }
          >
            {address.active ? "Routing on" : "Paused"}
          </Badge>
        </div>
        <CopyButton value={address.full_address} />
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmailCapturePage() {
  const { data: workspaceId, isLoading: wsLoading } = useWorkspaceId();
  const { data: addresses, isLoading } = useInboundAddresses(workspaceId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Email Capture"
        description="Wekbench monitors dedicated inboxes, extracts details from attachments — RFQs, purchase orders, amendments and more — and routes each email to the right buyer account automatically."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-info/10 text-info">
            <Inbox className="size-5" />
          </span>
          <h3 className="mt-3 font-semibold">1. Provision an address</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a unique <code>@{INBOUND_DOMAIN}</code> address per buyer and share it.
          </p>
        </Card>
        <Card className="p-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Sparkles className="size-5" />
          </span>
          <h3 className="mt-3 font-semibold">2. AI extraction</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Attachments (PDF, XLSX, DOCX) are parsed into structured line items with quantities and specs.
          </p>
        </Card>
        <Card className="p-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <h3 className="mt-3 font-semibold">3. Auto-route</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Emails are matched to the right buyer and surfaced in My Wekbench, ready for review.
          </p>
        </Card>
      </div>

      <Card className="mb-6 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AtSign className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold">Inbound domain</h3>
              <p className="text-sm text-muted-foreground">
                Any address you provision below routes through this domain.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
            <ShieldCheck className="size-3" />
            DNS configured
          </Badge>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
          <code className="truncate text-sm">@{INBOUND_DOMAIN}</code>
          <CopyButton value={`@${INBOUND_DOMAIN}`} />
        </div>
      </Card>

      {workspaceId && <div className="mb-6"><NewAddressForm workspaceId={workspaceId} /></div>}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Your capture addresses
      </h2>
      <Card className="divide-y divide-border">
        {wsLoading || isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !addresses || addresses.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No capture addresses yet. Create your first one above to start receiving RFQs.
          </div>
        ) : (
          addresses.map((a) => <AddressRow key={a.id} address={a} />)
        )}
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_app/email-capture")({
  component: EmailCapturePage,
});
