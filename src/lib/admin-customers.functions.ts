import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Admin CRM reads bypass RLS on purpose — access is gated by
// requireSupabaseAuth so the caller must be a signed-in admin.
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type AdminCustomerRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  birthday: string | null;
  marketing_opt_in: boolean;
  reward_points: number;
  loyalty_tier: string;
  daddy_pass_status: string;
  daddy_pass_renews_at: string | null;
  referral_code: string | null;
  referral_count: number;
  total_orders: number;
  total_spend_pkr: number;
  favorite_category: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  last_order_at: string | null;
};

export type AdminCustomerAddress = {
  id: string;
  label: string;
  recipient_name: string | null;
  phone: string | null;
  address_line: string;
  city: string;
  area: string | null;
  notes: string | null;
  is_default: boolean;
  created_at: string;
};

export type AdminCustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  total_pkr: number;
  payment_method: string;
  fulfillment_method: string;
  items_count: number;
  created_at: string;
};

export type AdminCustomerFavorite = {
  product_id: string;
  product_name: string | null;
  product_image: string | null;
  category_id: string | null;
  created_at: string;
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

async function attachEmails(userIds: string[]): Promise<Map<string, string | null>> {
  const supabase = await admin();
  const map = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      map.set(id, data.user?.email ?? null);
    }),
  );
  return map;
}

async function attachLastOrders(userIds: string[]): Promise<Map<string, string | null>> {
  const supabase = await admin();
  const map = new Map<string, string | null>();
  if (userIds.length === 0) return map;
  const { data } = await supabase
    .from("orders")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });
  for (const o of data ?? []) {
    if (!map.has(o.user_id)) map.set(o.user_id, o.created_at);
  }
  return map;
}

// ------------------------------------------------------------------
// List customers
// ------------------------------------------------------------------

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<AdminCustomerRow[]> => {
    const supabase = await admin();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, phone, avatar_url, birthday, marketing_opt_in, reward_points, loyalty_tier, daddy_pass_status, daddy_pass_renews_at, referral_code, referral_count, total_orders, total_spend_pkr, favorite_category, admin_notes, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const ids = rows.map((r) => r.id);
    const [emails, lastOrders] = await Promise.all([
      attachEmails(ids),
      attachLastOrders(ids),
    ]);
    return rows.map((r) => ({
      ...r,
      email: emails.get(r.id) ?? null,
      last_order_at: lastOrders.get(r.id) ?? null,
    })) as AdminCustomerRow[];
  });

// ------------------------------------------------------------------
// Get single customer detail
// ------------------------------------------------------------------

export const adminGetCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const [{ data: profile, error: pErr }, { data: addresses }, { data: orders }, { data: favorites }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, phone, avatar_url, birthday, marketing_opt_in, reward_points, loyalty_tier, daddy_pass_status, daddy_pass_renews_at, referral_code, referral_count, total_orders, total_spend_pkr, favorite_category, admin_notes, created_at, updated_at",
          )
          .eq("id", data.id)
          .maybeSingle(),
        supabase
          .from("user_addresses")
          .select(
            "id, label, recipient_name, phone, address_line, city, area, notes, is_default, created_at",
          )
          .eq("user_id", data.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select(
            "id, order_number, status, total_pkr, payment_method, fulfillment_method, created_at",
          )
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("user_favorites")
          .select("product_id, created_at")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Customer not found");

    const { data: emailUser } = await supabase.auth.admin.getUserById(data.id);

    // Items count per order (batch)
    const orderIds = (orders ?? []).map((o) => o.id);
    const itemsCount = new Map<string, number>();
    if (orderIds.length) {
      const { data: itemsRows } = await supabase
        .from("order_items")
        .select("order_id")
        .in("order_id", orderIds);
      for (const it of itemsRows ?? []) {
        itemsCount.set(it.order_id, (itemsCount.get(it.order_id) ?? 0) + 1);
      }
    }

    // Enrich favorites with menu item details
    const favIds = (favorites ?? []).map((f) => f.product_id);
    const menuMap = new Map<string, { name: string; image_url: string | null; category_id: string | null }>();
    if (favIds.length) {
      const { data: menuRows } = await supabase
        .from("menu_items")
        .select("id, name, image_url, category_id")
        .in("id", favIds);
      for (const m of menuRows ?? []) {
        menuMap.set(m.id, {
          name: m.name,
          image_url: m.image_url ?? null,
          category_id: m.category_id ?? null,
        });
      }
    }

    return {
      profile: {
        ...profile,
        email: emailUser.user?.email ?? null,
      } as AdminCustomerRow & { email: string | null },
      addresses: (addresses ?? []) as AdminCustomerAddress[],
      orders: (orders ?? []).map((o) => ({
        ...o,
        items_count: itemsCount.get(o.id) ?? 0,
      })) as AdminCustomerOrder[],
      favorites: (favorites ?? []).map((f) => {
        const m = menuMap.get(f.product_id);
        return {
          product_id: f.product_id,
          product_name: m?.name ?? null,
          product_image: m?.image_url ?? null,
          category_id: m?.category_id ?? null,
          created_at: f.created_at,
        };
      }) as AdminCustomerFavorite[],
    };
  });

// ------------------------------------------------------------------
// Update loyalty / pass / notes
// ------------------------------------------------------------------

const LoyaltyInputSchema = z.object({
  id: z.string().uuid(),
  reward_points: z.number().int().min(0).optional(),
  loyalty_tier: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
  daddy_pass_status: z.enum(["none", "active", "expired", "cancelled"]).optional(),
  daddy_pass_renews_at: z.string().nullable().optional(),
  admin_notes: z.string().nullable().optional(),
});

export const adminUpdateCustomerLoyalty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => LoyaltyInputSchema.parse(raw))
  .handler(async ({ data }) => {
    const supabase = await admin();
    const patch: Record<string, unknown> = {};
    if (data.reward_points !== undefined) patch.reward_points = data.reward_points;
    if (data.loyalty_tier !== undefined) patch.loyalty_tier = data.loyalty_tier;
    if (data.daddy_pass_status !== undefined) patch.daddy_pass_status = data.daddy_pass_status;
    if (data.daddy_pass_renews_at !== undefined)
      patch.daddy_pass_renews_at = data.daddy_pass_renews_at;
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("profiles").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------------------------
// Dashboard stats
// ------------------------------------------------------------------

export const adminCustomerStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const supabase = await admin();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: total },
      { count: new_this_week },
      { count: daddy_pass },
      { data: activeRows },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("daddy_pass_status", "active"),
      supabase
        .from("orders")
        .select("user_id")
        .gte("created_at", thirtyDaysAgo),
    ]);

    const activeSet = new Set((activeRows ?? []).map((r) => r.user_id));
    return {
      total: total ?? 0,
      new_this_week: new_this_week ?? 0,
      daddy_pass: daddy_pass ?? 0,
      active_30d: activeSet.size,
    };
  });
