import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import itemZinger from "@/assets/item-zinger.jpg";
import itemBeef from "@/assets/item-beef.jpg";
import itemShawarma from "@/assets/item-shawarma.jpg";
import itemChicken from "@/assets/item-chicken.jpg";
import catFries from "@/assets/cat-fries.jpg";
import catDrinks from "@/assets/cat-drinks.jpg";
import catDeals from "@/assets/cat-deals.jpg";
import catDesserts from "@/assets/cat-desserts.jpg";

const CATS = [
  { name: "Zinger Burgers", count: "12 items", img: itemZinger, span: "md:col-span-2 md:row-span-2", featured: true },
  { name: "Chicken Burgers", count: "9 items", img: itemChicken, span: "" },
  { name: "Beef Burgers", count: "7 items", img: itemBeef, span: "" },
  { name: "Shawarma & Wraps", count: "6 items", img: itemShawarma, span: "md:col-span-2" },
  { name: "Fries & Sides", count: "10 items", img: catFries, span: "" },
  { name: "Drinks", count: "14 items", img: catDrinks, span: "" },
  { name: "Deals & Combos", count: "8 items", img: catDeals, span: "md:col-span-2" },
  { name: "Desserts", count: "5 items", img: catDesserts, span: "" },
];

export function Categories() {
  return (
    <section id="categories" className="py-24 md:py-32 bg-surface">
      <div className="container-dz">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">01 — Categories</div>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-2xl">
              Every craving,<br />
              <span className="text-gradient-brand">one destination.</span>
            </h2>
          </div>
          <a href="#menu" className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
            View full menu
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[220px] gap-4">
          {CATS.map((c, i) => (
            <motion.a
              key={c.name}
              href="#menu"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={`group relative overflow-hidden rounded-2xl bg-card border border-border shadow-[var(--shadow-2)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-500 ${c.span}`}
            >
              <img
                src={c.img}
                alt={c.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              {c.featured && (
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                  Bestseller
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between text-white">
                <div>
                  <div className="text-xs text-white/60 uppercase tracking-wider">{c.count}</div>
                  <div className="text-lg md:text-xl font-bold tracking-tight">{c.name}</div>
                </div>
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
