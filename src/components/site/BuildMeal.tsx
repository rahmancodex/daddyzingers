import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MENU } from "@/lib/menu-data";
import { cartActions, drawerActions } from "@/lib/store";
import itemZinger from "@/assets/item-zinger.jpg";
import itemBeef from "@/assets/item-beef.jpg";
import itemShawarma from "@/assets/item-shawarma.jpg";
import catFries from "@/assets/cat-fries.jpg";
import catDrinks from "@/assets/cat-drinks.jpg";
import catDesserts from "@/assets/cat-desserts.jpg";

type Opt = { id: string; itemId?: string; name: string; price: number; img: string };

const BURGERS: Opt[] = [
  { id: "b-zinger", itemId: "zinger", name: "Signature Zinger", price: 490, img: itemZinger },
  { id: "b-loaded", itemId: "loaded-zinger", name: "Loaded Zinger", price: 650, img: itemZinger },
  { id: "b-beef", itemId: "double-patty-burger", name: "Double Patty Beef", price: 620, img: itemBeef },
  { id: "b-wrap", itemId: "zinger-shawarma", name: "Zinger Shawarma", price: 380, img: itemShawarma },
];
const FRIES: Opt[] = [
  { id: "f-classic", itemId: "french-fries", name: "Classic Fries", price: 220, img: catFries },
  { id: "f-loaded", itemId: "loaded-fries", name: "Loaded Fries", price: 380, img: catFries },
];
const DRINKS: Opt[] = [
  { id: "d-cola", name: "Cola 330ml", price: 120, img: catDrinks },
  { id: "d-tea", name: "Iced Tea 330ml", price: 150, img: catDrinks },
];
const SAUCES: Opt[] = [
  { id: "s-mayo", name: "Garlic Mayo", price: 60, img: catDesserts },
  { id: "s-hot", name: "Fire Chilli", price: 60, img: catDesserts },
  { id: "s-bbq", name: "Smoky BBQ", price: 60, img: catDesserts },
];

const STEPS = [
  { key: "burger", label: "Choose your burger", opts: BURGERS },
  { key: "fries", label: "Add a side", opts: FRIES },
  { key: "drink", label: "Pick a drink", opts: DRINKS },
  { key: "sauce", label: "Signature sauce", opts: SAUCES },
] as const;

export function BuildMeal() {
  const [sel, setSel] = useState<Record<string, Opt | undefined>>({});

  const total = useMemo(
    () => Object.values(sel).reduce((s, o) => s + (o?.price ?? 0), 0),
    [sel],
  );
  const chosenCount = Object.values(sel).filter(Boolean).length;

  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container-dz">
        <div className="max-w-2xl mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">05 — Build your meal</div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Design a meal<br />
            <span className="text-gradient-brand">that's uniquely you.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
          {/* Picker */}
          <div className="space-y-8">
            {STEPS.map((step, si) => (
              <div key={step.key}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold ${sel[step.key] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {sel[step.key] ? <Check className="h-4 w-4" /> : si + 1}
                  </div>
                  <h3 className="text-lg font-bold tracking-tight">{step.label}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {step.opts.map((o) => {
                    const active = sel[step.key]?.id === o.id;
                    return (
                      <div key={o.id} className="relative">
                        <button
                          onClick={() => setSel((s) => ({ ...s, [step.key]: active ? undefined : o }))}
                          className={`group relative block w-full rounded-2xl overflow-hidden border-2 text-left transition-all duration-300 ${active ? "border-primary shadow-[var(--shadow-glow)]" : "border-border hover:border-primary/40"}`}
                        >
                          <div className="aspect-[4/3] overflow-hidden bg-muted">
                            <img src={o.img} alt={o.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="p-3">
                            <div className="font-semibold text-sm">{o.name}</div>
                            <div className="text-xs text-muted-foreground">+ Rs {o.price}</div>
                          </div>
                          {active && (
                            <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                        </button>
                        {o.itemId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              drawerActions.openById(o.itemId!);
                            }}
                            className="absolute bottom-2 right-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-background/85 border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                          >
                            Details
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-28">
            <div className="rounded-3xl bg-secondary text-secondary-foreground p-8 shadow-[var(--shadow-4)] relative overflow-hidden">
              <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-radial-glow)" }} aria-hidden />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/60 mb-3">
                  <Sparkles className="h-3 w-3 text-primary" /> Your meal
                </div>
                <div className="font-display text-3xl font-extrabold mb-1">
                  {chosenCount === 0 ? "Start building" : `${chosenCount} of 4 chosen`}
                </div>
                <div className="text-white/60 text-sm mb-6">Real-time preview as you pick.</div>

                <div className="relative h-48 mb-6 grid place-items-center">
                  <AnimatePresence>
                    {STEPS.map((step, i) => {
                      const item = sel[step.key];
                      if (!item) return null;
                      const angle = (i - 1.5) * 25;
                      return (
                        <motion.img
                          key={item.id}
                          src={item.img}
                          alt={item.name}
                          initial={{ opacity: 0, scale: 0.5, y: 40, rotate: 0 }}
                          animate={{ opacity: 1, scale: 1, y: 0, rotate: angle }}
                          exit={{ opacity: 0, scale: 0.5, y: -20 }}
                          transition={{ type: "spring", stiffness: 200, damping: 18 }}
                          className="absolute h-32 w-32 rounded-2xl object-cover shadow-[var(--shadow-floating)] border-4 border-secondary"
                          style={{ zIndex: 10 - i, transform: `translateX(${(i - 1.5) * 40}px)` }}
                        />
                      );
                    })}
                  </AnimatePresence>
                  {chosenCount === 0 && (
                    <div className="text-white/30 text-sm italic">Your combo appears here</div>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  {STEPS.map((step) => {
                    const item = sel[step.key];
                    return (
                      <div key={step.key} className="flex items-center justify-between text-sm border-b border-white/10 pb-2">
                        <span className="text-white/60">{step.label.split(" ").slice(-1)[0]}</span>
                        <span className="font-medium">{item ? item.name : "—"}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm text-white/60 uppercase tracking-wider">Total</span>
                  <span className="font-display text-4xl font-extrabold text-primary">Rs {total}</span>
                </div>
                <Button
                  disabled={chosenCount < 4}
                  onClick={() => {
                    if (chosenCount < 4) return;
                    let added = 0;
                    STEPS.forEach((step) => {
                      const opt = sel[step.key];
                      if (!opt || !opt.itemId) return;
                      const menuItem = MENU.find((m) => m.id === opt.itemId);
                      if (!menuItem) return;
                      cartActions.add({
                        item: menuItem,
                        qty: 1,
                        customizationIds: [],
                        upgradeIds: [],
                        notes: "",
                      });
                      added++;
                    });
                    toast.success("Your combo is in the cart", {
                      description: `${added} item${added !== 1 ? "s" : ""} · Rs ${total}`,
                    });
                    setSel({});
                  }}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] font-semibold disabled:opacity-40"
                >
                  {chosenCount < 4 ? `Pick ${4 - chosenCount} more` : "Add meal to cart"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
