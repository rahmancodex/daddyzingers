import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Contact,
  Copy,
  Globe,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Palette,
  Receipt,
  RotateCcw,
  Save,
  Search,
  Share2,
  ShieldAlert,
  Truck,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

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
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
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
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => getSettings(),
    staleTime: 30_000,
  });

  const maintenanceLive =
    !!data && b((data as unknown as Settings).maintenance_mode?.enabled);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-24">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Globe className="h-3.5 w-3.5" /> Restaurant Settings
          </div>
          <h1 className="font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
            Store &amp; Configuration
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage restaurant details, branches, hours, delivery, taxes, SEO and brand.
            Changes go live on the customer website immediately.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {maintenanceLive && (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" /> Maintenance live
            </Badge>
          )}
          {isFetching && !isLoading && (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Syncing
            </Badge>
          )}
        </div>
      </header>

      {isLoading ? (
        <SettingsSkeleton />
      ) : error ? (
        <ErrorCard message={(error as Error).message} onRetry={() => refetch()} />
      ) : data ? (
        <SettingsTabs initial={data as unknown as Settings} />
      ) : null}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold">Couldn't load settings</div>
            <div className="text-sm text-muted-foreground break-words">{message}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try again
        </Button>
      </CardContent>
    </Card>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full rounded-xl" aria-busy="true" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

// -----------------------------
// Tabs container
// -----------------------------

function SettingsTabs({ initial }: { initial: Settings }) {
  const [tab, setTab] = React.useState("info");
  const activeMeta = TABS.find((t) => t.value === tab);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      {/* Desktop / tablet tabs */}
      <div className="sticky top-0 z-20 -mx-4 hidden border-b border-border/60 bg-background/85 px-4 pb-3 pt-2 backdrop-blur sm:block">
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
      </div>

      {/* Mobile selector */}
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur sm:hidden">
        <Select value={tab} onValueChange={setTab}>
          <SelectTrigger className="h-11 flex-1 text-sm font-semibold">
            <div className="flex items-center gap-2">
              {activeMeta ? <activeMeta.icon className="h-4 w-4" /> : null}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        <TabsContent value="info" className="m-0"><InfoSection initial={initial} /></TabsContent>
        <TabsContent value="branches" className="m-0"><BranchesManager /></TabsContent>
        <TabsContent value="hours" className="m-0"><HoursSection initial={initial} /></TabsContent>
        <TabsContent value="delivery" className="m-0"><DeliverySection initial={initial} /></TabsContent>
        <TabsContent value="tax" className="m-0"><TaxSection initial={initial} /></TabsContent>
        <TabsContent value="seo" className="m-0"><SeoSection initial={initial} /></TabsContent>
        <TabsContent value="social" className="m-0"><SocialSection initial={initial} /></TabsContent>
        <TabsContent value="contact" className="m-0"><ContactSection initial={initial} /></TabsContent>
        <TabsContent value="brand" className="m-0"><BrandSection initial={initial} /></TabsContent>
        <TabsContent value="maintenance" className="m-0"><MaintenanceSection initial={initial} /></TabsContent>
      </div>
    </Tabs>
  );
}

// -----------------------------
// Reusable save hook + dirty tracking
// -----------------------------

function useSaveSettings() {
  const updateFn = useServerFn(adminUpdateSettings);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const result = await updateFn({ data: patch as never });
      return result;
    },
    onSuccess: (data) => {
      if (data) qc.setQueryData(["admin", "settings"], data);
      // Force a refetch so every tab shows the latest server values and any
      // derived public reads (delivery pricing, etc.) also refresh.
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["public", "delivery-pricing"] });
      toast.success("Settings saved", { description: "Changes are live on your site." });
    },
    onError: (e: Error) => {
      console.error("[settings] save failed", e);
      toast.error("Couldn't save settings", { description: e?.message ?? "Please try again." });
    },
  });
}

