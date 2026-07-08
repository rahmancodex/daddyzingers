// Bespoke Hero Slider list page — replaces the default CmsModulePage table so
// we can add per-row Edit, Duplicate, and richer previews without rewriting
// the generic CmsEntriesTable.
import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit3,
  Loader2,
  MoreHorizontal,
  Trash2,
  Archive,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { CmsModuleShell } from "../CmsModuleShell";
import { CmsStatusPill } from "../CmsStatusPill";
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

import {
  useCmsCreate,
  useCmsDelete,
  useCmsReorder,
  useCmsSetActive,
  useCmsSetStatus,
  useCmsUpsertChild,
} from "@/lib/use-cms";
import type { CmsEntry, CmsStatus } from "@/lib/cms-shared";
import { supabase } from "@/integrations/supabase/client";

import { HeroSlideDrawer } from "./HeroSlideDrawer";
import { parseHeroMeta, parseHeroSlide } from "@/lib/hero-slide-schema";

type Row = CmsEntry & { effective_status?: CmsStatus };

export function HeroSliderPage() {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const create = useCmsCreate("hero_slide");
  const upsertChild = useCmsUpsertChild("hero_slide", "cms_hero_slides");

  const openEditor = (id: string) => {
    setEditingId(id);
    setDrawerOpen(true);
  };

  return (
    <>
      <CmsModuleShell
        module="hero_slide"
        emptyHint="Rotating hero slides shown at the very top of the homepage."
        headerRight={
          <Button
            size="sm"
            variant="secondary"
            className="h-9"
            onClick={async () => {
              // Custom "New" — create both the entry AND a starter child row so
              // the drawer opens on a fully-formed slide.
              const created = await create.mutateAsync({
                title: "New hero slide",
                status: "draft",
                is_active: true,
              } as never);
              if (!created) return;
              await upsertChild
                .mutateAsync({
                  entry_id: created.id,
                  values: { headline: "New hero slide" },
                })
                .catch(() => undefined);
              openEditor(created.id);
            }}
            disabled={create.isPending}
          >
            {create.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            New slide
          </Button>
        }
      >
        {({ rows }) => (
          <HeroSlideList rows={rows as unknown as Row[]} onEdit={openEditor} />
        )}
      </CmsModuleShell>

      <HeroSlideDrawer
        entryId={editingId}
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setEditingId(null);
        }}
      />
    </>
  );
}

function HeroSlideList({ rows, onEdit }: { rows: Row[]; onEdit: (id: string) => void }) {
  const setActive = useCmsSetActive("hero_slide");
  const setStatus = useCmsSetStatus("hero_slide");
  const reorder = useCmsReorder("hero_slide");
  const del = useCmsDelete("hero_slide");
  const create = useCmsCreate("hero_slide");
  const upsertChild = useCmsUpsertChild("hero_slide", "cms_hero_slides");

  const duplicate = async (row: Row) => {
    try {
      const { data: child } = await supabase
        .from("cms_hero_slides")
        .select("*")
        .eq("entry_id", row.id)
        .maybeSingle();
      const created = await create.mutateAsync({
        title: `${row.title || "Slide"} (copy)`,
        status: "draft",
        is_active: true,
        meta: (row.meta ?? {}) as never,
      } as never);
      if (created && child) {
        const { entry_id: _skip, ...values } = child as Record<string, unknown>;
        await upsertChild.mutateAsync({ entry_id: created.id, values });
      }
      toast.success("Duplicated");
    } catch (e) {
      toast.error("Couldn't duplicate", { description: (e as Error).message });
    }
  };

  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        No hero slides yet. Click <strong>New slide</strong> to create your first one.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <SlideRow
          key={row.id}
          row={row}
          onEdit={() => onEdit(row.id)}
          onDuplicate={() => duplicate(row)}
          onDelete={() => del.mutate({ id: row.id })}
          onArchive={() => setStatus.mutate({ id: row.id, status: "archived" })}
          onPublish={() => setStatus.mutate({ id: row.id, status: "published" })}
          onDraft={() => setStatus.mutate({ id: row.id, status: "draft" })}
          onToggleActive={(v) => setActive.mutate({ id: row.id, is_active: v })}
          onMoveUp={() => reorder.mutate({ id: row.id, direction: "up" })}
          onMoveDown={() => reorder.mutate({ id: row.id, direction: "down" })}
        />
      ))}
    </div>
  );
}

function SlideRow({
  row,
  onEdit,
  onDuplicate,
  onDelete,
  onArchive,
  onPublish,
  onDraft,
  onToggleActive,
  onMoveUp,
  onMoveDown,
}: {
  row: Row;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onPublish: () => void;
  onDraft: () => void;
  onToggleActive: (v: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const meta = parseHeroMeta(row.meta);
  const slide = parseHeroSlide({ headline: row.title });
  const effective = row.effective_status ?? row.status;
  const thumb =
    meta.desktop_image_url ||
    meta.mobile_image_url ||
    slide.image_url ||
    "";

  const updated = row.updated_at ? new Date(row.updated_at) : null;

  return (
    <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onEdit}
        className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            No image
          </div>
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onEdit} className="truncate text-left text-sm font-semibold hover:underline">
            {row.title || "Untitled slide"}
          </button>
          <CmsStatusPill status={effective} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Order {row.sort_order ?? 0}
          {updated ? ` · Updated ${formatDistanceToNow(updated, { addSuffix: true })}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2 py-1">
          <Switch checked={row.is_active} onCheckedChange={onToggleActive} />
          <span className="text-[11px] font-medium text-muted-foreground">Active</span>
        </div>
        <Button size="sm" variant="ghost" onClick={onMoveUp} className="h-8 w-8 p-0" aria-label="Move up">
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onMoveDown} className="h-8 w-8 p-0" aria-label="Move down">
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="secondary" onClick={onEdit} className="h-8">
          <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onPublish}>
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Publish
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDraft}>
              <CircleDot className="mr-2 h-3.5 w-3.5" /> Mark draft
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onArchive}>
              <Archive className="mr-2 h-3.5 w-3.5" /> Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDuplicate}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
