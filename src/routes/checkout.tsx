import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bike,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Plus,
  Store,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { OrderHeader } from "@/components/order/OrderHeader";
import { MobileBottomNav } from "@/components/order/MobileBottomNav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cartActions, useCart, useCartTotal } from "@/lib/store";
import {
  checkoutActions,
  computeTotals,
  useCheckout,
  type DeliveryMethod,
} from "@/lib/checkout-store";
import { formatPKR } from "@/lib/menu";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { placeOrder } from "@/lib/orders.functions";
import { useKeyboardOpen } from "@/hooks/use-keyboard-open";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Daddy Zinger" },
      { name: "description", content: "Confirm your address, payment method and order details, then place your Daddy Zinger order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const STEPS = ["Method", "Address", "Payment", "Review"] as const;
type StepIdx = 0 | 1 | 2 | 3;

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

function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const subtotal = useCartTotal();
  const checkout = useCheckout();
  const totals = useMemo(
    () => computeTotals({ subtotal, method: checkout.method, coupon: checkout.coupon, tip: checkout.tip }),
    [subtotal, checkout.method, checkout.coupon, checkout.tip],
  );

  const [step, setStep] = useState<StepIdx>(0);
  const [placing, setPlacing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const keyboardOpen = useKeyboardOpen();
  const addressStepRef = useRef<{ prepare: () => Promise<boolean> } | null>(null);

  const placeOrderFn = useServerFn(placeOrder);

  const goNext = async () => {
    if (step === 1 && checkout.method === "delivery" && addressStepRef.current) {
      const ok = await addressStepRef.current.prepare();
      if (!ok) return;
    }
    setStep((s) => (Math.min(3, s + 1) as StepIdx));
  };

  // Auto-populate contact phone from the signed-in user's profile so the
  // Place Order button doesn't silently stay disabled.
  useEffect(() => {
    if (!user || checkout.contactPhone.trim().length >= 8) return;
    const metaPhone = (user.user_metadata?.phone as string | undefined)?.trim();
    if (metaPhone && metaPhone.length >= 8) {
      checkoutActions.setContact({ contactPhone: metaPhone });
      return;
    }
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = (data?.phone ?? "").trim();
        if (p.length >= 8) checkoutActions.setContact({ contactPhone: p });
      });
  }, [user, checkout.contactPhone]);


  // Auth gate — render inline sign-in prompt
  if (!authLoading && !user) {
    return (
      <div className="min-h-dvh bg-background">
        <OrderHeader />
        <main className="pt-8 pb-24">
          <div className="container-dz max-w-md mx-auto text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-primary/10 grid place-items-center mb-6">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-extrabold">Sign in to check out</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your cart is saved. Sign in to load your addresses and place your order.
            </p>
            <Link to="/auth" className="inline-block mt-6">
              <Button className="h-12 px-8 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-semibold">
                Sign in to continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-dvh bg-background">
        <OrderHeader />
        <main className="pt-8 pb-24">
          <div className="container-dz max-w-md mx-auto text-center">
            <h1 className="font-display text-3xl font-extrabold">Your cart is empty</h1>
            <p className="mt-2 text-sm text-muted-foreground">Add something to check out.</p>
            <Link to="/menu" className="inline-block mt-6">
              <Button className="h-12 px-8 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-semibold">
                Browse menu
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const canPlace =
    cart.length > 0 &&
    (checkout.method !== "delivery" || !!checkout.selectedAddressId) &&
    checkout.contactPhone.trim().length >= 8;

  const handlePlace = async () => {
    if (!canPlace || placing) return;
    setPlacing(true);

    let addressSnapshot: Address | null = null;
    if (checkout.method === "delivery" && checkout.selectedAddressId) {
      const { data } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("id", checkout.selectedAddressId)
        .maybeSingle();
      addressSnapshot = (data as Address) ?? null;
    }

    try {
      const order = await placeOrderFn({
        data: {
          items: cart.map((l) => ({
            product_id: l.itemId,
            name: l.name,
            qty: l.qty,
            unit_price_pkr: l.unitPrice,
            options: {
              customizations: l.customizations,
              upgrades: l.upgrades,
              notes: l.notes || undefined,
            },
          })),
          subtotal_pkr: subtotal,
          delivery_fee_pkr: totals.deliveryFee,
          tax_pkr: totals.tax,
          discount_pkr: totals.discount,
          total_pkr: totals.total,
          payment_method: checkout.paymentMethod,
          fulfillment_method: checkout.method,
          schedule_at: checkout.scheduleAt,
          coupon_code: checkout.coupon?.code ?? null,
          address_snapshot: addressSnapshot
            ? {
                label: addressSnapshot.label,
                recipient_name: addressSnapshot.recipient_name,
                phone: addressSnapshot.phone,
                address_line: addressSnapshot.address_line,
                city: addressSnapshot.city,
                area: addressSnapshot.area,
                notes: addressSnapshot.notes,
              }
            : null,
          notes: checkout.notes,
          special_instructions: null,
        },
      });
      toast.success(`Order ${order.order_number} placed`, {
        description: "You'll get a notification once the kitchen confirms.",
      });
      cartActions.clear();
      checkoutActions.reset();
      navigate({ to: "/order-success/$number", params: { number: order.order_number } });
    } catch (err) {
      toast.error("Could not place your order", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <OrderHeader />
      <main className="pt-6 md:pt-10 pb-56 lg:pb-16">
        <div className="container-dz">
          <div className="mb-6 md:mb-8 flex items-center justify-between gap-4">
            <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to cart
            </Link>
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Step 2 of 2</div>
          </div>

          <Stepper current={step} onJump={(s) => setStep(s)} />

          <div className="mt-8 grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-10 items-start">
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {step === 0 && <MethodStep />}
                  {step === 1 && <AddressStep bindRef={addressStepRef} />}
                  {step === 2 && <PaymentStep />}
                  {step === 3 && <ReviewStep totals={totals} subtotal={subtotal} />}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={step === 0}
                  onClick={() => setStep((s) => (Math.max(0, s - 1) as StepIdx))}
                  className="border-border"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                {step < 3 ? (
                  <Button
                    onClick={goNext}
                    className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-semibold"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <div className="flex flex-col items-end gap-1.5">
                    <Button
                      onClick={handlePlace}
                      disabled={!canPlace || placing}
                      className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-semibold h-12 px-6"
                    >
                      {placing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing order…
                        </>
                      ) : (
                        <>Place order · {formatPKR(totals.total)}</>
                      )}
                    </Button>
                    {!canPlace && !placing && (
                      <p className="text-[11px] text-destructive">
                        {checkout.method === "delivery" && !checkout.selectedAddressId
                          ? "Select a delivery address to continue"
                          : checkout.contactPhone.trim().length < 8
                            ? "Add a valid phone number (Step 2) to continue"
                            : "Add an item to continue"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop sticky summary */}
            <aside className="hidden lg:block lg:sticky lg:top-24">
              <OrderSummary subtotal={subtotal} totals={totals} />
            </aside>
          </div>
        </div>
      </main>

      {/* Mobile summary sheet */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border">
        <button
          onClick={() => setSummaryOpen((v) => !v)}
          className="w-full px-5 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Order total</span>
            <span className="font-display font-extrabold text-lg tabular-nums">{formatPKR(totals.total)}</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {summaryOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="p-4">
                <OrderSummary subtotal={subtotal} totals={totals} compact />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}

/* -------------------- Stepper -------------------- */

function Stepper({ current, onJump }: { current: StepIdx; onJump: (s: StepIdx) => void }) {
  return (
    <ol className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-none">
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <li key={label} className="flex items-center gap-2 md:gap-3 shrink-0">
            <button
              onClick={() => onJump(i as StepIdx)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : done
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`grid place-items-center h-5 w-5 rounded-full text-[10px] ${
                active ? "bg-primary-foreground/20" : done ? "bg-primary/20" : "bg-background"
              }`}>
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-4 md:w-8 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------- Step 1: Method -------------------- */

const METHODS: { id: DeliveryMethod; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }[] = [
  { id: "delivery", label: "Delivery", desc: "~29 min to your door", icon: Bike },
  { id: "pickup", label: "Pickup", desc: "Ready in ~10 minutes", icon: Store },
  { id: "dinein", label: "Dine-in", desc: "Coming soon", icon: UtensilsCrossed, soon: true },
];

function MethodStep() {
  const checkout = useCheckout();
  const [scheduleOpen, setScheduleOpen] = useState(!!checkout.scheduleAt);

  return (
    <Section title="How would you like your order?">
      <div className="grid sm:grid-cols-3 gap-3">
        {METHODS.map((m) => {
          const active = checkout.method === m.id;
          return (
            <button
              key={m.id}
              disabled={m.soon}
              onClick={() => { if (!m.soon) checkoutActions.setMethod(m.id); else toast("Dine-in coming soon"); }}
              className={`p-4 rounded-2xl border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                active
                  ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]"
                  : "border-border hover:border-foreground/30 bg-background"
              }`}
            >
              <m.icon className={`h-5 w-5 mb-2 ${active ? "text-primary" : "text-foreground/70"}`} />
              <div className="font-display font-bold">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> When?
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {scheduleOpen && checkout.scheduleAt
                ? `Scheduled: ${new Date(checkout.scheduleAt).toLocaleString()}`
                : "ASAP — kitchen starts immediately"}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={scheduleOpen ? "outline" : "default"}
              onClick={() => { setScheduleOpen(false); checkoutActions.setSchedule(null); }}
              className={scheduleOpen ? "border-border" : "bg-primary text-primary-foreground"}
            >
              ASAP
            </Button>
            <Button
              size="sm"
              variant={scheduleOpen ? "default" : "outline"}
              onClick={() => setScheduleOpen(true)}
              className={scheduleOpen ? "bg-primary text-primary-foreground" : "border-border"}
            >
              Schedule
            </Button>
          </div>
        </div>
        {scheduleOpen && (
          <div className="mt-3">
            <Input
              type="datetime-local"
              value={checkout.scheduleAt ? checkout.scheduleAt.slice(0, 16) : ""}
              min={new Date(Date.now() + 30 * 60_000).toISOString().slice(0, 16)}
              onChange={(e) => checkoutActions.setSchedule(e.target.value ? new Date(e.target.value).toISOString() : null)}
              className="max-w-xs"
            />
          </div>
        )}
      </div>
    </Section>
  );
}

/* -------------------- Step 2: Address -------------------- */

function AddressStep({ bindRef }: { bindRef: React.MutableRefObject<{ prepare: () => Promise<boolean> } | null> }) {
  const { user } = useAuth();
  const checkout = useCheckout();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!user) return;
    supabase
      .from("user_addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const list = (data as Address[]) ?? [];
        setAddresses(list);
        if (list.length === 0) {
          checkoutActions.setUseNewAddress(true);
        } else if (!checkout.selectedAddressId && !checkout.useNewAddress) {
          const def = list.find((a) => a.is_default) ?? list[0];
          checkoutActions.setAddress(def.id);
        }
      });
  };
  useEffect(load, [user]);

  // Expose a validate+save handler for the parent's Continue button.
  useEffect(() => {
    bindRef.current = {
      prepare: async () => {
        const showForm = checkout.useNewAddress || (addresses !== null && addresses.length === 0);
        if (!showForm) {
          if (!checkout.selectedAddressId) {
            toast.error("Select a delivery address");
            return false;
          }
          return true;
        }
        const d = checkout.newAddress;
        const missing: string[] = [];
        if (!d.recipient_name.trim()) missing.push("full name");
        if (d.phone.trim().length < 8) missing.push("phone");
        if (!d.address_line.trim()) missing.push("address");
        if (!d.city.trim()) missing.push("city");
        if (missing.length > 0) {
          toast.error(`Please fill: ${missing.join(", ")}`);
          return false;
        }
        if (!user) return false;
        setSaving(true);
        const { data, error } = await supabase
          .from("user_addresses")
          .insert({
            user_id: user.id,
            label: "Home",
            recipient_name: d.recipient_name.trim(),
            phone: d.phone.trim(),
            address_line: d.address_line.trim(),
            city: d.city.trim(),
            area: d.area.trim() || null,
            notes: d.notes.trim() || null,
            is_default: (addresses?.length ?? 0) === 0,
          })
          .select("*")
          .maybeSingle();
        setSaving(false);
        if (error || !data) {
          toast.error("Could not save address", { description: error?.message });
          return false;
        }
        const saved = data as Address;
        checkoutActions.setAddress(saved.id);
        if (d.phone.trim().length >= 8) {
          checkoutActions.setContact({ contactPhone: d.phone.trim() });
        }
        checkoutActions.resetNewAddress();
        return true;
      },
    };
    return () => { bindRef.current = null; };
  }, [bindRef, checkout.useNewAddress, checkout.selectedAddressId, checkout.newAddress, addresses, user]);

  if (checkout.method !== "delivery") {
    return (
      <Section title="Contact details">
        <ContactFields />
      </Section>
    );
  }

  const showForm = checkout.useNewAddress || (addresses !== null && addresses.length === 0);
  const hasSaved = (addresses?.length ?? 0) > 0;

  return (
    <Section title="Delivery address">
      {addresses === null ? (
        <div className="text-sm text-muted-foreground">Loading addresses…</div>
      ) : (
        <>
          {hasSaved && !showForm && (
            <RadioGroup
              value={checkout.selectedAddressId ?? ""}
              onValueChange={(v) => checkoutActions.setAddress(v)}
              className="space-y-2"
            >
              {addresses!.map((a) => (
                <label
                  key={a.id}
                  htmlFor={`addr-${a.id}`}
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    checkout.selectedAddressId === a.id
                      ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <RadioGroupItem id={`addr-${a.id}`} value={a.id} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm">{a.label}</span>
                      {a.is_default && <Badge variant="outline" className="text-[10px]">Default</Badge>}
                    </div>
                    <div className="text-sm text-foreground/80 mt-0.5">{a.address_line}</div>
                    <div className="text-xs text-muted-foreground">
                      {[a.area, a.city].filter(Boolean).join(", ")}
                    </div>
                    {a.notes && (
                      <div className="text-xs italic text-muted-foreground mt-1">Instructions: {a.notes}</div>
                    )}
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}

          {hasSaved && !showForm && (
            <button
              type="button"
              onClick={() => checkoutActions.setUseNewAddress(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add new address
            </button>
          )}

          {showForm && (
            <div className="space-y-4">
              {hasSaved && (
                <button
                  type="button"
                  onClick={() => checkoutActions.setUseNewAddress(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Use a saved address
                </button>
              )}
              <NewAddressForm />
              {saving && (
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving address…
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                We'll save this to your account so you can reuse it on your next order.
              </p>
            </div>
          )}
        </>
      )}

      <div className="mt-6 pt-6 border-t border-border">
        <ContactFields />
      </div>
    </Section>
  );
}

function NewAddressForm() {
  const checkout = useCheckout();
  const d = checkout.newAddress;
  const set = (patch: Partial<typeof d>) => checkoutActions.setNewAddress(patch);
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="na-name">Full name *</Label>
        <Input id="na-name" value={d.recipient_name} onChange={(e) => set({ recipient_name: e.target.value })} placeholder="e.g. Ali Raza" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="na-phone">Phone number *</Label>
        <Input id="na-phone" type="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="03XX-XXXXXXX" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="na-city">City *</Label>
        <Input id="na-city" value={d.city} onChange={(e) => set({ city: e.target.value })} placeholder="Lahore" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="na-addr">Address *</Label>
        <Input id="na-addr" value={d.address_line} onChange={(e) => set({ address_line: e.target.value })} placeholder="House / street / building" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="na-area">Area / neighbourhood</Label>
        <Input id="na-area" value={d.area} onChange={(e) => set({ area: e.target.value })} placeholder="DHA Phase 5" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="na-notes">Delivery notes (optional)</Label>
        <Textarea id="na-notes" rows={2} maxLength={300} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Ring the bell twice, gate code…" />
      </div>
    </div>
  );
}

function ContactFields() {
  const checkout = useCheckout();
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number *</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="03XX-XXXXXXX"
          value={checkout.contactPhone}
          onChange={(e) => checkoutActions.setContact({ contactPhone: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="alt">Alternate phone (optional)</Label>
        <Input
          id="alt"
          type="tel"
          placeholder="Backup number"
          value={checkout.contactAltPhone}
          onChange={(e) => checkoutActions.setContact({ contactAltPhone: e.target.value })}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="notes">Order notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          maxLength={500}
          placeholder="Ring the bell twice, leave at the reception, extra ketchup…"
          value={checkout.notes}
          onChange={(e) => checkoutActions.setContact({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}

/* -------------------- Step 3: Payment -------------------- */

const PAYMENTS: { id: "cod" | "card" | "wallet"; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }[] = [
  { id: "cod", label: "Cash on delivery", desc: "Pay in cash when your order arrives", icon: Banknote },
  { id: "card", label: "Credit / Debit card", desc: "Coming soon — secure card payments", icon: CreditCard, soon: true },
  { id: "wallet", label: "Wallet (JazzCash / EasyPaisa)", desc: "Coming soon — mobile wallets", icon: Wallet, soon: true },
];

function PaymentStep() {
  const checkout = useCheckout();
  return (
    <Section title="Payment method">
      <div className="space-y-2">
        {PAYMENTS.map((p) => {
          const active = checkout.paymentMethod === p.id;
          return (
            <button
              key={p.id}
              disabled={p.soon}
              onClick={() => { if (!p.soon) checkoutActions.setPayment(p.id); }}
              className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                active
                  ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${active ? "bg-primary/20 text-primary" : "bg-secondary text-foreground/70"}`}>
                <p.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm flex items-center gap-2">
                  {p.label}
                  {p.soon && <Badge variant="outline" className="text-[10px]">Soon</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
              {active && <Check className="h-5 w-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/* -------------------- Step 4: Review -------------------- */

function ReviewStep({ totals, subtotal }: { totals: ReturnType<typeof computeTotals>; subtotal: number }) {
  const cart = useCart();
  const checkout = useCheckout();
  return (
    <Section title="Review your order">
      <div className="rounded-2xl border border-border divide-y divide-border">
        <ReviewRow label="Method" value={checkout.method === "delivery" ? "Delivery" : checkout.method === "pickup" ? "Pickup" : "Dine-in"} />
        <ReviewRow label="When" value={checkout.scheduleAt ? new Date(checkout.scheduleAt).toLocaleString() : "ASAP"} />
        <ReviewRow label="Payment" value={checkout.paymentMethod === "cod" ? "Cash on delivery" : checkout.paymentMethod === "card" ? "Card" : "Wallet"} />
        <ReviewRow label="Contact" value={checkout.contactPhone || "—"} />
        {checkout.coupon && <ReviewRow label="Coupon" value={checkout.coupon.code} />}
      </div>

      <div className="mt-4 rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-display font-bold text-sm">
          {cart.length} item{cart.length !== 1 ? "s" : ""}
        </div>
        <ul className="divide-y divide-border">
          {cart.map((line) => (
            <li key={line.key} className="p-4 flex gap-3">
              <img src={line.image} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-display font-semibold text-sm truncate">
                    {line.qty}× {line.name}
                  </div>
                  <div className="font-display font-bold tabular-nums text-sm">{formatPKR(line.unitPrice * line.qty)}</div>
                </div>
                {(line.customizations.length > 0 || line.upgrades.length > 0) && (
                  <div className="text-[11px] text-muted-foreground truncate">
                    {[...line.upgrades.map((u) => "+ " + u.label), ...line.customizations.map((c) => c.label)].join(" · ")}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        By placing this order you accept our terms and confirm the details above. Estimated delivery {estWindow(checkout.method, cart.length)}.
      </p>
    </Section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between px-4 py-3 gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function estWindow(method: DeliveryMethod, _lines: number) {
  if (method === "pickup") return "in 10–15 min";
  if (method === "dinein") return "on arrival";
  return "in ~29 min";
}

/* -------------------- Order Summary -------------------- */

function OrderSummary({ subtotal, totals, compact }: { subtotal: number; totals: ReturnType<typeof computeTotals>; compact?: boolean }) {
  const cart = useCart();
  const checkout = useCheckout();
  return (
    <div className={`rounded-3xl border border-border bg-card overflow-hidden ${compact ? "" : "shadow-[var(--shadow-3)]"}`}>
      {!compact && (
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{cart.length} item{cart.length !== 1 ? "s" : ""}</p>
        </div>
      )}
      <div className="p-5 space-y-2 text-sm">
        <div className="flex items-baseline justify-between"><span>Subtotal</span><span className="tabular-nums">{formatPKR(subtotal)}</span></div>
        <div className="flex items-baseline justify-between">
          <span>{checkout.method === "delivery" ? "Delivery" : checkout.method === "pickup" ? "Pickup" : "Dine-in"}</span>
          <span className="tabular-nums">{formatPKR(totals.deliveryFee)}</span>
        </div>
        <div className="flex items-baseline justify-between"><span>Service fee</span><span className="tabular-nums">{formatPKR(totals.serviceFee)}</span></div>
        {totals.discount > 0 && (
          <div className="flex items-baseline justify-between text-primary font-semibold">
            <span>Discount {checkout.coupon ? `(${checkout.coupon.code})` : ""}</span>
            <span className="tabular-nums">− {formatPKR(totals.discount)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between text-muted-foreground"><span>Estimated tax</span><span className="tabular-nums">{formatPKR(totals.tax)}</span></div>
        <div className="my-2 h-px bg-border" />
        <div className="flex items-baseline justify-between">
          <span className="font-display font-bold">Total</span>
          <span className="font-display font-extrabold text-2xl tabular-nums">{formatPKR(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Section -------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
      <h2 className="font-display text-lg md:text-xl font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}
