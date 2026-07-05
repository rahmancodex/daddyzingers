import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Building2, Check, Clock, MapPin, ReceiptText, ArrowRight, Home, Sparkles } from "lucide-react";
import { OrderHeader } from "@/components/order/OrderHeader";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR } from "@/lib/menu";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/order-success/$number")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.number} placed — Daddy Zinger` },
      { name: "description", content: "Your Daddy Zinger order is confirmed. Track it live from your dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderSuccess,
});

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_pkr: number;
  subtotal_pkr: number;
  delivery_fee_pkr: number;
  created_at: string;
  branch_id: string | null;
  branch?: { id: string; name: string; city: string | null; phone: string | null } | null;
  address_snapshot: {
    address_line?: string;
    city?: string;
    area?: string | null;
    label?: string;
  } | null;
};

function OrderSuccess() {
  const { number } = Route.useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id, order_number, status, total_pkr, subtotal_pkr, delivery_fee_pkr, created_at, address_snapshot, branch_id, branch:branches(id, name, city, phone)")
      .eq("order_number", number)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOrder(data as unknown as OrderRow);
        else setNotFound(true);
      });
  }, [user, number]);


  return (
    <div className="min-h-dvh bg-background">
      <OrderHeader />
      <main className="pt-8 md:pt-14 pb-24">
        <div className="container-dz max-w-3xl">
          {/* Success hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
            className="text-center"
          >
            <div className="relative mx-auto h-28 w-28 mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6, times: [0, 0.7, 1], ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-primary/15"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 18 }}
                className="absolute inset-3 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-glow)]"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 16 }}
                >
                  <Check className="h-12 w-12" strokeWidth={3} />
                </motion.div>
              </motion.div>
              {/* Confetti dots */}
              {[...Array(8)].map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: Math.cos((i / 8) * Math.PI * 2) * 70,
                    y: Math.sin((i / 8) * Math.PI * 2) * 70,
                    scale: [0, 1, 0.3],
                  }}
                  transition={{ duration: 1, delay: 0.6 + i * 0.03 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary"
                />
              ))}
            </div>

            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.28em] text-primary font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Order confirmed
            </div>
            <h1 className="mt-2 font-display text-4xl md:text-5xl font-extrabold tracking-tight">
              Thank you!
            </h1>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              We're firing up the kitchen. You'll get updates as your order moves.
            </p>
          </motion.div>

          {/* Order number pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-8 rounded-3xl border border-border bg-card overflow-hidden shadow-[var(--shadow-3)]"
          >
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="p-5 md:p-6">
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Order number</div>
                <div className="mt-1 font-display text-2xl md:text-3xl font-extrabold tracking-tight">
                  #{number}
                </div>
                {order && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Placed {new Date(order.created_at).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="p-5 md:p-6 bg-primary/5">
                <div className="text-[10px] uppercase tracking-[0.28em] text-primary font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Estimated delivery
                </div>
                <div className="mt-1 font-display text-2xl md:text-3xl font-extrabold tracking-tight">
                  29 minutes
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Hot &amp; fresh from our kitchen</div>
              </div>
            </div>

            {order && (
              <div className="border-t border-border p-5 md:p-6 grid sm:grid-cols-2 gap-4 text-sm">
                {order.address_snapshot?.address_line && (
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-secondary grid place-items-center shrink-0 text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Deliver to</div>
                      <div className="font-semibold truncate">{order.address_snapshot.label || "Address"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {order.address_snapshot.address_line}
                        {order.address_snapshot.city ? `, ${order.address_snapshot.city}` : ""}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-secondary grid place-items-center shrink-0 text-primary">
                    <ReceiptText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total paid</div>
                    <div className="font-display font-extrabold text-lg tabular-nums">{formatPKR(order.total_pkr)}</div>
                    <div className="text-xs text-muted-foreground">
                      Subtotal {formatPKR(order.subtotal_pkr)} · Delivery {formatPKR(order.delivery_fee_pkr)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="mt-6 grid sm:grid-cols-2 gap-3"
          >
            <Link
              to="/dashboard/orders/$orderId"
              params={{ orderId: order?.id ?? number }}
            >
              <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-semibold">
                <ReceiptText className="h-4 w-4" /> Track my order
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link to="/menu">
              <Button variant="outline" className="w-full h-12 border-border font-semibold">
                <Home className="h-4 w-4" /> Continue shopping
              </Button>
            </Link>
          </motion.div>

          {notFound && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              We couldn't load the order details, but your order is placed. Check your dashboard.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
