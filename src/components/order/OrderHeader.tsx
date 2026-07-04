import { Link } from "@tanstack/react-router";
import { ShoppingBag, Award, Bike, Store } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Logo } from "@/components/site/Logo";
import { LocationSelector } from "./LocationSelector";
import { AccountMenu } from "./AccountMenu";
import { useCartCount, useCartTotal, cartDrawerActions } from "@/lib/store";
import { formatPKR } from "@/lib/menu-data";
import { branchActions, useOrderMethod } from "@/lib/location-store";

export function OrderHeader() {
  const count = useCartCount();
  const total = useCartTotal();
  const method = useOrderMethod();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-background/85 backdrop-blur-2xl border-b border-border/80 shadow-[var(--shadow-2)]"
            : "bg-background/70 backdrop-blur-xl border-b border-border/40"
        }`}
      >
        <div className="container-dz flex items-center gap-2 md:gap-4 h-14 md:h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 shrink-0 group" aria-label="Daddy Zinger — Home">
            <div className="relative h-9 w-9 md:h-11 md:w-11 rounded-xl md:rounded-2xl overflow-hidden ring-1 ring-primary/25 shadow-[var(--shadow-glow)] group-hover:ring-primary/60 group-hover:scale-[1.04] transition-all">
              <Logo className="h-full w-full object-cover" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-display text-sm md:text-base font-extrabold tracking-tight">Daddy Zinger</div>
              <div className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground -mt-0.5">Order Online</div>
            </div>
          </Link>

          {/* Delivery / Pickup toggle (desktop) */}
          <div className="hidden md:inline-flex items-center gap-0.5 p-1 rounded-full border border-border bg-card/70 backdrop-blur ml-2">
            <MethodBtn
              active={method === "delivery"}
              onClick={() => branchActions.setMethod("delivery")}
              icon={<Bike className="h-3.5 w-3.5" />}
              label="Delivery"
            />
            <MethodBtn
              active={method === "pickup"}
              onClick={() => branchActions.setMethod("pickup")}
              icon={<Store className="h-3.5 w-3.5" />}
              label="Pickup"
            />
          </div>

          {/* Branch (desktop) */}
          <div className="hidden md:block">
            <LocationSelector />
          </div>

          <div className="flex-1" />

          {/* Rewards (desktop) */}
          <Link
            to="/dashboard/rewards"
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 h-10 rounded-full text-xs font-semibold text-foreground/85 hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Award className="h-3.5 w-3.5 text-primary" /> Rewards
          </Link>

          <AccountMenu compact />

          {/* Cart pill */}
          <button
            onClick={() => cartDrawerActions.open()}
            className="relative inline-flex items-center gap-2 h-9 md:h-11 pl-2.5 pr-3 md:pl-3 md:pr-4 rounded-full bg-primary text-primary-foreground font-semibold text-xs md:text-sm shadow-[var(--shadow-glow)] hover:scale-[1.04] active:scale-[0.98] transition-transform"
            aria-label={`Open cart, ${count} items`}
          >
            <div className="relative">
              <ShoppingBag className="h-4 w-4" />
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 16 }}
                  className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full bg-background text-foreground text-[10px] font-extrabold grid place-items-center"
                >
                  {count}
                </motion.span>
              )}
            </div>
            <span className="hidden sm:inline tabular-nums">
              {count > 0 ? formatPKR(total) : "Cart"}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile: method toggle + branch (NOT sticky — scrolls away naturally) */}
      <div className="md:hidden container-dz pt-3 pb-1 flex items-center gap-2">
        <div className="inline-flex items-center gap-0.5 p-1 rounded-full border border-border bg-card/70 shrink-0">
          <MethodBtn
            active={method === "delivery"}
            onClick={() => branchActions.setMethod("delivery")}
            icon={<Bike className="h-3.5 w-3.5" />}
            label="Delivery"
            compact
          />
          <MethodBtn
            active={method === "pickup"}
            onClick={() => branchActions.setMethod("pickup")}
            icon={<Store className="h-3.5 w-3.5" />}
            label="Pickup"
            compact
          />
        </div>
        <div className="min-w-0 flex-1">
          <LocationSelector compact />
        </div>
      </div>
    </>
  );
}

function MethodBtn({
  active,
  onClick,
  icon,
  label,
  compact = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 rounded-full font-semibold transition-all ${
        compact ? "h-8 px-2.5 text-[11px]" : "h-8 px-3 text-xs"
      } ${
        active
          ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
          : "text-foreground/70 hover:text-foreground"
      }`}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