function useDirtyState<T>(initial: T) {
  const [value, setValue] = React.useState<T>(initial);
  const initialJson = React.useMemo(() => JSON.stringify(initial ?? {}), [initial]);
  const baselineRef = React.useRef<string>(initialJson);
  // Re-baseline (and re-hydrate the form) whenever the server data changes
  // AND the user has no unsaved edits. Keeps every tab in sync after a
  // successful save + refetch, without clobbering in-progress edits.
  React.useEffect(() => {
    if (JSON.stringify(value ?? {}) === baselineRef.current) {
      baselineRef.current = initialJson;
      try {
        setValue(JSON.parse(initialJson) as T);
      } catch {
        setValue(initial);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJson]);
  const dirty = React.useMemo(
    () => JSON.stringify(value ?? {}) !== baselineRef.current,
    [value],
  );
  const reset = React.useCallback(() => {
    try {
      setValue(JSON.parse(baselineRef.current));
    } catch {
      setValue(initial);
    }
  }, [initial]);
  const commit = React.useCallback((next: T) => {
    baselineRef.current = JSON.stringify(next ?? {});
    setValue(next);
  }, []);
  return { value, setValue, dirty, reset, commit };
}

// -----------------------------
// Section chrome
// -----------------------------

function SectionCard({
  title,
  description,
  children,
  icon: Icon,
  headerRight,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  headerRight?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-base font-bold leading-tight sm:text-lg">{title}</div>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {headerRight}
      </div>
      <CardContent className="space-y-5 p-5 sm:p-6">{children}</CardContent>
    </Card>
  );
}

function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  destructive,
  saveLabel = "Save changes",
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  destructive?: boolean;
  saveLabel?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-3 z-10 mt-6 flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-lg transition-all",
        dirty
          ? "border-primary/40 bg-background/95 backdrop-blur"
          : "border-border/60 bg-muted/40",
      )}
      role="region"
      aria-label="Save changes"
    >
      <div className="flex min-w-0 items-center gap-2 pl-1 text-xs font-medium">
        {dirty ? (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
            <span className="truncate text-foreground">Unsaved changes</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="truncate text-muted-foreground">All changes saved</span>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={!dirty || saving}
          className="h-9"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Discard
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (saving) return;
            try {
              onSave();
            } catch (err) {
              console.error("[settings] onSave threw", err);
              toast.error("Couldn't save settings", {
                description: (err as Error)?.message ?? "Please try again.",
              });
            }
          }}
          disabled={!dirty || saving}
          variant={destructive ? "destructive" : "default"}
          className="h-9 min-w-[130px]"
        >
          {saving ? (
            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…</>
          ) : (
            <><Save className="mr-1.5 h-3.5 w-3.5" /> {saveLabel}</>
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  error,
  required,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// Validation helpers
const isEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isUrl = (v: string) => !v || /^https?:\/\/[^\s]+$/i.test(v);

// -----------------------------
// Restaurant Info
// -----------------------------

const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR", "INR"];
const TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Europe/London",
  "America/New_York",
  "UTC",
];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
  { value: "ar", label: "Arabic" },
];

