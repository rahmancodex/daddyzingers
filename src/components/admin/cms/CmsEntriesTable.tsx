// Generic entries table used by the module list pages.
// Handles status pill, active toggle, reorder, quick publish/unpublish, delete.
import * as React from "react";
import { ArrowDown, ArrowUp, Calendar, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CmsStatusPill } from "./CmsStatusPill";

import {
  useCmsDelete,
  useCmsReorder,
  useCmsSetActive,
  useCmsSetStatus,
} from "@/lib/use-cms";
import type { CmsEntry, CmsModule, CmsStatus } from "@/lib/cms-shared";

type Row = CmsEntry & { effective_status?: CmsStatus };

export function CmsEntriesTable({
  module,
  rows,
  onEdit,
}: {
  module: CmsModule;
  rows: Row[];
  onEdit?: (row: Row) => void;
}) {
  const setActive = useCmsSetActive(module);
  const setStatus = useCmsSetStatus(module);
  const reorder = useCmsReorder(module);
  const del = useCmsDelete(module);

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70">
      <div className="divide-y divide-border/60">
        {rows.map((row, idx) => {
          const status = row.effective_status ?? row.status;
          const isFirst = idx === 0;
          const isLast = idx === rows.length - 1;
          return (
            <div
              key={row.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[auto_1fr_auto_auto_auto]"
            >
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={isFirst || reorder.isPending}
                  onClick={() => reorder.mutate({ id: row.id, direction: "up" })}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={isLast || reorder.isPending}
                  onClick={() => reorder.mutate({ id: row.id, direction: "down" })}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              <button
                type="button"
                onClick={() => onEdit?.(row)}
                className="min-w-0 text-left"
              >
                <div className="truncate font-semibold">{row.title || "Untitled"}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    Updated {row.updated_at ? formatDistanceToNow(new Date(row.updated_at), { addSuffix: true }) : "—"}
                  </span>
                  {row.publish_at && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(row.publish_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </button>

              <CmsStatusPill status={status} />

              <div className="hidden items-center gap-2 sm:flex">
                <Switch
                  checked={row.is_active}
                  onCheckedChange={(v) => setActive.mutate({ id: row.id, is_active: v })}
                  aria-label="Active"
                />
                <span className="text-[11px] text-muted-foreground">
                  {row.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Publishing</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setStatus.mutate({ id: row.id, status: "published" })}
                    disabled={row.status === "published"}
                  >
                    Publish now
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatus.mutate({ id: row.id, status: "draft" })}
                    disabled={row.status === "draft"}
                  >
                    Move to draft
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatus.mutate({ id: row.id, status: "archived" })}
                    disabled={row.status === "archived"}
                  >
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm("Delete this entry? This cannot be undone.")) {
                        del.mutate({ id: row.id });
                      }
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
