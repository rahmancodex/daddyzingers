// TanStack Query hooks powering every CMS module.
// Optimistic updates for the frequent mutations (set active, set status, reorder).
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  cmsCreateEntry,
  cmsDeleteEntry,
  cmsGetChild,
  cmsGetEntry,
  cmsListEntries,
  cmsReorderEntry,
  cmsSchedule,
  cmsSetActive,
  cmsSetStatus,
  cmsUpdateEntry,
  cmsUpsertChild,
} from "@/lib/cms.functions";
import type { CmsModule, CmsStatus, CmsEntry } from "@/lib/cms-shared";

type EntryWithStatus = CmsEntry & { effective_status: CmsStatus };

const listKey = (module: CmsModule, status: CmsStatus | "all" = "all"): QueryKey => [
  "cms",
  "entries",
  module,
  status,
];

const entryKey = (id: string): QueryKey => ["cms", "entry", id];
const childKey = (table: string, entryId: string): QueryKey => ["cms", "child", table, entryId];

export function useCmsList(module: CmsModule, status: CmsStatus | "all" = "all") {
  const listFn = useServerFn(cmsListEntries);
  return useQuery({
    queryKey: listKey(module, status),
    queryFn: () => listFn({ data: { module, status: status } }),
    staleTime: 15_000,
  });
}

export function useCmsEntry(id: string | undefined) {
  const getFn = useServerFn(cmsGetEntry);
  return useQuery({
    queryKey: id ? entryKey(id) : ["cms", "entry", "none"],
    queryFn: () => (id ? getFn({ data: { id } }) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCmsChild<T = unknown>(
  table:
    | "cms_hero_slides"
    | "cms_homepage_sections"
    | "cms_customer_reviews"
    | "cms_video_testimonials"
    | "cms_layout_configs"
    | "cms_media_assets",
  entryId: string | undefined,
) {
  const getFn = useServerFn(cmsGetChild);
  return useQuery({
    queryKey: entryId ? childKey(table, entryId) : ["cms", "child", table, "none"],
    queryFn: () =>
      entryId ? (getFn({ data: { table, entry_id: entryId } }) as Promise<T | null>) : Promise.resolve(null),
    enabled: !!entryId,
    staleTime: 15_000,
  });
}

function invalidateModule(qc: ReturnType<typeof useQueryClient>, module: CmsModule) {
  qc.invalidateQueries({ queryKey: ["cms", "entries", module] });
}

export function useCmsCreate(module: CmsModule) {
  const qc = useQueryClient();
  const createFn = useServerFn(cmsCreateEntry);
  return useMutation({
    mutationFn: (input: Parameters<typeof createFn>[0]["data"]) =>
      createFn({ data: { ...input, module } as never }),
    onSuccess: () => {
      invalidateModule(qc, module);
      toast.success("Created");
    },
    onError: (e: Error) => toast.error("Couldn't create", { description: e.message }),
  });
}

export function useCmsUpdate(module: CmsModule) {
  const qc = useQueryClient();
  const updateFn = useServerFn(cmsUpdateEntry);
  return useMutation({
    mutationFn: (input: Parameters<typeof updateFn>[0]["data"]) => updateFn({ data: input }),
    onSuccess: (updated) => {
      invalidateModule(qc, module);
      if (updated) qc.setQueryData(entryKey(updated.id), updated);
    },
    onError: (e: Error) => toast.error("Couldn't save", { description: e.message }),
  });
}

export function useCmsDelete(module: CmsModule) {
  const qc = useQueryClient();
  const deleteFn = useServerFn(cmsDeleteEntry);
  return useMutation({
    mutationFn: (input: { id: string }) => deleteFn({ data: input }),
    // Optimistic: remove from every cached list for this module.
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["cms", "entries", module] });
      const snapshot = qc.getQueriesData<EntryWithStatus[]>({ queryKey: ["cms", "entries", module] });
      snapshot.forEach(([key, rows]) => {
        if (Array.isArray(rows)) qc.setQueryData(key, rows.filter((r) => r.id !== id));
      });
      return { snapshot };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshot?.forEach(([key, rows]) => qc.setQueryData(key, rows));
      toast.error("Couldn't delete", { description: e.message });
    },
    onSettled: () => invalidateModule(qc, module),
    onSuccess: () => toast.success("Deleted"),
  });
}

export function useCmsSetActive(module: CmsModule) {
  const qc = useQueryClient();
  const setActiveFn = useServerFn(cmsSetActive);
  return useMutation({
    mutationFn: (input: { id: string; is_active: boolean }) => setActiveFn({ data: input }),
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: ["cms", "entries", module] });
      const snapshot = qc.getQueriesData<EntryWithStatus[]>({ queryKey: ["cms", "entries", module] });
      snapshot.forEach(([key, rows]) => {
        if (Array.isArray(rows)) {
          qc.setQueryData(
            key,
            rows.map((r) => (r.id === id ? { ...r, is_active } : r)),
          );
        }
      });
      return { snapshot };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshot?.forEach(([key, rows]) => qc.setQueryData(key, rows));
      toast.error("Couldn't update", { description: e.message });
    },
    onSettled: () => invalidateModule(qc, module),
  });
}

