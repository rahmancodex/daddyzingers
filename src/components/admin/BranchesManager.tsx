import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Building2,
  ExternalLink,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Power,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import {
  adminCreateBranch,
  adminDeleteBranch,
  adminListBranches,
  adminUpdateBranch,
} from "@/lib/admin-settings.functions";

type Branch = Awaited<ReturnType<typeof adminListBranches>>[number];

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
] as const;

export function BranchesManager() {
  const listFn = useServerFn(adminListBranches);
  const updateFn = useServerFn(adminUpdateBranch);
  const deleteFn = useServerFn(adminDeleteBranch);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Branch | null>(null);
  const [deleting, setDeleting] = React.useState<Branch | null>(null);

  const toggleActive = useMutation({
    mutationFn: (b: Branch) => updateFn({ data: { id: b.id, is_active: !b.is_active } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "branches"] });
      toast.success("Branch updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doDelete = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "branches"] });
      toast.success("Branch deleted");
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Branches</h2>
          <p className="text-sm text-muted-foreground">
            Manage restaurant locations, hours, and delivery availability.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> New Branch
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Failed to load: {(error as Error).message}
          </CardContent>
        </Card>
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold">No branches yet</div>
              <div className="text-sm text-muted-foreground">
                Add your first branch to start accepting orders.
              </div>
            </div>
            <Button onClick={openNew} size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Branch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onEdit={() => openEdit(branch)}
              onToggle={() => toggleActive.mutate(branch)}
              onDelete={() => setDeleting(branch)}
            />
          ))}
        </div>
      )}

      <BranchDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        branch={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin", "branches"] });
          setDrawerOpen(false);
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete branch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &ldquo;{deleting?.name}&rdquo;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && doDelete.mutate(deleting.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BranchCard({
  branch,
  onEdit,
  onToggle,
  onDelete,
}: {
  branch: Branch;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="rounded-2xl border-border/70 transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-lg font-bold">{branch.name}</h3>
              {branch.is_active ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </div>
            {branch.city && (
              <div className="mt-0.5 text-xs text-muted-foreground">{branch.city}</div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggle}>
                <Power className="h-4 w-4" />
                {branch.is_active ? "Disable" : "Enable"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm">
          {branch.address && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="line-clamp-2">{branch.address}</span>
            </div>
          )}
          {branch.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              {branch.phone}
            </div>
          )}
          {branch.manager_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 shrink-0" />
              {branch.manager_name}
            </div>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Radius" value={`${branch.delivery_radius_km ?? 0} km`} />
          <Stat label="ETA" value={`${branch.estimated_delivery_minutes ?? 0}m`} />
          <Stat label="Min Order" value={`${branch.minimum_order ?? 0}`} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {branch.delivery_available && (
            <Badge variant="outline" className="text-[10px]">Delivery</Badge>
          )}
          {branch.pickup_available && (
            <Badge variant="outline" className="text-[10px]">Pickup</Badge>
          )}
          {branch.google_maps_link && (
            <a
              href={branch.google_maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent"
            >
              Map <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold">{value}</div>
    </div>
  );
}

// -----------------------------
// Drawer
// -----------------------------

type BranchForm = {
  name: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  google_maps_link: string;
  phone: string;
  email: string;
  manager_name: string;
  is_active: boolean;
  opening_hours: Record<string, { open?: string; close?: string; closed?: boolean }>;
  delivery_radius_km: string;
  estimated_delivery_minutes: string;
  minimum_order: string;
  delivery_charges: string;
  pickup_available: boolean;
  delivery_available: boolean;
};

function toForm(b: Branch | null): BranchForm {
  return {
    name: b?.name ?? "",
    address: b?.address ?? "",
    city: b?.city ?? "",
    latitude: b?.latitude != null ? String(b.latitude) : "",
    longitude: b?.longitude != null ? String(b.longitude) : "",
    google_maps_link: b?.google_maps_link ?? "",
    phone: b?.phone ?? "",
    email: b?.email ?? "",
    manager_name: b?.manager_name ?? "",
    is_active: b?.is_active ?? true,
    opening_hours: (b?.opening_hours as BranchForm["opening_hours"]) ?? {},
    delivery_radius_km: b?.delivery_radius_km != null ? String(b.delivery_radius_km) : "5",
    estimated_delivery_minutes:
      b?.estimated_delivery_minutes != null ? String(b.estimated_delivery_minutes) : "45",
    minimum_order: b?.minimum_order != null ? String(b.minimum_order) : "0",
    delivery_charges: b?.delivery_charges != null ? String(b.delivery_charges) : "0",
    pickup_available: b?.pickup_available ?? true,
    delivery_available: b?.delivery_available ?? true,
  };
}

function BranchDrawer({
  open,
  onOpenChange,
  branch,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branch: Branch | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<BranchForm>(toForm(branch));
  const createFn = useServerFn(adminCreateBranch);
  const updateFn = useServerFn(adminUpdateBranch);

  React.useEffect(() => {
    if (open) setForm(toForm(branch));
  }, [open, branch]);

  const setField = <K extends keyof BranchForm>(k: K, v: BranchForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setHour = (day: string, patch: Partial<BranchForm["opening_hours"][string]>) =>
    setForm((f) => ({
      ...f,
      opening_hours: { ...f.opening_hours, [day]: { ...(f.opening_hours[day] ?? {}), ...patch } },
    }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        google_maps_link: form.google_maps_link.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        manager_name: form.manager_name.trim() || null,
        is_active: form.is_active,
        opening_hours: form.opening_hours,
        delivery_radius_km: form.delivery_radius_km ? parseFloat(form.delivery_radius_km) : null,
        estimated_delivery_minutes: form.estimated_delivery_minutes
          ? parseInt(form.estimated_delivery_minutes)
          : null,
        minimum_order: form.minimum_order ? parseFloat(form.minimum_order) : null,
        delivery_charges: form.delivery_charges ? parseFloat(form.delivery_charges) : null,
        pickup_available: form.pickup_available,
        delivery_available: form.delivery_available,
      };
      if (branch) {
        return updateFn({ data: { id: branch.id, ...payload } as never });
      }
      return createFn({ data: payload as never });
    },
    onSuccess: () => {
      toast.success(branch ? "Branch updated" : "Branch created");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/70 px-6 py-4">
          <SheetTitle>{branch ? "Edit Branch" : "New Branch"}</SheetTitle>
          <SheetDescription>
            {branch ? "Update branch details, hours, and delivery." : "Add a new restaurant location."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Basic */}
          <Section title="Basic Info">
            <FormField label="Branch Name *">
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </FormField>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="City">
                <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
              </FormField>
              <FormField label="Branch Manager">
                <Input
                  value={form.manager_name}
                  onChange={(e) => setField("manager_name", e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Address">
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </FormField>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Phone">
                <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </FormField>
            </div>
          </Section>

          {/* Location */}
          <Section title="Location">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Latitude">
                <Input
                  type="number"
                  step="0.0000001"
                  value={form.latitude}
                  onChange={(e) => setField("latitude", e.target.value)}
                />
              </FormField>
              <FormField label="Longitude">
                <Input
                  type="number"
                  step="0.0000001"
                  value={form.longitude}
                  onChange={(e) => setField("longitude", e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Google Maps Link">
              <Input
                placeholder="https://maps.google.com/…"
                value={form.google_maps_link}
                onChange={(e) => setField("google_maps_link", e.target.value)}
              />
            </FormField>
          </Section>

          {/* Delivery */}
          <Section title="Delivery & Pickup">
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow
                label="Delivery Available"
                checked={form.delivery_available}
                onChange={(v) => setField("delivery_available", v)}
              />
              <ToggleRow
                label="Pickup Available"
                checked={form.pickup_available}
                onChange={(v) => setField("pickup_available", v)}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Delivery Radius (km)">
                <Input
                  type="number"
                  step="0.1"
                  value={form.delivery_radius_km}
                  onChange={(e) => setField("delivery_radius_km", e.target.value)}
                />
              </FormField>
              <FormField label="Estimated Time (min)">
                <Input
                  type="number"
                  value={form.estimated_delivery_minutes}
                  onChange={(e) => setField("estimated_delivery_minutes", e.target.value)}
                />
              </FormField>
              <FormField label="Minimum Order">
                <Input
                  type="number"
                  step="0.01"
                  value={form.minimum_order}
                  onChange={(e) => setField("minimum_order", e.target.value)}
                />
              </FormField>
              <FormField label="Delivery Charges">
                <Input
                  type="number"
                  step="0.01"
                  value={form.delivery_charges}
                  onChange={(e) => setField("delivery_charges", e.target.value)}
                />
              </FormField>
            </div>
          </Section>

          {/* Hours */}
          <Section title="Opening Hours">
            <div className="space-y-2">
              {DAYS.map((d) => {
                const day = form.opening_hours[d.key] ?? {};
                const closed = !!day.closed;
                return (
                  <div
                    key={d.key}
                    className="grid grid-cols-[60px,1fr,1fr,90px] items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2"
                  >
                    <div className="text-xs font-semibold">{d.label}</div>
                    <Input
                      type="time"
                      value={day.open ?? "11:00"}
                      onChange={(e) => setHour(d.key, { open: e.target.value })}
                      disabled={closed}
                      className="h-9"
                    />
                    <Input
                      type="time"
                      value={day.close ?? "23:00"}
                      onChange={(e) => setHour(d.key, { close: e.target.value })}
                      disabled={closed}
                      className="h-9"
                    />
                    <label className="flex items-center justify-end gap-1.5 text-xs">
                      <Switch
                        checked={closed}
                        onCheckedChange={(v) => setHour(d.key, { closed: v })}
                      />
                      Closed
                    </label>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Status">
            <ToggleRow
              label="Branch is active"
              checked={form.is_active}
              onChange={(v) => setField("is_active", v)}
            />
          </Section>
        </div>

        <SheetFooter className="border-t border-border/70 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
            {save.isPending ? "Saving…" : branch ? "Save Changes" : "Create Branch"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
      <span className="font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
