import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Star, Clock, Flame, ShoppingBag, X, Sparkles, Heart } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CUSTOMIZATIONS, MEAL_UPGRADES, MENU, formatPKR } from "@/lib/menu-data";
import {
  cartActions,
  drawerActions,
  favoriteActions,
  getMenuItem,
  useDrawer,
  useIsFavorite,
} from "@/lib/store";

export function GlobalProductDrawer() {
  const { id, open } = useDrawer();
  const item = id ? getMenuItem(id) : null;

  const [qty, setQty] = useState(1);
  const [selectedCustom, setSelectedCustom] = useState<Set<string>>(new Set());
  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const fav = useIsFavorite(item?.id ?? "");

  useEffect(() => {
    if (open && item) {
      setQty(1);
      setSelectedCustom(new Set());
      setSelectedUpgrades(new Set());
      setNotes("");
      setActiveImage(0);
      setZoom(false);
    }
  }, [open, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gallery = useMemo(() => {
    if (!item) return [];
    return item.gallery && item.gallery.length ? item.gallery : [item.image];
  }, [item]);

  const related = useMemo(() => {
    if (!item) return [];
    return MENU.filter((m) => m.id !== item.id && m.category === item.category).slice(0, 4);
  }, [item]);

  const totals = useMemo(() => {
    if (!item) return { unit: 0, addons: 0, subtotal: 0 };
    let addons = 0;
    CUSTOMIZATIONS.forEach((c) => selectedCustom.has(c.id) && (addons += c.price));
    MEAL_UPGRADES.forEach((u) => selectedUpgrades.has(u.id) && (addons += u.price));
    const unit = item.price + addons;
    return { unit, addons, subtotal: unit * qty };
  }, [item, qty, selectedCustom, selectedUpgrades]);

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const handleAdd = () => {
    if (!item) return;
    cartActions.add({
      item,
      qty,
      customizationIds: [...selectedCustom],
      upgradeIds: [...selectedUpgrades],
      notes,
    });
    toast.success(`${qty} × ${item.name} added`, {
      description: `Subtotal ${formatPKR(totals.subtotal)}`,
    });
    drawerActions.close();
  };

  const handleFav = () => {
    if (!item) return;
    const added = favoriteActions.toggle(item.id);
    added
      ? toast(`❤️ Saved ${item.name}`, { description: "Added to your favorites" })
      : toast(`Removed ${item.name}`, { description: "Taken out of favorites" });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && drawerActions.close()}>
      <SheetContent
        side="right"
        className="p-0 w-full sm:max-w-xl md:max-w-2xl lg:max-w-[560px] bg-background border-l border-border flex flex-col h-full [&>button]:hidden"
      >
        {item && (
          <>
            <SheetTitle className="sr-only">{item.name}</SheetTitle>

            <button
              onClick={() => drawerActions.close()}
              aria-label="Close"
              className="absolute top-4 right-4 z-30 h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border grid place-items-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div
                className="relative aspect-[4/3] w-full overflow-hidden bg-secondary cursor-zoom-in"
                onClick={() => setZoom((z) => !z)}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={gallery[activeImage]}
                    src={gallery[activeImage]}
                    alt={item.name}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: zoom ? 1.25 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                  {item.tags.includes("bestseller") && (
                    <Badge className="bg-primary text-primary-foreground border-0 text-[10px] font-bold uppercase tracking-wider px-2.5">
                      <Sparkles className="h-3 w-3 mr-1" /> Best Seller
                    </Badge>
                  )}
                  {item.tags.includes("new") && (
                    <Badge className="bg-info text-info-foreground border-0 text-[10px] font-bold uppercase tracking-wider">
                      New
                    </Badge>
                  )}
                  {item.tags.includes("spicy") && (
                    <Badge className="bg-destructive text-destructive-foreground border-0 text-[10px] font-bold uppercase tracking-wider">
                      <Flame className="h-3 w-3 mr-1" /> Spicy
                    </Badge>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFav();
                  }}
                  className="absolute top-4 right-16 h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border grid place-items-center hover:bg-primary hover:text-primary-foreground transition-all"
                  aria-label="Favorite"
                >
                  <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
                </button>

                {gallery.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {gallery.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImage(i);
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          i === activeImage ? "w-6 bg-primary" : "w-1.5 bg-white/60"
                        }`}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
                      {item.name}
                    </h2>
                    <div className="text-right shrink-0">
                      <div className="text-2xl md:text-3xl font-extrabold text-primary">
                        {formatPKR(totals.unit)}
                      </div>
                      {totals.addons > 0 && (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatPKR(item.price)}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-muted-foreground">{item.shortDescription}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      {item.rating} · {item.reviews.toLocaleString()} reviews
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {item.prepTime} min
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                      <Flame className="h-3.5 w-3.5" />
                      {item.calories} kcal
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                    About this dish
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/85">{item.longDescription}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border p-4 bg-card">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      Ingredients
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.ingredients.map((ing) => (
                        <span
                          key={ing}
                          className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border p-4 bg-card">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      Allergens
                    </div>
                    {item.allergens.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.allergens.map((a) => (
                          <span
                            key={a}
                            className="text-xs px-2 py-1 rounded-md bg-destructive/10 text-destructive font-medium"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">None declared</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        Customize
                      </div>
                      <div className="font-display text-lg font-bold">Make it yours</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Optional</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CUSTOMIZATIONS.map((c) => {
                      const active = selectedCustom.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`group flex items-center justify-between gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-all ${
                            active
                              ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                              : "border-border hover:border-foreground/20 bg-card"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={active}
                              onCheckedChange={() =>
                                toggle(selectedCustom, c.id, setSelectedCustom)
                              }
                            />
                            <span className="text-sm font-medium">{c.label}</span>
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              c.price > 0 ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {c.price > 0 ? `+${formatPKR(c.price)}` : "Free"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        Upgrade
                      </div>
                      <div className="font-display text-lg font-bold">Make it a meal</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {MEAL_UPGRADES.map((u) => {
                      const active = selectedUpgrades.has(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                            active
                              ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                              : "border-border hover:border-foreground/20 bg-card"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={active}
                              onCheckedChange={() =>
                                toggle(selectedUpgrades, u.id, setSelectedUpgrades)
                              }
                            />
                            <div>
                              <div className="text-sm font-semibold">{u.label}</div>
                              <div className="text-xs text-muted-foreground">{u.desc}</div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-primary">+{formatPKR(u.price)}</div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      Quantity
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="h-10 w-10 rounded-full grid place-items-center hover:bg-secondary transition-colors disabled:opacity-40"
                        disabled={qty <= 1}
                        aria-label="Decrease"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={qty}
                          initial={{ y: -8, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 8, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="min-w-8 text-center font-display text-lg font-bold"
                        >
                          {qty}
                        </motion.div>
                      </AnimatePresence>
                      <button
                        onClick={() => setQty((q) => Math.min(20, q + 1))}
                        className="h-10 w-10 rounded-full grid place-items-center bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors"
                        aria-label="Increase"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      Special notes
                    </div>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. No onions, extra crispy, easy on the mayo…"
                      className="resize-none min-h-[80px] rounded-xl"
                    />
                  </div>
                </div>

                {related.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                      Frequently bought together
                    </div>
                    <div className="font-display text-lg font-bold mb-3">You might also love</div>
                    <div className="grid grid-cols-2 gap-3">
                      {related.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            // Save current customized product to cart BEFORE swapping
                            // so no in-progress work is silently discarded.
                            cartActions.add({
                              item,
                              qty,
                              customizationIds: [...selectedCustom],
                              upgradeIds: [...selectedUpgrades],
                              notes,
                            });
                            toast.success(`${item.name} added`, {
                              description: `Opening ${r.name}…`,
                            });
                            drawerActions.swap(r);
                          }}
                          className="group text-left rounded-xl overflow-hidden border border-border bg-card hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all"
                        >
                          <div className="aspect-square overflow-hidden bg-secondary">
                            <img
                              src={r.image}
                              alt={r.name}
                              loading="lazy"
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                          <div className="p-3">
                            <div className="text-sm font-semibold truncate">{r.name}</div>
                            <div className="text-xs text-primary font-bold mt-0.5">
                              {formatPKR(r.price)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-4" />
              </div>
            </div>

            <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Ready in ~{item.prepTime} min
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Subtotal
                  </div>
                  <div className="font-display text-xl font-extrabold">
                    {formatPKR(totals.subtotal)}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleAdd}
                size="lg"
                className="w-full h-14 rounded-xl bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-bold text-base"
              >
                <ShoppingBag className="h-5 w-5" />
                Add {qty} to Cart · {formatPKR(totals.subtotal)}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
