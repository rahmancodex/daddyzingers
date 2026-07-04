import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatPKR, MENU } from "@/lib/menu-data";
import { drawerActions } from "@/lib/store";
import { EmptyState } from "./dashboard.index";
import { PageHeader } from "./dashboard.orders";

export const Route = createFileRoute("/_authenticated/dashboard/favorites")({
  head: () => ({ meta: [{ title: "Favorites — Daddy Zinger" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[] | null>(null);

  const load = () => {
    if (!user) return;
    supabase
      .from("user_favorites")
      .select("product_id")
      .then(({ data }) => setIds((data ?? []).map((r) => r.product_id as string)));
  };
  useEffect(load, [user]);

  const items = (ids ?? []).map((id) => MENU.find((m) => m.id === id)).filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader title="Favorites" subtitle="The dishes you can't get enough of." />
      {ids === null ? (
        <div className="h-40 rounded-2xl bg-muted/30 animate-pulse" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          body="Tap the heart on any product to save it here."
          cta={{ label: "Browse menu", to: "/menu" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((m) => (
            <div
              key={m!.id}
              className="rounded-2xl border border-border bg-card overflow-hidden flex"
            >
              <img src={m!.image} alt={m!.name} className="h-32 w-32 object-cover" />
              <div className="flex-1 p-4 flex flex-col">
                <div className="font-semibold">{m!.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {m!.shortDescription}
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="font-display font-bold text-primary">{formatPKR(m!.price)}</div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => drawerActions.openById(m!.id)}>
                      Order
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        if (!user) return;
                        const { error } = await supabase
                          .from("user_favorites")
                          .delete()
                          .eq("user_id", user.id)
                          .eq("product_id", m!.id);
                        if (error) return toast.error(error.message);
                        toast.success("Removed from favorites");
                        load();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
