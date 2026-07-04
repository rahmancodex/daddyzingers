import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  React.useEffect(() => {
    if (open) setForm(normalize(initial));
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: (v: Parameters<typeof adminUpsertCoupon>[0]["data"]) =>
      upsert({ data: v }),
    onSuccess: () => {
      toast.success(initial?.id ? "Coupon updated" : "Coupon created");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) return toast.error("Code is required");
    if (!form.label.trim()) return toast.error("Label is required");
    if (form.discount_type === "percent" && !form.percent)
      return toast.error("Enter a percentage");
    if (form.discount_type === "flat" && !form.flat_pkr)
      return toast.error("Enter a flat discount");

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/70 px-6 py-4">
          <SheetTitle className="font-display text-xl font-black">
            {initial?.id ? "Edit coupon" : "New coupon"}
          </SheetTitle>
          <SheetDescription>
            Configure discount rules and validity window.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 p-6">
            <div className="col-span-2 flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-3">
              <div>
                <div className="text-sm font-semibold">Active</div>
                <div className="text-xs text-muted-foreground">
                  Only active coupons can be applied at checkout
                </div>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>

            <Field label="Code" className="col-span-2">
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="SAVE20"
                className="h-11 rounded-xl font-mono uppercase"
              />
            </Field>

            <Field label="Label" className="col-span-2">
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="20% off your order"
                className="h-11 rounded-xl"
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

            <Field label="Discount type" className="col-span-2">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { v: "percent", label: "Percentage" },
                    { v: "flat", label: "Fixed" },
                    { v: "free_delivery", label: "Free delivery" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, discount_type: opt.v }))
                    }
                    className={
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors " +
                      (form.discount_type === opt.v
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30")
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            {form.discount_type === "percent" && (
              <Field label="Percent">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.percent}
                  onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </Field>
            )}
            {form.discount_type === "flat" && (
              <Field label="Flat discount (Rs)">
                <Input
                  type="number"
                  min={0}
                  value={form.flat_pkr}
                  onChange={(e) => setForm((f) => ({ ...f, flat_pkr: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </Field>
            )}
            <Field label="Max discount (Rs)">
              <Input
                type="number"
                min={0}
                value={form.max_discount_pkr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_discount_pkr: e.target.value }))
                }
                placeholder="Optional cap"
                className="h-11 rounded-xl"
              />
            </Field>

            <Field label="Min order (Rs)">
              <Input
                type="number"
                min={0}
                value={form.min_subtotal_pkr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, min_subtotal_pkr: e.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </Field>
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
            <Field label="Per-user limit" className="col-span-2">
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

            <Field label="Starts at">
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Expires at">
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </Field>
          </div>

          <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/70 bg-background px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
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

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
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
