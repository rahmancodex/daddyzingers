import { catDeals, itemZinger, itemChicken } from "@/assets";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { drawerActions } from "@/lib/store";



function useCountdown(hours: number) {
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = Date.now() + hours * 3600_000;
    setTarget(t);
    setNow(Date.now());
    setMounted(true);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hours]);
  const diff = mounted ? Math.max(0, target - now) : hours * 3600_000;
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { h, m, s, mounted };
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

type Deal = {
  itemId: string;
  title: string;
  desc: string;
  price: number;
  old: number;
  discount: number;
  img: string;
  tone: "primary" | "dark" | "red";
};

const DEALS: Deal[] = [
  { itemId: "zinger-platter", title: "Family Feast", desc: "Zinger Platter · 2 zingers, loaded fries, drink & dips.", price: 1290, old: 1700, discount: 24, img: catDeals, tone: "primary" },
  { itemId: "loaded-zinger", title: "Solo Crush Combo", desc: "Loaded Zinger — cheese, jalapeños, olives, house mayo.", price: 650, old: 820, discount: 21, img: itemZinger, tone: "dark" },
  { itemId: "hot-wings", title: "Fire Wings Wednesday", desc: "6 pcs Buffalo-style hot wings with cool ranch.", price: 420, old: 560, discount: 25, img: itemChicken, tone: "red" },
];

export function Deals() {
  const c = useCountdown(6);

  return (
    <section id="deals" className="py-16 md:py-24 bg-surface">
      <div className="container-dz">
        <div className="grid lg:grid-cols-[1fr_auto] items-end gap-6 md:gap-8 mb-8 md:mb-12">
          <div>
            <div className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2 md:mb-3">04 — Limited time</div>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-2xl">
              Deals that end<br />
              <span className="text-gradient-brand">before your hunger.</span>
            </h2>
          </div>
          <div className="flex items-center gap-3 md:gap-4 rounded-2xl bg-background border border-border px-4 py-3 md:px-5 md:py-4 shadow-[var(--shadow-2)]">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary grid place-items-center shrink-0">
              <Clock className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex gap-2" suppressHydrationWarning>
              <CountdownUnit value={c.h} label="Hours" />
              <CountdownUnit value={c.m} label="Min" />
              <CountdownUnit value={c.s} label="Sec" />
            </div>
          </div>
        </div>


        <div className="grid md:grid-cols-3 gap-6">
          {DEALS.map((d, i) => (
            <motion.button
              type="button"
              key={d.title}
              onClick={() => drawerActions.openById(d.itemId)}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`group relative text-left rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-2)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                d.tone === "primary" ? "bg-primary text-primary-foreground" : d.tone === "dark" ? "bg-secondary text-secondary-foreground" : "bg-card"
              }`}
            >
              <div className="relative aspect-[16/11] overflow-hidden">
                <img src={d.img} alt={d.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 left-4 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider bg-[var(--color-brand-red)] text-white">
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
                  <span
                    className={`inline-flex items-center rounded-full h-9 px-4 text-xs font-bold uppercase tracking-wider ${
                      d.tone === "primary"
                        ? "bg-background text-foreground"
                        : "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                    }`}
                  >
                    Grab deal
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
