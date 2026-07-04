import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, User, Menu as MenuIcon, X, LayoutDashboard } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/site/Logo";
import { searchActions, useCartCount } from "@/lib/store";
import { useAuth } from "@/lib/auth";

type NavItem = { label: string; href?: string; to?: string };
const NAV: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Menu", to: "/menu" },
  { label: "Deals", href: "/#deals" },
  { label: "About", href: "/#why" },
  { label: "Contact", href: "/#contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const count = useCartCount();
  const { user } = useAuth();
  const initials =
    (user?.user_metadata?.full_name || user?.email || "?")
      .split(/\s+/)
      .map((s: string) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      const isMobile = window.innerWidth < 1024;
      if (isMobile && !open) {
        const delta = y - lastY.current;
        if (y > 120 && delta > 6) setHidden(true);
        else if (delta < -4) setHidden(false);
      } else {
        setHidden(false);
      }
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: hidden ? -100 : 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-[background,border,box-shadow] duration-500 ${
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-[var(--shadow-2)]"
          : "bg-background/70 backdrop-blur-md border-b border-border/40"
      }`}
    >
      <div className="container-dz flex items-center justify-between h-16 md:h-20">
        <Link to="/" hash="home" className="flex items-center gap-2.5 md:gap-3 group min-w-0" aria-label="Daddy Zinger — Home">
          <div className="relative h-11 w-11 md:h-14 md:w-14 rounded-2xl overflow-hidden ring-1 ring-primary/25 shadow-[var(--shadow-glow)] group-hover:ring-primary/60 group-hover:scale-[1.04] transition-all">
            <Logo className="h-full w-full object-cover" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-display text-base md:text-lg font-extrabold tracking-tight truncate">Daddy Zinger</div>
            <div className="hidden sm:block text-[10px] uppercase tracking-[0.28em] text-muted-foreground -mt-0.5">Choice of the family</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) =>
            n.to ? (
              <Link
                key={n.label}
                to={n.to}
                className="relative px-4 py-2 text-sm font-semibold text-foreground/85 hover:text-foreground transition-colors group"
                activeProps={{ className: "text-primary" }}
              >
                {n.label}
                <span className="absolute left-4 right-4 -bottom-0.5 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              </Link>
            ) : (
              <a
                key={n.label}
                href={n.href}
                className="relative px-4 py-2 text-sm font-semibold text-foreground/85 hover:text-foreground transition-colors group"
              >
                {n.label}
                <span className="absolute left-4 right-4 -bottom-0.5 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              </a>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Search" onClick={() => searchActions.open()}>
            <Search className="h-4 w-4" />
          </Button>
          <Link to="/cart" aria-label="Cart">
            <Button variant="ghost" size="icon" className="relative" aria-label="Cart">
              <ShoppingBag className="h-4 w-4" />
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="absolute -top-0.5 -right-0.5"
                >
                  <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground rounded-full">
                    {count}
                  </Badge>
                </motion.span>
              )}
            </Button>
          </Link>
          {user ? (
            <Link to="/dashboard" className="ml-1">
              <Button variant="ghost" size="sm" className="gap-2 pl-1 pr-3">
                <Avatar className="h-7 w-7 ring-1 ring-primary/30">
                  <AvatarImage src={user.user_metadata?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden xl:inline text-sm">Dashboard</span>
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <User className="h-4 w-4" /> Login
              </Button>
            </Link>
          )}
          <Link to="/menu">
            <Button className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-glow)] ml-2 font-semibold rounded-full px-5">
              Order Now
            </Button>
          </Link>
        </div>

        <div className="flex md:hidden items-center gap-1.5">
          <Link to="/cart" aria-label="Cart">
            <Button variant="ghost" size="icon" className="relative h-10 w-10" aria-label="Cart">
              <ShoppingBag className="h-4 w-4" />
              {count > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground rounded-full">
                  {count}
                </Badge>
              )}
            </Button>
          </Link>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/60 backdrop-blur active:scale-95 transition-transform"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden border-t border-border bg-background/98 backdrop-blur-xl"
          >
            <div className="container-dz py-4 flex flex-col gap-1">
              {NAV.map((n) =>
                n.to ? (
                  <Link
                    key={n.label}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-lg text-base font-medium hover:bg-accent"
                  >
                    {n.label}
                  </Link>
                ) : (
                  <a
                    key={n.label}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-lg text-base font-medium hover:bg-accent"
                  >
                    {n.label}
                  </a>
                )
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setOpen(false);
                    searchActions.open();
                  }}
                >
                  <Search className="h-4 w-4" /> Search
                </Button>
                <Link to={user ? "/dashboard" : "/auth"} className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">
                    {user ? (
                      <>
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4" /> Login
                      </>
                    )}
                  </Button>
                </Link>
              </div>
              <Link to="/menu" onClick={() => setOpen(false)}>
                <Button className="w-full mt-1 bg-primary text-primary-foreground font-semibold rounded-full h-12">
                  Order Now {count > 0 && `· ${count}`}
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
