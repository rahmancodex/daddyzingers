import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePerm } from "@/lib/admin-guard";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ============ SETTINGS ============

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requirePerm("settings.manage")])
  .handler(async () => {
    const supabase = await admin();
    const { data, error } = await supabase
      .from("restaurant_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      const { data: created, error: insErr } = await supabase
        .from("restaurant_settings")
        .insert({ singleton: true })
        .select("*")
        .single();
      if (insErr) throw new Error(insErr.message);
      return created;
    }
    return data;
  });

const settingsPatchSchema = z.object({
  restaurant_info: z.record(z.string(), z.any()).optional(),
  business_hours: z.record(z.string(), z.any()).optional(),
  delivery_settings: z.record(z.string(), z.any()).optional(),
  tax_settings: z.record(z.string(), z.any()).optional(),
  seo_settings: z.record(z.string(), z.any()).optional(),
  social_media: z.record(z.string(), z.any()).optional(),
  contact_info: z.record(z.string(), z.any()).optional(),
  brand_assets: z.record(z.string(), z.any()).optional(),
  maintenance_mode: z.record(z.string(), z.any()).optional(),
});

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("settings.manage")])
  .inputValidator((input: z.infer<typeof settingsPatchSchema>) => settingsPatchSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: updated, error } = await supabase
      .from("restaurant_settings")
      .update(data)
      .eq("singleton", true)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

// ============ BRANCHES ============

export const adminListBranches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requirePerm("branches.manage")])
  .handler(async () => {
    const supabase = await admin();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const branchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  google_maps_link: z.string().trim().max(500).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().max(255).nullable().optional(),
  manager_name: z.string().trim().max(120).nullable().optional(),
  is_active: z.boolean().optional(),
  opening_hours: z.record(z.string(), z.any()).optional(),
  delivery_radius_km: z.number().nullable().optional(),
  estimated_delivery_minutes: z.number().int().nullable().optional(),
  minimum_order: z.number().nullable().optional(),
  delivery_charges: z.number().nullable().optional(),
  pickup_available: z.boolean().optional(),
  delivery_available: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const adminCreateBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("branches.manage")])
  .inputValidator((input: z.infer<typeof branchSchema>) => branchSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: created, error } = await supabase
      .from("branches")
      .insert(data)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

const branchUpdateSchema = branchSchema.partial().extend({ id: z.string().uuid() });

export const adminUpdateBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("branches.manage")])
  .inputValidator((input: z.infer<typeof branchUpdateSchema>) => branchUpdateSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { id, ...patch } = data;
    const { data: updated, error } = await supabase
      .from("branches")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const adminDeleteBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("branches.manage")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = await admin();

    // Refuse deletion when the branch is referenced anywhere meaningful.
    const [ordersRes, staffRes, rolesRes, invRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("branch_id", data.id),
      supabase.from("staff_profiles").select("user_id", { count: "exact", head: true }).eq("branch_id", data.id),
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("branch_id", data.id),
      supabase.from("staff_invitations").select("id", { count: "exact", head: true }).eq("branch_id", data.id),
    ]);
    const orders = ordersRes.count ?? 0;
    const staff = (staffRes.count ?? 0) + (rolesRes.count ?? 0);
    const invites = invRes.count ?? 0;
    if (orders + staff + invites > 0) {
      const parts: string[] = [];
      if (orders) parts.push(`${orders} order${orders === 1 ? "" : "s"}`);
      if (staff) parts.push(`${staff} staff assignment${staff === 1 ? "" : "s"}`);
      if (invites) parts.push(`${invites} pending invite${invites === 1 ? "" : "s"}`);
      throw new Error(
        `Cannot delete this branch — it is still linked to ${parts.join(", ")}. Disable the branch instead, or reassign these records first.`,
      );
    }

    const { error } = await supabase.from("branches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Swap two branches' sort_order in a single call. Used by the reorder buttons.
export const adminReorderBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("branches.manage")])
  .inputValidator((input: { id: string; direction: "up" | "down" }) =>
    z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { data: rows, error } = await supabase
      .from("branches")
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const idx = list.findIndex((b) => b.id === data.id);
    if (idx < 0) throw new Error("Branch not found");
    const swapIdx = data.direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return { ok: true };
    const a = list[idx];
    const b = list[swapIdx];
    // Handle equal sort_order by biasing one side.
    const aOrder = a.sort_order ?? 0;
    const bOrder = (b.sort_order ?? 0) === aOrder ? aOrder + (data.direction === "up" ? -1 : 1) : b.sort_order;
    await supabase.from("branches").update({ sort_order: bOrder }).eq("id", a.id);
    await supabase.from("branches").update({ sort_order: aOrder }).eq("id", b.id);
    return { ok: true };
  });

