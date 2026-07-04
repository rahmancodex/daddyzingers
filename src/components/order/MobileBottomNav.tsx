import { Link, useRouterState } from "@tanstack/react-router";
import { UtensilsCrossed, Sparkles, ShoppingBag, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCartCount } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const ITEMS = [
  { label: "Menu", to: "/menu", icon: UtensilsCrossed, match: (p: string) => p === "/menu" || p === "/" },
  { label: "Offers", to: "/menu", hash: "platters", icon: Sparkles, match: (p: string, h: string) => (p === "/menu" || p === "/") && h === "platters" },
  { label: "Cart", to: "/cart", icon: ShoppingBag, match: (p: string) => p === "/cart" },
  { label: "Account", to: "/dashboard", icon: User, match: (p: string) => p.startsWith("/dashboard") || p === "/auth" },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const count = useCartCount();
  const { user } = useAuth();

  return (
    <div
      aria-hidden
      className="md:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none h-[calc(env(safe-area-inset-bottom)+92px)]"
      style={{ background: "linear-gradient(to top, hsl(var(--background)) 40%, transparent)" }}
    >
      <nav
        aria-label="Primary"
        className="pointer-events-auto absolute bottom-3 left-3 right-3 rounded-2xl border border-border/70 bg-background/70 backdrop-blur-xl shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)] mb-[env(safe-area-inset-bottom)]"
      >
        <ul className="relative grid grid-cols-4">
          {ITEMS.map((item) => {
            const active = item.match(pathname, hash);
            const to = item.label === "Account" && !user ? "/auth" : item.to;
            return (
              <li key={item.label} className="relative">
                <Link
                  to={to}
                  hash={item.hash}
                  className="relative flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] text-[10px] font-semibold tracking-wide transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-pill"
                      className="absolute inset-1.5 rounded-xl bg-primary/12 border border-primary/25"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className={`relative h-6 w-6 grid place-items-center transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                    <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                    {item.label === "Cart" && count > 0 && (
                      <motion.span
                        key={count}
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-extrabold grid place-items-center shadow-[var(--shadow-glow)]"
                      >
                        {count}
                      </motion.span>
                    )}
                  </div>
                  <span className={`relative ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
