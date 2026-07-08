// Server functions powering the CMS.
// All CRUD is scoped by module and gated by cms.manage / cms.publish.
// Uses the admin (service-role) client — loaded INSIDE each handler so this
// file remains safe to import from client-reachable admin routes.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePerm } from "@/lib/admin-guard";
import type { Database } from "@/integrations/supabase/types";

type CmsModule = Database["public"]["Enums"]["cms_module"];
type CmsStatus = Database["public"]["Enums"]["cms_status"];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const cmsModuleValues = [
  "homepage",
  "hero_slide",
  "homepage_section",
  "customer_review",
  "video_testimonial",
  "layout_desktop",
  "layout_mobile",
  "media_asset",
] as const satisfies readonly CmsModule[];

const cmsStatusValues = [
  "draft",
  "scheduled",
  "published",
  "inactive",
  "archived",
] as const satisfies readonly CmsStatus[];

const cmsModuleSchema = z.enum(cmsModuleValues);
const cmsStatusSchema = z.enum(cmsStatusValues);

// -----------------------------
// LIST + GET
// -----------------------------

export const cmsListEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requirePerm("cms.view")])
  .inputValidator((input: { module: CmsModule; status?: CmsStatus | "all" }) =>
    z
      .object({
        module: cmsModuleSchema,
        status: z.union([cmsStatusSchema, z.literal("all")]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    let q = supabase
      .from("cms_entries_with_status")
      .select("*")
      .eq("module", data.module)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const cmsGetEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requirePerm("cms.view")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: entry, error } = await supabase
      .from("cms_entries")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return entry;
  });

// -----------------------------
// CREATE / UPDATE / DELETE
// -----------------------------

const entryPatchSchema = z.object({
  title: z.string().trim().max(200).optional(),
  slug: z.string().trim().max(200).nullable().optional(),
  status: cmsStatusSchema.optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  publish_at: z.string().datetime().nullable().optional(),
  unpublish_at: z.string().datetime().nullable().optional(),
  locale: z.string().trim().max(10).optional(),
  tags: z.array(z.string().trim().max(50)).optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

const createSchema = entryPatchSchema.extend({
  module: cmsModuleSchema,
  title: z.string().trim().min(1).max(200),
});

export const cmsCreateEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("cms.manage")])
  .inputValidator((input: z.infer<typeof createSchema>) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = await admin();
    const { data: created, error } = await supabase
      .from("cms_entries")
      .insert({
        ...data,
        // Trigger will fall back to auth.uid() when null, but the admin client
        // has no auth.uid(), so stamp created_by / updated_by explicitly.
        created_by: (context as any).userId ?? null,
        updated_by: (context as any).userId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

const updateSchema = entryPatchSchema.extend({ id: z.string().uuid() });

export const cmsUpdateEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("cms.manage")])
  .inputValidator((input: z.infer<typeof updateSchema>) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = await admin();
    const { id, ...patch } = data;
    const { data: updated, error } = await supabase
      .from("cms_entries")
      .update({ ...patch, updated_by: (context as any).userId ?? null })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const cmsDeleteEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("cms.manage")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase.from("cms_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -----------------------------
// PUBLISH LIFECYCLE
// -----------------------------

export const cmsSetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("cms.publish")])
  .inputValidator((input: { id: string; status: CmsStatus }) =>
    z.object({ id: z.string().uuid(), status: cmsStatusSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = await admin();
    const patch: Record<string, unknown> = {
      status: data.status,
      updated_by: (context as any).userId ?? null,
    };
    if (data.status === "published") patch.published_at = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("cms_entries")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const cmsSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("cms.publish")])
  .inputValidator((input: { id: string; publish_at: string; unpublish_at?: string | null }) =>
    z
      .object({
        id: z.string().uuid(),
        publish_at: z.string().datetime(),
        unpublish_at: z.string().datetime().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = await admin();
    const { data: updated, error } = await supabase
      .from("cms_entries")
      .update({
        status: "scheduled",
        publish_at: data.publish_at,
        unpublish_at: data.unpublish_at ?? null,
        updated_by: (context as any).userId ?? null,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const cmsSetActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("cms.manage")])
  .inputValidator((input: { id: string; is_active: boolean }) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = await admin();
    const { data: updated, error } = await supabase
      .from("cms_entries")
      .update({ is_active: data.is_active, updated_by: (context as any).userId ?? null })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

// Reorder — swap two entries' sort_order within their module.
export const cmsReorderEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("cms.manage")])
  .inputValidator((input: { id: string; direction: "up" | "down" }) =>
    z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: target, error: tErr } = await supabase
      .from("cms_entries")
      .select("id, module, sort_order")
      .eq("id", data.id)
      .single();
    if (tErr) throw new Error(tErr.message);
    const { data: siblings, error: sErr } = await supabase
      .from("cms_entries")
      .select("id, sort_order")
      .eq("module", target.module)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (sErr) throw new Error(sErr.message);
    const list = siblings ?? [];
    const idx = list.findIndex((r) => r.id === data.id);
    if (idx < 0) return { ok: true };
    const swapIdx = data.direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return { ok: true };
    const a = list[idx];
    const b = list[swapIdx];
    const aOrder = a.sort_order ?? 0;
    const bOrder = (b.sort_order ?? 0) === aOrder ? aOrder + (data.direction === "up" ? -1 : 1) : b.sort_order;
    await supabase.from("cms_entries").update({ sort_order: bOrder }).eq("id", a.id);
    await supabase.from("cms_entries").update({ sort_order: aOrder }).eq("id", b.id);
    return { ok: true };
  });

// -----------------------------
// TYPED CHILD UPSERT (generic)
// -----------------------------

const childTableSchema = z.enum([
  "cms_hero_slides",
  "cms_homepage_sections",
  "cms_customer_reviews",
  "cms_video_testimonials",
  "cms_layout_configs",
  "cms_media_assets",
]);

export const cmsUpsertChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("cms.manage")])
  .inputValidator(
    (input: {
      table: z.infer<typeof childTableSchema>;
      entry_id: string;
      values: Record<string, unknown>;
    }) =>
      z
        .object({
          table: childTableSchema,
          entry_id: z.string().uuid(),
          values: z.record(z.string(), z.any()),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    const payload = { entry_id: data.entry_id, ...data.values };
    // upsert on entry_id (child PK) so create + update share the same call.
    const { data: row, error } = await supabase
      .from(data.table)
      .upsert(payload as never, { onConflict: "entry_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const cmsGetChild = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requirePerm("cms.view")])
  .inputValidator((input: { table: z.infer<typeof childTableSchema>; entry_id: string }) =>
    z.object({ table: childTableSchema, entry_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: row, error } = await supabase
      .from(data.table)
      .select("*")
      .eq("entry_id", data.entry_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
