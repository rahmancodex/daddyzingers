import { motion } from "framer-motion";
import { Leaf, Sparkles, Truck, ShieldCheck, Wallet, Heart } from "lucide-react";

const FEATURES = [
  { icon: Leaf, title: "Fresh Chicken Daily", desc: "Sourced every morning. Never frozen, never yesterday.", stat: "0hr", statLabel: "cold storage" },
  { icon: Sparkles, title: "Premium Ingredients", desc: "House-baked brioche, in-house sauces, imported spice.", stat: "12+", statLabel: "signature recipes" },
  { icon: Truck, title: "Lightning Delivery", desc: "GPS-tracked riders, insulated bags, hot to your door.", stat: "18min", statLabel: "avg. arrival" },
  { icon: ShieldCheck, title: "Hygienic Kitchen", desc: "ISO-audited stations, daily deep clean, glove-only prep.", stat: "A+", statLabel: "food safety" },
  { icon: Wallet, title: "Fair Pricing", desc: "Premium quality without the premium markup. Every day.", stat: "Rs 249", statLabel: "meals from" },
  { icon: Heart, title: "Loved by 42k+", desc: "Rated 4.9 across delivery apps and city foodie forums.", stat: "4.9", statLabel: "avg. rating" },
];

export function WhyUs() {
  return (
    <section id="why" className="py-16 md:py-24 bg-secondary text-secondary-foreground relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: "var(--gradient-radial-glow)" }}
        aria-hidden
      />
      <div className="container-dz relative">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">03 — Why Daddy Zinger</div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Premium is not a<br />
            <span className="text-gradient-brand">price tag. It's a promise.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group relative rounded-2xl p-7 bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] hover:border-primary/40 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start justify-between mb-6">
                <div className="h-12 w-12 rounded-xl bg-primary grid place-items-center shadow-[var(--shadow-glow)]">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-extrabold text-primary">{f.stat}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/50">{f.statLabel}</div>
                </div>
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">{f.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
