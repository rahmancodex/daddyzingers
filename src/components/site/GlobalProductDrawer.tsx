import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Star, Clock, Flame, ShoppingBag, X, Sparkles, Heart, Check } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MENU,
  formatPKR,
  resolveItemOptions,
  type OptionGroup,
  type OptionChoice,
} from "@/lib/menu-data";
import {
  cartActions,
  drawerActions,
  favoriteActions,
  getMenuItem,
  useDrawer,
  useIsFavorite,
  type CartLine,
} from "@/lib/store";

/* --------- selection helpers --------- */
type Selection = Record<string, Set<string>>;

function initSelection(groups: OptionGroup[]): Selection {
  const s: Selection = {};
  for (const g of groups) {
    if (g.type === "single" && g.required && g.choices[0]) {
      s[g.id] = new Set([g.choices[0].id]);
    } else {
      s[g.id] = new Set();
    }
  }
  return s;
}

export function GlobalProductDrawer() {
  const { id, open } = useDrawer();
  const item = id ? getMenuItem(id) : null;

  const groups = useMemo<OptionGroup[]>(() => (item ? resolveItemOptions(item) : []), [item]);

  const [qty, setQty] = useState(1);
  const [selection, setSelection] = useState<Selection>({});
  const [notes, setNotes] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const fav = useIsFavorite(item?.id ?? "");

  useEffect(() => {
    if (open && item) {
      setQty(1);
      setSelection(initSelection(groups));
      setNotes("");
      setActiveImage(0);
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

  /** Compute base price from `size` group when item has sizes, else item.price */
  const basePrice = useMemo(() => {
    if (!item) return 0;
    if (item.sizes && item.sizes.length) {
      const sel = selection.size;
      const picked = sel && sel.size ? null : sel ? [...sel][0] : null;
      const sizeId = picked ?? item.sizes[0].id;
      const size = item.sizes.find((s) => s.id === sizeId);
      return size ? size.price : item.sizes[0].price;
    }
    return item.price;
  }, [item, selection]);

  const { customEntries, upgradeEntries, addonsTotal } = useMemo(() => {
    const custom: { id: string; label: string; price: number }[] = [];
    const upgrade: { id: string; label: string; price: number }[] = [];
    let total = 0;
    for (const g of groups) {
      if (g.id === "size") continue; // size handled via basePrice
      const sel = selection[g.id];
      if (!sel || sel.size === 0) continue;
      for (const c of g.choices) {
        if (!sel.has(c.id)) continue;
        const label = `${g.label}: ${c.label}`;
        const entry = { id: `${g.id}:${c.id}`, label, price: c.priceDelta };
        total += c.priceDelta;
        (g.id === "meal" ? upgrade : custom).push(entry);
      }
    }
    return { customEntries: custom, upgradeEntries: upgrade, addonsTotal: total };
  }, [groups, selection]);

  const unitPrice = basePrice + addonsTotal;
  const subtotal = unitPrice * qty;

  const toggle = (group: OptionGroup, choice: OptionChoice) => {
    setSelection((prev) => {
      const cur = new Set(prev[group.id] ?? []);
      if (group.type === "single") {
        cur.clear();
        cur.add(choice.id);
      } else {
        cur.has(choice.id) ? cur.delete(choice.id) : cur.add(choice.id);
      }
      return { ...prev, [group.id]: cur };
    });
  };

  const missingRequired = groups.some(
    (g) => g.required && (!selection[g.id] || selection[g.id].size === 0),
  );

  const handleAdd = () => {
    if (!item || missingRequired) return;
    cartActions.add({
      item,
      qty,
      notes,
      customEntries,
      upgradeEntries,
      basePriceOverride: basePrice,
    });
    toast.success(`${qty} × ${item.name} added`, {
      description: `Subtotal ${formatPKR(subtotal)}`,
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
        className="p-0 w-full sm:max-w-md md:max-w-lg bg-background border-l border-border flex flex-col h-full [&>button]:hidden"
      >
        {item && (
          <>
            <SheetTitle className="sr-only">{item.name}</SheetTitle>

            <button
              onClick={() => drawerActions.close()}
              aria-label="Close"
              className="absolute top-3 right-3 z-30 h-9 w-9 rounded-full bg-background/85 backdrop-blur border border-border grid place-items-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* IMAGE */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={gallery[activeImage]}
                    src={gallery[activeImage]}
                    alt={item.name}
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[70%]">
                  {item.tags.includes("bestseller") && (
                    <Badge className="bg-primary text-primary-foreground border-0 text-[10px] font-bold uppercase tracking-wider">
                      <Sparkles className="h-3 w-3 mr-1" /> Best
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
                  onClick={handleFav}
                  className="absolute top-3 right-14 h-9 w-9 rounded-full bg-background/85 backdrop-blur border border-border grid place-items-center hover:bg-primary hover:text-primary-foreground transition-all"
                  aria-label="Favorite"
                >
                  <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
                </button>

                {gallery.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {gallery.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === activeImage ? "w-6 bg-primary" : "w-1.5 bg-white/60"
                        }`}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* HEADER */}
              <div className="px-5 pt-5 md:px-6 md:pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl md:text-[28px] font-extrabold tracking-tight leading-tight">
                      {item.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {item.shortDescription}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl md:text-2xl font-extrabold text-primary tabular-nums">
                      {formatPKR(unitPrice)}
                    </div>
                    {addonsTotal > 0 && (
                      <div className="text-[11px] text-muted-foreground line-through tabular-nums">
                        {formatPKR(basePrice)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <MetaChip icon={<Star className="h-3 w-3 fill-primary text-primary" />}>
                    {item.rating} · {item.reviews.toLocaleString()}
                  </MetaChip>
                  <MetaChip icon={<Clock className="h-3 w-3" />}>{item.prepTime} min</MetaChip>
                  <MetaChip icon={<Flame className="h-3 w-3" />}>{item.calories} kcal</MetaChip>
                </div>
              </div>

              {/* OPTION GROUPS */}
              <div className="px-5 md:px-6 py-5 space-y-5">
                {groups.map((g) => (
                  <OptionGroupBlock
                    key={g.id}
                    group={g}
                    selection={selection[g.id] ?? new Set()}
                    onToggle={(c) => toggle(g, c)}
                  />
                ))}

                {/* Quantity + notes */}
                <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                  <div>
                    <SectionLabel>Qty</SectionLabel>
                    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="h-9 w-9 rounded-full grid place-items-center hover:bg-secondary transition-colors disabled:opacity-40"
                        disabled={qty <= 1}
                        aria-label="Decrease"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={qty}
                          initial={{ y: -6, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 6, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="min-w-7 text-center font-display text-base font-bold tabular-nums"
                        >
                          {qty}
                        </motion.div>
                      </AnimatePresence>
                      <button
                        onClick={() => setQty((q) => Math.min(20, q + 1))}
                        className="h-9 w-9 rounded-full grid place-items-center bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors"
                        aria-label="Increase"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <SectionLabel>Special notes</SectionLabel>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. No onions, extra crispy…"
                      className="resize-none min-h-[64px] rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* About + ingredients (compact) */}
                <details className="rounded-xl border border-border bg-card">
                  <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Details, ingredients & allergens
                  </summary>
                  <div className="px-4 pb-4 space-y-3 text-sm">
                    <p className="text-foreground/85 leading-relaxed">{item.longDescription}</p>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
                        Ingredients
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.ingredients.map((ing) => (
                          <span key={ing} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                    {item.allergens.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
                          Allergens
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {item.allergens.map((a) => (
                            <span key={a} className="text-xs px-2 py-0.5 rounded-md bg-destructive/10 text-destructive font-medium">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>

                {related.length > 0 && (
                  <div>
                    <SectionLabel>You might also love</SectionLabel>
                    <div className="grid grid-cols-2 gap-2.5">
                      {related.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            if (!missingRequired) {
                              cartActions.add({
                                item,
                                qty,
                                notes,
                                customEntries,
                                upgradeEntries,
                                basePriceOverride: basePrice,
                              });
                              toast.success(`${item.name} added`, { description: `Opening ${r.name}…` });
                            }
                            drawerActions.swap(r);
                          }}
                          className="group text-left rounded-xl overflow-hidden border border-border bg-card hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all"
                        >
                          <div className="aspect-square overflow-hidden bg-secondary">
                            <img src={r.image} alt={r.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="p-2.5">
                            <div className="text-xs font-semibold truncate">{r.name}</div>
                            <div className="text-[11px] text-primary font-bold mt-0.5">
                              {formatPKR(r.price)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-2" />
              </div>
            </div>

            {/* STICKY ADD TO CART */}
            <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-xl px-4 py-3 md:px-5 md:py-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <Button
                onClick={handleAdd}
                disabled={missingRequired}
                size="lg"
                className="w-full h-13 rounded-xl bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-bold text-sm md:text-base disabled:opacity-60 min-h-12"
              >
                <ShoppingBag className="h-5 w-5" />
                {missingRequired ? "Select required options" : `Add ${qty} · ${formatPKR(subtotal)}`}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================ */
/*  Sub-components                                              */
/* ============================================================ */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 font-semibold">
      {children}
    </div>
  );
}

function MetaChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-[11px] font-medium">
      {icon}
      {children}
    </div>
  );
}

function OptionGroupBlock({
  group,
  selection,
  onToggle,
}: {
  group: OptionGroup;
  selection: Set<string>;
  onToggle: (c: OptionChoice) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <div className="font-display text-sm font-bold uppercase tracking-wider">{group.label}</div>
          {group.required && (
            <span className="text-[9px] uppercase tracking-widest text-primary font-bold">Required</span>
          )}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {group.type === "single" ? "Pick one" : "Pick any"}
        </div>
      </div>
      <div className={`grid gap-1.5 ${group.choices.length > 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {group.choices.map((c) => {
          const active = selection.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggle(c)}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                active
                  ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                  : "border-border hover:border-foreground/25 bg-card"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`h-5 w-5 shrink-0 grid place-items-center rounded-${group.type === "single" ? "full" : "md"} border-2 transition-all ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {active && <Check className="h-3 w-3" strokeWidth={3} />}
                </div>
                <span className="text-sm font-medium truncate">{c.label}</span>
              </div>
              {c.priceDelta !== 0 && (
                <span className="text-xs font-semibold text-primary shrink-0 tabular-nums">
                  +{formatPKR(c.priceDelta)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
