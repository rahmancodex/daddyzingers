import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  Database,
  HardDrive,
  Mail,
  MessageSquare,
  Plug,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Trash2,
  Webhook,
  Wrench,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  listIntegrations,
  upsertIntegration,
  testIntegration,
  listEmailTemplates,
  upsertEmailTemplate,
  listWebhookEndpoints,
  upsertWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookDeliveries,
  retryWebhookDelivery,
  listErrorLogs,
  clearErrorLogs,
  getSystemHealth,
  listBackups,
  recordBackup,
  runMaintenance,
  type IntegrationConfig,
  type EmailTemplate,
  type WebhookEndpoint,
} from "@/lib/admin-production.functions";

// ---------------- helpers ----------------
function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          : "border-red-500/30 bg-red-500/10 text-red-600"
      }
    >
      {ok ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
      {label ?? (ok ? "Healthy" : "Issue")}
    </Badge>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold leading-tight">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

// ---------------- Integration Card ----------------
function IntegrationCard({
  cfg,
  fields,
  icon,
  title,
  description,
  onSave,
  onTest,
}: {
  cfg: IntegrationConfig | undefined;
  fields: { key: string; label: string; type?: string; placeholder?: string; secret?: boolean }[];
  icon: any;
  title: string;
  description?: string;
  onSave: (patch: {
    enabled?: boolean;
    mode?: string;
    config?: Record<string, any>;
  }) => Promise<void>;
  onTest: () => Promise<void>;
}) {
  const [local, setLocal] = React.useState<Record<string, any>>(cfg?.config ?? {});
  const [enabled, setEnabled] = React.useState(cfg?.enabled ?? false);
  const [mode, setMode] = React.useState(cfg?.mode ?? "sandbox");
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    setLocal(cfg?.config ?? {});
    setEnabled(cfg?.enabled ?? false);
    setMode(cfg?.mode ?? "sandbox");
  }, [cfg?.id]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <SectionHeader icon={icon} title={title} description={description} />
          <div className="flex items-center gap-2">
            <StatusBadge ok={!!cfg?.enabled} label={cfg?.enabled ? "Enabled" : "Disabled"} />
            <Switch
              checked={enabled}
              onCheckedChange={async (v) => {
                setEnabled(v);
                setSaving(true);
                await onSave({ enabled: v, mode, config: local });
                setSaving(false);
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cfg?.last_tested_at && (
            <span className="text-xs text-muted-foreground">
              Last tested: {new Date(cfg.last_tested_at).toLocaleString()}
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <Input
                type={f.secret ? "password" : f.type ?? "text"}
                placeholder={f.placeholder ?? (f.secret ? "•••••• (stored securely)" : "")}
                value={local[f.key] ?? ""}
                onChange={(e) => setLocal({ ...local, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({ enabled, mode, config: local });
                toast.success(`${title} saved`);
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={testing}
            onClick={async () => {
              setTesting(true);
              try {
                await onTest();
                toast.success(`Test triggered for ${title}`);
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setTesting(false);
              }
            }}
          >
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Integrations Tab ----------------
function IntegrationsTab() {
  const qc = useQueryClient();
  const list = useServerFn(listIntegrations);
  const upsert = useServerFn(upsertIntegration);
  const test = useServerFn(testIntegration);

  const { data, isLoading } = useQuery({
    queryKey: ["prod-integrations"],
    queryFn: () => list(),
  });

  const save = async (key: string, patch: any, category: string) => {
    await upsert({ data: { key, category, ...patch } });
    qc.invalidateQueries({ queryKey: ["prod-integrations"] });
  };
  const runTest = async (key: string) => {
    await test({ data: { key } });
    qc.invalidateQueries({ queryKey: ["prod-integrations"] });
  };

  const get = (key: string) => data?.find((d) => d.key === key);

  if (isLoading)
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );

  return (
    <Tabs defaultValue="auth" className="space-y-6">
      <TabsList className="flex-wrap">
        <TabsTrigger value="auth">Authentication</TabsTrigger>
        <TabsTrigger value="email">Email / SMTP</TabsTrigger>
        <TabsTrigger value="sms">SMS / WhatsApp</TabsTrigger>
        <TabsTrigger value="push">Push</TabsTrigger>
        <TabsTrigger value="payment">Payments</TabsTrigger>
      </TabsList>

      <TabsContent value="auth" className="space-y-4">
        <IntegrationCard
          cfg={get("google_oauth")}
          icon={ShieldCheck}
          title="Google OAuth"
          description="Enable Google Sign-In for customers. Credentials are managed by Lovable Cloud by default."
          fields={[
            { key: "client_id", label: "Client ID (optional override)" },
            { key: "client_secret", label: "Client Secret", secret: true },
            { key: "redirect_uri", label: "Redirect URI" },
            { key: "notes", label: "Notes" },
          ]}
          onSave={(p) => save("google_oauth", p, "auth")}
          onTest={() => runTest("google_oauth")}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Go to Google Cloud Console → Credentials → OAuth 2.0 Client IDs.</p>
            <p>2. Add authorized redirect URI shown above.</p>
            <p>3. Paste Client ID & Secret here, or leave blank to use the managed defaults.</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="email" className="space-y-4">
        <IntegrationCard
          cfg={get("smtp")}
          icon={Mail}
          title="SMTP / Email"
          description="Outgoing email server for verification, password reset & transactional emails."
          fields={[
            { key: "host", label: "SMTP Host", placeholder: "smtp.example.com" },
            { key: "port", label: "SMTP Port", type: "number", placeholder: "587" },
            { key: "username", label: "Username" },
            { key: "password", label: "Password", secret: true },
            { key: "encryption", label: "Encryption (tls/ssl/none)" },
            { key: "sender_name", label: "Sender Name" },
            { key: "sender_email", label: "Sender Email" },
            { key: "reply_to", label: "Reply-To" },
          ]}
          onSave={(p) => save("smtp", p, "email")}
          onTest={() => runTest("smtp")}
        />
      </TabsContent>

      <TabsContent value="sms" className="space-y-4">
        <IntegrationCard
          cfg={get("twilio")}
          icon={MessageSquare}
          title="Twilio SMS"
          description="Programmable SMS for OTPs, order updates and delivery alerts."
          fields={[
            { key: "account_sid", label: "Account SID" },
            { key: "auth_token", label: "Auth Token", secret: true },
            { key: "from_number", label: "From Number", placeholder: "+1..." },
          ]}
          onSave={(p) => save("twilio", p, "sms")}
          onTest={() => runTest("twilio")}
        />
        <IntegrationCard
          cfg={get("whatsapp_cloud")}
          icon={MessageSquare}
          title="WhatsApp Cloud API"
          description="Meta WhatsApp Business API for order & promotional messages."
          fields={[
            { key: "phone_number_id", label: "Phone Number ID" },
            { key: "business_account_id", label: "Business Account ID" },
            { key: "access_token", label: "Access Token", secret: true },
          ]}
          onSave={(p) => save("whatsapp_cloud", p, "sms")}
          onTest={() => runTest("whatsapp_cloud")}
        />
      </TabsContent>

      <TabsContent value="push" className="space-y-4">
        <IntegrationCard
          cfg={get("fcm")}
          icon={Bell}
          title="Firebase Cloud Messaging"
          description="Native mobile push for iOS & Android."
          fields={[
            { key: "project_id", label: "Project ID" },
            { key: "sender_id", label: "Sender ID" },
            { key: "server_key", label: "Server Key", secret: true },
          ]}
          onSave={(p) => save("fcm", p, "push")}
          onTest={() => runTest("fcm")}
        />
        <IntegrationCard
          cfg={get("web_push")}
          icon={Bell}
          title="Web Push (VAPID)"
          description="Browser push notifications."
          fields={[
            { key: "vapid_public_key", label: "VAPID Public Key" },
            { key: "vapid_private_key", label: "VAPID Private Key", secret: true },
            { key: "vapid_subject", label: "Subject (mailto:)" },
          ]}
          onSave={(p) => save("web_push", p, "push")}
          onTest={() => runTest("web_push")}
        />
      </TabsContent>

      <TabsContent value="payment" className="space-y-4">
        <IntegrationCard
          cfg={get("stripe")}
          icon={CreditCard}
          title="Stripe"
          description="Cards & wallets via Stripe."
          fields={[
            { key: "publishable_key", label: "Publishable Key" },
            { key: "secret_key", label: "Secret Key", secret: true },
            { key: "webhook_secret", label: "Webhook Secret", secret: true },
            { key: "webhook_endpoint", label: "Webhook Endpoint URL" },
          ]}
          onSave={(p) => save("stripe", p, "payment")}
          onTest={() => runTest("stripe")}
        />
        <IntegrationCard
          cfg={get("jazzcash")}
          icon={CreditCard}
          title="JazzCash"
          description="Pakistan mobile wallet payments."
          fields={[
            { key: "merchant_id", label: "Merchant ID" },
            { key: "password", label: "Password", secret: true },
            { key: "integrity_salt", label: "Integrity Salt", secret: true },
            { key: "return_url", label: "Return URL" },
          ]}
          onSave={(p) => save("jazzcash", p, "payment")}
          onTest={() => runTest("jazzcash")}
        />
        <IntegrationCard
          cfg={get("easypaisa")}
          icon={CreditCard}
          title="Easypaisa"
          description="Pakistan mobile wallet payments."
          fields={[
            { key: "store_id", label: "Store ID" },
            { key: "hash_key", label: "Hash Key", secret: true },
            { key: "return_url", label: "Return URL" },
          ]}
          onSave={(p) => save("easypaisa", p, "payment")}
          onTest={() => runTest("easypaisa")}
        />
        <IntegrationCard
          cfg={get("cod")}
          icon={CreditCard}
          title="Cash on Delivery"
          description="Enable / configure limits for Cash on Delivery."
          fields={[
            { key: "min_order", label: "Minimum Order (0 = no limit)", type: "number" },
            { key: "max_order", label: "Maximum Order (0 = no limit)", type: "number" },
          ]}
          onSave={(p) => save("cod", p, "payment")}
          onTest={() => runTest("cod")}
        />
      </TabsContent>
    </Tabs>
  );
}

// ---------------- Email Templates Tab ----------------
function EmailTemplatesTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listEmailTemplates);
  const upsertFn = useServerFn(upsertEmailTemplate);

  const { data, isLoading } = useQuery({
    queryKey: ["prod-email-templates"],
    queryFn: () => listFn(),
  });

  const [selected, setSelected] = React.useState<string | null>(null);
  const current = data?.find((t) => t.key === selected) ?? data?.[0];

  React.useEffect(() => {
    if (!selected && data?.[0]) setSelected(data[0].key);
  }, [data, selected]);

  const [draft, setDraft] = React.useState<EmailTemplate | null>(null);
  React.useEffect(() => setDraft(current ? { ...current } : null), [current?.id]);

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Templates</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[500px]">
            <div className="space-y-1">
              {data.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.key)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                    (selected ?? data[0].key) === t.key
                      ? "bg-primary/10 font-medium text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div>{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.key}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>{draft.name}</CardTitle>
              <CardDescription>Available variables: {(draft.variables ?? []).map((v) => `{{${v}}}`).join(", ") || "None"}</CardDescription>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">HTML Body</Label>
              <Textarea
                rows={12}
                className="font-mono text-xs"
                value={draft.body_html}
                onChange={(e) => setDraft({ ...draft, body_html: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plain Text Body (fallback)</Label>
              <Textarea
                rows={4}
                className="font-mono text-xs"
                value={draft.body_text}
                onChange={(e) => setDraft({ ...draft, body_text: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    await upsertFn({
                      data: {
                        key: draft.key,
                        name: draft.name,
                        subject: draft.subject,
                        body_html: draft.body_html,
                        body_text: draft.body_text,
                        enabled: draft.enabled,
                      },
                    });
                    toast.success("Template saved");
                    qc.invalidateQueries({ queryKey: ["prod-email-templates"] });
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
              >
                Save Template
              </Button>
              <Button variant="outline" onClick={() => current && setDraft({ ...current })}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------- Webhooks Tab ----------------
function WebhookDrawer({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: WebhookEndpoint | null;
  onSaved: () => void;
}) {
  const upsert = useServerFn(upsertWebhookEndpoint);
  const [form, setForm] = React.useState({
    id: initial?.id,
    provider: initial?.provider ?? "stripe",
    label: initial?.label ?? "",
    url: initial?.url ?? "",
    secret_hint: initial?.secret_hint ?? "",
    events: (initial?.events ?? []).join(","),
    enabled: initial?.enabled ?? true,
  });
  React.useEffect(() => {
    setForm({
      id: initial?.id,
      provider: initial?.provider ?? "stripe",
      label: initial?.label ?? "",
      url: initial?.url ?? "",
      secret_hint: initial?.secret_hint ?? "",
      events: (initial?.events ?? []).join(","),
      enabled: initial?.enabled ?? true,
    });
  }, [initial?.id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Webhook" : "New Webhook"}</DialogTitle>
          <DialogDescription>Endpoints receive event callbacks from providers.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Endpoint URL</Label>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Secret Hint (last 4 chars)</Label>
            <Input
              value={form.secret_hint}
              onChange={(e) => setForm({ ...form, secret_hint: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Events (comma separated)</Label>
            <Input
              value={form.events}
              onChange={(e) => setForm({ ...form, events: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            />
            <Label className="text-sm">Enabled</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                await upsert({
                  data: {
                    id: form.id,
                    provider: form.provider,
                    label: form.label,
                    url: form.url,
                    secret_hint: form.secret_hint || undefined,
                    events: form.events.split(",").map((s) => s.trim()).filter(Boolean),
                    enabled: form.enabled,
                  },
                });
                toast.success("Webhook saved");
                onSaved();
                onOpenChange(false);
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WebhooksTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listWebhookEndpoints);
  const delFn = useServerFn(deleteWebhookEndpoint);
  const deliveriesFn = useServerFn(listWebhookDeliveries);
  const retryFn = useServerFn(retryWebhookDelivery);

  const endpoints = useQuery({ queryKey: ["webhook-endpoints"], queryFn: () => listFn() });
  const deliveries = useQuery({ queryKey: ["webhook-deliveries"], queryFn: () => deliveriesFn() });

  const [drawer, setDrawer] = React.useState<{ open: boolean; initial?: WebhookEndpoint | null }>({
    open: false,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
    qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Endpoints</CardTitle>
            <CardDescription>Register webhook URLs and event subscriptions.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setDrawer({ open: true, initial: null })}>
            <Webhook className="mr-2 h-4 w-4" /> New Endpoint
          </Button>
        </CardHeader>
        <CardContent>
          {endpoints.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (endpoints.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No endpoints yet.</p>
          ) : (
            <div className="space-y-2">
              {endpoints.data!.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{e.provider}</Badge>
                      <span className="font-medium">{e.label}</span>
                      <StatusBadge ok={e.enabled} label={e.enabled ? "Active" : "Paused"} />
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{e.url}</div>
                    {e.events?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {e.events.map((ev) => (
                          <Badge key={ev} variant="secondary" className="text-[10px]">
                            {ev}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDrawer({ open: true, initial: e })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Delete ${e.label}?`)) return;
                        await delFn({ data: { id: e.id } });
                        toast.success("Deleted");
                        refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
          <CardDescription>Last 100 delivery attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveries.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (deliveries.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries yet.</p>
          ) : (
            <div className="space-y-2">
              {deliveries.data!.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      ok={d.status === "success" || d.status === "delivered"}
                      label={d.status}
                    />
                    <span className="font-medium">{d.provider}</span>
                    <span className="text-muted-foreground">{d.event}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.response_code && (
                      <Badge variant="outline">HTTP {d.response_code}</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await retryFn({ data: { id: d.id } });
                        toast.success("Queued retry");
                        refresh();
                      }}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" /> Retry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WebhookDrawer
        open={drawer.open}
        onOpenChange={(v) => setDrawer({ open: v, initial: drawer.initial })}
        initial={drawer.initial}
        onSaved={refresh}
      />
    </div>
  );
}

// ---------------- System Health Tab ----------------
function SystemHealthTab() {
  const qc = useQueryClient();
  const healthFn = useServerFn(getSystemHealth);
  const maintenanceFn = useServerFn(runMaintenance);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["prod-health"],
    queryFn: () => healthFn(),
    refetchInterval: 30_000,
  });

  const runAction = async (action: "clear_cache" | "refresh_realtime" | "health_check") => {
    try {
      await maintenanceFn({ data: { action } });
      toast.success(`${action.replace("_", " ")} triggered`);
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.checks).map(([name, c]: any) => (
          <Card key={name}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium capitalize">{name}</span>
                </div>
                <StatusBadge ok={c.ok} />
              </div>
              {c.latency_ms !== undefined && (
                <p className="mt-2 text-xs text-muted-foreground">{c.latency_ms} ms</p>
              )}
              {c.note && <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Errors (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.metrics.errors_24h}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Webhooks (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.metrics.webhooks_24h}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Failed Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{data.metrics.failed_webhooks_24h}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(data.integrations as any[]).map((i) => (
              <div
                key={i.key}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{i.key}</div>
                  <div className="text-xs text-muted-foreground">{i.category}</div>
                </div>
                <StatusBadge ok={!!i.enabled} label={i.enabled ? "Enabled" : "Off"} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Tools</CardTitle>
          <CardDescription>All actions are logged in Audit Logs.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => runAction("clear_cache")}>
            <Wrench className="mr-2 h-4 w-4" /> Clear Cache
          </Button>
          <Button variant="outline" onClick={() => runAction("refresh_realtime")}>
            <Activity className="mr-2 h-4 w-4" /> Refresh Realtime
          </Button>
          <Button variant="outline" onClick={() => runAction("health_check")}>
            <RefreshCw className="mr-2 h-4 w-4" /> Health Check
          </Button>
          <Button variant="outline" disabled>
            Rebuild Search Index (coming soon)
          </Button>
        </CardContent>
      </Card>

      <div className="text-right text-xs text-muted-foreground">
        v{data.version} · Total latency {data.total_latency_ms} ms · Last refresh{" "}
        {new Date(data.generated_at).toLocaleTimeString()}
      </div>
    </div>
  );
}

// ---------------- Backups Tab ----------------
function BackupsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBackups);
  const recordFn = useServerFn(recordBackup);
  const { data, isLoading } = useQuery({ queryKey: ["prod-backups"], queryFn: () => listFn() });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Backups</CardTitle>
            <CardDescription>
              Automated backups are managed by Lovable Cloud. Record manual snapshot markers here.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              await recordFn({ data: {} });
              toast.success("Snapshot marker recorded");
              qc.invalidateQueries({ queryKey: ["prod-backups"] });
            }}
          >
            <HardDrive className="mr-2 h-4 w-4" /> Record Snapshot
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {data!.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {new Date(b.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{b.notes}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge ok={b.status === "completed"} label={b.status} />
                    <Button size="sm" variant="outline" disabled>
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- Error Logs Tab ----------------
function ErrorLogsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listErrorLogs);
  const clearFn = useServerFn(clearErrorLogs);
  const [source, setSource] = React.useState("all");
  const [level, setLevel] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["prod-error-logs", source, level, search],
    queryFn: () => listFn({ data: { source, level, search } }),
  });

  const [detail, setDetail] = React.useState<any>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search error message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="server">Server Function</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!confirm("Clear all matching error logs?")) return;
                  await clearFn({ data: { source: source === "all" ? undefined : source } });
                  qc.invalidateQueries({ queryKey: ["prod-error-logs"] });
                  toast.success("Cleared");
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors 🎉</p>
          ) : (
            <div className="space-y-1">
              {data!.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setDetail(e)}
                  className="flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left text-sm hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase">
                        {e.level}
                      </Badge>
                      <Badge variant="secondary">{e.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-medium">{e.message}</div>
                    {e.url && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{e.url}</div>
                    )}
                  </div>
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs">Message</Label>
                <p className="font-medium">{detail.message}</p>
              </div>
              {detail.stack && (
                <div>
                  <Label className="text-xs">Stack</Label>
                  <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
                    {detail.stack}
                  </pre>
                </div>
              )}
              {detail.context && (
                <div>
                  <Label className="text-xs">Context</Label>
                  <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
                    {JSON.stringify(detail.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Main ----------------
export function ProductionContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Rocket className="h-6 w-6 text-primary" /> Production
          </h1>
          <p className="text-sm text-muted-foreground">
            Integrations, webhooks, error monitoring & maintenance for launch. Owner only.
          </p>
        </div>
      </div>
      <Separator />

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="integrations">
            <Plug className="mr-2 h-4 w-4" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="mr-2 h-4 w-4" /> Email Templates
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="mr-2 h-4 w-4" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="health">
            <Activity className="mr-2 h-4 w-4" /> System Health
          </TabsTrigger>
          <TabsTrigger value="backups">
            <HardDrive className="mr-2 h-4 w-4" /> Backups
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertTriangle className="mr-2 h-4 w-4" /> Error Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
        <TabsContent value="emails"><EmailTemplatesTab /></TabsContent>
        <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
        <TabsContent value="health"><SystemHealthTab /></TabsContent>
        <TabsContent value="backups"><BackupsTab /></TabsContent>
        <TabsContent value="errors"><ErrorLogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
