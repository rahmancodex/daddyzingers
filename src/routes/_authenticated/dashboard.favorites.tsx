import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatPKR, useMenuData } from "@/lib/menu";
import { drawerActions } from "@/lib/store";
import { EmptyState, PageHeader, SkeletonBlock } from "@/components/dashboard/shared";

export const Route = createFileRoute("/_authenticated/dashboard/favorites")({
  head: () => ({ meta: [{ title: "Favorites — Daddy Zinger" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const { byId } = useMenuData();
  const [ids, setIds] = useState<string[] | null>(null);

  const load = () => {
    if (!user) return;
    supabase
      .from("user_favorites")
      .select("product_id")
      .then(({ data }) => setIds((data ?? []).map((r) => r.product_id as string)));
  };
  useEffect(load, [user]);

  const items = (ids ?? []).map((id) => byId.get(id)).filter(Boolean);

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Favorites"
        subtitle="The dishes you can't get enough of — one tap to reorder."
      />

      {ids === null ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          body="Tap the heart on any product to save it here for quick reordering."
          cta={{ label: "Browse menu", to: "/menu" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <AnimatePresence initial={false}>
            {items.map((m) => (
              <motion.div
                key={m!.id}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3 }}
                className="group relative rounded-2xl border border-border bg-card overflow-hidden flex hover:border-primary/40 hover:shadow-[var(--shadow-2)] transition-all"
              >
                <button
                  type="button"
                  onClick={() => drawerActions.openById(m!.id)}
                  className="relative h-36 w-36 sm:h-40 sm:w-40 shrink-0 overflow-hidden"
                  aria-label={`Open ${m!.name}`}
                >
                  <img
                    src={m!.image}
                    alt={m!.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </button>
                <div className="flex-1 p-4 flex flex-col min-w-0">
                  <button
                    type="button"
                    onClick={() => drawerActions.openById(m!.id)}
                    className="text-left"
                  >
                    <div className="font-semibold truncate">{m!.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {m!.shortDescription}
                    </div>
                  </button>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <div className="font-display font-bold text-primary">
                      {formatPKR(m!.price)}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => drawerActions.openById(m!.id)}>
                        <Plus className="h-3.5 w-3.5" /> Order
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Remove from favorites"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          if (!user) return;
                          // Optimistic removal for the tap-to-remove animation.
                          setIds((cur) => (cur ?? []).filter((id) => id !== m!.id));
                          const { error } = await supabase
                            .from("user_favorites")
                            .delete()
                            .eq("user_id", user.id)
                            .eq("product_id", m!.id);
                          if (error) {
                            load();
                            return toast.error(error.message);
                          }
                          toast.success("Removed from favorites");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
