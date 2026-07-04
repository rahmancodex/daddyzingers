import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  X,
  Star,
  Plus,
  Heart,
  Flame,
  Sparkles,
  ImageOff,
  TrendingUp,
  Clock,
} from "lucide-react";
import { OrderHeader } from "@/components/order/OrderHeader";
import { MobileBottomNav } from "@/components/order/MobileBottomNav";
import { PromoCarousel } from "@/components/order/PromoCarousel";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES,
  MENU,
  FILTERS,
  POPULAR_SEARCHES,
  formatPKR,
  type MenuCategory,
  type MenuItem,
} from "@/lib/menu-data";
import {
  drawerActions,
  favoriteActions,
  useFavorites,
} from "@/lib/store";

const RECENT_KEY = "dz_recent_searches";

export function OrderingExperience({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const [activeCat, setActiveCat] = useState<MenuCategory>("burgers");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<string>("popular");
  const [recent, setRecent] = useState<string[]>([]);
  const favsList = useFavorites();
  const favs = useMemo(() => new Set(favsList), [favsList]);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const isScrollingByClick = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as MenuCategory;
    if (CATEGORIES.some((c) => c.id === hash)) {
      setTimeout(() => scrollToCategory(hash), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const filteredMenu = useMemo(() => {
    let list = MENU;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.shortDescription.toLowerCase().includes(q) ||
          m.ingredients.some((i) => i.toLowerCase().includes(q))
      );
    }
    switch (filter) {
      case "bestseller":
        list = list.filter((m) => m.tags.includes("bestseller"));
        break;
      case "new":
        list = list.filter((m) => m.tags.includes("new"));
        break;
      case "spicy":
        list = list.filter((m) => m.tags.includes("spicy"));
        break;
      case "chicken":
        list = list.filter((m) => m.tags.includes("chicken"));
        break;
      case "beef":
        list = list.filter((m) => m.tags.includes("beef"));
        break;
      case "deal":
        list = list.filter((m) => m.tags.includes("deal"));
        break;
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      default:
        list = [...list].sort((a, b) => b.reviews - a.reviews);
    }
    return list;
  }, [search, filter]);

  const grouped = useMemo(() => {
    const map: Record<MenuCategory, MenuItem[]> = {
      burgers: [],
      shawarma: [],
      rolls: [],
      platters: [],
      broast: [],
      sides: [],
      drinks: [],
      extras: [],
    };
    filteredMenu.forEach((m) => map[m.category].push(m));
    return map;
  }, [filteredMenu]);

  const toggleFav = (item: MenuItem) => {
    const added = favoriteActions.toggle(item.id);
    added
      ? toast(`❤️ Saved ${item.name}`, { description: "Added to your favorites" })
      : toast(`Removed ${item.name}`, { description: "Taken out of favorites" });
  };

  const openItem = (item: MenuItem) => {
    drawerActions.open(item);
  };

  const scrollToCategory = (id: MenuCategory) => {
    setActiveCat(id);
    const el = sectionRefs.current[id];
    if (el) {
      isScrollingByClick.current = true;
      const y = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top: y, behavior: "smooth" });
      setTimeout(() => (isScrollingByClick.current = false), 800);
    }
  };

  useEffect(() => {
    const onScroll = () => {
      if (isScrollingByClick.current) return;
      const scrollY = window.scrollY + 200;
      let current: MenuCategory | null = null;
      for (const cat of CATEGORIES) {
        const el = sectionRefs.current[cat.id];
        if (el && el.offsetTop <= scrollY) current = cat.id;
      }
      if (current && current !== activeCat) setActiveCat(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeCat]);

  const commitSearch = (q: string) => {
    setSearch(q);
    if (!q.trim()) return;
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const totalItems = filteredMenu.length;

  return (
    <>
      {!hideHeader && <OrderHeader />}

      {/* PROMO CAROUSEL */}
      <PromoCarousel />

      {/* STICKY CATEGORY NAV + SEARCH */}
      <div className="sticky top-14 md:top-[72px] z-40 bg-background/85 backdrop-blur-xl border-b border-border">


        <div className="container-dz py-2 md:py-3 flex items-center gap-2 md:gap-3">
          <div className="flex-1 -mx-4 md:mx-0 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            <div className="flex items-center gap-1.5 md:gap-2 px-4 md:px-0 min-w-max">
              {CATEGORIES.map((c) => {
                const active = activeCat === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => scrollToCategory(c.id)}
                    className={`relative shrink-0 snap-start inline-flex items-center gap-1.5 h-9 md:h-10 px-3 md:px-3.5 rounded-full border text-[13px] md:text-sm font-semibold transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                        : "bg-card border-border hover:border-foreground/20 text-foreground/80"
                    }`}
                  >
                    <span aria-hidden className="text-sm leading-none">{c.icon}</span>
                    <span>{c.label}</span>
                    {active && (
                      <motion.span
                        layoutId="cat-active"
                        className="absolute inset-0 rounded-full ring-2 ring-primary/40"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-full grid place-items-center border border-border bg-card hover:border-primary hover:text-primary transition-all"
            aria-label="Search menu"
          >
            {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        {/* Filters row */}
        <div className="container-dz pb-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mr-1 hidden sm:block">
              Sort · Filter
            </div>
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search panel */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden border-t border-border bg-background"
            >
              <div className="container-dz py-5">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white group-hover:text-black group-focus-within:text-black transition-colors z-10 pointer-events-none" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitSearch(search);
                    }}
                    placeholder="Search zinger, fries, shawarma…"
                    className="w-full h-14 pl-11 pr-11 rounded-2xl bg-[hsl(0_0%_10%)] hover:bg-primary focus:bg-primary border-2 border-transparent focus:border-primary text-base font-medium text-white placeholder:text-white/70 hover:text-black hover:placeholder:text-black/70 focus:text-black focus:placeholder:text-black/60 focus:outline-none focus:ring-4 focus:ring-primary/25 transition-all duration-200"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full grid place-items-center bg-white/10 hover:bg-black/20 text-white group-hover:text-black group-focus-within:text-black transition-colors z-10"
                      aria-label="Clear"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>


                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recent.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Recent
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recent.map((r) => (
                          <button
                            key={r}
                            onClick={() => commitSearch(r)}
                            className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3" /> Popular
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SEARCHES.map((p) => (
                        <button
                          key={p}
                          onClick={() => commitSearch(p)}
                          className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MENU SECTIONS */}
      <main className="container-dz py-8 md:py-14">
        {totalItems === 0 ? (
          <EmptyState query={search} onClear={() => setSearch("")} />
        ) : (
          <div className="space-y-12 md:space-y-20">
            {CATEGORIES.map((cat) => {
              const items = grouped[cat.id];
              if (!items || items.length === 0) return null;
              return (
                <section
                  key={cat.id}
                  ref={(el) => {
                    sectionRefs.current[cat.id] = el;
                  }}
                  id={cat.id}
                  className="scroll-mt-40"
                >
                  <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
                    <div className="min-w-0">
                      <div className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1.5 md:mb-2 flex items-center gap-2">
                        <span aria-hidden className="text-sm md:text-base">{cat.icon}</span>
                        <span className="truncate">{cat.tagline}</span>
                      </div>
                      <h2 className="font-display text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
                        {cat.label}
                      </h2>
                    </div>
                    <div className="text-[11px] md:text-xs text-muted-foreground shrink-0 pb-1">
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {items.map((item, i) => (
                      <ProductCard
                        key={item.id}
                        item={item}
                        index={i}
                        fav={favs.has(item.id)}
                        onFav={() => toggleFav(item)}
                        onOpen={() => openItem(item)}
                        onQuickAdd={() => openItem(item)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </>
  );
}

/* ============================== */
/*         PRODUCT CARD           */
/* ============================== */
function ProductCard({
  item,
  index,
  fav,
  onFav,
  onOpen,
  onQuickAdd,
}: {
  item: MenuItem;
  index: number;
  fav: boolean;
  onFav: () => void;
  onOpen: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <motion.div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: (index % 8) * 0.04, ease: [0.25, 1, 0.5, 1] }}
      className="group relative text-left rounded-2xl overflow-hidden bg-card border border-border shadow-[var(--shadow-2)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {item.tags.includes("bestseller") && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Best
            </span>
          )}
          {item.tags.includes("new") && (
            <span className="px-2 py-1 rounded-full bg-info text-info-foreground text-[10px] font-bold uppercase tracking-wider">
              New
            </span>
          )}
          {item.tags.includes("spicy") && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider">
              <Flame className="h-3 w-3" /> Spicy
            </span>
          )}
        </div>

        {/* Fav */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFav();
          }}
          className="absolute top-3 right-3 h-9 w-9 rounded-full grid place-items-center bg-background/85 backdrop-blur border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          aria-label={fav ? "Remove favorite" : "Add favorite"}
        >
          <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>

        {/* Quick add */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          aria-label={`Quick add ${item.name}`}
          className="absolute bottom-3 right-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all inline-flex items-center gap-1.5 h-10 pl-3 pr-4 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-[var(--shadow-glow)] hover:scale-105"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="p-4 md:p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display font-bold text-base md:text-lg tracking-tight leading-tight line-clamp-1">
            {item.name}
          </h3>
          <div className="inline-flex items-center gap-1 text-xs font-semibold shrink-0">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            {item.rating}
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.25rem]">
          {item.shortDescription}
        </p>
        <div className="flex items-center justify-between pt-2">
          <div className="font-display text-lg font-extrabold text-primary">
            {formatPKR(item.price)}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            <Clock className="h-3 w-3 inline mr-0.5" /> {item.prepTime}m
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================== */
/*          EMPTY STATE           */
/* ============================== */
function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="py-20 md:py-28 text-center max-w-md mx-auto">
      <div className="relative mx-auto h-32 w-32 mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-primary/5" />
        <div className="absolute inset-0 grid place-items-center">
          <ImageOff className="h-12 w-12 text-primary" />
        </div>
      </div>
      <h3 className="font-display text-2xl font-bold tracking-tight">
        Nothing matches "{query}"
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Try a different search, or browse the full menu.
      </p>
      <Button onClick={onClear} className="mt-6 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] font-semibold">
        Clear search
      </Button>
    </div>
  );
}
