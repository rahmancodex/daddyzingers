import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  adminDeleteCategory,
  adminListCategories,
  adminUpdateCategory,
  type AdminCategory,
} from "@/lib/admin-menu.functions";
import { CategoryDrawer } from "./CategoryDrawer";

export function CategoriesContent() {
  const qc = useQueryClient();
  const listCats = useServerFn(adminListCategories);
  const updateCat = useServerFn(adminUpdateCategory);
  const deleteCat = useServerFn(adminDeleteCategory);

  const q = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => listCats(),
  });

  const [editing, setEditing] = React.useState<{ mode: "create" | "edit"; cat?: AdminCategory } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminCategory | null>(null);

  React.useEffect(() => {
    const ch = supabase
      .channel("admin-cats-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, () => {
        qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const patchMutation = useMutation({
    mutationFn: (v: { id: string; is_active?: boolean; sort_order?: number }) =>
      updateCat({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => deleteCat({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cats = q.data ?? [];

  function move(idx: number, dir: -1 | 1) {
    const target = cats[idx + dir];
    const cur = cats[idx];
    if (!target || !cur) return;
    patchMutation.mutate({ id: cur.id, sort_order: target.sort_order });
    patchMutation.mutate({ id: target.id, sort_order: cur.sort_order });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize the menu into sections shown across the site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => q.refetch()}
            className="rounded-xl"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
          </Button>
          <Button
            onClick={() => setEditing({ mode: "create" })}
            className="rounded-xl bg-primary font-bold text-primary-foreground shadow-[var(--shadow-1)]"
          >
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      {q.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : cats.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15">
            <FolderPlus className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-lg font-black">No categories yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create categories to group your menu.
          </p>
          <Button
            onClick={() => setEditing({ mode: "create" })}
            className="mt-4 rounded-xl bg-primary font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cats.map((c, i) => (
            <div
              key={c.id}
              className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]"
            >
              <div className="relative aspect-[16/10] bg-muted">
                {c.image_url ? (
                  <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-4xl">
                    {c.icon ?? "🍽️"}
                  </div>
                )}
                {!c.is_active && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40">
                    <Badge variant="secondary" className="rounded-full">
                      Hidden
                    </Badge>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      <span className="mr-1.5">{c.icon ?? "🍽️"}</span>
                      {c.label}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {c.items_count} item{c.items_count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => setEditing({ mode: "edit", cat: c })}>
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          patchMutation.mutate({ id: c.id, is_active: !c.is_active })
                        }
                      >
                        {c.is_active ? "Hide" : "Show"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => move(i, -1)} disabled={i === 0}>
                        <ArrowUp className="h-4 w-4" /> Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => move(i, 1)}
                        disabled={i === cats.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" /> Move down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(c)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {c.tagline && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.tagline}</p>
                )}
                <div className="flex items-center justify-between border-t border-border/50 pt-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    {c.is_active ? "Visible" : "Hidden"}
                  </div>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) => patchMutation.mutate({ id: c.id, is_active: v })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <CategoryDrawer
          mode={editing.mode}
          category={editing.cat}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the category. It must be empty first. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && delMutation.mutate(deleteTarget.id)}
              disabled={delMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {delMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
