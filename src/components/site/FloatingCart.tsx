import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Clock, ArrowRight } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cartDrawerActions, useCart, useCartCount, useCartTotal } from "@/lib/store";
import { formatPKR } from "@/lib/menu";

/**
 * Native-style bottom sticky cart on mobile.
 * Elegant floating "Order tray" card on desktop.
 * Hidden on /cart, /checkout, /auth, /dashboard.
 */
export function FloatingCart() {
  const count = useCartCount();
  const total = useCartTotal();
  const cart = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const suppressed =
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname.startsWith("/order-success") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/dashboard");

  const preview = cart.slice(0, 3);
  const rest = Math.max(0, count - preview.reduce((n, l) => n + l.qty, 0));

  return (
    <AnimatePresence>
      {count > 0 && !suppressed && (
        <>
          {/* MOBILE — bottom sticky bar (sits above MobileBottomNav on ordering routes,
              but on other routes it becomes the primary cart affordance). */}
          <motion.div
            key="mobile"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="md:hidden fixed inset-x-3 bottom-3 z-40"
          >
            <button
              onClick={() => cartDrawerActions.open()}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)] active:scale-[0.98] transition-transform"
              aria-label={`View cart, ${count} items, ${formatPKR(total)}`}
            >
              <div className="flex -space-x-2 shrink-0">
                {preview.map((l) => (
                  <div
                    key={l.key}
                    className="h-9 w-9 rounded-full ring-2 ring-primary overflow-hidden bg-secondary"
                  >
                    <img src={l.image} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
                {rest > 0 && (
                  <div className="h-9 w-9 rounded-full ring-2 ring-primary bg-primary-foreground/15 grid place-items-center text-[10px] font-extrabold">
                    +{rest}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left leading-tight">
                <div className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Delivery ~29 min
                </div>
                <div className="font-display font-extrabold text-sm truncate">
                  {count} item{count !== 1 ? "s" : ""} · {formatPKR(total)}
                </div>
              </div>
              <div className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[11px] font-bold">
                View <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          </motion.div>

          {/* DESKTOP — elegant floating card */}
          <motion.button
            key="desktop"
            initial={{ y: 60, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={() => cartDrawerActions.open()}
            className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl bg-background/95 backdrop-blur-xl border border-border shadow-[var(--shadow-floating)] hover:shadow-[var(--shadow-4)] hover:-translate-y-0.5 transition-all group"
            aria-label={`Open cart, ${count} items, ${formatPKR(total)}`}
          >
            <div className="relative h-11 w-11 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0">
              <ShoppingBag className="h-5 w-5" />
              <motion.span
                key={count}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 16 }}
                className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-background text-foreground text-[10px] font-extrabold grid place-items-center ring-2 ring-background"
              >
                {count}
              </motion.span>
            </div>
            <div className="text-left leading-tight pr-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> ETA ~29 min
              </div>
              <div className="font-display font-extrabold text-sm tabular-nums">
                {formatPKR(total)}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-[11px] font-bold group-hover:gap-1.5 transition-all">
              View cart <ArrowRight className="h-3 w-3" />
            </span>
          </motion.button>

          {/* Screen-reader link fallback (also useful for keyboard nav) */}
          <Link to="/cart" className="sr-only">
            View cart with {count} items totaling {formatPKR(total)}
          </Link>
        </>
      )}
    </AnimatePresence>
  );
}
