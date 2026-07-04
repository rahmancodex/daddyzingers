import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, BadgeCheck, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const REVIEWS = [
  { name: "Ayesha K.", city: "Karachi", order: "Signature Zinger × 2", rating: 5, quote: "Genuinely the crispiest zinger in the city. The sauce is dangerous — I ordered again the next day.", avatar: "AK" },
  { name: "Bilal R.", city: "Lahore", order: "Family Feast", rating: 5, quote: "Feeded four people, everyone was smiling. Delivery was hot, packaging felt premium. This is our new Friday tradition.", avatar: "BR" },
  { name: "Sana M.", city: "Islamabad", order: "Chicken Shawarma", rating: 5, quote: "Real ingredients you can taste. Marination is on another level and the pita is soft. Feels like a proper restaurant meal.", avatar: "SM" },
  { name: "Hamza T.", city: "Karachi", order: "Wing Bucket", rating: 5, quote: "Fire-glazed wings are unreal. Perfect char, real heat, no shortcuts. Daddy Zinger is now on speed dial.", avatar: "HT" },
];

export function Reviews() {
  const [i, setI] = useState(0);
  const r = REVIEWS[i];
  const prev = () => setI((v) => (v - 1 + REVIEWS.length) % REVIEWS.length);
  const next = () => setI((v) => (v + 1) % REVIEWS.length);

  return (
    <section className="py-24 md:py-32 bg-surface">
      <div className="container-dz">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">06 — Reviews</div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Loved by <span className="text-gradient-brand">real people.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-end">
          <div className="relative rounded-3xl bg-card border border-border p-8 md:p-12 shadow-[var(--shadow-3)] overflow-hidden min-h-[320px]">
            <Quote className="absolute top-6 right-6 h-24 w-24 text-primary/10" />
            <AnimatePresence mode="wait">
              <motion.div
                key={r.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-1 mb-5">
                  {Array.from({ length: r.rating }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-2xl md:text-3xl font-display font-semibold leading-tight tracking-tight max-w-3xl">
                  "{r.quote}"
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">
                    {r.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold">
                      {r.name}
                      <BadgeCheck className="h-4 w-4 text-info" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.city} · Verified order — {r.order}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex lg:flex-col gap-3 items-center justify-between lg:justify-end">
            <div className="text-sm text-muted-foreground tabular-nums font-display">
              <span className="text-2xl font-extrabold text-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span> / {String(REVIEWS.length).padStart(2, "0")}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prev} aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={next} className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)]" aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
