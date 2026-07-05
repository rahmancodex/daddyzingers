import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Copy,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  adminListBanners,
  adminToggleBanner,
  adminDeleteBanner,
  adminReorderBanners,
} from "@/lib/admin-promos.functions";
import { BannerDrawer, type BannerRow } from "./BannerDrawer";

type Filter = "all" | "active" | "scheduled" | "expired" | "inactive";

function statusOf(b: BannerRow): "active" | "scheduled" | "expired" | "inactive" {
  const now = Date.now();
  if (b.ends_at && new Date(b.ends_at).getTime() < now) return "expired";
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return "scheduled";
  if (!b.is_active) return "inactive";
  return "active";
}

const STATUS_CLASS: Record<ReturnType<typeof statusOf>, string> = {
  active: "bg-success/15 text-success-foreground",
  scheduled: "bg-info/15 text-info",
  expired: "bg-muted text-muted-foreground",
  inactive: "bg-destructive/15 text-destructive",
};

const STATUS_DOT: Record<ReturnType<typeof statusOf>, string> = {
  active: "bg-success",
  scheduled: "bg-info",
  expired: "bg-muted-foreground/50",
  inactive: "bg-destructive",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}


export function BannersContent() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListBanners);
  const toggleFn = useServerFn(adminToggleBanner);
  const deleteFn = useServerFn(adminDeleteBanner);
  const reorderFn = useServerFn(adminReorderBanners);

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [sort, setSort] = React.useState<"priority" | "recent">("priority");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<BannerRow | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: () => fetchList({ data: undefined }) as Promise<BannerRow[]>,
  });

  React.useEffect(() => {
    const channel = supabase
      .channel("admin-banners")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promo_banners" },
        () => qc.invalidateQueries({ queryKey: ["admin", "banners"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggleFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "banners"] });
      toast.success("Banner updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "banners"] });
      toast.success("Banner deleted");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => reorderFn({ data: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "banners"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rows = React.useMemo(() => {
    let list = q.data ?? [];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          (b.subtitle ?? "").toLowerCase().includes(s) ||
          (b.cta_text ?? "").toLowerCase().includes(s),
      );
    }
    if (filter !== "all") list = list.filter((b) => statusOf(b) === filter);
    list = [...list].sort((a, b) => {
      if (sort === "recent")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return a.sort_order - b.sort_order;
    });
    return list;
  }, [q.data, search, filter, sort]);

  function move(index: number, dir: -1 | 1) {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMut.mutate(next.map((b) => b.id));
  }

  const stats = React.useMemo(() => {
    const list = q.data ?? [];
    const active = list.filter((b) => statusOf(b) === "active").length;
    const scheduled = list.filter((b) => statusOf(b) === "scheduled").length;
    const expired = list.filter((b) => statusOf(b) === "expired").length;
    return { total: list.length, active, scheduled, expired };
  }, [q.data]);

  const filtersActive = search.trim() !== "" || filter !== "all";
  const clearFilters = () => {
    setSearch("");
    setFilter("all");
  };

  const openNew = () => {
    setEditRow(null);
    setDrawerOpen(true);
  };

  const duplicate = (b: BannerRow) => {
    setEditRow({
      ...b,
      id: undefined as unknown as string,
      title: `${b.title} (Copy)`,
      is_active: false,
    });
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Marketing
          </div>
          <h1 className="mt-0.5 truncate font-display text-2xl font-black tracking-tight md:text-3xl">
            Promo Banners
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Rotating homepage banners. Changes go live instantly.
          </p>
        </div>
        <Button onClick={openNew} className="h-10 shrink-0 rounded-xl">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New banner</span>
          <span className="sm:hidden">New</span>
        </Button>
      </header>

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Banner overview">
        <BannerKpi label="Total" value={stats.total} tone="default" />
        <BannerKpi label="Active" value={stats.active} tone="success" />
        <BannerKpi label="Scheduled" value={stats.scheduled} tone="info" />
        <BannerKpi label="Expired" value={stats.expired} tone="muted" />
      </section>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, subtitle or CTA"
                aria-label="Search banners"
                className="h-10 rounded-xl border-transparent bg-muted/60 pl-9 pr-9 focus-visible:border-input focus-visible:bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "priority" | "recent")}
                aria-label="Sort banners"
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="priority">Priority</option>
                <option value="recent">Recent</option>
              </select>
              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg text-xs"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter by status"
          >
            {(["all", "active", "scheduled", "expired", "inactive"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {f !== "all" && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      STATUS_DOT[f as keyof typeof STATUS_DOT],
                    )}
                    aria-hidden
                  />
                )}
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {q.isError ? (
        <BannerError onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <div
          className="grid gap-4 md:grid-cols-2"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-12 text-center shadow-[var(--shadow-1)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="mt-4 font-display text-lg font-black">
            {filtersActive ? "No banners match" : "No banners yet"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtersActive
              ? "Try adjusting your filters or clearing them."
              : "Add your first homepage banner to promote a campaign."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {filtersActive && (
              <Button variant="outline" size="sm" className="rounded-xl" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            )}
            <Button className="rounded-xl" onClick={openNew}>
              <Plus className="h-4 w-4" /> New banner
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((b, i) => {
            const status = statusOf(b);
            const isFirst = i === 0;
            const isLast = i === rows.length - 1;
            return (
              <article
                key={b.id}
                className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)] focus-within:ring-2 focus-within:ring-ring"
              >
                <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
                  {b.desktop_image_url ? (
                    <img
                      src={b.desktop_image_url}
                      alt={b.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" aria-hidden />
                    </div>
                  )}
                  <Badge
                    className={cn(
                      "absolute left-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                      STATUS_CLASS[status],
                    )}
                  >
                    <span
                      className={cn(
                        "mr-1 inline-block h-1.5 w-1.5 rounded-full",
                        STATUS_DOT[status],
                      )}
                      aria-hidden
                    />
                    {status}
                  </Badge>
                  {sort === "priority" && (
                    <div className="absolute right-3 top-3 flex gap-1 opacity-90 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 rounded-lg bg-black/60 text-white hover:bg-black/80"
                        onClick={() => move(i, -1)}
                        disabled={isFirst || reorderMut.isPending}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 rounded-lg bg-black/60 text-white hover:bg-black/80"
                        onClick={() => move(i, 1)}
                        disabled={isLast || reorderMut.isPending}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-display text-base font-black leading-tight">
                        {b.title}
                      </div>
                      {b.subtitle && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {b.subtitle}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-lg"
                          aria-label="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditRow(b);
                            setDrawerOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate(b)}>
                          <Copy className="h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            toggleMut.mutate({ id: b.id, is_active: !b.is_active })
                          }
                          disabled={toggleMut.isPending}
                        >
                          <Power className="h-4 w-4" />
                          {b.is_active ? "Disable" : "Enable"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(b.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      Priority{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        #{b.sort_order}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 truncate">
                      <Calendar className="h-3 w-3" aria-hidden />
                      <span className="truncate">
                        {fmtDate(b.starts_at)} → {fmtDate(b.ends_at)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    {b.cta_text ? (
                      <div className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold">
                        <span>CTA · {b.cta_text}</span>
                        {b.cta_link && (
                          <span className="truncate text-muted-foreground">
                            → {b.cta_link}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/70">No CTA</span>
                    )}
                    <span
                      className="shrink-0 text-[11px] text-muted-foreground"
                      title={fmtDate(b.updated_at)}
                    >
                      Updated {relativeTime(b.updated_at)}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}


      <BannerDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initial={editRow}
        onSaved={() => {
          setDrawerOpen(false);
          qc.invalidateQueries({ queryKey: ["admin", "banners"] });
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete banner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the banner from the homepage immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
