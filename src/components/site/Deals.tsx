import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import catDeals from "@/assets/cat-deals.jpg";
import itemZinger from "@/assets/item-zinger.jpg";
import itemChicken from "@/assets/item-chicken.jpg";

function useCountdown(hours: number) {
  const target = useState(() => Date.now() + hours * 3600_000)[0];
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { h, m, s };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="tabular-nums font-display text-2xl md:text-3xl font-extrabold bg-secondary text-secondary-foreground rounded-lg min-w-[56px] px-3 py-2 text-center shadow-[var(--shadow-2)]">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1.5">{label}</div>
    </div>
  );
}

const DEALS = [
  { title: "Family Feast", desc: "4 zingers, 10 wings, large fries, 1.5L drink.", price: 2499, old: 3400, discount: 27, img: catDeals, tone: "primary" as const },
  { title: "Solo Crush Combo", desc: "Signature zinger, medium fries, drink.", price: 899, old: 1199, discount: 25, img: itemZinger, tone: "dark" as const },
  { title: "Wing Wednesday", desc: "10 pcs fire-glazed wings + garlic dip.", price: 749, old: 999, discount: 25, img: itemChicken, tone: "red" as const },
];

export function Deals() {
  const c = useCountdown(6);

  return (
    <section id="deals" className="py-24 md:py-32 bg-surface">
      <div className="container-dz">
        <div className="grid lg:grid-cols-[1fr_auto] items-end gap-8 mb-12">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">04 — Limited time</div>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-2xl">
              Deals that end<br />
              <span className="text-gradient-brand">before your hunger.</span>
            </h2>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-background border border-border px-5 py-4 shadow-[var(--shadow-2)]">
            <div className="h-10 w-10 rounded-full bg-primary grid place-items-center">
              <Clock className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex gap-2">
              <CountdownUnit value={c.h} label="Hours" />
              <CountdownUnit value={c.m} label="Min" />
              <CountdownUnit value={c.s} label="Sec" />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {DEALS.map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`group relative rounded-3xl overflow-hidden border border-border shadow-[var(--shadow-3)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-500 ${
                d.tone === "primary" ? "bg-primary text-primary-foreground" : d.tone === "dark" ? "bg-secondary text-secondary-foreground" : "bg-card"
              }`}
            >
              <div className="relative aspect-[16/11] overflow-hidden">
                <img src={d.img} alt={d.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className={`absolute top-4 left-4 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider ${
                  d.tone === "red" ? "bg-[var(--color-brand-red)] text-white" : "bg-[var(--color-brand-red)] text-white"
                }`}>
                  {d.discount}% OFF
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-extrabold tracking-tight">{d.title}</h3>
                <p className={`text-sm mt-1.5 ${d.tone === "primary" ? "text-primary-foreground/80" : d.tone === "dark" ? "text-white/70" : "text-muted-foreground"}`}>{d.desc}</p>
                <div className="mt-5 flex items-end justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-extrabold">Rs {d.price.toLocaleString()}</span>
                    <span className={`text-sm line-through ${d.tone === "primary" ? "text-primary-foreground/60" : d.tone === "dark" ? "text-white/50" : "text-muted-foreground"}`}>
                      Rs {d.old.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={d.tone === "primary" ? "secondary" : "default"}
                    className={`rounded-full font-semibold ${d.tone === "dark" ? "bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)]" : ""}`}
                  >
                    Grab deal
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
