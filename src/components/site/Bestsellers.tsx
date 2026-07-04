import { motion } from "framer-motion";
import { Heart, Plus, Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import itemZinger from "@/assets/item-zinger.jpg";
import itemBeef from "@/assets/item-beef.jpg";
import itemShawarma from "@/assets/item-shawarma.jpg";
import itemChicken from "@/assets/item-chicken.jpg";

const ITEMS = [
  { name: "Signature Zinger", desc: "Buttermilk chicken, brioche, secret sauce", price: 749, rating: 4.9, tag: "Bestseller", img: itemZinger, hot: true },
  { name: "Double Beef Stack", desc: "Two smashed patties, bacon, cheddar", price: 1099, rating: 4.8, tag: "New", img: itemBeef },
  { name: "Chicken Shawarma", desc: "Slow-marinated, garlic yogurt, pita", price: 549, rating: 4.7, tag: "Chef's pick", img: itemShawarma },
  { name: "Crispy Wing Bucket", desc: "10 pcs · fire-glazed or classic", price: 1249, rating: 4.9, tag: "Sharer", img: itemChicken, hot: true },
];

export function Bestsellers() {
  return (
    <section id="menu" className="py-24 md:py-32 bg-background">
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
          {ITEMS.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative rounded-3xl bg-card border border-border overflow-hidden shadow-[var(--shadow-2)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-500"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={item.img}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <Badge className="bg-secondary text-secondary-foreground border-0 shadow">{item.tag}</Badge>
                  {item.hot && (
                    <Badge className="bg-[var(--color-brand-red)] text-white border-0 shadow gap-1">
                      <Flame className="h-3 w-3" /> Hot
                    </Badge>
                  )}
                </div>
                <button
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/90 backdrop-blur grid place-items-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label="Favorite"
                >
                  <Heart className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                  <Star className="h-3 w-3 fill-primary text-primary" /> {item.rating} · 2k+ orders
                </div>
                <h3 className="text-lg font-bold tracking-tight">{item.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.desc}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="font-display text-xl font-extrabold">
                    Rs {item.price.toLocaleString()}
                  </div>
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] gap-1 h-9 rounded-full font-semibold"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button size="lg" variant="outline" className="h-12 px-8 font-semibold">
            View Full Menu
          </Button>
        </div>
      </div>
    </section>
  );
}
