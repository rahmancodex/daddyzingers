import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCartCount, useCartTotal } from "@/lib/store";
import { formatPKR } from "@/lib/menu-data";
import { toast } from "sonner";

export function FloatingCart() {
  const count = useCartCount();
  const total = useCartTotal();

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          onClick={() =>
            toast("Checkout coming soon", {
              description: `${count} item${count !== 1 ? "s" : ""} · ${formatPKR(total)}`,
            })
          }
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fixed bottom-5 right-5 md:bottom-8 md:right-8 z-40 group inline-flex items-center gap-3 pl-4 pr-5 py-3 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:scale-105 transition-transform"
          aria-label={`Cart, ${count} items, ${formatPKR(total)}`}
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            <motion.span
              key={count}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 16 }}
              className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full bg-background text-foreground text-[10px] font-extrabold grid place-items-center"
            >
              {count}
            </motion.span>
          </div>
          <div className="flex flex-col leading-none text-left">
            <span className="text-[10px] uppercase tracking-wider opacity-80">View cart</span>
            <span className="font-display font-extrabold text-sm">{formatPKR(total)}</span>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
