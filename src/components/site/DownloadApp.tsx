import { heroBurger } from "@/assets";
import { motion } from "framer-motion";
import { Apple, Smartphone, Bell, Gift, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DownloadApp() {
  return (
    <section className="py-16 md:py-24 bg-secondary text-secondary-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-radial-glow)" }} aria-hidden />
      <div className="container-dz relative grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">08 — Get the app</div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Craving on tap.<br />
            <span className="text-gradient-brand">Order in 3 taps.</span>
          </h2>
          <p className="mt-6 text-white/70 text-lg max-w-lg leading-relaxed">
            Track your rider live, unlock app-only deals, and save your usual. Free to download — coming to iOS and Android soon.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-14 px-6 bg-white text-secondary hover:bg-white/90 gap-3">
              <Apple className="h-6 w-6" />
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase tracking-wider opacity-70">Coming soon</div>
                <div className="text-sm font-bold">App Store</div>
              </div>
            </Button>
            <Button size="lg" className="h-14 px-6 bg-white text-secondary hover:bg-white/90 gap-3">
              <Smartphone className="h-6 w-6" />
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase tracking-wider opacity-70">Coming soon</div>
                <div className="text-sm font-bold">Google Play</div>
              </div>
            </Button>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10">
            <div className="text-sm text-white/60 mb-3">Or get launch alerts + a free zinger on day one:</div>
            <form className="flex gap-2 max-w-md" onSubmit={(e) => e.preventDefault()}>
              <Input placeholder="you@email.com" className="h-12 bg-white/5 border-white/15 text-white placeholder:text-white/40" />
              <Button className="h-12 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] font-semibold px-6">
                Notify me
              </Button>
            </form>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
            {[
              { icon: Bell, label: "Live rider tracking" },
              { icon: Gift, label: "App-only deals" },
              { icon: Zap, label: "1-tap reorder" },
            ].map((f) => (
              <div key={f.label} className="text-center">
                <div className="mx-auto h-10 w-10 rounded-xl bg-white/5 border border-white/10 grid place-items-center mb-2">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-xs text-white/70">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto"
        >
          <div className="absolute inset-0 rounded-[60px] bg-primary/40 blur-3xl -z-10" />
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-[280px] md:w-[320px] aspect-[9/19] rounded-[48px] bg-neutral-900 border-[10px] border-neutral-800 shadow-[var(--shadow-modal)] overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20" />
            <div className="absolute inset-0 bg-background text-foreground">
              <div className="p-5 pt-10">
                <div className="text-xs text-muted-foreground">Good evening,</div>
                <div className="font-display text-xl font-extrabold">What's the craving?</div>
                <div className="mt-4 rounded-xl overflow-hidden aspect-[16/10] relative">
                  <img src={heroBurger} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <div className="text-[10px] uppercase tracking-wider">Today's pick</div>
                    <div className="font-bold text-sm">Signature Zinger</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["Burgers", "Wings", "Wraps"].map((c) => (
                    <div key={c} className="rounded-lg bg-muted p-2 text-center text-[10px] font-semibold">{c}</div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-primary text-primary-foreground p-3 text-center text-sm font-bold">
                  Track your order →
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
