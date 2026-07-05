import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Briefcase,
  Home as HomeIcon,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, SkeletonBlock } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/addresses")({
  head: () => ({ meta: [{ title: "Addresses — Daddy Zinger" }] }),
  component: AddressesPage,
});

type Address = {
  id: string;
  label: string;
  recipient_name: string | null;
  phone: string | null;
  address_line: string;
  city: string;
  area: string | null;
  notes: string | null;
  is_default: boolean;
};

const schema = z.object({
  label: z.string().trim().min(1, "Label required").max(40),
  recipient_name: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  address_line: z.string().trim().min(4, "Enter street/house").max(200),
  city: z.string().trim().min(2, "Enter city").max(60),
  area: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

function iconForLabel(label: string) {
  const l = label.toLowerCase();
  if (l.includes("home")) return HomeIcon;
  if (l.includes("office") || l.includes("work")) return Briefcase;
  return MapPin;
}

function AddressesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Address | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rows = null } = useQuery<Address[]>({
    queryKey: ["customer-addresses", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      return (data as Address[]) ?? [];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["customer-addresses", user?.id] });
    // The overview card shows the address count.
    qc.invalidateQueries({ queryKey: ["customer-overview", user?.id] });
  };


  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Address book"
        subtitle="Send orders to the right door, every time."
        action={
          <Button
            className="h-11 px-5 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] font-semibold"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add address
          </Button>
        }
      />

      {rows === null ? (
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No addresses yet"
          body="Add your home or office so checkout takes seconds."
          cta={{ label: "Add address", to: "/dashboard/addresses" }}
        />
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {rows.map((a, i) => {
            const Icon = iconForLabel(a.label);
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-5 md:p-6 transition-all hover:shadow-[var(--shadow-2)]",
                  a.is_default
                    ? "border-primary/40 bg-gradient-to-br from-primary/10 to-transparent"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "h-11 w-11 rounded-xl grid place-items-center shrink-0",
                      a.is_default
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{a.label}</span>
                      {a.is_default && (
                        <Badge className="bg-primary/15 text-primary border-primary/30">
                          <Star className="h-3 w-3" /> Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-foreground/85 mt-1.5">
                      {a.address_line}
                      {a.area ? `, ${a.area}` : ""}, {a.city}
                    </div>
                    {a.recipient_name && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {a.recipient_name}
                        {a.phone ? ` · ${a.phone}` : ""}
                      </div>
                    )}
                    {a.notes && (
                      <div className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
                        "{a.notes}"
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-border/60">
                  {!a.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!user) return;
                        await supabase
                          .from("user_addresses")
                          .update({ is_default: false })
                          .eq("user_id", user.id);
                        const { error } = await supabase
                          .from("user_addresses")
                          .update({ is_default: true })
                          .eq("id", a.id);
                        if (error) return toast.error(error.message);
                        toast.success("Default address updated");
                        load();
                      }}
                    >
                      <Star className="h-3.5 w-3.5" /> Set default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(a);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("user_addresses")
                        .delete()
                        .eq("id", a.id);
                      if (error) return toast.error(error.message);
                      toast.success("Address deleted");
                      load();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </motion.li>
            );
          })}

          {/* Add address tile */}
          <li>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="w-full h-full min-h-[188px] rounded-2xl border border-dashed border-border hover:border-primary/50 bg-card/40 hover:bg-primary/5 p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <Plus className="h-5 w-5" />
              </div>
              <div className="font-semibold text-sm text-foreground">Add a new address</div>
              <div className="text-xs">Home, office or anywhere you'd like your Zinger.</div>
            </button>
          </li>
        </ul>
      )}

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}

function AddressDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Address | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    label: "Home",
    recipient_name: "",
    phone: "",
    address_line: "",
    city: "",
    area: "",
    notes: "",
    is_default: false,
  });

  useEffect(() => {
    if (editing) {
      setForm({
        label: editing.label,
        recipient_name: editing.recipient_name ?? "",
        phone: editing.phone ?? "",
        address_line: editing.address_line,
        city: editing.city,
        area: editing.area ?? "",
        notes: editing.notes ?? "",
        is_default: editing.is_default,
      });
    } else {
      setForm({
        label: "Home",
        recipient_name: "",
        phone: "",
        address_line: "",
        city: "",
        area: "",
        notes: "",
        is_default: false,
      });
    }
  }, [editing, open]);

  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editing ? "Edit address" : "New address"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return;
            const parsed = schema.safeParse(form);
            if (!parsed.success) return toast.error(parsed.error.issues[0].message);
            setSubmitting(true);
            const payload = {
              ...parsed.data,
              recipient_name: parsed.data.recipient_name || null,
              phone: parsed.data.phone || null,
              area: parsed.data.area || null,
              notes: parsed.data.notes || null,
              is_default: form.is_default,
            };
            if (editing) {
              const { error } = await supabase
                .from("user_addresses")
                .update(payload)
                .eq("id", editing.id);
              setSubmitting(false);
              if (error) return toast.error(error.message);
              toast.success("Address updated");
            } else {
              const { error } = await supabase
                .from("user_addresses")
                .insert({ ...payload, user_id: user.id });
              setSubmitting(false);
              if (error) return toast.error(error.message);
              toast.success("Address added");
            }
            onSaved();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" value={form.label} onChange={(v) => setForm({ ...form, label: v })} placeholder="Home" />
            <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Karachi" />
          </div>
          <Field label="Address line" value={form.address_line} onChange={(v) => setForm({ ...form, address_line: v })} placeholder="House 12, Street 4" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area" value={form.area} onChange={(v) => setForm({ ...form, area: v })} placeholder="DHA Phase 6" />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="03xx xxxxxxx" />
          </div>
          <Field label="Recipient name" value={form.recipient_name} onChange={(v) => setForm({ ...form, recipient_name: v })} placeholder="Ali Raza" />
          <div className="space-y-1">
            <Label>Delivery notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ring the bell twice, dog on the porch."
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              checked={form.is_default}
              onCheckedChange={(v) => setForm({ ...form, is_default: v === true })}
            />
            Make this my default address
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Add address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
