import * as React from "react";
import { ChevronLeft, ChevronRight, Rows3, Rows2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DataColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** When false the column is hidden by default and appears in the toggler. */
  defaultVisible?: boolean;
  /** Hide from the column-visibility menu. */
  alwaysVisible?: boolean;
};

export type Density = "comfortable" | "compact";

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyState,
  getRowKey,
  onRowClick,
  zebra = false,
  density: densityProp,
  toolbar,
  className,
}: {
  columns: DataColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  getRowKey: (row: T, i: number) => React.Key;
  onRowClick?: (row: T) => void;
  zebra?: boolean;
  density?: Density;
  toolbar?: React.ReactNode;
  className?: string;
}) {
  const [density, setDensity] = React.useState<Density>(densityProp ?? "comfortable");
  const [hidden, setHidden] = React.useState<Record<string, boolean>>(() => {
    const h: Record<string, boolean> = {};
    for (const c of columns) if (c.defaultVisible === false) h[c.id] = true;
    return h;
  });

  const visible = columns.filter((c) => !hidden[c.id]);
  const rowPad = density === "compact" ? "py-2" : "py-3";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card",
        "shadow-[0_1px_0_0_hsl(var(--foreground)/0.02),0_1px_2px_-1px_hsl(var(--foreground)/0.06)]",
        className,
      )}
    >
      {(toolbar || true) && (
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5">
          <div className="min-w-0 flex-1">{toolbar}</div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground"
              aria-label={density === "compact" ? "Comfortable density" : "Compact density"}
              onClick={() => setDensity((d) => (d === "compact" ? "comfortable" : "compact"))}
            >
              {density === "compact" ? <Rows3 className="h-4 w-4" /> : <Rows2 className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground"
                  aria-label="Column visibility"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl">
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns
                  .filter((c) => !c.alwaysVisible)
                  .map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={!hidden[c.id]}
                      onCheckedChange={(v) =>
                        setHidden((h) => ({ ...h, [c.id]: !v }))
                      }
                    >
                      {typeof c.header === "string" ? c.header : c.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full caption-bottom border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <tr>
              {visible.map((c) => (
                <th
                  key={c.id}
                  className={cn(
                    "border-b border-border/70 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border/50 last:border-0">
                  {visible.map((c) => (
                    <td key={c.id} className={cn("px-3", rowPad)}>
                      <Skeleton className="h-4 w-full max-w-[180px] rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={visible.length} className="px-6 py-14 text-center">
                  {emptyState ?? (
                    <div className="text-sm text-muted-foreground">No results.</div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={getRowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border/50 transition-colors last:border-0",
                    zebra && i % 2 === 1 && "bg-muted/30",
                    onRowClick && "cursor-pointer",
                    "hover:bg-muted/50",
                  )}
                >
                  {visible.map((c) => (
                    <td
                      key={c.id}
                      className={cn("px-3 align-middle", rowPad, c.className)}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TablePagination({
  page,
  pageCount,
  onPage,
  totalLabel,
  className,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
  totalLabel?: React.ReactNode;
  className?: string;
}) {
  const canPrev = page > 1;
  const canNext = page < pageCount;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs",
        className,
      )}
    >
      <div className="text-muted-foreground">{totalLabel}</div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-md"
          disabled={!canPrev}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="min-w-[80px] px-2 text-center tabular-nums">
          Page <span className="font-semibold text-foreground">{page}</span> of{" "}
          <span className="font-semibold text-foreground">{Math.max(1, pageCount)}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-md"
          disabled={!canNext}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
