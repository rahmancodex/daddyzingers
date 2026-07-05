import { useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bike,
  Check,
  ChefHat,
  Clock,
  MapPin,
  Package,
  ReceiptText,
  RefreshCw,
  Store,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatPKR, useMenuData } from "@/lib/menu";
import { cartActions } from "@/lib/store";
import {
  EmptyState,
  PageHeader,
  SkeletonBlock,
  StatusPill,
} from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/orders/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Order #${params.orderId} — Daddy Zinger` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetailsPage,
});

type OptionEntry = { id: string; label: string; price: number };
type OrderItem = {
  id: string;
  product_id: string;
  name: string;
  qty: number;
  unit_price_pkr: number;
  options: {
    customizations?: OptionEntry[];
    upgrades?: OptionEntry[];
    notes?: string;
  } | null;
};

type AddressSnapshot = {
  label?: string;
  recipient_name?: string | null;
  phone?: string | null;
  address_line?: string;
  city?: string;
  area?: string | null;
  notes?: string | null;
} | null;

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  fulfillment_method: string;
  subtotal_pkr: number;
  delivery_fee_pkr: number;
  discount_pkr: number | null;
  tax_pkr: number | null;
  total_pkr: number;
  coupon_code: string | null;
  address_snapshot: AddressSnapshot;
  notes: string | null;
  special_instructions: string | null;
  created_at: string;
  schedule_at: string | null;
  branch_id: string | null;
  branch?: { id: string; name: string; city: string | null; address: string | null; phone: string | null } | null;
  order_items: OrderItem[];
};


const DELIVERY_TIMELINE = [
  { key: "pending", label: "Placed", icon: ReceiptText },
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "preparing", label: "In the kitchen", icon: ChefHat },
  { key: "out_for_delivery", label: "Out for delivery", icon: Bike },
  { key: "delivered", label: "Delivered", icon: Package },
] as const;

const PICKUP_TIMELINE = [
  { key: "pending", label: "Placed", icon: ReceiptText },
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "preparing", label: "In the kitchen", icon: ChefHat },
  { key: "ready", label: "Ready for pickup", icon: Store },
  { key: "completed", label: "Picked up", icon: Package },
] as const;

const CANCELLED_STATES = new Set(["cancelled", "canceled", "rejected"]);

