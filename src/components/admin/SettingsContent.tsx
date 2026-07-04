import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Building2,
  Clock,
  Contact,
  Globe,
  Image as ImageIcon,
  MapPin,
  Palette,
  Receipt,
  Search,
  Share2,
  ShieldAlert,
  Truck,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { adminGetSettings, adminUpdateSettings } from "@/lib/admin-settings.functions";
import { uploadBrandAsset } from "@/lib/admin-brand-storage";
import { BranchesManager } from "./BranchesManager";

// -----------------------------
// Types (loose to match jsonb)
// -----------------------------

type Obj = Record<string, unknown>;

type Settings = {
  id: string;
  restaurant_info: Obj;
  business_hours: Obj;
  delivery_settings: Obj;
  tax_settings: Obj;
  seo_settings: Obj;
  social_media: Obj;
  contact_info: Obj;
  brand_assets: Obj;
  maintenance_mode: Obj;
};

const s = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0) => (typeof v === "number" ? v : d);
const b = (v: unknown, d = false) => (typeof v === "boolean" ? v : d);

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

const TABS = [
  { value: "info", label: "Restaurant", icon: Building2 },
  { value: "branches", label: "Branches", icon: MapPin },
  { value: "hours", label: "Hours", icon: Clock },
  { value: "delivery", label: "Delivery", icon: Truck },
  { value: "tax", label: "Taxes", icon: Receipt },
  { value: "seo", label: "SEO", icon: Search },
  { value: "social", label: "Social", icon: Share2 },
  { value: "contact", label: "Contact", icon: Contact },
  { value: "brand", label: "Brand", icon: Palette },
  { value: "maintenance", label: "Maintenance", icon: ShieldAlert },
];

// -----------------------------
// Root
// -----------------------------

export function SettingsContent() {
  const getSettings = useServerFn(adminGetSettings);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => getSettings(),
    staleTime: 30_000,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Globe className="h-3.5 w-3.5" /> Restaurant Settings
        </div>
        <h1 className="font-display text-3xl font-black leading-tight md:text-4xl">
          Store & Branding
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage restaurant details, branches, business hours, delivery, taxes, SEO and brand
          assets. Changes go live immediately on the customer website.
        </p>
      </header>

      {isLoading ? (
        <SettingsSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Failed to load settings: {(error as Error).message}
          </CardContent>
        </Card>
      ) : data ? (
        <SettingsTabs initial={data as unknown as Settings} />
      ) : null}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

// -----------------------------
// Tabs container
// -----------------------------

function SettingsTabs({ initial }: { initial: Settings }) {
  const [tab, setTab] = React.useState("info");
  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-muted/60 p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <div className="mt-6">
        <TabsContent value="info" className="m-0">
          <InfoSection initial={initial} />
        </TabsContent>
        <TabsContent value="branches" className="m-0">
          <BranchesManager />
        </TabsContent>
        <TabsContent value="hours" className="m-0">
          <HoursSection initial={initial} />
        </TabsContent>
        <TabsContent value="delivery" className="m-0">
          <DeliverySection initial={initial} />
        </TabsContent>
        <TabsContent value="tax" className="m-0">
          <TaxSection initial={initial} />
        </TabsContent>
        <TabsContent value="seo" className="m-0">
          <SeoSection initial={initial} />
        </TabsContent>
        <TabsContent value="social" className="m-0">
          <SocialSection initial={initial} />
        </TabsContent>
        <TabsContent value="contact" className="m-0">
          <ContactSection initial={initial} />
        </TabsContent>
        <TabsContent value="brand" className="m-0">
          <BrandSection initial={initial} />
        </TabsContent>
        <TabsContent value="maintenance" className="m-0">
          <MaintenanceSection initial={initial} />
        </TabsContent>
      </div>
    </Tabs>
  );
}

// -----------------------------
// Reusable save hook
// -----------------------------

function useSaveSettings() {
  const updateFn = useServerFn(adminUpdateSettings);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Settings>) => updateFn({ data: patch as never }),
    onSuccess: (data) => {
      qc.setQueryData(["admin", "settings"], data);
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save"),
  });
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// -----------------------------
// Restaurant Info
// -----------------------------

const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR", "INR"];
const TIMEZONES = ["Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "America/New_York", "UTC"];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
  { value: "ar", label: "Arabic" },
];

