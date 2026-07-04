import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bike,
  Clock,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { OrderHeader } from "@/components/order/OrderHeader";
import { MobileBottomNav } from "@/components/order/MobileBottomNav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cartActions, useCart, useCartTotal, drawerActions } from "@/lib/store";
import { checkoutActions, computeTotals, useCheckout, type DeliveryMethod } from "@/lib/checkout-store";
import { validateCoupon } from "@/lib/coupons";
import { formatPKR } from "@/lib/menu-data";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Daddy Zinger" },
      { name: "description", content: "Review your Daddy Zinger order — customizations, meal upgrades, delivery fee and coupons." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

const METHODS: { id: DeliveryMethod; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }[] = [
  { id: "delivery", label: "Delivery", desc: "18–28 min", icon: Bike },
  { id: "pickup", label: "Pickup", desc: "Ready in 10 min", icon: Store },
  { id: "dinein", label: "Dine-in", desc: "Coming soon", icon: UtensilsCrossed, soon: true },
];

function CartPage() {
  const cart = useCart();
  const subtotal = useCartTotal();
  const checkout = useCheckout();
  const totals = useMemo(
    () => computeTotals({ subtotal, method: checkout.method, coupon: checkout.coupon, tip: checkout.tip }),
    [subtotal, checkout.method, checkout.coupon, checkout.tip],
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
    toast.success(`${res.coupon.code} applied`, { description: res.coupon.label });
  };

  const prepMinutes = Math.max(12, Math.min(28, 10 + cart.length * 3));

  return (
    <div className="min-h-screen bg-background">
      <OrderHeader />
      <main className="pt-24 md:pt-28 pb-24">
        <div className="container-dz">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
            className="mb-8 md:mb-10 flex items-end justify-between gap-4"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Step 1 of 2</div>
              <h1 className="mt-2 font-display text-3xl md:text-5xl font-extrabold tracking-tight">Your cart</h1>
              <p className="mt-1 text-sm text-muted-foreground">Review, customize and add a coupon before checkout.</p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => { cartActions.clear(); toast("Cart cleared"); }}
                className="hidden md:inline text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear cart
              </button>
            )}
          </motion.div>

          {cart.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-10 items-start">
              {/* LINES + METHOD + COUPON */}
              <div className="space-y-6">
                <MethodPicker current={checkout.method} />

                <section className="rounded-3xl border border-border bg-card overflow-hidden">
                  <header className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="font-display text-lg font-bold">Items ({cart.length})</h2>
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Prep ~ {prepMinutes} min
                    </div>
                  </header>
                  <ul className="divide-y divide-border">
                    <AnimatePresence initial={false}>
                      {cart.map((line) => (
                        <motion.li
                          key={line.key}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="p-4 md:p-5 flex gap-4"
                        >
                          <button
                            onClick={() => drawerActions.openById(line.itemId)}
                            className="relative shrink-0 h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden bg-secondary group"
                            aria-label={`Edit ${line.name}`}
                          >
                            <img
                              src={line.image}
                              alt=""
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <button
                                  onClick={() => drawerActions.openById(line.itemId)}
                                  className="text-left font-display font-bold text-base md:text-lg hover:text-primary transition-colors truncate block"
                                >
                                  {line.name}
                                </button>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {formatPKR(line.basePrice)} base
                                </div>
                              </div>
                              <button
                                onClick={() => cartActions.remove(line.key)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                aria-label={`Remove ${line.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {(line.customizations.length > 0 || line.upgrades.length > 0) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {line.upgrades.map((u) => (
                                  <Badge key={u.id} className="bg-primary/10 text-primary border-0 text-[10px] font-semibold rounded-full">
                                    + {u.label}
                                  </Badge>
                                ))}
                                {line.customizations.map((c) => (
                                  <Badge key={c.id} variant="outline" className="text-[10px] font-medium rounded-full">
                                    {c.label}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {line.notes && (
                              <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
                                "{line.notes}"
                              </p>
                            )}

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <QtyControl
                                qty={line.qty}
                                onDec={() => cartActions.updateQty(line.key, line.qty - 1)}
                                onInc={() => cartActions.updateQty(line.key, line.qty + 1)}
                              />
                              <div className="text-right">
                                <div className="font-display font-extrabold text-lg tabular-nums">
                                  {formatPKR(line.unitPrice * line.qty)}
                                </div>
                                {line.qty > 1 && (
                                  <div className="text-[10px] text-muted-foreground tabular-nums">
                                    {formatPKR(line.unitPrice)} each
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>

                <CouponBox
                  input={couponInput}
                  setInput={setCouponInput}
                  loading={couponLoading}
                  error={couponError}
                  applied={checkout.coupon}
                  onApply={applyCoupon}
                  onRemove={() => { checkoutActions.setCoupon(null); toast("Coupon removed"); }}
                />
              </div>

              {/* SUMMARY */}
              <aside className="lg:sticky lg:top-24">
                <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-[var(--shadow-3)]">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="font-display text-lg font-bold">Order summary</h2>
                  </div>
                  <div className="p-5 space-y-3 text-sm">
                    <Row label="Subtotal" value={formatPKR(subtotal)} />
                    <Row
                      label={
                        checkout.method === "delivery"
                          ? "Delivery fee"
                          : checkout.method === "pickup"
                            ? "Pickup fee"
                            : "Dine-in fee"
                      }
                      value={formatPKR(totals.deliveryFee)}
                    />
                    <Row label="Service fee" value={formatPKR(totals.serviceFee)} />
                    {totals.discount > 0 && (
                      <Row
                        label={`Discount${checkout.coupon ? ` (${checkout.coupon.code})` : ""}`}
                        value={`− ${formatPKR(totals.discount)}`}
                        positive
                      />
                    )}
                    <Row label="Estimated tax" value={formatPKR(totals.tax)} muted />
                    <div className="my-2 h-px bg-border" />
                    <div className="flex items-baseline justify-between">
                      <span className="font-display font-bold text-base">Total</span>
                      <span className="font-display font-extrabold text-2xl tabular-nums">{formatPKR(totals.total)}</span>
                    </div>

                    <Link to="/checkout" className="block pt-2">
                      <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-semibold">
                        Continue to checkout
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>

                    <Link to="/menu" className="block text-center text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors pt-2">
                      Add more items
                    </Link>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-border bg-card/60 p-4 flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Try coupon <span className="font-mono text-foreground">WELCOME10</span> for 10% off, or{" "}
                    <span className="font-mono text-foreground">ZINGER20</span> on orders above Rs 1,500.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value, muted, positive }: { label: string; value: string; muted?: boolean; positive?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${positive ? "text-primary font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function QtyControl({ qty, onDec, onInc }: { qty: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background">
      <button
        onClick={onDec}
        className="h-9 w-9 grid place-items-center text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors rounded-l-full"
        aria-label="Decrease quantity"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
      <button
        onClick={onInc}
        className="h-9 w-9 grid place-items-center text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors rounded-r-full"
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MethodPicker({ current }: { current: DeliveryMethod }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base font-bold">How would you like it?</h2>
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {METHODS.map((m) => {
          const active = current === m.id;
          return (
            <button
              key={m.id}
              disabled={m.soon}
              onClick={() => {
                if (m.soon) { toast("Dine-in coming soon"); return; }
                checkoutActions.setMethod(m.id);
              }}
              className={`relative p-3 md:p-4 rounded-2xl border transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed ${
                active
                  ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]"
                  : "border-border hover:border-foreground/30 bg-background"
              }`}
            >
              <m.icon className={`h-5 w-5 mb-2 ${active ? "text-primary" : "text-foreground/70"}`} />
              <div className="text-sm font-bold font-display">{m.label}</div>
              <div className="text-[10px] text-muted-foreground">{m.desc}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CouponBox({
  input, setInput, loading, error, applied, onApply, onRemove,
}: {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  error: string | null;
  applied: ReturnType<typeof useCheckout>["coupon"];
  onApply: () => void;
  onRemove: () => void;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 md:p-5">
      <h2 className="font-display text-base font-bold mb-3">Promo code</h2>
      {applied ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/20 grid place-items-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-sm font-bold truncate">{applied.code}</div>
              <div className="text-[11px] text-muted-foreground truncate">{applied.label}</div>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-background transition-colors shrink-0"
            aria-label="Remove coupon"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g. WELCOME10)"
              className="uppercase tracking-wider font-mono"
              onKeyDown={(e) => e.key === "Enter" && onApply()}
              disabled={loading}
            />
            <Button
              onClick={onApply}
              disabled={loading || !input.trim()}
              variant="outline"
              className="border-border font-semibold min-w-24"
            >
              {loading ? "Checking…" : "Apply"}
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </>
      )}
    </section>
  );
}

function EmptyCart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto text-center py-16 md:py-24"
    >
      <div className="mx-auto h-20 w-20 rounded-3xl bg-primary/10 grid place-items-center mb-6">
        <ShoppingBag className="h-9 w-9 text-primary" />
      </div>
      <h2 className="font-display text-2xl md:text-3xl font-extrabold">Your cart is empty</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Craving something bold? Explore the menu and start building your order.
      </p>
      <Link to="/menu" className="inline-block mt-6">
        <Button className="h-12 px-8 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-semibold">
          Browse the menu <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </Link>
    </motion.div>
  );
}