function InfoSection({ initial }: { initial: Settings }) {
  const state = useDirtyState<Obj>(initial.restaurant_info ?? {});
  const { value: form, setValue: setForm, dirty, reset, commit } = state;
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const errors = {
    website: !isUrl(s(form.website)) ? "Must start with http:// or https://" : null,
    support_email: !isEmail(s(form.support_email)) ? "Invalid email address" : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const onSave = () =>
    save.mutate(
      { restaurant_info: form },
      { onSuccess: (d) => commit(((d as Settings)?.restaurant_info) ?? form) },
    );

  return (
    <>
      <SectionCard
        title="Restaurant Information"
        description="Public-facing details about your restaurant."
        icon={Building2}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Restaurant Name" required>
            <Input
              value={s(form.name)}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Daddy Zingers"
              className="h-10"
            />
          </Field>
          <Field label="Website" hint="Public URL" error={errors.website}>
            <Input
              inputMode="url"
              placeholder="https://…"
              value={s(form.website)}
              onChange={(e) => setField("website", e.target.value)}
              className="h-10"
            />
          </Field>
          <Field label="Support Email" error={errors.support_email}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={s(form.support_email)}
              onChange={(e) => setField("support_email", e.target.value)}
              className="h-10"
            />
          </Field>
          <Field label="Support Phone">
            <Input
              inputMode="tel"
              autoComplete="tel"
              value={s(form.support_phone)}
              onChange={(e) => setField("support_phone", e.target.value)}
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label="WhatsApp Number">
            <Input
              inputMode="tel"
              value={s(form.whatsapp)}
              onChange={(e) => setField("whatsapp", e.target.value)}
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label="Currency">
            <Select
              value={s(form.currency, "PKR")}
              onValueChange={(v) => setField("currency", v)}
            >
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Timezone">
            <Select
              value={s(form.timezone, "Asia/Karachi")}
              onValueChange={(v) => setField("timezone", v)}
            >
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Default Language">
            <Select
              value={s(form.language, "en")}
              onValueChange={(v) => setField("language", v)}
            >
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field
          label="Short Description"
          hint={`${s(form.short_description).length}/160 characters — shown under the restaurant name.`}
        >
          <Input
            value={s(form.short_description)}
            onChange={(e) => setField("short_description", e.target.value)}
            maxLength={160}
            className="h-10"
          />
        </Field>

        <Field label="Long Description" hint="Used on the About page and SEO fallback.">
          <Textarea
            rows={5}
            value={s(form.long_description)}
            onChange={(e) => setField("long_description", e.target.value)}
            className="resize-none"
          />
        </Field>
      </SectionCard>

      <SaveBar
        dirty={dirty && !hasErrors}
        saving={save.isPending}
        onSave={onSave}
        onDiscard={reset}
      />
    </>
  );
}

// -----------------------------
// Hours
// -----------------------------

function HoursSection({ initial }: { initial: Settings }) {
  const { value: hours, setValue: setHours, dirty, reset, commit } = useDirtyState<Obj>(
    initial.business_hours ?? {},
  );
  const save = useSaveSettings();

  const setDay = (day: string, patch: Obj) => {
    setHours((h) => ({ ...h, [day]: { ...((h[day] as Obj) ?? {}), ...patch } }));
  };

  const copyToAll = () => {
    const monday = (hours.monday as Obj) ?? { open: "11:00", close: "23:00", closed: false };
    const next: Obj = { ...hours };
    DAYS.forEach((d) => (next[d.key] = { ...monday }));
    setHours(next);
    toast.info("Monday hours copied to every day");
  };

  const onSave = () =>
    save.mutate(
      { business_hours: hours },
      { onSuccess: (d) => commit(((d as Settings)?.business_hours) ?? hours) },
    );

  return (
    <>
      <SectionCard
        title="Business Hours"
        description="Default weekly schedule. Individual branches can override these."
        icon={Clock}
        headerRight={
          <Button variant="outline" size="sm" onClick={copyToAll}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Monday to all
          </Button>
        }
      >
        <div className="grid gap-2.5">
          {DAYS.map((d) => {
            const day = (hours[d.key] as Obj) ?? {};
            const closed = b(day.closed);
            return (
              <div
                key={d.key}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 transition-colors sm:grid-cols-[130px,1fr,1fr,110px] sm:p-4",
                  closed ? "border-border/50 bg-muted/20" : "border-border/70 bg-card",
                )}
              >
                <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                  <span className="font-semibold">
                    <span className="sm:hidden">{d.short}</span>
                    <span className="hidden sm:inline">{d.label}</span>
                  </span>
                  {closed && <Badge variant="outline" className="text-[10px]">Closed</Badge>}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Open
                  </Label>
                  <Input
                    type="time"
                    value={s(day.open, "11:00")}
                    onChange={(e) => setDay(d.key, { open: e.target.value })}
                    disabled={closed}
                    className="h-9 tabular-nums"
                    aria-label={`${d.label} opening time`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Close
                  </Label>
                  <Input
                    type="time"
                    value={s(day.close, "23:00")}
                    onChange={(e) => setDay(d.key, { close: e.target.value })}
                    disabled={closed}
                    className="h-9 tabular-nums"
                    aria-label={`${d.label} closing time`}
                  />
                </div>
                <label className="col-span-2 flex items-center justify-end gap-2 text-xs font-medium sm:col-span-1 sm:justify-start">
                  <Switch
                    checked={closed}
                    onCheckedChange={(v) => setDay(d.key, { closed: v })}
                    aria-label={`Mark ${d.label} as closed`}
                  />
                  <span className="text-muted-foreground">Closed</span>
                </label>
              </div>
            );
          })}
        </div>

        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Temporary Closure Message"
            hint="Shown when the store is temporarily closed."
          >
            <Input
              value={s(hours.temp_closure_message)}
              onChange={(e) =>
                setHours((h) => ({ ...h, temp_closure_message: e.target.value }))
              }
              placeholder="e.g. Closed for maintenance until 3pm"
              className="h-10"
            />
          </Field>
          <Field label="Holiday Notice" hint="Optional banner text for public holidays.">
            <Input
              value={s(hours.holiday_notice)}
              onChange={(e) => setHours((h) => ({ ...h, holiday_notice: e.target.value }))}
              placeholder="e.g. Closed on Eid"
              className="h-10"
            />
          </Field>
        </div>
      </SectionCard>

      <SaveBar dirty={dirty} saving={save.isPending} onSave={onSave} onDiscard={reset} />
    </>
  );
}

