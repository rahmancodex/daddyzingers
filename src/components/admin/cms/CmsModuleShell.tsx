// Reusable shell for every CMS module page.
// Handles loading, error, empty state, header, and a status filter — so
// individual editors only own their table body and drawer.
import * as React from "react";
import { AlertTriangle, Loader2, Plus, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CMS_MODULES, CMS_STATUS_LABEL, type CmsModule, type CmsStatus } from "@/lib/cms-shared";
import { useCmsCreate, useCmsList } from "@/lib/use-cms";
import { CmsStatusPill } from "./CmsStatusPill";

type FilterStatus = CmsStatus | "all";

const FILTERS: FilterStatus[] = ["all", "draft", "scheduled", "published", "inactive", "archived"];

export function CmsModuleShell({
  module,
  createDefaults,
  createDisabled,
  children,
  headerRight,
  emptyHint,
}: {
  module: CmsModule;
  /** Optional defaults for the "New" button. Omit `title` to skip auto-create. */
  createDefaults?: { title?: string; extra?: Record<string, unknown> };
  createDisabled?: boolean;
  children?: (ctx: {
    rows: Array<Awaited<ReturnType<typeof useCmsList>>["data"]> extends Array<infer _T>
      ? NonNullable<Awaited<ReturnType<typeof useCmsList>>["data"]>
      : never;
    status: FilterStatus;
    isFetching: boolean;
  }) => React.ReactNode;
  headerRight?: React.ReactNode;
  emptyHint?: string;
}) {
  const meta = CMS_MODULES[module];
  const [status, setStatus] = React.useState<FilterStatus>("all");
  const list = useCmsList(module, status);
  const create = useCmsCreate(module);

  const onCreate = () => {
    if (!createDefaults?.title) {
      toast.info("Editor coming soon", {
        description: "This module's inline editor is not built yet — the API is ready.",
      });
      return;
    }
    create.mutate({
      title: createDefaults.title,
      status: "draft",
      is_active: true,
      ...(createDefaults.extra ?? {}),
    } as never);
  };

  const rows = list.data ?? [];
  const counts = React.useMemo(() => {
    const c: Record<FilterStatus, number> = {
      all: rows.length,
      draft: 0,
      scheduled: 0,
      published: 0,
      inactive: 0,
      archived: 0,
    };
    for (const r of rows) {
      const s = (r as { effective_status?: CmsStatus }).effective_status ?? (r as { status: CmsStatus }).status;
      if (s in c) c[s]++;
    }
    return c;
  }, [rows]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-24">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Content Management
          </div>
          <h1 className="font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
            {meta.label}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {list.isFetching && !list.isLoading && (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Syncing
            </Badge>
          )}
          {headerRight}
          <Button size="sm" onClick={onCreate} disabled={createDisabled || create.isPending} className="h-9">
            {create.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            New
          </Button>
        </div>
      </header>

      <Tabs value={status} onValueChange={(v) => setStatus(v as FilterStatus)}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-muted/60 p-1.5">
          {FILTERS.map((f) => (
            <TabsTrigger
              key={f}
              value={f}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {f === "all" ? "All" : CMS_STATUS_LABEL[f]}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                {counts[f]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : list.error ? (
        <ErrorCard message={(list.error as Error).message} onRetry={() => list.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState label={meta.label} hint={emptyHint} onCreate={onCreate} disabled={createDisabled} />
      ) : (
        children?.({ rows: rows as never, status, isFetching: list.isFetching })
      )}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold">Couldn't load content</div>
            <div className="text-sm text-muted-foreground break-words">{message}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try again
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  label,
  hint,
  onCreate,
  disabled,
}: {
  label: string;
  hint?: string;
  onCreate: () => void;
  disabled?: boolean;
}) {
  return (
    <Card className="border-dashed border-border/70 bg-muted/20">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <div className="text-base font-bold">No {label.toLowerCase()} yet</div>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {hint ?? `Create your first ${label.toLowerCase()} entry to publish it on the website.`}
          </p>
        </div>
        <Button onClick={onCreate} disabled={disabled} className="mt-2">
          <Plus className="mr-1.5 h-4 w-4" /> Create
        </Button>
      </CardContent>
    </Card>
  );
}

// Re-export the status pill so callers only import from one place.
export { CmsStatusPill };
