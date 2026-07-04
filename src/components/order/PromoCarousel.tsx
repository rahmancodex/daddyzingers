import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Sparkles, Tag } from "lucide-react";
import heroBurger from "@/assets/hero-burger.jpg";
import itemZinger from "@/assets/item-zinger.jpg";
import catFries from "@/assets/cat-fries.jpg";

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  hash?: string;
  image: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const SLIDES: Slide[] = [
  {
    id: "signature",
    eyebrow: "Signature",
    title: "Two Zingers. One Legend.",
    subtitle: "Hand-breaded fillets, 11-spice crunch. Free delivery over Rs 1,500.",
    cta: "Order Zinger Platter",
    href: "/menu",
    hash: "platters",
    image: heroBurger,
    Icon: Sparkles,
    accent: "from-primary/40 via-primary/10 to-transparent",
  },
  {
    id: "welcome",
    eyebrow: "First order",
    title: "10% off with WELCOME10",
    subtitle: "New here? Add code at checkout for an instant treat on your first order.",
    cta: "Browse menu",
    href: "/menu",
    image: itemZinger,
    Icon: Tag,
    accent: "from-info/40 via-info/10 to-transparent",
  },
  {
    id: "loaded",
    eyebrow: "Fan favourite",
    title: "Loaded Fries · Cheese overload",
    subtitle: "Molten cheddar, jalapeños, olives, Zinger strips. Rs 490.",
    cta: "Add loaded fries",
    href: "/menu",
    hash: "sides",
    image: catFries,
    Icon: Flame,
    accent: "from-destructive/40 via-destructive/10 to-transparent",
  },
];

export function PromoCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative">
      <div className="container-dz pt-4 md:pt-6">
        <div className="relative h-[280px] sm:h-[320px] md:h-[380px] rounded-3xl overflow-hidden border border-border bg-brand-black">
          <AnimatePresence mode="wait">
            {SLIDES.map((s, i) =>
              i === index ? (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                  className="absolute inset-0"
                >
                  <img src={s.image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-45" />
                  <div className={`absolute inset-0 bg-gradient-to-r ${s.accent}`} />
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/70 to-transparent" />
                  <div className="relative h-full flex items-center">
                    <div className="p-6 sm:p-8 md:p-12 max-w-lg text-white">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
                        <s.Icon className="h-3 w-3" /> {s.eyebrow}
                      </div>
                      <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-extrabold leading-[1.05] tracking-tight">
                        {s.title}
                      </h2>
                      <p className="mt-2 md:mt-3 text-sm md:text-base text-white/75 max-w-md">{s.subtitle}</p>
                      <Link
                        to={s.href}
                        hash={s.hash}
                        className="mt-4 md:mt-6 inline-flex items-center gap-2 h-11 md:h-12 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm md:text-base shadow-[var(--shadow-glow)] hover:scale-[1.02] transition-transform"
                      >
                        {s.cta} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : null,
            )}
          </AnimatePresence>

          {/* Dots */}
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex gap-1.5 z-10">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-primary" : "w-2 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
