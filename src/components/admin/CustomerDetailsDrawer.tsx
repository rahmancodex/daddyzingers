import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  BadgeCheck,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  Heart,
  Loader2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  ShoppingBag,
  Ticket,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";


import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminGetCustomer,
  adminUpdateCustomerLoyalty,
  type AdminCustomerRow,
} from "@/lib/admin-customers.functions";
import {
  PASS_STYLE,
  TIER_STYLE,
  fmtDate,
  fmtRelative,
  formatPKR,
  initialsFrom,
} from "@/lib/admin-customers";
import {
  buildTimeline,
  orderCounts,
  type TimelineEvent,
  type TimelineKind,
} from "@/lib/admin-customers-derived";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/admin-orders";
import type { AdminOrderStatus } from "@/lib/admin-orders.functions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
};

const TIERS = ["bronze", "silver", "gold", "platinum"] as const;
const PASS = ["none", "active", "expired", "cancelled"] as const;

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mapsUrl(a: {
  address_line: string;
  city: string;
  area: string | null;
}): string {
  const q = encodeURIComponent(`${a.address_line}, ${a.area ?? ""} ${a.city}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function CustomerDetailsDrawer({ open, onOpenChange, customerId }: Props) {
  const qc = useQueryClient();
  const fetchDetail = useServerFn(adminGetCustomer);
  const updateFn = useServerFn(adminUpdateCustomerLoyalty);

  const q = useQuery({
    queryKey: ["admin", "customer", customerId],
    enabled: !!customerId && open,
    queryFn: () =>
      fetchDetail({ data: { id: customerId! } }) as Promise<{
        profile: AdminCustomerRow;
        addresses: Array<{
          id: string;
          label: string;
          recipient_name: string | null;
          phone: string | null;
          address_line: string;
          city: string;
          area: string | null;
          notes: string | null;
          is_default: boolean;
          created_at: string;
        }>;
        orders: Array<{
          id: string;
          order_number: string;
          status: string;
          total_pkr: number;
          payment_method: string;
          fulfillment_method: string;
          items_count: number;
          created_at: string;
        }>;
        favorites: Array<{
          product_id: string;
          product_name: string | null;
          product_image: string | null;
          category_id: string | null;
          created_at: string;
        }>;
      }>,
  });

  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    reward_points: "0",
    loyalty_tier: "bronze" as (typeof TIERS)[number],
    daddy_pass_status: "none" as (typeof PASS)[number],
    daddy_pass_renews_at: "",
    admin_notes: "",
  });

  React.useEffect(() => {
    if (q.data?.profile) {
      const p = q.data.profile;
      setForm({
        reward_points: String(p.reward_points ?? 0),
        loyalty_tier: (TIERS.includes(p.loyalty_tier as (typeof TIERS)[number])
          ? p.loyalty_tier
          : "bronze") as (typeof TIERS)[number],
        daddy_pass_status: (PASS.includes(p.daddy_pass_status as (typeof PASS)[number])
          ? p.daddy_pass_status
          : "none") as (typeof PASS)[number],
        daddy_pass_renews_at: toDatetimeLocal(p.daddy_pass_renews_at),
        admin_notes: p.admin_notes ?? "",
      });
      setEditing(false);
    }
  }, [q.data?.profile]);

  const save = useMutation({
    mutationFn: (v: Record<string, unknown>) => updateFn({ data: v as never }),
    onSuccess: () => {
      toast.success("Customer updated");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["admin", "customer", customerId] });
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  function submit() {
    if (!customerId) return;
    save.mutate({
      id: customerId,
      reward_points: Number(form.reward_points) || 0,
      loyalty_tier: form.loyalty_tier,
      daddy_pass_status: form.daddy_pass_status,
      daddy_pass_renews_at: form.daddy_pass_renews_at
        ? new Date(form.daddy_pass_renews_at).toISOString()
        : null,
      admin_notes: form.admin_notes || null,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {q.isLoading || !q.data ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-8 w-1/2 rounded" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b border-border/70 px-6 py-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 border-2 border-border">
                  <AvatarImage src={q.data.profile.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/20 font-black">
                    {initialsFrom(q.data.profile.full_name, "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="font-display text-xl font-black">
                    {q.data.profile.full_name ?? "Unnamed customer"}
                  </SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {q.data.profile.email && (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Mail className="h-3 w-3" /> {q.data.profile.email}
                      </span>
                    )}
                    {q.data.profile.phone && (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3" /> {q.data.profile.phone}
                      </span>
                    )}
                  </SheetDescription>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                        TIER_STYLE[q.data.profile.loyalty_tier] ?? "bg-muted",
                      )}
                    >
                      <Award className="mr-1 h-3 w-3" /> {q.data.profile.loyalty_tier}
                    </Badge>
                    {q.data.profile.daddy_pass_status !== "none" && (
                      <Badge
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                          PASS_STYLE[q.data.profile.daddy_pass_status] ?? "bg-muted",
                        )}
                      >
                        <BadgeCheck className="mr-1 h-3 w-3" />
                        Daddy Pass · {q.data.profile.daddy_pass_status}
                      </Badge>
                    )}
                    {q.data.profile.referral_code && (
                      <Badge className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                        <Gift className="mr-1 h-3 w-3" /> {q.data.profile.referral_code}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            {/* Metrics strip */}
            {(() => {
              const counts = orderCounts(q.data.orders);
              const aov = q.data.profile.total_orders
                ? q.data.profile.total_spend_pkr / q.data.profile.total_orders
                : 0;
              return (
                <div className="grid grid-cols-2 gap-3 border-b border-border/70 p-4 md:grid-cols-3 xl:grid-cols-6">
                  <Metric label="Lifetime spend" value={formatPKR(q.data.profile.total_spend_pkr)} />
                  <Metric label="Orders" value={String(q.data.profile.total_orders)} />
                  <Metric label="Avg order" value={formatPKR(aov)} />
                  <Metric label="Completed" value={String(counts.completed)} />
                  <Metric label="Cancelled" value={String(counts.cancelled)} />
                  <Metric label="Points" value={String(q.data.profile.reward_points)} />
                </div>
              );
            })()}

            <Tabs defaultValue="overview" className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b border-border/70 px-4">
                <TabsList className="h-11 flex-wrap gap-1 bg-transparent p-0">
                  <TabsTrigger value="overview" className="rounded-lg">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="rounded-lg">
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="rounded-lg">
                    Orders ({q.data.orders.length})
                  </TabsTrigger>
                  <TabsTrigger value="addresses" className="rounded-lg">
                    Addresses ({q.data.addresses.length})
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="rounded-lg">
                    Favorites ({q.data.favorites.length})
                  </TabsTrigger>
                  <TabsTrigger value="loyalty" className="rounded-lg">
                    Loyalty
                  </TabsTrigger>
                </TabsList>
              </div>


              <div className="flex-1 overflow-y-auto">
                {/* Overview */}
                <TabsContent value="overview" className="m-0 space-y-4 p-4">
                  <Section title="Profile">
                    <Detail label="Full name" value={q.data.profile.full_name ?? "—"} />
                    <Detail label="Email" value={q.data.profile.email ?? "—"} />
                    <Detail label="Phone" value={q.data.profile.phone ?? "—"} />
                    <Detail label="Birthday" value={fmtDate(q.data.profile.birthday)} />
                    <Detail label="Joined" value={fmtDate(q.data.profile.created_at)} />
                    <Detail
                      label="Favorite category"
                      value={q.data.profile.favorite_category ?? "—"}
                    />
                    <Detail label="Referral code" value={q.data.profile.referral_code ?? "—"} />
                    <Detail
                      label="Latest order"
                      value={
                        q.data.orders[0]
                          ? `#${q.data.orders[0].order_number} · ${fmtRelative(q.data.orders[0].created_at)}`
                          : "—"
                      }
                    />
                  </Section>

                  {q.data.profile.admin_notes && (
                    <Section title="Admin notes">
                      <p className="col-span-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {q.data.profile.admin_notes}
                      </p>
                    </Section>
                  )}
                </TabsContent>

                {/* Timeline */}
                <TabsContent value="timeline" className="m-0 p-4">
                  <Timeline events={buildTimeline(q.data.profile, q.data.orders)} />
                </TabsContent>

                {/* Orders */}
                <TabsContent value="orders" className="m-0 p-4">
                  {q.data.orders.length === 0 ? (
                    <Empty icon={Package} title="No orders yet" />
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-4 py-3 font-semibold">Order</th>
                            <th className="px-2 py-3 font-semibold">Date</th>
                            <th className="px-2 py-3 font-semibold">Items</th>
                            <th className="px-2 py-3 font-semibold">Status</th>
                            <th className="px-2 py-3 font-semibold">Payment</th>
                            <th className="px-4 py-3 text-right font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.data.orders.map((o) => (
                            <tr
                              key={o.id}
                              className="border-t border-border/50 transition-colors hover:bg-muted/40"
                            >
                              <td className="px-4 py-3 font-mono text-xs font-bold">
                                #{o.order_number}
                              </td>
                              <td className="px-2 py-3 text-xs text-muted-foreground">
                                {fmtRelative(o.created_at)}
                              </td>
                              <td className="px-2 py-3 tabular-nums text-muted-foreground">
                                {o.items_count}
                              </td>
                              <td className="px-2 py-3">
                                <Badge
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                    STATUS_STYLE[o.status as AdminOrderStatus],
                                  )}
                                >
                                  {STATUS_LABEL[o.status as AdminOrderStatus]}
                                </Badge>
                              </td>
                              <td className="px-2 py-3 text-xs capitalize text-muted-foreground">
                                {o.payment_method}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                {formatPKR(o.total_pkr)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Addresses */}
                <TabsContent value="addresses" className="m-0 space-y-3 p-4">
                  {q.data.addresses.length === 0 ? (
                    <Empty icon={MapPin} title="No saved addresses" />
                  ) : (
                    q.data.addresses.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-black">{a.label}</span>
                              {a.is_default && (
                                <Badge className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-foreground">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-sm">{a.address_line}</div>
                            <div className="text-xs text-muted-foreground">
                              {[a.area, a.city].filter(Boolean).join(", ")}
                            </div>
                            {a.recipient_name && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {a.recipient_name}
                                {a.phone ? ` · ${a.phone}` : ""}
                              </div>
                            )}
                            {a.notes && (
                              <div className="mt-1 text-xs italic text-muted-foreground">
                                {a.notes}
                              </div>
                            )}
                          </div>
                          <a
                            href={mapsUrl(a)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold hover:bg-accent"
                          >
                            <MapPin className="h-3 w-3" /> Map
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Favorites */}
                <TabsContent value="favorites" className="m-0 p-4">
                  {q.data.favorites.length === 0 ? (
                    <Empty icon={Heart} title="No favorites yet" />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {q.data.favorites.map((f) => (
                        <div
                          key={f.product_id}
                          className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]"
                        >
                          <div className="aspect-square w-full overflow-hidden bg-muted">
                            {f.product_image ? (
                              <img
                                src={f.product_image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-muted-foreground">
                                <Heart className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <div className="truncate text-sm font-semibold">
                              {f.product_name ?? f.product_id}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {fmtRelative(f.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Loyalty */}
                <TabsContent value="loyalty" className="m-0 space-y-4 p-4">
                  <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-1)]">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-display text-base font-black">Loyalty & Pass</div>
                      {!editing ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => setEditing(true)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg"
                            onClick={() => setEditing(false)}
                            disabled={save.isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-lg"
                            onClick={submit}
                            disabled={save.isPending}
                          >
                            {save.isPending && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            Save
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Reward points">
                        <Input
                          type="number"
                          min={0}
                          value={form.reward_points}
                          disabled={!editing}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, reward_points: e.target.value }))
                          }
                          className="h-10 rounded-xl"
                        />
                      </Field>
                      <Field label="Loyalty tier">
                        <Select
                          value={form.loyalty_tier}
                          disabled={!editing}
                          onValueChange={(v) =>
                            setForm((f) => ({ ...f, loyalty_tier: v as (typeof TIERS)[number] }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIERS.map((t) => (
                              <SelectItem key={t} value={t} className="capitalize">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Daddy Pass status">
                        <Select
                          value={form.daddy_pass_status}
                          disabled={!editing}
                          onValueChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              daddy_pass_status: v as (typeof PASS)[number],
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PASS.map((p) => (
                              <SelectItem key={p} value={p} className="capitalize">
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Pass renews at">
                        <Input
                          type="datetime-local"
                          value={form.daddy_pass_renews_at}
                          disabled={!editing}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, daddy_pass_renews_at: e.target.value }))
                          }
                          className="h-10 rounded-xl"
                        />
                      </Field>
                      <div className="col-span-2">
                        <Field label="Internal admin notes">
                          <Textarea
                            value={form.admin_notes}
                            disabled={!editing}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, admin_notes: e.target.value }))
                            }
                            placeholder="Only visible to admins"
                            className="min-h-[100px] rounded-xl"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Stat
                      icon={Calendar}
                      label="Pass renews"
                      value={fmtDate(q.data.profile.daddy_pass_renews_at)}
                    />
                    <Stat
                      icon={Ticket}
                      label="Marketing"
                      value={q.data.profile.marketing_opt_in ? "Opted in" : "Opted out"}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-1)]">
      <div className="mb-3 font-display text-base font-black">{title}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-1)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-10 text-center shadow-[var(--shadow-1)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-3 font-display text-base font-black">{title}</div>
    </div>
  );
}

const TIMELINE_META: Record<
  TimelineKind,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  account_created: {
    icon: UserPlus,
    tone: "bg-info/15 text-info",
  },
  order_placed: {
    icon: ShoppingBag,
    tone: "bg-primary/15 text-foreground",
  },
  order_delivered: {
    icon: CheckCircle2,
    tone: "bg-success/15 text-success-foreground",
  },
  order_cancelled: {
    icon: Ban,
    tone: "bg-destructive/15 text-destructive",
  },
};

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <Empty icon={Clock} title="No activity yet" />;
  }
  return (
    <ol className="relative space-y-4 pl-6">
      <span
        aria-hidden
        className="pointer-events-none absolute left-[11px] top-1 bottom-1 w-px bg-border"
      />
      {events.map((e) => {
        const meta = TIMELINE_META[e.kind];
        const Icon = meta.icon;
        return (
          <li key={e.id} className="relative">
            <span
              className={cn(
                "absolute -left-6 grid h-6 w-6 place-items-center rounded-full ring-2 ring-background",
                meta.tone,
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <div className="truncate text-sm font-semibold">{e.title}</div>
                <div
                  className="shrink-0 text-[11px] text-muted-foreground"
                  title={new Date(e.at).toLocaleString()}
                >
                  {fmtRelative(e.at)}
                </div>
              </div>
              {e.detail && (
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {e.detail}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
