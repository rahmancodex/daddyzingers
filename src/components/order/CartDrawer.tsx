import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Bike, Clock, Minus, Plus, ShoppingBag, Sparkles, Store, Tag, Trash2, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  cartActions,
  cartDrawerActions,
  drawerActions,
  useCart,
  useCartDrawerOpen,
  useCartTotal,
} from "@/lib/store";
import {
  checkoutActions,
  computeTotals,
  useCheckout,
  type DeliveryMethod,
} from "@/lib/checkout-store";
import { validateCoupon } from "@/lib/coupons";
import { MENU, formatPKR } from "@/lib/menu-data";
import { useBranch } from "@/lib/location-store";

const METHODS: { id: DeliveryMethod; label: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }[] = [
  { id: "delivery", label: "Delivery", icon: Bike },
  { id: "pickup", label: "Pickup", icon: Store },
  { id: "dinein", label: "Dine-in", icon: UtensilsCrossed, soon: true },
];

export function CartDrawer() {
  const open = useCartDrawerOpen();
  const cart = useCart();
  const subtotal = useCartTotal();
  const checkout = useCheckout();
  const branch = useBranch();

  const totals = useMemo(
    () => computeTotals({ subtotal, method: checkout.method, coupon: checkout.coupon, tip: checkout.tip }),
    [subtotal, checkout.method, checkout.coupon, checkout.tip],
  );

  const inCartIds = useMemo(() => new Set(cart.map((l) => l.itemId)), [cart]);
  const recommended = useMemo(
    () =>
      MENU.filter(
        (m) => !inCartIds.has(m.id) && (m.category === "sides" || m.category === "extras"),
      ).slice(0, 4),
    [inCartIds],
  );

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const applyCoupon = async () => {
    setCouponError(null);
    setCouponLoading(true);
    const res = await validateCoupon(couponInput, subtotal);
    setCouponLoading(false);
    if (!res.ok) {
      setCouponError(res.error);
      return;
    }
    checkoutActions.setCoupon(res.coupon);
    setCouponInput("");
    toast.success(`${res.coupon.code} applied`);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && cartDrawerActions.close()}>
      <SheetContent
        side="right"
        className="p-0 w-full sm:max-w-md md:max-w-lg bg-background border-l border-border flex flex-col h-full [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Your cart</SheetTitle>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 md:p-5 border-b border-border bg-background/95 backdrop-blur-xl">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Your order</div>
            <div className="font-display font-extrabold text-lg">
              {cart.length} {cart.length === 1 ? "item" : "items"}
            </div>
          </div>
          <button
            onClick={() => cartDrawerActions.close()}
            aria-label="Close cart"
            className="h-10 w-10 rounded-full grid place-items-center border border-border hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 grid place-items-center p-8 text-center">
            <div>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 grid place-items-center">
                <ShoppingBag className="h-7 w-7 text-primary" />
              </div>
              <div className="font-display font-bold text-xl">Your cart is empty</div>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                Pick a Zinger, shawarma, or platter and it'll show up here.
              </p>
              <Link to="/menu" onClick={() => cartDrawerActions.close()} className="inline-block mt-6">
                <Button className="h-11 px-6 bg-primary text-primary-foreground shadow-[var(--shadow-glow)] font-semibold">
                  Browse menu <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Method */}
              <div className="p-4 md:p-5 border-b border-border">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  How would you like it?
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map((m) => {
                    const active = checkout.method === m.id;
                    return (
                      <button
                        key={m.id}
                        disabled={m.soon}
                        onClick={() => !m.soon && checkoutActions.setMethod(m.id)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-40 ${
                          active
                            ? "border-primary bg-primary/10 text-primary shadow-[var(--shadow-glow)]"
                            : "border-border hover:border-foreground/30"
                        }`}
                      >
                        <m.icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Estimated {checkout.method === "pickup" ? "pickup" : "delivery"} in{" "}
                  <span className="font-semibold text-foreground">
                    {checkout.method === "pickup" ? "~10 min" : `${branch.etaMin}–${branch.etaMax} min`}
                  </span>
                </div>
              </div>

              {/* Items */}
              <ul className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {cart.map((line) => (
                    <motion.li
                      key={line.key}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="p-4 md:p-5 flex gap-3"
                    >
                      <button
                        onClick={() => {
                          drawerActions.openById(line.itemId);
                          cartDrawerActions.close();
                        }}
                        className="relative shrink-0 h-16 w-16 rounded-2xl overflow-hidden bg-secondary"
                        aria-label={`Edit ${line.name}`}
                      >
                        <img src={line.image} alt="" className="h-full w-full object-cover" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-display font-bold text-sm truncate">{line.name}</div>
                          <button
                            onClick={() => cartActions.remove(line.key)}
                            className="p-1 -m-1 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label={`Remove ${line.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {(line.customizations.length > 0 || line.upgrades.length > 0) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {line.upgrades.map((u) => (
                              <Badge key={u.id} className="bg-primary/10 text-primary border-0 text-[9px] font-semibold rounded-full px-1.5 py-0">
                                + {u.label}
                              </Badge>
                            ))}
                            {line.customizations.map((c) => (
                              <Badge key={c.id} variant="outline" className="text-[9px] font-medium rounded-full px-1.5 py-0">
                                {c.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-full border border-border bg-background">
                            <button
                              onClick={() => cartActions.updateQty(line.key, line.qty - 1)}
                              className="h-8 w-8 grid place-items-center hover:bg-secondary rounded-l-full"
                              aria-label="Decrease"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-bold tabular-nums">{line.qty}</span>
                            <button
                              onClick={() => cartActions.updateQty(line.key, line.qty + 1)}
                              className="h-8 w-8 grid place-items-center hover:bg-secondary rounded-r-full"
                              aria-label="Increase"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="font-display font-extrabold text-sm tabular-nums">
                            {formatPKR(line.unitPrice * line.qty)}
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {/* Recommended */}
              {recommended.length > 0 && (
                <div className="p-4 md:p-5 border-t border-border bg-secondary/30">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Complete your order
                  </div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
                    {recommended.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          drawerActions.openById(r.id);
                          cartDrawerActions.close();
                        }}
                        className="shrink-0 w-32 text-left rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-colors"
                      >
                        <div className="aspect-square overflow-hidden">
                          <img src={r.image} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="p-2">
                          <div className="text-[11px] font-semibold truncate">{r.name}</div>
                          <div className="text-[11px] text-primary font-bold">{formatPKR(r.price)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Coupon */}
              <div className="p-4 md:p-5 border-t border-border">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Tag className="h-3 w-3" /> Promo code
                </div>
                {checkout.coupon ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/30">
                    <div className="text-xs">
                      <span className="font-mono font-bold">{checkout.coupon.code}</span>{" "}
                      <span className="text-muted-foreground">— {checkout.coupon.label}</span>
                    </div>
                    <button
                      onClick={() => checkoutActions.setCoupon(null)}
                      className="p-1 rounded hover:bg-background"
                      aria-label="Remove coupon"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                      placeholder="WELCOME10"
                      className="uppercase font-mono h-10"
                      disabled={couponLoading}
                    />
                    <Button onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()} variant="outline" className="h-10">
                      {couponLoading ? "…" : "Apply"}
                    </Button>
                  </div>
                )}
                {couponError && <p className="mt-1.5 text-[11px] text-destructive">{couponError}</p>}
              </div>

              {/* Totals */}
              <div className="p-4 md:p-5 border-t border-border space-y-2 text-sm">
                <Row label="Subtotal" value={formatPKR(subtotal)} />
                <Row label={checkout.method === "delivery" ? "Delivery" : checkout.method === "pickup" ? "Pickup" : "Dine-in"} value={formatPKR(totals.deliveryFee)} />
                <Row label="Service fee" value={formatPKR(totals.serviceFee)} />
                {totals.discount > 0 && <Row label="Discount" value={`− ${formatPKR(totals.discount)}`} positive />}
              </div>
            </div>

            {/* Sticky checkout */}
            <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-xl p-4">
              <div className="flex items-baseline justify-between mb-3">
                <span className="font-display font-bold">Total</span>
                <span className="font-display font-extrabold text-2xl tabular-nums">
                  {formatPKR(totals.total)}
                </span>
              </div>
              <Link to="/checkout" onClick={() => cartDrawerActions.close()}>
                <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-bold">
                  Checkout · {formatPKR(totals.total)}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${positive ? "text-primary font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
