import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Grid3x3,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  UtensilsCrossed,
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
  adminDeleteMenuItem,
  adminDuplicateMenuItem,
  adminListCategories,
  adminListMenuItems,
  adminSetItemFlags,
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

type SortKey = "newest" | "name" | "price_asc" | "price_desc";
type BoolFilter = "any" | "yes" | "no";

export function MenuContent() {
  const qc = useQueryClient();
  const listItems = useServerFn(adminListMenuItems);
  const listCats = useServerFn(adminListCategories);
  const setFlags = useServerFn(adminSetItemFlags);
  const dupItem = useServerFn(adminDuplicateMenuItem);
  const delItem = useServerFn(adminDeleteMenuItem);

  const [view, setView] = React.useState<"list" | "grid">("list");
  const [rawSearch, setRawSearch] = React.useState("");
  const search = useDebounced(rawSearch, 300);
  const [category, setCategory] = React.useState<string>("all");
  const [featured, setFeatured] = React.useState<BoolFilter>("any");
  const [available, setAvailable] = React.useState<BoolFilter>("any");
  const [sort, setSort] = React.useState<SortKey>("newest");

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

  const rows = items.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} item{rows.length === 1 ? "" : "s"} · changes appear live on the customer site.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-[var(--shadow-1)]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder="Search products…"
            className="h-10 rounded-xl border-transparent bg-muted/60 pl-9 focus-visible:border-input focus-visible:bg-background"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 w-[180px] rounded-xl">
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

        <Select value={featured} onValueChange={(v) => setFeatured(v as BoolFilter)}>
          <SelectTrigger className="h-10 w-[140px] rounded-xl">
            <SelectValue placeholder="Featured" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Featured: Any</SelectItem>
            <SelectItem value="yes">Featured only</SelectItem>
            <SelectItem value="no">Not featured</SelectItem>
          </SelectContent>
        </Select>

        <Select value={available} onValueChange={(v) => setAvailable(v as BoolFilter)}>
          <SelectTrigger className="h-10 w-[150px] rounded-xl">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Availability: Any</SelectItem>
            <SelectItem value="yes">Available</SelectItem>
            <SelectItem value="no">Unavailable</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-10 w-[160px] rounded-xl">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="name">Name A→Z</SelectItem>
            <SelectItem value="price_asc">Price low→high</SelectItem>
            <SelectItem value="price_desc">Price high→low</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex rounded-xl border border-border bg-muted/40 p-0.5">
          <button
            onClick={() => setView("list")}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg transition-colors",
              view === "list" ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg transition-colors",
              view === "grid" ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
            aria-label="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {items.isLoading ? (
        <LoadingState view={view} />
      ) : items.isError ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <p className="text-sm font-semibold text-destructive">Couldn't load menu</p>
          <p className="mt-1 text-xs text-muted-foreground">{(items.error as Error).message}</p>
          <Button onClick={() => items.refetch()} variant="outline" size="sm" className="mt-4 rounded-xl">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState onCreate={() => setEditing({ mode: "create" })} />
      ) : view === "list" ? (
        <ListView
          rows={rows}
          onView={(id) => setEditing({ mode: "view", id })}
          onEdit={(id) => setEditing({ mode: "edit", id })}
          onDuplicate={(id) => dupMutation.mutate(id)}
          onDelete={(id) => setDeleteId(id)}
          onToggleAvailable={(id, v) => flagsMutation.mutate({ id, is_available: v })}
          onToggleFeatured={(id, v) => flagsMutation.mutate({ id, is_featured: v })}
        />
      ) : (
        <GridView
          rows={rows}
          onView={(id) => setEditing({ mode: "view", id })}
          onEdit={(id) => setEditing({ mode: "edit", id })}
          onDuplicate={(id) => dupMutation.mutate(id)}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      {/* Drawer */}
      {editing && (
        <MenuItemDrawer
          mode={editing.mode}
          itemId={editing.id}
          categories={cats.data ?? []}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the item and its sizes and options from the customer menu. This cannot be undone.
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
        <div key={i} className="flex items-center gap-4 border-t border-border/50 px-6 py-4 first:border-t-0">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-4 w-40" />
          <div className="flex-1" />
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

type ListProps = {
  rows: AdminMenuItem[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleAvailable: (id: string, v: boolean) => void;
  onToggleFeatured: (id: string, v: boolean) => void;
};

function ListView({
  rows,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleAvailable,
  onToggleFeatured,
}: ListProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]">
      <div className="hidden border-b border-border/70 bg-muted/40 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[64px_1.5fr_1fr_100px_110px_100px_100px_60px]">
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
        {rows.map((r) => (
          <li
            key={r.id}
            className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border-t border-border/50 px-4 py-3 md:grid-cols-[64px_1.5fr_1fr_100px_110px_100px_100px_60px] md:px-6"
          >
            <button
              onClick={() => onView(r.id)}
              className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-muted"
            >
              {r.image_url ? (
                <img src={r.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <button onClick={() => onView(r.id)} className="min-w-0 text-left">
              <div className="truncate text-sm font-semibold">{r.name}</div>
              <div className="truncate text-xs text-muted-foreground md:hidden">
                {r.category_label ?? r.category_id} · {formatPKR(r.price_pkr)}
              </div>
            </button>
            <div className="hidden text-sm text-muted-foreground md:block">
              <Badge variant="outline" className="rounded-full font-medium">
                {r.category_label ?? r.category_id}
              </Badge>
            </div>
            <div className="hidden text-sm font-semibold tabular-nums md:block">
              {formatPKR(r.price_pkr)}
            </div>
            <div className="hidden md:block">
              <Switch
                checked={r.is_available}
                onCheckedChange={(v) => onToggleAvailable(r.id, v)}
                aria-label="Available"
              />
            </div>
            <div className="hidden md:block">
              <button
                onClick={() => onToggleFeatured(r.id, !r.is_featured)}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg transition-colors",
                  r.is_featured
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-label="Featured"
              >
                <Star className={cn("h-4 w-4", r.is_featured && "fill-current")} />
              </button>
            </div>
            <div className="hidden text-xs text-muted-foreground md:block">
              {timeAgo(r.updated_at)}
            </div>
            <RowActions
              onView={() => onView(r.id)}
              onEdit={() => onEdit(r.id)}
              onDuplicate={() => onDuplicate(r.id)}
              onDelete={() => onDelete(r.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GridView({
  rows,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: Omit<ListProps, "onToggleAvailable" | "onToggleFeatured">) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((r) => (
        <div
          key={r.id}
          className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)] transition-shadow hover:shadow-md"
        >
          <button
            onClick={() => onView(r.id)}
            className="relative aspect-square overflow-hidden bg-muted"
          >
            {r.image_url ? (
              <img
                src={r.image_url}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <UtensilsCrossed className="h-8 w-8" />
              </div>
            )}
            <div className="absolute left-2 top-2 flex gap-1">
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
          <div className="flex flex-1 flex-col p-3">
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
              />
            </div>
            <div className="mt-2 text-sm font-bold tabular-nums">{formatPKR(r.price_pkr)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RowActions({
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
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
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
