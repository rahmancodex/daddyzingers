import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Grid3x3,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  StarOff,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  adminDeleteMenuItem,
  adminDuplicateMenuItem,
  adminListCategories,
  adminListMenuItems,
  adminSetItemFlags,
  adminSetItemSortOrder,
  type AdminMenuItem,
} from "@/lib/admin-menu.functions";
import { MenuItemDrawer } from "./MenuItemDrawer";


function formatPKR(n: number) {
  return `PKR ${new Intl.NumberFormat("en-PK").format(n)}`;
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

type SortKey = "newest" | "name" | "price_asc" | "price_desc" | "display_order";
type BoolFilter = "any" | "yes" | "no";

export function MenuContent() {
  const qc = useQueryClient();
  const listItems = useServerFn(adminListMenuItems);
  const listCats = useServerFn(adminListCategories);
  const setFlags = useServerFn(adminSetItemFlags);
  const dupItem = useServerFn(adminDuplicateMenuItem);
  const delItem = useServerFn(adminDeleteMenuItem);
  const setSortOrder = useServerFn(adminSetItemSortOrder);


  const [view, setView] = React.useState<"list" | "grid">("list");
  const [rawSearch, setRawSearch] = React.useState("");
  const search = useDebounced(rawSearch, 300);
  const [category, setCategory] = React.useState<string>("all");
  const [featured, setFeatured] = React.useState<BoolFilter>("any");
  const [available, setAvailable] = React.useState<BoolFilter>("any");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [priceMin, setPriceMin] = React.useState<string>("");
  const [priceMax, setPriceMax] = React.useState<string>("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [editing, setEditing] = React.useState<{ mode: "create" | "edit" | "view"; id?: string } | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const cats = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => listCats(),
  });

  const items = useQuery({
    queryKey: ["admin", "menu-items", { search, category, featured, available, sort }],
    queryFn: () =>
      listItems({
        data: {
          search: search.trim() || undefined,
          category_id: category === "all" ? undefined : category,
          featured: featured === "any" ? undefined : featured === "yes",
          available: available === "any" ? undefined : available === "yes",
          sort,
        },
      }),
  });

  React.useEffect(() => {
    const ch = supabase
      .channel("admin-menu-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
        qc.invalidateQueries({ queryKey: ["admin", "menu-items"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, () => {
        qc.invalidateQueries({ queryKey: ["admin", "categories"] });
        qc.invalidateQueries({ queryKey: ["admin", "menu-items"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const flagsMutation = useMutation({
    mutationFn: (v: { id: string; is_available?: boolean; is_featured?: boolean }) =>
      setFlags({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "menu-items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const dupMutation = useMutation({
    mutationFn: (id: string) => dupItem({ data: { id } }),
    onSuccess: () => {
      toast.success("Item duplicated");
      qc.invalidateQueries({ queryKey: ["admin", "menu-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => delItem({ data: { id } }),
    onSuccess: () => {
      toast.success("Item deleted");
      qc.invalidateQueries({ queryKey: ["admin", "menu-items"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (v: { a: AdminMenuItem; b: AdminMenuItem }) => {
      // Swap sort_order between two items in the same category.
      // If both currently hold the same value, bump one to keep them distinct.
      const aOrder = v.a.sort_order;
      const bOrder = v.b.sort_order === aOrder ? aOrder + 1 : v.b.sort_order;
      await setSortOrder({ data: { id: v.a.id, sort_order: bOrder } });
      await setSortOrder({ data: { id: v.b.id, sort_order: aOrder } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "menu-items"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const allRows = items.data ?? [];

  // Client-side price range refinement (backend has no price range filter)
  const rows = React.useMemo(() => {
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    if (min == null && max == null) return allRows;
    return allRows.filter((r) => {
      if (min != null && r.price_pkr < min) return false;
      if (max != null && r.price_pkr > max) return false;
      return true;
    });
  }, [allRows, priceMin, priceMax]);

  // Prune selection to only visible rows
  React.useEffect(() => {
    if (selected.size === 0) return;
    const visible = new Set(rows.map((r) => r.id));
    let changed = false;
    const next = new Set<string>();
    selected.forEach((id) => {
      if (visible.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelected(next);
  }, [rows, selected]);

  const activeFilters =
    (search ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (featured !== "any" ? 1 : 0) +
    (available !== "any" ? 1 : 0) +
    (priceMin || priceMax ? 1 : 0);

  function clearFilters() {
    setRawSearch("");
    setCategory("all");
    setFeatured("any");
    setAvailable("any");
    setPriceMin("");
    setPriceMax("");
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  }

  async function bulkApply(patch: { is_available?: boolean; is_featured?: boolean }) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const label =
      patch.is_available === true
        ? "Made available"
        : patch.is_available === false
        ? "Marked unavailable"
        : patch.is_featured === true
        ? "Featured"
        : "Unfeatured";
    try {
      await Promise.all(ids.map((id) => setFlags({ data: { id, ...patch } })));
      toast.success(`${label} ${ids.length} item${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin", "menu-items"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk update failed");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-black tracking-tight sm:text-3xl">
            Menu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} item{rows.length === 1 ? "" : "s"} · changes go live instantly.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => items.refetch()}
            className="rounded-xl"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", items.isFetching && "animate-spin")} />
          </Button>
          <Button
            onClick={() => setEditing({ mode: "create" })}
            className="rounded-xl bg-primary font-bold text-primary-foreground shadow-[var(--shadow-1)]"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </header>

      {/* Sticky filter bar */}
      <div className="sticky top-[64px] z-20 -mx-4 space-y-3 border-y border-border/60 bg-background/85 px-4 py-3 backdrop-blur sm:top-16 sm:mx-0 sm:rounded-2xl sm:border sm:bg-card/80 sm:px-3 sm:shadow-[var(--shadow-1)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder="Search by name, tag, description…"
              className="h-10 rounded-xl border-transparent bg-muted/60 pl-9 focus-visible:border-input focus-visible:bg-background"
            />
            {rawSearch && (
              <button
                onClick={() => setRawSearch("")}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-10 w-[150px] rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {cats.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={available} onValueChange={(v) => setAvailable(v as BoolFilter)}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Availability</SelectItem>
              <SelectItem value="yes">Available</SelectItem>
              <SelectItem value="no">Unavailable</SelectItem>
            </SelectContent>
          </Select>

          <Select value={featured} onValueChange={(v) => setFeatured(v as BoolFilter)}>
            <SelectTrigger className="h-10 w-[130px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Featured</SelectItem>
              <SelectItem value="yes">Featured only</SelectItem>
              <SelectItem value="no">Not featured</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-[150px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="display_order">Display order</SelectItem>
              <SelectItem value="name">Name A→Z</SelectItem>
              <SelectItem value="price_asc">Price low→high</SelectItem>
              <SelectItem value="price_desc">Price high→low</SelectItem>
            </SelectContent>

          </Select>

          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-10 rounded-xl",
              (priceMin || priceMax) && "border-primary text-primary",
            )}
            onClick={() => setShowAdvanced((s) => !s)}
            aria-expanded={showAdvanced}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Price</span>
          </Button>

          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl text-xs"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" /> Clear ({activeFilters})
            </Button>
          )}

          <div className="ml-auto flex rounded-xl border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                view === "list" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
              aria-label="List view"
              aria-pressed={view === "list"}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                view === "grid" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Price range (PKR)
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="Min"
              className="h-9 w-24 rounded-xl"
              aria-label="Minimum price"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Max"
              className="h-9 w-24 rounded-xl"
              aria-label="Maximum price"
            />
            {(priceMin || priceMax) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-lg text-xs"
                onClick={() => {
                  setPriceMin("");
                  setPriceMax("");
                }}
              >
                Reset price
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-[132px] z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 shadow-[var(--shadow-1)] backdrop-blur sm:top-[124px]">
          <span className="text-sm font-bold">
            {selected.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg bg-background"
            onClick={() => bulkApply({ is_available: true })}
          >
            <Eye className="h-3.5 w-3.5" /> Activate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg bg-background"
            onClick={() => bulkApply({ is_available: false })}
          >
            <EyeOff className="h-3.5 w-3.5" /> Deactivate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg bg-background"
            onClick={() => bulkApply({ is_featured: true })}
          >
            <Star className="h-3.5 w-3.5" /> Feature
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg bg-background"
            onClick={() => bulkApply({ is_featured: false })}
          >
            <StarOff className="h-3.5 w-3.5" /> Unfeature
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 rounded-lg text-xs"
            onClick={() => setSelected(new Set())}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      )}

      {/* Content */}
      {items.isLoading ? (
        <LoadingState view={view} />
      ) : items.isError ? (
        <ErrorState onRetry={() => items.refetch()} />
      ) : allRows.length === 0 ? (
        <EmptyState onCreate={() => setEditing({ mode: "create" })} />
      ) : rows.length === 0 ? (
        <NoResults onClear={clearFilters} />
      ) : view === "list" ? (
        <ListView
          rows={rows}
          selected={selected}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
          onView={(id) => setEditing({ mode: "view", id })}
          onEdit={(id) => setEditing({ mode: "edit", id })}
          onDuplicate={(id) => dupMutation.mutate(id)}
          onDelete={(id) => setDeleteId(id)}
          onToggleAvailable={(id, v) => flagsMutation.mutate({ id, is_available: v })}
          onToggleFeatured={(id, v) => flagsMutation.mutate({ id, is_featured: v })}
          canReorder={canReorder}
          onMove={move}
          reordering={reorderMutation.isPending}
        />
      ) : (
        <GridView
          rows={rows}
          selected={selected}
          onToggleOne={toggleOne}
          onView={(id) => setEditing({ mode: "view", id })}
          onEdit={(id) => setEditing({ mode: "edit", id })}
          onDuplicate={(id) => dupMutation.mutate(id)}
          onDelete={(id) => setDeleteId(id)}
          onToggleAvailable={(id, v) => flagsMutation.mutate({ id, is_available: v })}
          onToggleFeatured={(id, v) => flagsMutation.mutate({ id, is_featured: v })}
          canReorder={canReorder}
          onMove={move}
          reordering={reorderMutation.isPending}
        />
      )}


      {editing && (
        <MenuItemDrawer
          mode={editing.mode}
          itemId={editing.id}
          categories={cats.data ?? []}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the item and its sizes and options from the customer menu.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && delMutation.mutate(deleteId)}
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

function LoadingState({ view }: { view: "list" | "grid" }) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-t border-border/50 px-6 py-4 first:border-t-0"
        >
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15">
        <UtensilsCrossed className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-black">No products yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Add your first product to get the menu live.
      </p>
      <Button onClick={onCreate} className="mt-4 rounded-xl bg-primary font-bold text-primary-foreground">
        <Plus className="h-4 w-4" /> Add Product
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
      <h3 className="mt-4 font-display text-base font-black">No matching products</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Try adjusting the filters or clearing your search.
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
      <p className="text-sm font-semibold text-destructive">Couldn't load menu</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Something went wrong. Please try again.
      </p>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 rounded-xl">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  );
}

type ListProps = {
  rows: AdminMenuItem[];
  selected: Set<string>;
  onToggleOne: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleAvailable: (id: string, v: boolean) => void;
  onToggleFeatured: (id: string, v: boolean) => void;
};

function ListView({
  rows,
  selected,
  onToggleOne,
  onToggleAll,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleAvailable,
  onToggleFeatured,
}: ListProps) {
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = !allChecked && rows.some((r) => selected.has(r.id));

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)] md:block">
        <div className="grid grid-cols-[40px_64px_1.5fr_1fr_100px_110px_100px_100px_60px] border-b border-border/70 bg-muted/40 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center">
            <Checkbox
              checked={allChecked ? true : someChecked ? "indeterminate" : false}
              onCheckedChange={(v) => onToggleAll(v === true)}
              aria-label="Select all"
            />
          </div>
          <div />
          <div>Product</div>
          <div>Category</div>
          <div>Price</div>
          <div>Available</div>
          <div>Featured</div>
          <div>Updated</div>
          <div />
        </div>
        <ul>
          {rows.map((r) => {
            const isSel = selected.has(r.id);
            return (
              <li
                key={r.id}
                className={cn(
                  "grid grid-cols-[40px_64px_1.5fr_1fr_100px_110px_100px_100px_60px] items-center gap-3 border-t border-border/50 px-6 py-3 transition-colors",
                  isSel && "bg-primary/5",
                )}
              >
                <div className="flex items-center">
                  <Checkbox
                    checked={isSel}
                    onCheckedChange={(v) => onToggleOne(r.id, v === true)}
                    aria-label={`Select ${r.name}`}
                  />
                </div>
                <button
                  onClick={() => onView(r.id)}
                  className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`Preview ${r.name}`}
                >
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => onView(r.id)}
                  className="min-w-0 text-left focus-visible:outline-none"
                >
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  {r.short_description && (
                    <div className="truncate text-xs text-muted-foreground">
                      {r.short_description}
                    </div>
                  )}
                </button>
                <div className="text-sm">
                  <Badge variant="outline" className="rounded-full font-medium">
                    {r.category_label ?? r.category_id}
                  </Badge>
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {formatPKR(r.price_pkr)}
                </div>
                <div>
                  <Switch
                    checked={r.is_available}
                    onCheckedChange={(v) => onToggleAvailable(r.id, v)}
                    aria-label={`Toggle availability for ${r.name}`}
                  />
                </div>
                <div>
                  <button
                    onClick={() => onToggleFeatured(r.id, !r.is_featured)}
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      r.is_featured
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                    aria-label={`Toggle featured for ${r.name}`}
                    aria-pressed={r.is_featured}
                  >
                    <Star className={cn("h-4 w-4", r.is_featured && "fill-current")} />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">{timeAgo(r.updated_at)}</div>
                <RowActions
                  onView={() => onView(r.id)}
                  onEdit={() => onEdit(r.id)}
                  onDuplicate={() => onDuplicate(r.id)}
                  onDelete={() => onDelete(r.id)}
                  onToggleAvailable={() => onToggleAvailable(r.id, !r.is_available)}
                  onToggleFeatured={() => onToggleFeatured(r.id, !r.is_featured)}
                  isAvailable={r.is_available}
                  isFeatured={r.is_featured}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => {
          const isSel = selected.has(r.id);
          return (
            <li
              key={r.id}
              className={cn(
                "rounded-2xl border border-border/70 bg-card p-3 shadow-[var(--shadow-1)] transition-colors",
                isSel && "border-primary/50 bg-primary/5",
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSel}
                  onCheckedChange={(v) => onToggleOne(r.id, v === true)}
                  aria-label={`Select ${r.name}`}
                  className="mt-1"
                />
                <button
                  onClick={() => onView(r.id)}
                  className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted"
                  aria-label={`Preview ${r.name}`}
                >
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onView(r.id)}
                      className="min-w-0 text-left"
                    >
                      <div className="truncate text-sm font-bold">{r.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="rounded-full font-medium">
                          {r.category_label ?? r.category_id}
                        </Badge>
                      </div>
                    </button>
                    <RowActions
                      onView={() => onView(r.id)}
                      onEdit={() => onEdit(r.id)}
                      onDuplicate={() => onDuplicate(r.id)}
                      onDelete={() => onDelete(r.id)}
                      onToggleAvailable={() => onToggleAvailable(r.id, !r.is_available)}
                      onToggleFeatured={() => onToggleFeatured(r.id, !r.is_featured)}
                      isAvailable={r.is_available}
                      isFeatured={r.is_featured}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold tabular-nums">
                      {formatPKR(r.price_pkr)}
                    </span>
                    {r.is_featured && (
                      <Badge className="rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        <Star className="h-3 w-3 fill-current" /> Featured
                      </Badge>
                    )}
                    {!r.is_available && (
                      <Badge
                        variant="secondary"
                        className="rounded-full text-[10px] font-bold"
                      >
                        Unavailable
                      </Badge>
                    )}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {timeAgo(r.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

type GridProps = Omit<ListProps, "onToggleAll">;

function GridView({
  rows,
  selected,
  onToggleOne,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleAvailable,
  onToggleFeatured,
}: GridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((r) => {
        const isSel = selected.has(r.id);
        return (
          <div
            key={r.id}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:shadow-md",
              isSel && "border-primary/50 ring-1 ring-primary/40",
            )}
          >
            <div className="absolute left-3 top-3 z-10">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-background/85 shadow-sm backdrop-blur">
                <Checkbox
                  checked={isSel}
                  onCheckedChange={(v) => onToggleOne(r.id, v === true)}
                  aria-label={`Select ${r.name}`}
                />
              </span>
            </div>
            <button
              onClick={() => onView(r.id)}
              className="relative aspect-square overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={`Open ${r.name}`}
            >
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground">
                  <UtensilsCrossed className="h-8 w-8" />
                </div>
              )}
              <div className="absolute right-2 top-2 flex flex-col gap-1">
                {r.is_featured && (
                  <Badge className="rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    Featured
                  </Badge>
                )}
                {!r.is_available && (
                  <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                    Off
                  </Badge>
                )}
              </div>
            </button>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => onView(r.id)} className="min-w-0 text-left">
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {r.category_label ?? r.category_id}
                  </div>
                </button>
                <RowActions
                  onView={() => onView(r.id)}
                  onEdit={() => onEdit(r.id)}
                  onDuplicate={() => onDuplicate(r.id)}
                  onDelete={() => onDelete(r.id)}
                  onToggleAvailable={() => onToggleAvailable(r.id, !r.is_available)}
                  onToggleFeatured={() => onToggleFeatured(r.id, !r.is_featured)}
                  isAvailable={r.is_available}
                  isFeatured={r.is_featured}
                />
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2">
                <span className="text-sm font-bold tabular-nums">
                  {formatPKR(r.price_pkr)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(r.updated_at)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RowActions({
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleAvailable,
  onToggleFeatured,
  isAvailable,
  isFeatured,
}: {
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleAvailable: () => void;
  onToggleFeatured: () => void;
  isAvailable: boolean;
  isFeatured: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg"
          aria-label="Actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>
          <Search className="h-4 w-4" /> View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleAvailable}>
          {isAvailable ? (
            <>
              <EyeOff className="h-4 w-4" /> Mark unavailable
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" /> Mark available
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleFeatured}>
          {isFeatured ? (
            <>
              <StarOff className="h-4 w-4" /> Unfeature
            </>
          ) : (
            <>
              <Star className="h-4 w-4" /> Feature
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
