import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/menu";
import { useKeyboardOpen } from "@/hooks/use-keyboard-open";
import { cn } from "@/lib/utils";

/**
 * Mobile-only sticky checkout bar. Sits above <MobileBottomNav />
 * (which is ~82px + env(safe-area-inset-bottom)). Hides itself when the
 * on-screen keyboard is open so it never covers focused inputs.
 */
export function MobileCheckoutBar({
  total,
  to,
  label = "Continue to checkout",
  ariaLabel,
  itemCount,
}: {
  total: number;
  to: "/checkout" | "/cart";
  label?: string;
  ariaLabel?: string;
  itemCount?: number;
}) {
  const keyboardOpen = useKeyboardOpen();

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{
        y: keyboardOpen ? 200 : 0,
        opacity: keyboardOpen ? 0 : 1,
      }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "lg:hidden fixed inset-x-0 z-40 px-3 pointer-events-none",
        // Sit just above the floating MobileBottomNav pill.
        "bottom-[calc(env(safe-area-inset-bottom)+88px)]",
      )}
      aria-hidden={keyboardOpen}
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] p-2.5 flex items-center gap-3">
        <div className="flex-1 min-w-0 pl-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground leading-none">
            {itemCount != null ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Order total"}
          </div>
          <div className="mt-1 font-display font-extrabold text-lg tabular-nums leading-none truncate">
            {formatPKR(total)}
          </div>
        </div>
        <Link to={to} className="shrink-0" aria-label={ariaLabel ?? label}>
          <Button className="h-11 px-4 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-semibold">
            {label} <ArrowRight className="h-4 w-4 ml-0.5" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
