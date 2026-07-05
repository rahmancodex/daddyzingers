import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgePercent, Loader2, Ticket, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminUpsertCoupon } from "@/lib/admin-promos.functions";

export type CouponRow = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  discount_type: "percent" | "flat" | "free_delivery";
  percent: number | null;
  flat_pkr: number | null;
  max_discount_pkr: number | null;
  min_subtotal_pkr: number;
  usage_limit: number | null;
  per_user_limit: number;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CouponRow | null;
  onSaved: () => void;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

export function CouponDrawer({ open, onOpenChange, initial, onSaved }: Props) {
  const upsert = useServerFn(adminUpsertCoupon);

  const [form, setForm] = React.useState(() => normalize(initial));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (open) {
      setForm(normalize(initial));
      setErrors({});
    }
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: (v: Record<string, unknown>) => upsert({ data: v as never }),
    onSuccess: () => {
      toast.success(initial?.id ? "Coupon updated" : "Coupon created");
      onSaved();
    },
    onError: (e) =>
      toast.error(
        e instanceof Error && e.message ? e.message : "Failed to save coupon",
      ),
  });

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.code.trim()) errs.code = "Code is required";
    if (!form.label.trim()) errs.label = "Label is required";
    if (form.discount_type === "percent") {
      const n = Number(form.percent);
      if (!form.percent || Number.isNaN(n)) errs.percent = "Enter a percentage";
      else if (n <= 0 || n > 100) errs.percent = "Between 1 and 100";
    }
    if (form.discount_type === "flat") {
      const n = Number(form.flat_pkr);
      if (!form.flat_pkr || Number.isNaN(n) || n <= 0)
        errs.flat_pkr = "Enter a flat discount";
    }
    if (
      form.starts_at &&
      form.expires_at &&
      new Date(form.starts_at) >= new Date(form.expires_at)
    ) {
      errs.expires_at = "Must be after start date";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    mut.mutate({
      id: initial?.id,
      code: form.code,
      label: form.label,
      description: form.description || null,
      discount_type: form.discount_type,
      percent: form.percent ? Number(form.percent) : null,
      flat_pkr: form.flat_pkr ? Number(form.flat_pkr) : null,
      max_discount_pkr: form.max_discount_pkr ? Number(form.max_discount_pkr) : null,
      min_subtotal_pkr: form.min_subtotal_pkr ? Number(form.min_subtotal_pkr) : 0,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : 1,
      starts_at: fromDatetimeLocal(form.starts_at),
      expires_at: fromDatetimeLocal(form.expires_at),
      is_active: form.is_active,
    });
  }

  const previewValue =
    form.discount_type === "percent"
      ? `${form.percent || 0}% off`
      : form.discount_type === "flat"
        ? `Rs ${Number(form.flat_pkr || 0).toLocaleString("en-PK")} off`
        : "Free delivery";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/70 px-6 py-4">
          <SheetTitle className="font-display text-xl font-black">
            {initial?.id ? "Edit coupon" : "New coupon"}
          </SheetTitle>
          <SheetDescription>
            Configure discount rules, validity and usage limits.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Live preview */}
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/40 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Ticket className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-mono text-sm font-black">
                  {form.code || "COUPON"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {previewValue}
                  {form.min_subtotal_pkr &&
                    Number(form.min_subtotal_pkr) > 0 &&
                    ` · min Rs ${Number(form.min_subtotal_pkr).toLocaleString("en-PK")}`}
                </div>
              </div>
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  form.is_active
                    ? "bg-success/15 text-success-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {form.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Basic Information */}
            <Section title="Basic Information" description="Code and customer-facing text.">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code" className="col-span-2" error={errors.code}>
                  <Input
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                    }
                    placeholder="SAVE20"
                    className="h-11 rounded-xl font-mono uppercase"
                    aria-invalid={!!errors.code}
                    autoFocus
                  />
                </Field>
                <Field label="Label" className="col-span-2" error={errors.label}>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="20% off your order"
                    className="h-11 rounded-xl"
                    aria-invalid={!!errors.label}
                  />
                </Field>
                <Field label="Description" className="col-span-2">
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Optional details shown to customers"
                    className="min-h-[70px] rounded-xl"
                  />
                </Field>
              </div>
            </Section>

            {/* Discount */}
            <Section title="Discount" description="Type and value of the discount.">
              <Field label="Discount type" className="mb-3">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: "percent", label: "Percentage", Icon: BadgePercent },
                      { v: "flat", label: "Fixed", Icon: Wallet },
                      { v: "free_delivery", label: "Free delivery", Icon: Truck },
                    ] as const
                  ).map((opt) => {
                    const active = form.discount_type === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, discount_type: opt.v }))}
                        aria-pressed={active}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                        )}
                      >
                        <opt.Icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                {form.discount_type === "percent" && (
                  <Field label="Percent" error={errors.percent}>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={form.percent}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, percent: e.target.value }))
                        }
                        className="h-11 rounded-xl pr-8"
                        aria-invalid={!!errors.percent}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        %
                      </span>
                    </div>
                  </Field>
                )}
                {form.discount_type === "flat" && (
                  <Field label="Flat discount" error={errors.flat_pkr}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        Rs
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={form.flat_pkr}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, flat_pkr: e.target.value }))
                        }
                        className="h-11 rounded-xl pl-9"
                        aria-invalid={!!errors.flat_pkr}
                      />
                    </div>
                  </Field>
                )}
                <Field label="Max discount">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      Rs
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_discount_pkr}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, max_discount_pkr: e.target.value }))
                      }
                      placeholder="Optional cap"
                      className="h-11 rounded-xl pl-9"
                    />
                  </div>
                </Field>
              </div>
            </Section>

            {/* Validity */}
            <Section title="Validity" description="When the coupon can be redeemed.">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts at">
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, starts_at: e.target.value }))
                    }
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field label="Expires at" error={errors.expires_at}>
                  <Input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expires_at: e.target.value }))
                    }
                    className="h-11 rounded-xl"
                    aria-invalid={!!errors.expires_at}
                  />
                </Field>
              </div>
            </Section>

            {/* Usage limits */}
            <Section title="Usage Limits" description="Cap total and per-user redemptions.">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Global usage limit">
                  <Input
                    type="number"
                    min={0}
                    value={form.usage_limit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, usage_limit: e.target.value }))
                    }
                    placeholder="Unlimited"
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field label="Per-user limit">
                  <Input
                    type="number"
                    min={1}
                    value={form.per_user_limit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, per_user_limit: e.target.value }))
                    }
                    className="h-11 rounded-xl"
                  />
                </Field>
              </div>
            </Section>

            {/* Restrictions */}
            <Section title="Restrictions" description="Minimum spend rules.">
              <Field label="Min order">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Rs
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={form.min_subtotal_pkr}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, min_subtotal_pkr: e.target.value }))
                    }
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
              </Field>
            </Section>

            {/* Visibility */}
            <Section title="Visibility" description="Only active coupons can be redeemed.">
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-3">
                <div>
                  <div className="text-sm font-semibold">Active</div>
                  <div className="text-xs text-muted-foreground">
                    Turn off to pause without deleting.
                  </div>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  aria-label="Coupon active"
                />
              </div>
            </Section>
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border/70 bg-background/95 px-6 py-3 backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={mut.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending} className="rounded-xl">
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial?.id ? "Save changes" : "Create coupon"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 last:mb-0">
      <div className="mb-2.5">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground/80">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  className,
  error,
  children,
}: {
  label: string;
  className?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
      {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  );
}

function normalize(row: CouponRow | null) {
  return {
    code: row?.code ?? "",
    label: row?.label ?? "",
    description: row?.description ?? "",
    discount_type: (row?.discount_type ?? "percent") as CouponRow["discount_type"],
    percent: row?.percent != null ? String(row.percent) : "",
    flat_pkr: row?.flat_pkr != null ? String(row.flat_pkr) : "",
    max_discount_pkr: row?.max_discount_pkr != null ? String(row.max_discount_pkr) : "",
    min_subtotal_pkr: row?.min_subtotal_pkr != null ? String(row.min_subtotal_pkr) : "0",
    usage_limit: row?.usage_limit != null ? String(row.usage_limit) : "",
    per_user_limit: row?.per_user_limit != null ? String(row.per_user_limit) : "1",
    starts_at: toDatetimeLocal(row?.starts_at ?? null),
    expires_at: toDatetimeLocal(row?.expires_at ?? null),
    is_active: row?.is_active ?? true,
  };
}
