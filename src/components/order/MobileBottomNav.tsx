import { Link, useRouterState } from "@tanstack/react-router";
import { UtensilsCrossed, Tag, ShoppingBag, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCartCount } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const ITEMS = [
  { label: "Menu", to: "/menu", icon: UtensilsCrossed, match: (p: string) => p === "/menu" },
  { label: "Offers", to: "/menu", hash: "platters", icon: Tag, match: (p: string, h: string) => p === "/menu" && h === "platters" },
  { label: "Cart", to: "/cart", icon: ShoppingBag, match: (p: string) => p === "/cart" },
  { label: "Account", to: "/dashboard", icon: User, match: (p: string) => p.startsWith("/dashboard") || p === "/auth" },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const count = useCartCount();
  const { user } = useAuth();

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active = item.match(pathname, hash);
          const to = item.label === "Account" && !user ? "/auth" : item.to;
          return (
            <li key={item.label}>
              <Link
                to={to}
                hash={item.hash}
                className="relative flex flex-col items-center justify-center gap-1 py-2.5 min-h-14 text-[10px] font-semibold uppercase tracking-wider transition-colors"
              >
                <div className={`relative h-6 w-6 grid place-items-center transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <item.icon className="h-5 w-5" />
                  {item.label === "Cart" && count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                      className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-extrabold grid place-items-center"
                    >
                      {count}
                    </motion.span>
                  )}
                </div>
                <span className={active ? "text-primary" : "text-muted-foreground"}>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
