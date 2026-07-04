import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, Clock, Flame, Sparkles } from "lucide-react";
import { MENU, POPULAR_SEARCHES, formatPKR } from "@/lib/menu-data";
import { drawerActions, searchActions, useSearchOpen } from "@/lib/store";

const RECENT_KEY = "dz_recent_searches";

export function GlobalSearch() {
  const open = useSearchOpen();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setHighlight(0);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") searchActions.close();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchActions.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [] as typeof MENU;
    return MENU.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        m.shortDescription.toLowerCase().includes(s) ||
        m.ingredients.some((i) => i.toLowerCase().includes(s)),
    ).slice(0, 8);
  }, [q]);

  const commitRecent = (term: string) => {
    const next = [term, ...recent.filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const openItem = (id: string, term?: string) => {
    if (term) commitRecent(term);
    drawerActions.openById(id);
    searchActions.close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm grid place-items-start pt-16 md:pt-24 px-4"
          onClick={() => searchActions.close()}
        >
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-background border border-border shadow-[var(--shadow-4)] overflow-hidden"
          >
            <div className="relative border-b border-border">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight((h) => Math.min(results.length - 1, h + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => Math.max(0, h - 1));
                  } else if (e.key === "Enter" && results[highlight]) {
                    openItem(results[highlight].id, q);
                  }
                }}
                placeholder="Search zingers, fries, deals…"
                className="w-full h-16 pl-14 pr-14 bg-transparent text-lg font-medium placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={() => searchActions.close()}
                aria-label="Close search"
                className="absolute right-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full grid place-items-center hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {q.trim() ? (
                results.length ? (
                  <div className="space-y-1">
                    {results.map((r, i) => (
                      <button
                        key={r.id}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => openItem(r.id, q)}
                        className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          i === highlight ? "bg-secondary" : "hover:bg-secondary/60"
                        }`}
                      >
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                          <img src={r.image} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate">{r.name}</span>
                            {r.tags.includes("bestseller") && (
                              <Sparkles className="h-3 w-3 text-primary shrink-0" />
                            )}
                            {r.tags.includes("spicy") && (
                              <Flame className="h-3 w-3 text-destructive shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {r.shortDescription}
                          </div>
                        </div>
                        <div className="text-primary font-bold shrink-0">
                          {formatPKR(r.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="text-sm text-muted-foreground">
                      Nothing matches "<span className="text-foreground">{q}</span>"
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3 space-y-5">
                  {recent.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Recent
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recent.map((r) => (
                          <button
                            key={r}
                            onClick={() => setQ(r)}
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
                          onClick={() => setQ(p)}
                          className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <div>↑↓ Navigate · ↵ Open</div>
              <div>Esc to close</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
