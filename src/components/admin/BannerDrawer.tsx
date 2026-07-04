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
import { adminUpsertBanner } from "@/lib/admin-promos.functions";
import { BannerImageUploader } from "./BannerImageUploader";

export type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

export function BannerDrawer({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: BannerRow | null;
  onSaved: () => void;
}) {
  const upsert = useServerFn(adminUpsertBanner);
  const [form, setForm] = React.useState(() => normalize(initial));

  React.useEffect(() => {
    if (open) setForm(normalize(initial));
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: (v: Record<string, unknown>) => upsert({ data: v as never }),
    onSuccess: () => {
      toast.success(initial?.id ? "Banner updated" : "Banner created");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    mut.mutate({
      id: initial?.id,
      title: form.title,
      subtitle: form.subtitle || null,
      cta_text: form.cta_text || null,
      cta_link: form.cta_link || null,
      desktop_image_url: form.desktop_image_url || null,
      mobile_image_url: form.mobile_image_url || null,
      sort_order: Number(form.sort_order) || 0,
      starts_at: fromDatetimeLocal(form.starts_at),
      ends_at: fromDatetimeLocal(form.ends_at),
      is_active: form.is_active,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/70 px-6 py-4">
          <SheetTitle className="font-display text-xl font-black">
            {initial?.id ? "Edit banner" : "New banner"}
          </SheetTitle>
          <SheetDescription>Promotional banner shown on the homepage.</SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 p-6">
            <div className="col-span-2 flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-3">
              <div>
                <div className="text-sm font-semibold">Active</div>
                <div className="text-xs text-muted-foreground">
                  Inactive banners are hidden from the homepage
                </div>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>

            <Field label="Title" className="col-span-2">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Fresh & Crispy"
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Subtitle / badge" className="col-span-2">
              <Textarea
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                placeholder="Buy 1 Get 1 Free · This weekend only"
                className="min-h-[70px] rounded-xl"
              />
            </Field>

            <Field label="CTA text">
              <Input
                value={form.cta_text}
                onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))}
                placeholder="Order now"
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="CTA link">
              <Input
                value={form.cta_link}
                onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))}
                placeholder="/menu"
                className="h-11 rounded-xl"
              />
            </Field>

            <Field label="Display priority (lower = first)" className="col-span-2">
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
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
            <Field label="Ends at">
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </Field>

            <div className="col-span-2">
              <BannerImageUploader
                label="Desktop image (21:9)"
                prefix="desktop"
                value={form.desktop_image_url}
                onChange={(url) => setForm((f) => ({ ...f, desktop_image_url: url ?? "" }))}
              />
            </div>
            <div className="col-span-2">
              <BannerImageUploader
                label="Mobile image (9:16)"
                prefix="mobile"
                aspect="tall"
                value={form.mobile_image_url}
                onChange={(url) => setForm((f) => ({ ...f, mobile_image_url: url ?? "" }))}
              />
            </div>
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
              {initial?.id ? "Save changes" : "Create banner"}
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

function normalize(r: BannerRow | null) {
  return {
    title: r?.title ?? "",
    subtitle: r?.subtitle ?? "",
    cta_text: r?.cta_text ?? "",
    cta_link: r?.cta_link ?? "",
    desktop_image_url: r?.desktop_image_url ?? "",
    mobile_image_url: r?.mobile_image_url ?? "",
    sort_order: r?.sort_order != null ? String(r.sort_order) : "0",
    starts_at: toDatetimeLocal(r?.starts_at ?? null),
    ends_at: toDatetimeLocal(r?.ends_at ?? null),
    is_active: r?.is_active ?? true,
  };
}
