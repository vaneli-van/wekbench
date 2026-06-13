import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useProfile } from "@/hooks/use-profile"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/integrations/supabase/client"
import { useQueryClient } from "@tanstack/react-query"

function deriveDomain(company: string | null | undefined, email: string | null | undefined): string {
  if (email && email.includes("@")) return email.split("@")[1];
  if (!company) return "";
  return company.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
}

function WorkspaceCard() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const [org, setOrg] = useState("");
  const [domain, setDomain] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setOrg(profile.companyName ?? "");
      setDomain(deriveDomain(profile.companyName, user?.email));
    }
  }, [profile, user?.email]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const [wsRes, profRes] = await Promise.all([
        supabase.from("workspaces").update({ name: org.trim() }).eq("owner_id", user.id),
        supabase.from("profiles").update({ company_name: org.trim() }).eq("id", user.id),
      ]);
      if (wsRes.error) throw wsRes.error;
      if (profRes.error) throw profRes.error;
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Workspace updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>Basic information about your organization.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="org">Organization name</Label>
          <Input
            id="org"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            disabled={isLoading}
            placeholder="Your company"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="domain">Primary domain</Label>
          <Input
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={isLoading}
            placeholder="example.com"
          />
        </div>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="currency">Base currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usd">USD — US Dollar</SelectItem>
              <SelectItem value="eur">EUR — Euro</SelectItem>
              <SelectItem value="gbp">GBP — British Pound</SelectItem>
              <SelectItem value="cad">CAD — Canadian Dollar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={saving || isLoading || !org.trim()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TeamCard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  if (!profile || !user) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team members</CardTitle>
        <CardDescription>People with access to this procurement workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-muted text-xs">{profile.initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{profile.fullName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">Owner</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => toast.info("Member invitations — coming soon")}>
          Invite member
        </Button>
      </CardContent>
    </Card>
  );
}

function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <PageHeader title="Settings" description="Manage your workspace, team, and quote defaults." />

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="quoting">Quote Defaults</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <WorkspaceCard />
          <VendorTypeCard />
        </TabsContent>


        <TabsContent value="team" className="space-y-6">
          <TeamCard />
        </TabsContent>

        <TabsContent value="quoting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote defaults</CardTitle>
              <CardDescription>Applied automatically to new quotes. Override per RFQ as needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="margin">Default target margin (%)</Label>
                  <Input id="margin" type="number" defaultValue="22" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="validity">Quote validity (days)</Label>
                  <Input id="validity" type="number" defaultValue="30" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="incoterm">Default Incoterm</Label>
                  <Select defaultValue="ddp">
                    <SelectTrigger id="incoterm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exw">EXW — Ex Works</SelectItem>
                      <SelectItem value="fob">FOB — Free On Board</SelectItem>
                      <SelectItem value="cif">CIF — Cost, Insurance, Freight</SelectItem>
                      <SelectItem value="ddp">DDP — Delivered Duty Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead">Default lead time (weeks)</Label>
                  <Input id="lead" type="number" defaultValue="8" />
                </div>
              </div>
              <Button onClick={() => toast.success("Quote defaults saved")}>Save defaults</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what you want to be alerted about.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { label: "New RFQ received", desc: "When an inbound email is parsed into an RFQ.", on: true },
                { label: "High-value RFQ", desc: "RFQs with estimated value over $50,000.", on: true },
                { label: "Quote accepted", desc: "When a buyer accepts a quote you sent.", on: true },
                { label: "Quote expiring", desc: "48 hours before a sent quote expires.", on: false },
                { label: "Document overdue", desc: "When an order document pack is incomplete past its due date.", on: true },
              ].map((n, i, arr) => (
                <div key={n.label}>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <Switch defaultChecked={n.on} />
                  </div>
                  {i < arr.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});
