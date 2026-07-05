import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePerm } from "@/lib/admin-guard";

// All admin CRUD needs to see inactive/expired/scheduled rows too, so we use
// the service-role client (RLS bypassed). Access is still gated by
// requireSupabaseAuth — callers must be a signed-in admin user.

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ------------------------------------------------------------------
// Coupons
// ------------------------------------------------------------------

const CouponInputSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullish(),
  discount_type: z.enum(["percent", "flat", "free_delivery"]),
  percent: z.number().min(0).max(100).nullable().optional(),
  flat_pkr: z.number().int().min(0).nullable().optional(),
  max_discount_pkr: z.number().int().min(0).nullable().optional(),
  min_subtotal_pkr: z.number().int().min(0).default(0),
  usage_limit: z.number().int().min(0).nullable().optional(),
  per_user_limit: z.number().int().min(1).default(1),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requirePerm("coupons.manage")])
  .handler(async () => {
    const supabase = await admin();
    const { data, error } = await supabase
      .from("coupons")
      .select(
        "id,code,label,description,discount_type,percent,flat_pkr,max_discount_pkr,min_subtotal_pkr,usage_limit,per_user_limit,usage_count,starts_at,expires_at,is_active,created_at,updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("coupons.manage")])
  .inputValidator((raw: unknown) => CouponInputSchema.parse(raw))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const payload = {
      code: data.code.trim().toUpperCase(),
      label: data.label.trim(),
      description: data.description?.trim() || null,
      discount_type: data.discount_type,
      percent: data.discount_type === "percent" ? data.percent ?? null : null,
      flat_pkr: data.discount_type === "flat" ? data.flat_pkr ?? null : null,
      max_discount_pkr: data.max_discount_pkr ?? null,
      min_subtotal_pkr: data.min_subtotal_pkr ?? 0,
      usage_limit: data.usage_limit ?? null,
      per_user_limit: data.per_user_limit ?? 1,
      starts_at: data.starts_at || null,
      expires_at: data.expires_at || null,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("coupons")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminToggleCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("coupons.manage")])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("coupons.manage")])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------------------------
// Promo banners
// ------------------------------------------------------------------

const BannerInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(300).nullish(),
  cta_text: z.string().trim().max(80).nullish(),
  cta_link: z.string().trim().max(500).nullish(),
  desktop_image_url: z.string().trim().nullish(),
  mobile_image_url: z.string().trim().nullish(),
  sort_order: z.number().int().default(0),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const adminListBanners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requirePerm("banners.manage")])
  .handler(async () => {
    const supabase = await admin();
    const { data, error } = await supabase
      .from("promo_banners")
      .select(
        "id,title,subtitle,cta_text,cta_link,desktop_image_url,mobile_image_url,sort_order,starts_at,ends_at,is_active,created_at,updated_at",
      )
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("banners.manage")])
  .inputValidator((raw: unknown) => BannerInputSchema.parse(raw))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const payload = {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || null,
      cta_text: data.cta_text?.trim() || null,
      cta_link: data.cta_link?.trim() || null,
      desktop_image_url: data.desktop_image_url?.trim() || null,
      mobile_image_url: data.mobile_image_url?.trim() || null,
      sort_order: data.sort_order,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await supabase
        .from("promo_banners")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("promo_banners")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminToggleBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("banners.manage")])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase
      .from("promo_banners")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("banners.manage")])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const { error } = await supabase.from("promo_banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminReorderBanners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("banners.manage")])
  .inputValidator((raw: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = await admin();
    await Promise.all(
      data.ids.map((id, index) =>
        supabase.from("promo_banners").update({ sort_order: index }).eq("id", id),
      ),
    );
    return { ok: true };
  });

// ------------------------------------------------------------------
// Promo stats for the dashboard
// ------------------------------------------------------------------

export const adminPromoStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requirePerm("banners.manage")])
  .handler(async () => {
    const supabase = await admin();
    const [{ data: coupons, error: cErr }, { data: banners, error: bErr }] =
      await Promise.all([
        supabase.from("coupons").select("id,is_active,starts_at,expires_at"),
        supabase.from("promo_banners").select("id,is_active,starts_at,ends_at"),
      ]);
    if (cErr) throw new Error(cErr.message);
    if (bErr) throw new Error(bErr.message);

    const now = new Date();
    let active_coupons = 0;
    let expired_coupons = 0;
    let scheduled_promotions = 0;
    for (const c of coupons ?? []) {
      const starts = c.starts_at ? new Date(c.starts_at) : null;
      const expires = c.expires_at ? new Date(c.expires_at) : null;
      if (expires && expires < now) expired_coupons++;
      else if (starts && starts > now) scheduled_promotions++;
      else if (c.is_active) active_coupons++;
    }
    let active_banners = 0;
    for (const b of banners ?? []) {
      const starts = b.starts_at ? new Date(b.starts_at) : null;
      const ends = b.ends_at ? new Date(b.ends_at) : null;
      if (starts && starts > now) {
        scheduled_promotions++;
        continue;
      }
      if (ends && ends < now) continue;
      if (b.is_active) active_banners++;
    }
    return {
      active_coupons,
      expired_coupons,
      scheduled_promotions,
      active_banners,
    };
  });