function InfoSection({ initial }: { initial: Settings }) {
  const [form, setForm] = React.useState(initial.restaurant_info ?? {});
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SectionCard
      title="Restaurant Information"
      description="Public-facing details about your restaurant."
      action={
        <Button
          onClick={() => save.mutate({ restaurant_info: form })}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Restaurant Name">
          <Input value={s(form.name)} onChange={(e) => setField("name", e.target.value)} />
        </Field>
        <Field label="Website">
          <Input
            placeholder="https://…"
            value={s(form.website)}
            onChange={(e) => setField("website", e.target.value)}
          />
        </Field>
        <Field label="Support Email">
          <Input
            type="email"
            value={s(form.support_email)}
            onChange={(e) => setField("support_email", e.target.value)}
          />
        </Field>
        <Field label="Support Phone">
          <Input
            value={s(form.support_phone)}
            onChange={(e) => setField("support_phone", e.target.value)}
          />
        </Field>
        <Field label="WhatsApp Number">
          <Input
            value={s(form.whatsapp)}
            onChange={(e) => setField("whatsapp", e.target.value)}
          />
        </Field>
        <Field label="Currency">
          <Select
            value={s(form.currency, "PKR")}
            onValueChange={(v) => setField("currency", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Timezone">
          <Select
            value={s(form.timezone, "Asia/Karachi")}
            onValueChange={(v) => setField("timezone", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Default Language">
          <Select
            value={s(form.language, "en")}
            onValueChange={(v) => setField("language", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Short Description" hint="Shown under the restaurant name in headers.">
        <Input
          value={s(form.short_description)}
          onChange={(e) => setField("short_description", e.target.value)}
          maxLength={160}
        />
      </Field>

      <Field label="Long Description">
        <Textarea
          rows={5}
          value={s(form.long_description)}
          onChange={(e) => setField("long_description", e.target.value)}
        />
      </Field>
    </SectionCard>
  );
}

// -----------------------------
// Hours
// -----------------------------

function HoursSection({ initial }: { initial: Settings }) {
  const [hours, setHours] = React.useState<Obj>(initial.business_hours ?? {});
  const save = useSaveSettings();

  const setDay = (day: string, patch: Obj) => {
    setHours((h) => ({ ...h, [day]: { ...((h[day] as Obj) ?? {}), ...patch } }));
  };

  return (
    <SectionCard
      title="Business Hours"
      description="Default weekly schedule. Branches can override these."
      action={
        <Button
          onClick={() => save.mutate({ business_hours: hours })}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-3">
        {DAYS.map((d) => {
          const day = (hours[d.key] as Obj) ?? {};
          const closed = b(day.closed);
          return (
            <div
              key={d.key}
              className="grid grid-cols-1 items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 md:grid-cols-[140px,1fr,1fr,140px]"
            >
              <div className="font-semibold">{d.label}</div>
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground">Open</Label>
                <Input
                  type="time"
                  value={s(day.open, "11:00")}
                  onChange={(e) => setDay(d.key, { open: e.target.value })}
                  disabled={closed}
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase text-muted-foreground">Close</Label>
                <Input
                  type="time"
                  value={s(day.close, "23:00")}
                  onChange={(e) => setDay(d.key, { close: e.target.value })}
                  disabled={closed}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium">
                <Switch
                  checked={closed}
                  onCheckedChange={(v) => setDay(d.key, { closed: v })}
                />
                Closed
              </label>
            </div>
          );
        })}
      </div>

      <Separator />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Temporary Closure Message" hint="Shown when store is temporarily closed.">
          <Input
            value={s(hours.temp_closure_message)}
            onChange={(e) => setHours((h) => ({ ...h, temp_closure_message: e.target.value }))}
          />
        </Field>
        <Field label="Holiday Notice">
          <Input
            value={s(hours.holiday_notice)}
            onChange={(e) => setHours((h) => ({ ...h, holiday_notice: e.target.value }))}
          />
        </Field>
      </div>
    </SectionCard>
  );
}

// -----------------------------
// Delivery
// -----------------------------

function DeliverySection({ initial }: { initial: Settings }) {
  const [form, setForm] = React.useState<Obj>(initial.delivery_settings ?? {});
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SectionCard
      title="Delivery Settings"
      description="Default delivery configuration across all branches."
      action={
        <Button
          onClick={() => save.mutate({ delivery_settings: form })}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Default Delivery Fee">
          <Input
            type="number"
            step="0.01"
            value={n(form.default_fee)}
            onChange={(e) => setField("default_fee", parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Free Delivery Threshold" hint="Order total that unlocks free delivery.">
          <Input
            type="number"
            step="0.01"
            value={n(form.free_delivery_threshold)}
            onChange={(e) => setField("free_delivery_threshold", parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Estimated Delivery Time (minutes)">
          <Input
            type="number"
            value={n(form.estimated_minutes, 45)}
            onChange={(e) => setField("estimated_minutes", parseInt(e.target.value) || 0)}
          />
        </Field>
        <Field label="Maximum Delivery Radius (km)">
          <Input
            type="number"
            step="0.1"
            value={n(form.max_radius_km, 10)}
            onChange={(e) => setField("max_radius_km", parseFloat(e.target.value) || 0)}
          />
        </Field>
      </div>
    </SectionCard>
  );
}

// -----------------------------
// Tax
// -----------------------------

function TaxSection({ initial }: { initial: Settings }) {
  const [form, setForm] = React.useState<Obj>(initial.tax_settings ?? {});
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SectionCard
      title="Taxes & Fees"
      description="Configure GST, service charges and delivery tax."
      action={
        <Button
          onClick={() => save.mutate({ tax_settings: form })}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <TaxRow
        label="GST"
        enabled={b(form.gst_enabled)}
        rate={n(form.gst_rate)}
        onToggle={(v) => setField("gst_enabled", v)}
        onRate={(v) => setField("gst_rate", v)}
      />
      <TaxRow
        label="Service Charges"
        enabled={b(form.service_enabled)}
        rate={n(form.service_rate)}
        onToggle={(v) => setField("service_enabled", v)}
        onRate={(v) => setField("service_rate", v)}
      />
      <TaxRow
        label="Delivery Tax"
        enabled={b(form.delivery_tax_enabled)}
        rate={n(form.delivery_tax_rate)}
        onToggle={(v) => setField("delivery_tax_enabled", v)}
        onRate={(v) => setField("delivery_tax_rate", v)}
      />
    </SectionCard>
  );
}

function TaxRow({
  label,
  enabled,
  rate,
  onToggle,
  onRate,
}: {
  label: string;
  enabled: boolean;
  rate: number;
  onToggle: (v: boolean) => void;
  onRate: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3">
        <Switch checked={enabled} onCheckedChange={onToggle} />
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-xs text-muted-foreground">
            {enabled ? "Applied to orders" : "Disabled"}
          </div>
        </div>
      </div>
      <div className="w-full sm:w-40">
        <Label className="text-[11px] uppercase text-muted-foreground">Rate (%)</Label>
        <Input
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => onRate(parseFloat(e.target.value) || 0)}
          disabled={!enabled}
        />
      </div>
    </div>
  );
}

// -----------------------------
// SEO
// -----------------------------

function SeoSection({ initial }: { initial: Settings }) {
  const [form, setForm] = React.useState<Obj>(initial.seo_settings ?? {});
  const [uploading, setUploading] = React.useState<"og" | "favicon" | null>(null);
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const onUpload = async (kind: "og" | "favicon", file: File) => {
    try {
      setUploading(kind);
      const { url } = await uploadBrandAsset(file, kind === "og" ? "og" : "favicon");
      setField(kind === "og" ? "og_image" : "favicon", url);
      toast.success("Uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <SectionCard
      title="SEO"
      description="Search engine metadata for the customer website."
      action={
        <Button onClick={() => save.mutate({ seo_settings: form })} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <Field label="Meta Title" hint="Under 60 characters recommended.">
        <Input value={s(form.meta_title)} onChange={(e) => setField("meta_title", e.target.value)} maxLength={80} />
      </Field>
      <Field label="Meta Description" hint="Under 160 characters recommended.">
        <Textarea
          rows={3}
          value={s(form.meta_description)}
          onChange={(e) => setField("meta_description", e.target.value)}
          maxLength={200}
        />
      </Field>
      <Field label="Keywords" hint="Comma-separated list.">
        <Input value={s(form.keywords)} onChange={(e) => setField("keywords", e.target.value)} />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <AssetUpload
          label="OpenGraph Image"
          hint="Shown when the site is shared on social media."
          url={s(form.og_image)}
          uploading={uploading === "og"}
          onFile={(f) => onUpload("og", f)}
          onClear={() => setField("og_image", "")}
        />
        <AssetUpload
          label="Favicon"
          hint="ICO, PNG or SVG."
          url={s(form.favicon)}
          uploading={uploading === "favicon"}
          onFile={(f) => onUpload("favicon", f)}
          onClear={() => setField("favicon", "")}
        />
      </div>
    </SectionCard>
  );
}

// -----------------------------
// Social
// -----------------------------

function SocialSection({ initial }: { initial: Settings }) {
  const [form, setForm] = React.useState<Obj>(initial.social_media ?? {});
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const nets = [
    { key: "facebook", label: "Facebook" },
    { key: "instagram", label: "Instagram" },
    { key: "tiktok", label: "TikTok" },
    { key: "youtube", label: "YouTube" },
    { key: "linkedin", label: "LinkedIn" },
  ];

  return (
    <SectionCard
      title="Social Media"
      description="Links displayed in the footer and elsewhere on the customer site."
      action={
        <Button onClick={() => save.mutate({ social_media: form })} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        {nets.map((net) => (
          <Field key={net.key} label={net.label}>
            <Input
              placeholder={`https://${net.key}.com/…`}
              value={s(form[net.key])}
              onChange={(e) => setField(net.key, e.target.value)}
            />
          </Field>
        ))}
      </div>
    </SectionCard>
  );
}

// -----------------------------
// Contact
// -----------------------------

function ContactSection({ initial }: { initial: Settings }) {
  const [form, setForm] = React.useState<Obj>(initial.contact_info ?? {});
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SectionCard
      title="Contact Information"
      description="Public support and emergency channels."
      action={
        <Button onClick={() => save.mutate({ contact_info: form })} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Customer Care Number">
          <Input value={s(form.customer_care)} onChange={(e) => setField("customer_care", e.target.value)} />
        </Field>
        <Field label="Support Email">
          <Input type="email" value={s(form.support_email)} onChange={(e) => setField("support_email", e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input value={s(form.whatsapp)} onChange={(e) => setField("whatsapp", e.target.value)} />
        </Field>
        <Field label="Emergency Contact">
          <Input value={s(form.emergency)} onChange={(e) => setField("emergency", e.target.value)} />
        </Field>
      </div>
    </SectionCard>
  );
}

// -----------------------------
// Brand assets
// -----------------------------

function BrandSection({ initial }: { initial: Settings }) {
  const [form, setForm] = React.useState<Obj>(initial.brand_assets ?? {});
  const [uploading, setUploading] = React.useState<string | null>(null);
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const upload = async (
    field: string,
    kind: Parameters<typeof uploadBrandAsset>[1],
    file: File,
  ) => {
    try {
      setUploading(field);
      const { url } = await uploadBrandAsset(file, kind);
      setField(field, url);
      toast.success("Uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const assets: Array<{ field: string; label: string; kind: Parameters<typeof uploadBrandAsset>[1] }> = [
    { field: "logo", label: "Restaurant Logo", kind: "logo" },
    { field: "logo_dark", label: "Dark Logo", kind: "logo-dark" },
    { field: "favicon", label: "Favicon", kind: "favicon" },
    { field: "loading_logo", label: "Loading Logo", kind: "loading" },
    { field: "footer_logo", label: "Footer Logo", kind: "footer" },
  ];

  return (
    <SectionCard
      title="Brand Assets"
      description="Upload logos and imagery used throughout the customer website."
      action={
        <Button onClick={() => save.mutate({ brand_assets: form })} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((a) => (
          <AssetUpload
            key={a.field}
            label={a.label}
            url={s(form[a.field])}
            uploading={uploading === a.field}
            onFile={(f) => upload(a.field, a.kind, f)}
            onClear={() => setField(a.field, "")}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function AssetUpload({
  label,
  hint,
  url,
  uploading,
  onFile,
  onClear,
}: {
  label: string;
  hint?: string;
  url: string;
  uploading: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="group relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/80 bg-muted/40">
        {url ? (
          <>
            <img src={url} alt={label} className="max-h-full max-w-full object-contain p-4" />
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-destructive shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
            <span>No image</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.ico,.svg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-1 h-3.5 w-3.5" />
          {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
        </Button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// -----------------------------
// Maintenance
// -----------------------------

function MaintenanceSection({ initial }: { initial: Settings }) {
  const [form, setForm] = React.useState<Obj>(initial.maintenance_mode ?? {});
  const save = useSaveSettings();
  const enabled = b(form.enabled);

  return (
    <SectionCard
      title="Maintenance Mode"
      description="Take the customer website offline for planned maintenance."
      action={
        <Button
          onClick={() => save.mutate({ maintenance_mode: form })}
          disabled={save.isPending}
          variant={enabled ? "destructive" : "default"}
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={enabled}
            onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
          />
          <div>
            <div className="font-semibold">Enable maintenance mode</div>
            <div className="text-xs text-muted-foreground">
              Customers see a maintenance page instead of the site.
            </div>
          </div>
        </div>
        {enabled && <Badge variant="destructive">Live</Badge>}
      </div>

      <Field label="Custom Message">
        <Textarea
          rows={4}
          value={s(form.message)}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder="We'll be back shortly!"
        />
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-4">
        <Switch
          checked={b(form.whitelist_admins, true)}
          onCheckedChange={(v) => setForm((f) => ({ ...f, whitelist_admins: v }))}
        />
        <div>
          <div className="text-sm font-semibold">Whitelist Admin Access</div>
          <div className="text-xs text-muted-foreground">
            Admins can still browse the site while maintenance is active.
          </div>
        </div>
      </label>
    </SectionCard>
  );
}
