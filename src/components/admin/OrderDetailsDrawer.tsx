import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  MapPin,
  Phone,
  Receipt,
  ShoppingBag,
  StickyNote,
  Ticket,
  Truck,
  User,
  X,
  XCircle,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Separator } from "@/components/ui/separator";

import {
  adminGetOrder,
  adminUpdateOrderStatus,
  type AdminOrderStatus,
} from "@/lib/admin-orders.functions";
import {
  STATUS_DOT,
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_STYLE,
  formatPKR,
  formatRelative,
  nextStatus,
} from "@/lib/admin-orders";
import type { Json } from "@/integrations/supabase/types";

function getAddressField(snap: Json | null, key: string): string | null {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return null;
  const v = (snap as { [k: string]: Json | undefined })[key];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function Timeline({
  current,
  createdAt,
  updatedAt,
}: {
  current: AdminOrderStatus;
  createdAt: string;
  updatedAt: string;
}) {
  if (current === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-destructive/15 text-destructive">
          <XCircle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-destructive">Order cancelled</div>
          <div className="text-xs text-muted-foreground">
            Last updated {formatRelative(updatedAt)}
          </div>
        </div>
      </div>
    );
  }
  const idx = STATUS_ORDER.indexOf(current);
  return (
    <ol className="space-y-3">
      {STATUS_ORDER.map((s, i) => {
        const done = i <= idx;
        const active = i === idx;
        return (
          <li key={s} className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <div className="flex-1 pt-0.5">
              <div className={cn("text-sm font-semibold", !done && "text-muted-foreground")}>
                {STATUS_LABEL[s]}
              </div>
              {active && (
                <div className="text-xs text-muted-foreground">
                  {i === 0 ? `Placed ${formatRelative(createdAt)}` : `Updated ${formatRelative(updatedAt)}`}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

export function OrderDetailsDrawer({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const getOrder = useServerFn(adminGetOrder);
  const updateStatus = useServerFn(adminUpdateOrderStatus);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  const q = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () => getOrder({ data: { id: orderId! } }),
    enabled: !!orderId && open,
  });

  const mut = useMutation({
    mutationFn: (status: AdminOrderStatus) =>
      updateStatus({ data: { id: orderId!, status } }),
    onSuccess: (_r, status) => {
      toast.success(`Order marked as ${STATUS_LABEL[status]}`);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "order", orderId] });
      qc.invalidateQueries({ queryKey: ["admin", "order-stats"] });
    },
    onError: (err: Error) => toast.error("Failed to update", { description: err.message }),
  });

  const detail = q.data ?? null;
  const upcoming = detail ? nextStatus(detail.status) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-xl md:max-w-2xl"
      >
        {q.isLoading || !detail ? (
          <DetailSkeleton />
        ) : (
          <div className="flex min-h-full flex-col">
            <div className="sticky top-0 z-10 border-b border-border/70 bg-background/95 px-6 py-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Order
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(detail.order_number);
                        toast.success("Order number copied");
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-1 font-display text-2xl font-black tracking-tight">
                    {detail.order_number}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    Placed {formatRelative(detail.created_at)} · {detail.fulfillment_method}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold",
                      STATUS_STYLE[detail.status],
                    )}
                  >
                    <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", STATUS_DOT[detail.status])} />
                    {STATUS_LABEL[detail.status]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    className="rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-5 px-6 py-5">
              {/* Customer + address */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Customer
                  </div>
                  <div className="text-sm font-semibold">
                    {detail.customer_name ?? "—"}
                  </div>
                  {detail.customer_email && (
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {detail.customer_email}
                    </div>
                  )}
                  {detail.customer_phone && (
                    <a
                      href={`tel:${detail.customer_phone}`}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-primary/25"
                    >
                      <Phone className="h-3 w-3" /> {detail.customer_phone}
                    </a>
                  )}
                </div>

                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Delivery
                  </div>
                  {detail.fulfillment_method !== "delivery" ? (
                    <div className="text-sm capitalize">{detail.fulfillment_method}</div>
                  ) : (
                    <div className="space-y-0.5 text-sm">
                      <div className="font-semibold">
                        {getAddressField(detail.address_snapshot, "address_line") ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[getAddressField(detail.address_snapshot, "area"), getAddressField(detail.address_snapshot, "city")]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                      {getAddressField(detail.address_snapshot, "notes") && (
                        <div className="mt-2 rounded-lg bg-muted px-2 py-1.5 text-xs">
                          {getAddressField(detail.address_snapshot, "notes")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="rounded-2xl border border-border/70 bg-card">
                <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5" /> Items · {detail.items.length}
                </div>
                <ul className="divide-y divide-border/60">
                  {detail.items.map((it) => (
                    <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold">
                        {it.qty}×
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{it.name}</div>
                        {it.options && typeof it.options === "object" && "notes" in it.options && (it.options as { notes?: string }).notes && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Note: {(it.options as { notes?: string }).notes}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm font-semibold tabular-nums">
                        {formatPKR(it.unit_price_pkr * it.qty)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Notes */}
              {(detail.notes || detail.special_instructions) && (
                <div className="rounded-2xl border border-border/70 bg-warning/10 p-4">
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-warning-foreground">
                    <StickyNote className="h-3.5 w-3.5" /> Notes
                  </div>
                  <div className="whitespace-pre-line text-sm">
                    {detail.notes ?? detail.special_instructions}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Receipt className="h-3.5 w-3.5" /> Bill
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="tabular-nums">{formatPKR(detail.subtotal_pkr)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Delivery</dt>
                    <dd className="tabular-nums">{formatPKR(detail.delivery_fee_pkr)}</dd>
                  </div>
                  {detail.tax_pkr > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Tax</dt>
                      <dd className="tabular-nums">{formatPKR(detail.tax_pkr)}</dd>
                    </div>
                  )}
                  {detail.coupon_code && (
                    <div className="flex justify-between">
                      <dt className="inline-flex items-center gap-1 text-muted-foreground">
                        <Ticket className="h-3 w-3" /> {detail.coupon_code}
                      </dt>
                      <dd className="tabular-nums text-success-foreground">
                        −{formatPKR(detail.discount_pkr)}
                      </dd>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base font-black">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatPKR(detail.total_pkr)}</dd>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <dt>Payment</dt>
                    <dd className="uppercase">{detail.payment_method}</dd>
                  </div>
                </dl>
              </div>

              {/* Timeline */}
              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> Timeline
                </div>
                <Timeline
                  current={detail.status}
                  createdAt={detail.created_at}
                  updatedAt={detail.updated_at}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border/70 bg-background/95 px-6 py-4 backdrop-blur">
              {detail.status !== "cancelled" && detail.status !== "delivered" && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmCancel(true)}
                  className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={mut.isPending}
                >
                  <XCircle className="h-4 w-4" /> Cancel order
                </Button>
              )}
              <div className="flex-1" />
              {upcoming && (
                <Button
                  onClick={() => mut.mutate(upcoming)}
                  disabled={mut.isPending}
                  className="rounded-xl"
                >
                  {mut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Mark as {STATUS_LABEL[upcoming]} <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer will see it as cancelled. This can't be undone from the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                mut.mutate("cancelled");
                setConfirmCancel(false);
              }}
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
