import { itemZinger, itemBeef, itemShawarma, itemChicken, catFries, catDeals, catDesserts, heroBurger } from "@/assets";
import { motion } from "framer-motion";
import { Instagram, Heart } from "lucide-react";








const IMGS = [
  { src: heroBurger, span: "row-span-2", likes: "12.4k" },
  { src: itemBeef, span: "", likes: "8.9k" },
  { src: catFries, span: "", likes: "6.2k" },
  { src: itemShawarma, span: "row-span-2", likes: "9.1k" },
  { src: itemChicken, span: "", likes: "11.3k" },
  { src: catDeals, span: "", likes: "5.7k" },
  { src: itemZinger, span: "", likes: "14.8k" },
  { src: catDesserts, span: "", likes: "4.4k" },
];

export function Gallery() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container-dz">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">07 — On the gram</div>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-2xl">
              Tagged <span className="text-gradient-brand">#DaddyZinger</span>
            </h2>
          </div>
          <a href="#" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/90 transition">
            <Instagram className="h-4 w-4" /> @daddyzinger
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[220px] gap-3">
          {IMGS.map((img, i) => (
            <motion.a
              key={i}
              href="#"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={`group relative overflow-hidden rounded-xl bg-muted ${img.span}`}
            >
              <img src={img.src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white flex items-center gap-1.5 text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                <Heart className="h-4 w-4 fill-primary text-primary" /> {img.likes}
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