function OrderDetailsPage() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { byId: menuById } = useMenuData();

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Order | null>({
    queryKey: ["customer-order", orderId, user?.id],
    enabled: !!user,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, payment_method, fulfillment_method, subtotal_pkr, delivery_fee_pkr, discount_pkr, tax_pkr, total_pkr, coupon_code, address_snapshot, notes, special_instructions, created_at, schedule_at, branch_id, branch:branches(id, name, city, address, phone), order_items(id, product_id, name, qty, unit_price_pkr, options)",
        )
        // Try lookup by both id and order_number so links from either work.
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .maybeSingle();

      if (error) throw error;
      return (data as Order | null) ?? null;
    },
  });

  // Realtime: refresh when this order changes status server-side.
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["customer-order", orderId, user?.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, orderId, qc, user?.id]);

  const isDelivery = order?.fulfillment_method === "delivery";
  const timeline = isDelivery ? DELIVERY_TIMELINE : PICKUP_TIMELINE;
  const statusKey = (order?.status ?? "pending").toLowerCase().replace(/\s+/g, "_");
  const cancelled = CANCELLED_STATES.has(statusKey);
  const activeIdx = useMemo(() => {
    const i = timeline.findIndex((t) => t.key === statusKey);
    return i >= 0 ? i : cancelled ? -1 : 0;
  }, [timeline, statusKey, cancelled]);

  const reorder = () => {
    if (!order) return;
    let added = 0;
    let missing = 0;
    for (const it of order.order_items) {
      const menuItem = menuById.get(it.product_id);
      if (!menuItem) {
        missing += 1;
        continue;
      }
      cartActions.add({
        item: menuItem,
        qty: it.qty,
        customEntries: it.options?.customizations ?? [],
        upgradeEntries: it.options?.upgrades ?? [],
        notes: it.options?.notes ?? "",
      });
      added += 1;
    }
    if (added === 0) {
      toast.error("None of these items are on the current menu");
      return;
    }
    toast.success(`Added ${added} item${added === 1 ? "" : "s"} to cart`, {
      description: missing > 0 ? `${missing} item${missing === 1 ? "" : "s"} unavailable` : undefined,
    });
    navigate({ to: "/cart" });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          to="/dashboard/orders"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All orders
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-64" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={XCircle}
          title="Couldn't load this order"
          body={(error as Error)?.message ?? "Please try again."}
          cta={{ label: "Retry", to: "/dashboard/orders" }}
        />
      ) : !order ? (
        <EmptyState
          icon={Package}
          title="Order not found"
          body="This order may have been removed or doesn't belong to your account."
          cta={{ label: "Back to orders", to: "/dashboard/orders" }}
        />
      ) : (
        <>
          <PageHeader
            title={`Order #${order.order_number}`}
            subtitle={new Date(order.created_at).toLocaleString(undefined, {
              dateStyle: "long",
              timeStyle: "short",
            })}
            action={
              <div className="flex items-center gap-2">
                <StatusPill status={order.status} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  aria-label="Refresh order"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
            }
          />

          {/* Timeline */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
            {cancelled ? (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-10 w-10 rounded-xl bg-destructive/15 text-destructive grid place-items-center shrink-0">
                  <XCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">Order cancelled</div>
                  <div className="text-muted-foreground text-xs">
                    If this wasn't you, please contact support.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">
                      {isDelivery ? "Delivery" : "Pickup"} status
                    </div>
                    <div className="mt-1 font-display text-lg md:text-xl font-extrabold">
                      {timeline[activeIdx]?.label ?? "Placed"}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 inline mr-1" />
                    Updates automatically
                  </div>
                </div>
                <ol className="relative grid grid-cols-5 gap-1 md:gap-2">
                  {timeline.map((step, i) => {
                    const done = i <= activeIdx;
                    const current = i === activeIdx;
                    const Icon = step.icon;
                    return (
                      <li
                        key={step.key}
                        className="relative flex flex-col items-center gap-1.5 text-center"
                        aria-current={current ? "step" : undefined}
                      >
                        {i < timeline.length - 1 && (
                          <span
                            className={cn(
                              "absolute top-4 md:top-5 left-1/2 w-full h-0.5",
                              i < activeIdx ? "bg-primary" : "bg-border",
                            )}
                            aria-hidden
                          />
                        )}
                        <span
                          className={cn(
                            "relative z-10 h-8 w-8 md:h-10 md:w-10 rounded-full grid place-items-center border-2 transition-colors",
                            done
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border",
                            current && "shadow-[var(--shadow-glow)] ring-4 ring-primary/20",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </span>
                        <span
                          className={cn(
                            "text-[10px] md:text-xs font-medium leading-tight max-w-[10ch]",
                            done ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {step.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </section>

          {/* Grid: items + summary */}
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <header className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">
                  Items ({order.order_items.length})
                </h2>
                <Button
                  size="sm"
                  onClick={reorder}
                  className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] font-semibold"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reorder
                </Button>
              </header>
              <ul className="divide-y divide-border">
                {order.order_items.map((it) => {
                  const menuItem = menuById.get(it.product_id);
                  const image = menuItem?.image;
                  const addons = [
                    ...(it.options?.customizations ?? []),
                    ...(it.options?.upgrades ?? []),
                  ];
                  return (
                    <li key={it.id} className="p-4 md:p-5 flex gap-4">
                      <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-secondary shrink-0 overflow-hidden grid place-items-center text-muted-foreground">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <UtensilsCrossed className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              <span className="text-muted-foreground tabular-nums mr-1">
                                {it.qty}×
                              </span>
                              {it.name}
                            </div>
                            {addons.length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {addons.map((a) => a.label).join(" · ")}
                              </div>
                            )}
                            {it.options?.notes && (
                              <div className="mt-1 text-xs italic text-muted-foreground">
                                “{it.options.notes}”
                              </div>
                            )}
                          </div>
                          <div className="font-display font-bold tabular-nums shrink-0">
                            {formatPKR(it.unit_price_pkr * it.qty)}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-base font-bold mb-3">Payment summary</h2>
                <dl className="space-y-2 text-sm">
                  <Row label="Subtotal" value={formatPKR(order.subtotal_pkr)} />
                  {isDelivery && (
                    <Row label="Delivery" value={formatPKR(order.delivery_fee_pkr)} />
                  )}
                  {order.tax_pkr ? (
                    <Row label="Tax" value={formatPKR(order.tax_pkr)} />
                  ) : null}
                  {order.discount_pkr && order.discount_pkr > 0 ? (
                    <Row
                      label={order.coupon_code ? `Coupon (${order.coupon_code})` : "Discount"}
                      value={`− ${formatPKR(order.discount_pkr)}`}
                      tone="positive"
                    />
                  ) : null}
                  <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                    <dt className="font-display font-extrabold">Total</dt>
                    <dd className="font-display font-extrabold tabular-nums text-lg">
                      {formatPKR(order.total_pkr)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Payment method</span>
                  <span className="font-semibold uppercase">
                    {order.payment_method === "cod" ? "Cash on delivery" : order.payment_method}
                  </span>
                </div>
              </section>

              {isDelivery && order.address_snapshot?.address_line ? (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                        Delivering to
                      </div>
                      <div className="font-semibold">
                        {order.address_snapshot.label || "Address"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.address_snapshot.address_line}
                        {order.address_snapshot.city ? `, ${order.address_snapshot.city}` : ""}
                        {order.address_snapshot.area ? `, ${order.address_snapshot.area}` : ""}
                      </div>
                      {order.address_snapshot.phone && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {order.address_snapshot.recipient_name
                            ? `${order.address_snapshot.recipient_name} · `
                            : ""}
                          {order.address_snapshot.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              ) : !isDelivery ? (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                        Pickup
                      </div>
                      <div className="font-semibold">Ready at branch</div>
                      <div className="text-sm text-muted-foreground">
                        We'll notify you when it's ready to collect.
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {(order.notes || order.special_instructions) && (
                <section className="rounded-2xl border border-dashed border-border bg-secondary/30 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-1.5">
                    Instructions
                  </div>
                  <div className="text-sm whitespace-pre-line">
                    {order.special_instructions || order.notes}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums font-medium",
          tone === "positive" && "text-emerald-500",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
