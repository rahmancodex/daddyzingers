import { MapPin, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BRANCHES, branchActions, useBranch } from "@/lib/location-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function LocationSelector({ compact = false }: { compact?: boolean }) {
  const branch = useBranch();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`group inline-flex items-center gap-2 rounded-full border border-border bg-card/70 hover:border-primary/50 hover:bg-card transition-all ${
            compact ? "px-2.5 py-1.5" : "px-3 py-2"
          }`}
          aria-label="Change delivery location"
        >
          <span className="h-7 w-7 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <span className="text-left leading-tight min-w-0">
            <span className="block text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Deliver to
            </span>
            <span className="block text-xs font-bold truncate max-w-[130px]">{branch.name}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0 border-border bg-background/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[var(--shadow-4)]">
        <div className="p-4 border-b border-border">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Choose branch</div>
          <div className="font-display font-bold text-base">Pick your Daddy Zinger</div>
        </div>
        <div className="p-2">
          <AnimatePresence>
            {BRANCHES.map((b) => {
              const active = b.id === branch.id;
              return (
                <motion.button
                  key={b.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    branchActions.set(b.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left flex items-start gap-3 rounded-xl px-3 py-3 transition-colors ${
                    active ? "bg-primary/10" : "hover:bg-secondary"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/70"}`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm truncate">{b.name}</span>
                      {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{b.area} · {b.address}</div>
                    <div className="text-[10px] text-primary font-semibold mt-0.5">
                      ETA {b.etaMin}–{b.etaMax} min
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}
