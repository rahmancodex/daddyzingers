import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type SortKey = "order" | "name" | "items_desc" | "items_asc" | "newest";

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
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"all" | "active" | "hidden">("all");
  const [sort, setSort] = React.useState<SortKey>("order");

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

  const allCats = q.data ?? [];

  const stats = React.useMemo(() => {
    const active = allCats.filter((c) => c.is_active).length;
    const items = allCats.reduce((n, c) => n + (c.items_count ?? 0), 0);
    return { total: allCats.length, active, hidden: allCats.length - active, items };
  }, [allCats]);

  const cats = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    const arr = allCats
      .filter((c) => (status === "all" ? true : status === "active" ? c.is_active : !c.is_active))
      .filter((c) => (s ? c.label.toLowerCase().includes(s) || c.id.toLowerCase().includes(s) : true));
    switch (sort) {
      case "name":
        arr.sort((a, b) => a.label.localeCompare(b.label));
        break;
      case "items_desc":
        arr.sort((a, b) => (b.items_count ?? 0) - (a.items_count ?? 0));
        break;
      case "items_asc":
        arr.sort((a, b) => (a.items_count ?? 0) - (b.items_count ?? 0));
        break;
      case "newest":
        arr.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
        break;
      default:
        arr.sort((a, b) => a.sort_order - b.sort_order);
    }
    return arr;
  }, [allCats, search, status, sort]);

  const canReorder = sort === "order" && status !== "hidden" && !search;

  function move(idx: number, dir: -1 | 1) {
    if (!canReorder) return;
    const target = cats[idx + dir];
    const cur = cats[idx];
    if (!target || !cur) return;
    patchMutation.mutate({ id: cur.id, sort_order: target.sort_order });
    patchMutation.mutate({ id: target.id, sort_order: cur.sort_order });
  }

  const activeFilters =
    (search ? 1 : 0) + (status !== "all" ? 1 : 0) + (sort !== "order" ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-black tracking-tight sm:text-3xl">
            Categories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize the menu into sections shown across the site.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Category</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} tone="success" />
        <StatCard label="Hidden" value={stats.hidden} tone="muted" />
        <StatCard label="Menu Items" value={stats.items} tone="primary" />
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-[64px] z-20 -mx-4 border-y border-border/60 bg-background/85 px-4 py-3 backdrop-blur sm:top-16 sm:mx-0 sm:rounded-2xl sm:border sm:bg-card/80 sm:px-3 sm:shadow-[var(--shadow-1)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="h-10 rounded-xl border-transparent bg-muted/60 pl-9 focus-visible:border-input focus-visible:bg-background"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="hidden">Hidden only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-[160px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="order">Display order</SelectItem>
              <SelectItem value="name">Name A→Z</SelectItem>
              <SelectItem value="items_desc">Most items</SelectItem>
              <SelectItem value="items_asc">Fewest items</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto rounded-lg text-xs"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setSort("order");
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear ({activeFilters})
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {q.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : allCats.length === 0 ? (
        <EmptyState onCreate={() => setEditing({ mode: "create" })} />
      ) : cats.length === 0 ? (
        <NoResults
          onClear={() => {
            setSearch("");
            setStatus("all");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cats.map((c, i) => (
            <article
              key={c.id}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)] transition-all",
                "hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/40",
              )}
            >
              <div className="relative aspect-[16/10] bg-muted">
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-5xl">
                    {c.icon ?? "🍽️"}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute left-3 top-3 flex items-center gap-1.5">
                  {canReorder && (
                    <span
                      className="grid h-7 w-7 place-items-center rounded-lg bg-background/85 text-muted-foreground shadow-sm backdrop-blur"
                      title="Reorder via menu"
                      aria-hidden
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className="rounded-full border-transparent bg-background/85 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur"
                  >
                    #{i + 1}
                  </Badge>
                </div>
                <div className="absolute right-3 top-3">
                  {c.is_active ? (
                    <Badge className="rounded-full bg-success/90 text-[10px] font-bold uppercase tracking-wider text-success-foreground">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="rounded-full bg-muted-foreground/80 text-[10px] font-bold uppercase tracking-wider text-background">
                      Hidden
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
                  {c.items_count} item{c.items_count === 1 ? "" : "s"}
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold tracking-tight">
                      <span className="mr-1.5" aria-hidden>
                        {c.icon ?? "🍽️"}
                      </span>
                      {c.label}
                    </h3>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      /{c.id}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-lg"
                        aria-label={`Actions for ${c.label}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setEditing({ mode: "edit", cat: c })}>
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          patchMutation.mutate({ id: c.id, is_active: !c.is_active })
                        }
                      >
                        {c.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4" /> Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" /> Show
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => move(i, -1)}
                        disabled={!canReorder || i === 0}
                      >
                        <ArrowUp className="h-4 w-4" /> Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => move(i, 1)}
                        disabled={!canReorder || i === cats.length - 1}
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
                <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {c.is_active ? "Visible on site" : "Hidden from site"}
                  </span>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) => patchMutation.mutate({ id: c.id, is_active: v })}
                    aria-label={`Toggle visibility for ${c.label}`}
                  />
                </div>
              </div>
            </article>
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
            <AlertDialogTitle>Delete "{deleteTarget?.label}"?</AlertDialogTitle>
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

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "muted" | "primary";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "primary"
      ? "text-primary"
      : tone === "muted"
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-1)]">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-black tabular-nums", toneCls)}>{value}</div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15">
        <FolderPlus className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-black">No categories yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create categories to group your menu.
      </p>
      <Button
        onClick={onCreate}
        className="mt-4 rounded-xl bg-primary font-bold text-primary-foreground"
      >
        <Plus className="h-4 w-4" /> Add Category
      </Button>
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-display text-base font-black">No categories match</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Try clearing your filters or searching a different term.
      </p>
      <Button variant="outline" size="sm" onClick={onClear} className="mt-4 rounded-xl">
        <X className="h-3.5 w-3.5" /> Clear filters
      </Button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-16 text-center">
      <p className="text-sm font-semibold text-destructive">Couldn't load categories</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Something went wrong. Please try again.
      </p>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 rounded-xl">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  );
}
