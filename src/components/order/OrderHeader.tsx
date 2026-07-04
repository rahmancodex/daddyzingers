import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, Tag, Award } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/site/Logo";
import { LocationSelector } from "./LocationSelector";
import { AccountMenu } from "./AccountMenu";
import { searchActions, useCartCount, useCartTotal, cartDrawerActions } from "@/lib/store";
import { formatPKR } from "@/lib/menu-data";

export function OrderHeader() {
  const count = useCartCount();
  const total = useCartTotal();

  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border">
      {/* Row 1: logo + primary actions */}
      <div className="container-dz flex items-center gap-3 h-16 md:h-20">
        <Link to="/" className="flex items-center gap-2 md:gap-3 shrink-0 group" aria-label="Daddy Zinger — Home">
          <div className="relative h-10 w-10 md:h-12 md:w-12 rounded-2xl overflow-hidden ring-1 ring-primary/25 shadow-[var(--shadow-glow)] group-hover:ring-primary/50 transition-all">
            <Logo className="h-full w-full object-cover" />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="font-display text-sm md:text-base font-extrabold tracking-tight">Daddy Zinger</div>
            <div className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground -mt-0.5">Order Online</div>
          </div>
        </Link>

        <div className="hidden md:block">
          <LocationSelector />
        </div>

        {/* Search — desktop expanded, mobile icon */}
        <button
          onClick={() => searchActions.open()}
          className="hidden md:flex flex-1 items-center gap-2 h-11 px-4 rounded-full border border-border bg-card/70 hover:border-primary/40 hover:bg-card transition-all text-left text-sm text-muted-foreground max-w-md mx-auto"
        >
          <Search className="h-4 w-4" />
          <span>Search zinger, fries, shawarma…</span>
          <kbd className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded border border-border bg-background/50">⌘K</kbd>
        </button>

        <div className="flex-1 md:hidden" />

        <div className="hidden md:flex items-center gap-1">
          <Link
            to="/menu"
            hash="platters"
            className="inline-flex items-center gap-1.5 px-3 h-10 rounded-full text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Tag className="h-3.5 w-3.5" /> Offers
          </Link>
          <Link
            to="/dashboard/rewards"
            className="inline-flex items-center gap-1.5 px-3 h-10 rounded-full text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Award className="h-3.5 w-3.5" /> Rewards
          </Link>
        </div>

        {/* Search icon (mobile) */}
        <button
          onClick={() => searchActions.open()}
          aria-label="Search"
          className="md:hidden h-10 w-10 rounded-full grid place-items-center border border-border bg-card/70 hover:border-primary/40 transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>

        <AccountMenu compact />

        {/* Cart pill */}
        <button
          onClick={() => cartDrawerActions.open()}
          className="relative inline-flex items-center gap-2 h-10 md:h-11 pl-3 pr-3 md:pr-4 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-[var(--shadow-glow)] hover:scale-[1.03] transition-transform"
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

      {/* Row 2 — mobile location strip */}
      <div className="md:hidden container-dz pb-2.5 -mt-1">
        <LocationSelector compact />
      </div>
    </header>
  );
}
