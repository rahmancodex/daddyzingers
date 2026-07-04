import { motion } from "framer-motion";
import { ShoppingBag, ChevronDown, Leaf, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroBurger from "@/assets/hero-burger.jpg";

const BADGES = [
  { icon: Leaf, label: "Fresh Ingredients" },
  { icon: ShieldCheck, label: "100% Halal" },
  { icon: Zap, label: "Fast Delivery" },
];

export function Hero() {
  return (
    <section id="home" className="relative min-h-dvh flex items-center overflow-hidden bg-secondary text-secondary-foreground pt-24 pb-16">
      {/* Ambient background layers */}
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-dark)" }} aria-hidden />
      <div
        className="absolute inset-0 -z-10 opacity-70"
        style={{ background: "var(--gradient-radial-glow)" }}
        aria-hidden
      />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl -z-10 opacity-30 bg-primary" aria-hidden />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl -z-10 opacity-20 bg-[var(--color-brand-red)]" aria-hidden />

      <div className="container-dz grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center relative">
        {/* Copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-6 border-white/20 text-white/90 bg-white/5 backdrop-blur">
              <Sparkles className="h-3 w-3 mr-1.5 text-primary" /> New — Signature Zinger XL is here
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
            className="text-display"
          >
            Crafted for{" "}
            <span className="text-gradient-brand">Cravings.</span>
            <br />
            Built for <span className="italic font-light">flavor.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 text-lg md:text-xl text-white/70 max-w-xl leading-relaxed"
          >
            Every zinger, hand-breaded. Every bun, baked fresh daily. A premium fast-food experience
            engineered around one thing — flavor you can't forget.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link to="/menu">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-semibold bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] group"
              >
                <ShoppingBag className="h-5 w-5 group-hover:rotate-[-8deg] transition-transform" />
                Order Now
              </Button>
            </Link>
            <Link to="/menu">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-semibold border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur"
              >
                Explore Menu
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-4"
          >
            {BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 grid place-items-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-white/80">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero image + floaties */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
          className="relative aspect-square w-full max-w-[620px] mx-auto"
        >
          {/* Glow disc */}
          <div className="absolute inset-8 rounded-full bg-primary/40 blur-3xl -z-10" aria-hidden />
          <div className="absolute inset-16 rounded-full border border-primary/30 -z-10" aria-hidden />

          <motion.img
            src={heroBurger}
            alt="Signature Daddy Zinger burger"
            width={1600}
            height={1600}
            className="relative z-10 w-full h-full object-cover rounded-full shadow-[var(--shadow-4)]"
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Floating chips */}
          <motion.div
            className="absolute top-6 -left-2 md:-left-6 z-20 rounded-2xl bg-background text-foreground px-4 py-3 shadow-[var(--shadow-floating)] flex items-center gap-3"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg. delivery</div>
              <div className="text-sm font-bold">18 min</div>
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-8 -right-2 md:-right-6 z-20 rounded-2xl bg-background text-foreground px-4 py-3 shadow-[var(--shadow-floating)]"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <div className="flex items-center gap-1 mb-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-2 w-2 rounded-full bg-primary" />
              ))}
            </div>
            <div className="text-xs text-muted-foreground">Rated by</div>
            <div className="text-sm font-bold">42,000+ foodies</div>
          </motion.div>

          <motion.div
            className="absolute top-1/2 -right-4 md:-right-10 z-20 rounded-full bg-[var(--color-brand-red)] text-white px-4 py-2 shadow-[var(--shadow-floating)] text-xs font-bold uppercase tracking-wider"
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            🔥 Hot & Fresh
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.a
        href="#categories"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 hover:text-white transition-colors"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        aria-label="Scroll down"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
        <ChevronDown className="h-4 w-4" />
      </motion.a>
    </section>
  );
}
