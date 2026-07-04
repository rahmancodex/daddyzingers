import { motion } from "framer-motion";
import { Heart, Plus, Flame, Star, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPKR, useMenuItems, type MenuItem } from "@/lib/menu";
import {
  drawerActions,
  favoriteActions,
  useFavorites,
} from "@/lib/store";

/**
 * Preferred bestsellers, in display order. We first honour `is_bestseller`
 * flagged items from the DB, then fall back to any items whose `tags`
 * include "bestseller". Limited to 4.
 */
function pickBestsellers(all: MenuItem[]): MenuItem[] {
  const flagged = all.filter((m) => m.isBestseller);
  const tagged = all.filter((m) => !m.isBestseller && m.tags.includes("bestseller"));
  return [...flagged, ...tagged].slice(0, 4);
}

export function Bestsellers() {
  const favs = useFavorites();
  const all = useMenuItems();
  const items = pickBestsellers(all);

  const openCustomize = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    drawerActions.open(item);
  };


  const toggleFav = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const added = favoriteActions.toggle(item.id);
    added
      ? toast(`❤️ Saved ${item.name}`, { description: "Added to your favorites" })
      : toast(`Removed ${item.name}`, { description: "Taken out of favorites" });
  };

  return (
    <section id="menu" className="py-16 md:py-24 bg-background">
      <div className="container-dz">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">02 — Bestsellers</div>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-2xl">
              The most-loved,<br />
              <span className="text-gradient-brand">most-craved.</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm">
            Hand-picked from thousands of orders each week. Your city's favorites, right now.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => {
            const fav = favs.includes(item.id);
            return (
              <motion.div
                key={item.id}
                onClick={() => drawerActions.open(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && drawerActions.open(item)}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative rounded-3xl bg-card border border-border overflow-hidden shadow-[var(--shadow-2)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {item.tags.includes("bestseller") && (
                      <Badge className="bg-primary text-primary-foreground border-0 shadow gap-1">
                        <Sparkles className="h-3 w-3" /> Bestseller
                      </Badge>
                    )}
                    {item.tags.includes("new") && (
                      <Badge className="bg-info text-info-foreground border-0 shadow">New</Badge>
                    )}
                    {item.tags.includes("spicy") && (
                      <Badge className="bg-[var(--color-brand-red)] text-white border-0 shadow gap-1">
                        <Flame className="h-3 w-3" /> Spicy
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={(e) => toggleFav(item, e)}
                    className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/90 backdrop-blur grid place-items-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    aria-label={fav ? "Remove favorite" : "Add favorite"}
                  >
                    <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
                  </button>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                    <Star className="h-3 w-3 fill-primary text-primary" /> {item.rating} ·{" "}
                    {item.reviews.toLocaleString()} orders
                  </div>
                  <h3 className="text-lg font-bold tracking-tight">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {item.shortDescription}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="font-display text-xl font-extrabold">
                      {formatPKR(item.price)}
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => openCustomize(item, e)}
                      className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] gap-1 h-9 rounded-full font-semibold"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <Link to="/menu">
            <Button size="lg" variant="outline" className="h-12 px-8 font-semibold">
              View Full Menu
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
