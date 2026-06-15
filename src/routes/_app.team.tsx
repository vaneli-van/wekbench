import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Mail, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listTeam, inviteMember, revokeInvite, removeMember,
} from "@/lib/api/workspace.functions";

function TeamPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTeam);
  const inviteFn = useServerFn(inviteMember);
  const revokeFn = useServerFn(revokeInvite);
  const removeFn = useServerFn(removeMember);

  const { data, isLoading } = useQuery({ queryKey: ["team"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["team"] });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members: any[] = (data as any)?.members ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invites: any[] = (data as any)?.invites ?? [];
  const currentUserId = (data as any)?.currentUserId;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");

  const inviteMut = useMutation({
    mutationFn: () => inviteFn({ data: { email: email.trim(), role } }),
    onSuccess: () => { toast.success("Invite sent"); setEmail(""); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not invite"),
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { inviteId: id } }),
    onSuccess: () => { toast.success("Invite revoked"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const removeMut = useMutation({
    mutationFn: (uid: string) => removeFn({ data: { userId: uid } }),
    onSuccess: () => { toast.success("Member removed"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Team"
        description="Invite teammates to your workspace. Members can access RFQs, quotes, sourcing, and orders."
      />

      {/* Invite */}
      <Card className="mt-6 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><UserPlus className="size-4" /> Invite a teammate</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
            <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => inviteMut.mutate()} disabled={!email.trim() || inviteMut.isPending}>
            {inviteMut.isPending ? "Inviting…" : "Send invite"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          They join automatically the next time they sign in with this email address.
        </p>
      </Card>

      {/* Members */}
      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">Members</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {(m.email ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {m.email}{m.user_id === currentUserId ? <span className="text-muted-foreground"> (you)</span> : null}
                    </p>
                    <Badge variant="outline" className="mt-0.5 text-[10px] capitalize">{m.role}</Badge>
                  </div>
                </div>
                {m.role !== "owner" && m.user_id !== currentUserId && (
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => removeMut.mutate(m.user_id)} title="Remove member">
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
                {m.role === "owner" && <ShieldCheck className="size-4 text-muted-foreground" aria-label="Owner" />}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card className="mt-4 p-4">
          <h2 className="mb-3 text-sm font-semibold">Pending invites</h2>
          <ul className="divide-y divide-border">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <Badge variant="outline" className="mt-0.5 text-[10px] capitalize">{inv.role} · pending</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revokeMut.mutate(inv.id)}>Revoke</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/team")({
  component: TeamPage,
});
