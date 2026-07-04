import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, User, Menu as MenuIcon, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/site/Logo";

const NAV = [
  { label: "Home", href: "#home" },
  { label: "Menu", href: "#menu" },
  { label: "Deals", href: "#deals" },
  { label: "About", href: "#why" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-[var(--shadow-2)]"
          : "bg-transparent"
      }`}
    >
      <div className="container-dz flex items-center justify-between h-16 md:h-20">
        <Link to="/" hash="home" className="flex items-center gap-2.5 group">
          <div className="relative h-11 w-11 rounded-xl bg-brand-black grid place-items-center overflow-hidden shadow-[var(--shadow-glow)] group-hover:scale-105 transition-transform">
            <Logo className="h-9 w-9 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-extrabold tracking-tight">Daddy Zinger</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground -mt-0.5">Choice of the family</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="relative px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors group"
            >
              {n.label}
              <span className="absolute left-4 right-4 -bottom-0.5 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="relative" aria-label="Cart">
            <ShoppingBag className="h-4 w-4" />
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground rounded-full">2</Badge>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <User className="h-4 w-4" /> Login
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] ml-2 font-semibold">
            Order Now
          </Button>
        </div>

        <button
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/60 backdrop-blur"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden border-t border-border bg-background/95 backdrop-blur-xl"
          >
            <div className="container-dz py-4 flex flex-col gap-1">
              {NAV.map((n) => (
                <a
                  key={n.label}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-3 rounded-lg text-base font-medium hover:bg-accent"
                >
                  {n.label}
                </a>
              ))}
              <div className="flex gap-2 pt-3">
                <Button variant="outline" className="flex-1"><User className="h-4 w-4" />Login</Button>
                <Button className="flex-1 bg-primary text-primary-foreground">Order Now</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