export function useCmsSetStatus(module: CmsModule) {
  const qc = useQueryClient();
  const setStatusFn = useServerFn(cmsSetStatus);
  return useMutation({
    mutationFn: (input: { id: string; status: CmsStatus }) => setStatusFn({ data: input }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["cms", "entries", module] });
      const snapshot = qc.getQueriesData<EntryWithStatus[]>({ queryKey: ["cms", "entries", module] });
      snapshot.forEach(([key, rows]) => {
        if (Array.isArray(rows)) {
          qc.setQueryData(
            key,
            rows.map((r) => (r.id === id ? { ...r, status, effective_status: status } : r)),
          );
        }
      });
      return { snapshot };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshot?.forEach(([key, rows]) => qc.setQueryData(key, rows));
      toast.error("Couldn't change status", { description: e.message });
    },
    onSuccess: () => toast.success("Status updated"),
    onSettled: () => invalidateModule(qc, module),
  });
}

export function useCmsSchedule(module: CmsModule) {
  const qc = useQueryClient();
  const scheduleFn = useServerFn(cmsSchedule);
  return useMutation({
    mutationFn: (input: { id: string; publish_at: string; unpublish_at?: string | null }) =>
      scheduleFn({ data: input }),
    onSuccess: () => {
      invalidateModule(qc, module);
      toast.success("Scheduled");
    },
    onError: (e: Error) => toast.error("Couldn't schedule", { description: e.message }),
  });
}

export function useCmsReorder(module: CmsModule) {
  const qc = useQueryClient();
  const reorderFn = useServerFn(cmsReorderEntry);
  return useMutation({
    mutationFn: (input: { id: string; direction: "up" | "down" }) => reorderFn({ data: input }),
    onSuccess: () => invalidateModule(qc, module),
    onError: (e: Error) => toast.error("Couldn't reorder", { description: e.message }),
  });
}

export function useCmsUpsertChild(
  module: CmsModule,
  table:
    | "cms_hero_slides"
    | "cms_homepage_sections"
    | "cms_customer_reviews"
    | "cms_video_testimonials"
    | "cms_layout_configs"
    | "cms_media_assets",
) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(cmsUpsertChild);
  return useMutation({
    mutationFn: (input: { entry_id: string; values: Record<string, unknown> }) =>
      upsertFn({ data: { table, entry_id: input.entry_id, values: input.values } }),
    onSuccess: (row) => {
      if (row && typeof (row as any).entry_id === "string") {
        qc.setQueryData(childKey(table, (row as any).entry_id as string), row);
      }
      invalidateModule(qc, module);
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error("Couldn't save", { description: e.message }),
  });
}