// -----------------------------
// Delivery
// -----------------------------

function DeliverySection({ initial }: { initial: Settings }) {
  const { value: form, setValue: setForm, dirty, reset, commit } = useDirtyState<Obj>(
    initial.delivery_settings ?? {},
  );
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const currency = s((initial.restaurant_info as Obj)?.currency, "PKR");

  const onSave = () =>
    save.mutate(
      { delivery_settings: form },
      { onSuccess: (d) => commit(((d as Settings)?.delivery_settings) ?? form) },
    );

  return (
    <>
      <SectionCard
        title="Delivery Settings"
        description="Global delivery configuration. Per-branch delivery charges override the default fee below."
        icon={Truck}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Enable Delivery</div>
              <div className="text-xs text-muted-foreground">Customers can choose delivery at checkout.</div>
            </div>
            <Switch
              checked={b(form.delivery_enabled, true)}
              onCheckedChange={(v) => setField("delivery_enabled", v)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Enable Pickup</div>
              <div className="text-xs text-muted-foreground">Customers can choose pickup at checkout.</div>
            </div>
            <Switch
              checked={b(form.pickup_enabled, true)}
              onCheckedChange={(v) => setField("pickup_enabled", v)}
            />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={`Default Delivery Charge (${currency})`} hint="Used when a branch has no delivery_charges of its own.">
            <Input
              type="number"
              step="1"
              min={0}
              inputMode="decimal"
              value={n(form.default_fee)}
              onChange={(e) => setField("default_fee", parseFloat(e.target.value) || 0)}
              className="h-10 tabular-nums"
            />
          </Field>
          <Field
            label={`Free Delivery Threshold (${currency})`}
            hint="Order subtotal that unlocks free delivery. Set 0 to disable."
          >
            <Input
              type="number"
              step="1"
              min={0}
              inputMode="decimal"
              value={n(form.free_delivery_threshold)}
              onChange={(e) =>
                setField("free_delivery_threshold", parseFloat(e.target.value) || 0)
              }
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label={`Minimum Order Amount (${currency})`} hint="Set 0 to disable.">
            <Input
              type="number"
              step="1"
              min={0}
              inputMode="decimal"
              value={n(form.min_order)}
              onChange={(e) => setField("min_order", parseFloat(e.target.value) || 0)}
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label="Maximum Delivery Radius (km)">
            <Input
              type="number"
              step="0.1"
              min={0}
              inputMode="decimal"
              value={n(form.max_radius_km, 10)}
              onChange={(e) => setField("max_radius_km", parseFloat(e.target.value) || 0)}
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label="Estimated Delivery Time (minutes)">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={n(form.estimated_minutes, 45)}
              onChange={(e) =>
                setField("estimated_minutes", parseInt(e.target.value) || 0)
              }
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label="Estimated Pickup Time (minutes)">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={n(form.estimated_pickup_minutes, 15)}
              onChange={(e) =>
                setField("estimated_pickup_minutes", parseInt(e.target.value) || 0)
              }
              className="h-10 tabular-nums"
            />
          </Field>
        </div>
      </SectionCard>

      <SaveBar dirty={dirty} saving={save.isPending} onSave={onSave} onDiscard={reset} />
    </>
  );
}


// -----------------------------
// Tax
// -----------------------------

function TaxSection({ initial }: { initial: Settings }) {
  const { value: form, setValue: setForm, dirty, reset, commit } = useDirtyState<Obj>(
    initial.tax_settings ?? {},
  );
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = () =>
    save.mutate(
      { tax_settings: form },
      { onSuccess: (d) => commit(((d as Settings)?.tax_settings) ?? form) },
    );

  const totalRate =
    (b(form.gst_enabled) ? n(form.gst_rate) : 0) +
    (b(form.service_enabled) ? n(form.service_rate) : 0);

  return (
    <>
      <SectionCard
        title="Taxes &amp; Fees"
        description="GST, service charges and delivery tax applied at checkout."
        icon={Receipt}
        headerRight={
          <div className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">On subtotal:</span>{" "}
            <span className="font-bold tabular-nums">{totalRate.toFixed(2)}%</span>
          </div>
        }
      >
        <TaxRow
          label="GST"
          description="General Sales Tax on subtotal"
          enabled={b(form.gst_enabled)}
          rate={n(form.gst_rate)}
          onToggle={(v) => setField("gst_enabled", v)}
          onRate={(v) => setField("gst_rate", v)}
        />
        <TaxRow
          label="Service Charges"
          description="Service fee added to every order"
          enabled={b(form.service_enabled)}
          rate={n(form.service_rate)}
          onToggle={(v) => setField("service_enabled", v)}
          onRate={(v) => setField("service_rate", v)}
        />
        <TaxRow
          label="Delivery Tax"
          description="Tax on delivery fee only"
          enabled={b(form.delivery_tax_enabled)}
          rate={n(form.delivery_tax_rate)}
          onToggle={(v) => setField("delivery_tax_enabled", v)}
          onRate={(v) => setField("delivery_tax_rate", v)}
        />
      </SectionCard>

      <SaveBar dirty={dirty} saving={save.isPending} onSave={onSave} onDiscard={reset} />
    </>
  );
}

function TaxRow({
  label,
  description,
  enabled,
  rate,
  onToggle,
  onRate,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  rate: number;
  onToggle: (v: boolean) => void;
  onRate: (v: number) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center",
        enabled ? "border-primary/30 bg-primary/[0.03]" : "border-border/70 bg-muted/20",
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        <Switch checked={enabled} onCheckedChange={onToggle} aria-label={`Enable ${label}`} />
        <div className="min-w-0">
          <div className="font-semibold">{label}</div>
          <div className="text-xs text-muted-foreground">
            {enabled ? description ?? "Applied to orders" : "Disabled"}
          </div>
        </div>
      </div>
      <div className="w-full sm:w-44">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Rate (%)
        </Label>
        <div className="relative">
          <Input
            type="number"
            step="0.01"
            min={0}
            max={100}
            inputMode="decimal"
            value={rate}
            onChange={(e) => onRate(parseFloat(e.target.value) || 0)}
            disabled={!enabled}
            className="h-10 pr-8 tabular-nums"
            aria-label={`${label} rate`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            %
          </span>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// SEO
// -----------------------------

function SeoSection({ initial }: { initial: Settings }) {
  const { value: form, setValue: setForm, dirty, reset, commit } = useDirtyState<Obj>(
    initial.seo_settings ?? {},
  );
  const [uploading, setUploading] = React.useState<"og" | "favicon" | null>(null);
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const titleLen = s(form.meta_title).length;
  const descLen = s(form.meta_description).length;

  const onUpload = async (kind: "og" | "favicon", file: File) => {
    try {
      setUploading(kind);
      const { url } = await uploadBrandAsset(file, kind === "og" ? "og" : "favicon");
      setField(kind === "og" ? "og_image" : "favicon", url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(null);
    }
  };

  const onSave = () =>
    save.mutate(
      { seo_settings: form },
      { onSuccess: (d) => commit(((d as Settings)?.seo_settings) ?? form) },
    );

  return (
    <>
      <SectionCard
        title="SEO"
        description="Search engine metadata used across the customer website."
        icon={Search}
      >
        <Field
          label="Meta Title"
          hint={`${titleLen}/60 recommended`}
          error={titleLen > 60 ? "Title is too long for search results" : null}
        >
          <Input
            value={s(form.meta_title)}
            onChange={(e) => setField("meta_title", e.target.value)}
            maxLength={80}
            className="h-10"
          />
        </Field>
        <Field
          label="Meta Description"
          hint={`${descLen}/160 recommended`}
          error={descLen > 160 ? "Description is too long — search engines truncate at 160" : null}
        >
          <Textarea
            rows={3}
            value={s(form.meta_description)}
            onChange={(e) => setField("meta_description", e.target.value)}
            maxLength={200}
            className="resize-none"
          />
        </Field>
        <Field label="Keywords" hint="Comma-separated list.">
          <Input
            value={s(form.keywords)}
            onChange={(e) => setField("keywords", e.target.value)}
            className="h-10"
            placeholder="pizza, biryani, wings"
          />
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <AssetUpload
            label="OpenGraph Image"
            hint="1200×630 recommended — shown when shared on social."
            url={s(form.og_image)}
            uploading={uploading === "og"}
            onFile={(f) => onUpload("og", f)}
            onClear={() => setField("og_image", "")}
          />
          <AssetUpload
            label="Favicon"
            hint="ICO, PNG or SVG. 512×512 recommended."
            url={s(form.favicon)}
            uploading={uploading === "favicon"}
            onFile={(f) => onUpload("favicon", f)}
            onClear={() => setField("favicon", "")}
            aspect="square"
          />
        </div>
      </SectionCard>

      <SaveBar dirty={dirty} saving={save.isPending} onSave={onSave} onDiscard={reset} />
    </>
  );
}

// -----------------------------
// Social
// -----------------------------

function SocialSection({ initial }: { initial: Settings }) {
  const { value: form, setValue: setForm, dirty, reset, commit } = useDirtyState<Obj>(
    initial.social_media ?? {},
  );
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const nets = [
    { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
    { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
    { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/…" },
  ];

  const errors: Record<string, string | null> = {};
  nets.forEach((net) => {
    errors[net.key] = !isUrl(s(form[net.key])) ? "Must start with http:// or https://" : null;
  });
  const hasErrors = Object.values(errors).some(Boolean);

  const onSave = () =>
    save.mutate(
      { social_media: form },
      { onSuccess: (d) => commit(((d as Settings)?.social_media) ?? form) },
    );

  return (
    <>
      <SectionCard
        title="Social Media"
        description="Links displayed in the footer and around the customer site."
        icon={Share2}
      >
        <div className="grid gap-5 md:grid-cols-2">
          {nets.map((net) => (
            <Field key={net.key} label={net.label} error={errors[net.key]}>
              <Input
                inputMode="url"
                placeholder={net.placeholder}
                value={s(form[net.key])}
                onChange={(e) => setField(net.key, e.target.value)}
                className="h-10"
              />
            </Field>
          ))}
        </div>
      </SectionCard>

      <SaveBar
        dirty={dirty && !hasErrors}
        saving={save.isPending}
        onSave={onSave}
        onDiscard={reset}
      />
    </>
  );
}

// -----------------------------
// Contact
// -----------------------------

function ContactSection({ initial }: { initial: Settings }) {
  const { value: form, setValue: setForm, dirty, reset, commit } = useDirtyState<Obj>(
    initial.contact_info ?? {},
  );
  const save = useSaveSettings();
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const emailError = !isEmail(s(form.support_email)) ? "Invalid email address" : null;

  const onSave = () =>
    save.mutate(
      { contact_info: form },
      { onSuccess: (d) => commit(((d as Settings)?.contact_info) ?? form) },
    );

  return (
    <>
      <SectionCard
        title="Contact Information"
        description="Public support and emergency channels."
        icon={Contact}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Customer Care Number">
            <Input
              inputMode="tel"
              value={s(form.customer_care)}
              onChange={(e) => setField("customer_care", e.target.value)}
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label="Support Email" error={emailError}>
            <Input
              type="email"
              inputMode="email"
              value={s(form.support_email)}
              onChange={(e) => setField("support_email", e.target.value)}
              className="h-10"
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              inputMode="tel"
              value={s(form.whatsapp)}
              onChange={(e) => setField("whatsapp", e.target.value)}
              className="h-10 tabular-nums"
            />
          </Field>
          <Field label="Emergency Contact">
            <Input
              inputMode="tel"
              value={s(form.emergency)}
              onChange={(e) => setField("emergency", e.target.value)}
              className="h-10 tabular-nums"
            />
          </Field>
        </div>
      </SectionCard>

      <SaveBar
        dirty={dirty && !emailError}
        saving={save.isPending}
        onSave={onSave}
        onDiscard={reset}
      />
    </>
  );
}

// -----------------------------
// Brand assets
// -----------------------------

function BrandSection({ initial }: { initial: Settings }) {
  const { value: form, setValue: setForm, dirty, reset, commit } = useDirtyState<Obj>(
    initial.brand_assets ?? {},
  );
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
      toast.success("Asset uploaded");
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(null);
    }
  };

  const assets: Array<{
    field: string;
    label: string;
    hint?: string;
    kind: Parameters<typeof uploadBrandAsset>[1];
    aspect?: "square" | "wide";
  }> = [
    { field: "logo", label: "Primary Logo", kind: "logo", hint: "Used in the header." },
    { field: "logo_dark", label: "Dark Mode Logo", kind: "logo-dark", hint: "Optional." },
    { field: "favicon", label: "Favicon", kind: "favicon", hint: "512×512 recommended.", aspect: "square" },
    { field: "loading_logo", label: "Loading Logo", kind: "loading", hint: "Splash screen." },
    { field: "footer_logo", label: "Footer Logo", kind: "footer" },
  ];

  const onSave = () =>
    save.mutate(
      { brand_assets: form },
      { onSuccess: (d) => commit(((d as Settings)?.brand_assets) ?? form) },
    );

  return (
    <>
      <SectionCard
        title="Brand Assets"
        description="Upload logos and imagery used throughout the customer website."
        icon={Palette}
      >
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((a) => (
            <AssetUpload
              key={a.field}
              label={a.label}
              hint={a.hint}
              url={s(form[a.field])}
              uploading={uploading === a.field}
              onFile={(f) => upload(a.field, a.kind, f)}
              onClear={() => setField(a.field, "")}
              aspect={a.aspect}
            />
          ))}
        </div>
      </SectionCard>

      <SaveBar dirty={dirty} saving={save.isPending} onSave={onSave} onDiscard={reset} />
    </>
  );
}

function AssetUpload({
  label,
  hint,
  url,
  uploading,
  onFile,
  onClear,
  aspect = "wide",
}: {
  label: string;
  hint?: string;
  url: string;
  uploading: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  aspect?: "square" | "wide";
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={cn(
          "group relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          aspect === "square" ? "aspect-square" : "aspect-[3/2]",
          drag
            ? "border-primary bg-primary/10"
            : url
              ? "border-border/60 bg-muted/40"
              : "border-border/70 bg-muted/30 hover:border-primary/50",
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Uploading…</span>
          </div>
        ) : url ? (
          <>
            <img
              src={url}
              alt={label}
              loading="lazy"
              className="max-h-full max-w-full object-contain p-4"
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-2 rounded-full bg-background/95 p-1.5 text-destructive shadow-sm opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={`Remove ${label}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-3 text-center text-xs text-muted-foreground">
            <ImageIcon className="h-7 w-7 opacity-60" />
            <span className="font-medium">Drop image here</span>
            <span className="text-[10px] opacity-70">or click below to upload</span>
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
          className="h-9 flex-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {url ? "Replace" : "Upload"}
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
  const { value: form, setValue: setForm, dirty, reset, commit } = useDirtyState<Obj>(
    initial.maintenance_mode ?? {},
  );
  const save = useSaveSettings();
  const enabled = b(form.enabled);
  const wasEnabled = b(initial.maintenance_mode?.enabled);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const doSave = () =>
    save.mutate(
      { maintenance_mode: form },
      { onSuccess: (d) => commit(((d as Settings)?.maintenance_mode) ?? form) },
    );

  const onSave = () => {
    // Confirm when turning maintenance ON
    if (enabled && !wasEnabled) {
      setConfirmOpen(true);
      return;
    }
    doSave();
  };

  return (
    <>
      <SectionCard
        title="Maintenance Mode"
        description="Temporarily take the customer website offline for planned maintenance."
        icon={ShieldAlert}
        headerRight={
          enabled ? (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" /> Live
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="h-3 w-3" /> Site online
            </Badge>
          )
        }
      >
        {enabled && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Customers can't place orders right now.</div>
              <div className="text-xs opacity-80">Disable this toggle to restore normal service.</div>
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-4">
          <Switch
            checked={enabled}
            onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            aria-label="Enable maintenance mode"
          />
          <div className="min-w-0">
            <div className="font-semibold">Enable maintenance mode</div>
            <div className="text-xs text-muted-foreground">
              Customers see a maintenance page instead of the store.
            </div>
          </div>
        </label>

        <Field label="Custom Message" hint="Shown on the maintenance page.">
          <Textarea
            rows={4}
            value={s(form.message)}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="We'll be back shortly!"
            className="resize-none"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-4">
          <Switch
            checked={b(form.whitelist_admins, true)}
            onCheckedChange={(v) => setForm((f) => ({ ...f, whitelist_admins: v }))}
            aria-label="Whitelist admins"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold">Whitelist admin access</div>
            <div className="text-xs text-muted-foreground">
              Admins can still browse the site while maintenance is active.
            </div>
          </div>
        </label>
      </SectionCard>

      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        onSave={onSave}
        onDiscard={reset}
        destructive={enabled && !wasEnabled}
        saveLabel={enabled && !wasEnabled ? "Enable maintenance" : "Save changes"}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Take the site offline?</AlertDialogTitle>
            <AlertDialogDescription>
              Customers will see the maintenance page and won't be able to place orders until
              you turn this off. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                doSave();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Enable maintenance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
