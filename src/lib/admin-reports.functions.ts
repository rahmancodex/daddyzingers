import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const filtersSchema = z.object({
  from: z.string(),
  to: z.string(),
  branchId: z.string().uuid().nullable().optional(),
  status: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  couponCode: z.string().nullable().optional(),
});

export type ReportFilters = z.infer<typeof filtersSchema>;

type OrderRow = {
  id: string;
  user_id: string | null;
  order_number: string;
  status: string;
  subtotal_pkr: number | null;
  delivery_fee_pkr: number | null;
  total_pkr: number | null;
  discount_pkr: number | null;
  tax_pkr: number | null;
  fulfillment_method: string | null;
  branch_id: string | null;
  coupon_code: string | null;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  order_id: string;
  product_id: string | null;
  name: string | null;
  qty: number | null;
  unit_price_pkr: number | null;
  options: unknown;
};

const TERMINAL_DELIVERED = "delivered";
const TERMINAL_CANCELLED = "cancelled";

function bucketByDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function bucketByMonth(d: Date): string {
  return d.toISOString().slice(0, 7);
}
function bucketByHour(d: Date): number {
  return d.getUTCHours();
}
function bucketByDow(d: Date): number {
  return d.getUTCDay();
}

export const adminReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: ReportFilters) => filtersSchema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // ---- Orders in range ----
    let q = supabaseAdmin
      .from("orders")
      .select(
        "id,user_id,order_number,status,subtotal_pkr,delivery_fee_pkr,total_pkr,discount_pkr,tax_pkr,fulfillment_method,branch_id,coupon_code,created_at,updated_at",
      )
      .gte("created_at", data.from)
      .lte("created_at", data.to)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (data.branchId) q = q.eq("branch_id", data.branchId);
    if (data.status) q = q.eq("status", data.status as never);
    if (data.userId) q = q.eq("user_id", data.userId);
    if (data.couponCode) q = q.eq("coupon_code", data.couponCode);

    const { data: orders, error } = await q;
    if (error) throw new Error(error.message);
    const orderList = (orders ?? []) as OrderRow[];
    const orderIds = orderList.map((o) => o.id);

    // ---- Previous period for growth ----
    const rangeMs = new Date(data.to).getTime() - new Date(data.from).getTime();
    const prevFrom = new Date(new Date(data.from).getTime() - rangeMs).toISOString();
    const prevTo = data.from;
    const { data: prevOrders } = await supabaseAdmin
      .from("orders")
      .select("total_pkr,discount_pkr")
      .gte("created_at", prevFrom)
      .lt("created_at", prevTo)
      .limit(10000);

    // ---- Items ----
    let items: ItemRow[] = [];
    if (orderIds.length) {
      const { data: itemRows } = await supabaseAdmin
        .from("order_items")
        .select("order_id,product_id,name,qty,unit_price_pkr,options")
        .in("order_id", orderIds);
      items = (itemRows ?? []) as ItemRow[];
    }

    // ---- Menu, categories for product analytics ----
    const productIds = Array.from(
      new Set(items.map((i) => i.product_id).filter((x): x is string => !!x)),
    );
    let productMap = new Map<string, { name: string; category_id: string | null }>();
    if (productIds.length) {
      const { data: menu } = await supabaseAdmin
        .from("menu_items")
        .select("id,name,category_id")
        .in("id", productIds);
      for (const m of menu ?? []) productMap.set(m.id, { name: m.name, category_id: m.category_id });
    }
    const { data: categories } = await supabaseAdmin
      .from("menu_categories")
      .select("id,name");
    const categoryMap = new Map<string, string>((categories ?? []).map((c) => [c.id, c.name]));

    // Optional category filter (items whose product is in that category)
    let filteredItems = items;
    if (data.categoryId) {
      filteredItems = items.filter(
        (i) => i.product_id && productMap.get(i.product_id)?.category_id === data.categoryId,
      );
    }

    // ---- Customers ----
    const userIds = Array.from(new Set(orderList.map((o) => o.user_id).filter((x): x is string => !!x)));
    let profileMap = new Map<
      string,
      {
        full_name: string | null;
        phone: string | null;
        loyalty_tier: string | null;
        daddy_pass_status: string | null;
        referral_count: number | null;
        total_orders: number | null;
        total_spend_pkr: number | null;
        created_at: string;
      }
    >();
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select(
          "id,full_name,phone,loyalty_tier,daddy_pass_status,referral_count,total_orders,total_spend_pkr,created_at",
        )
        .in("id", userIds);
      for (const p of profs ?? []) profileMap.set(p.id, p);
    }

    // Loyalty tier + Daddy pass distribution (all profiles snapshot)
    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id,loyalty_tier,daddy_pass_status,referral_count,total_spend_pkr,total_orders,created_at,full_name")
      .limit(10000);
    const profiles = allProfiles ?? [];

    // ---- Branches ----
    const { data: branches } = await supabaseAdmin
      .from("branches")
      .select("id,name,city,is_active,estimated_delivery_minutes");

    // ---- Coupons / redemptions ----
    const { data: coupons } = await supabaseAdmin
      .from("coupons")
      .select("id,code,label,is_active,starts_at,expires_at,usage_count,usage_limit");
    const { data: redemptions } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("coupon_id,user_id,order_id,discount_pkr,created_at")
      .gte("created_at", data.from)
      .lte("created_at", data.to)
      .limit(5000);

    // ---- Promo banners ----
    const { data: banners } = await supabaseAdmin
      .from("promo_banners")
      .select("id,title,is_active,starts_at,ends_at");

    // =========================
    // AGGREGATIONS
    // =========================

    // Revenue
    const totalRevenue = orderList.reduce((s, o) => s + (o.total_pkr ?? 0), 0);
    const totalDiscount = orderList.reduce((s, o) => s + (o.discount_pkr ?? 0), 0);
    const totalDelivery = orderList.reduce((s, o) => s + (o.delivery_fee_pkr ?? 0), 0);
    const totalTax = orderList.reduce((s, o) => s + (o.tax_pkr ?? 0), 0);
    const netRevenue = totalRevenue - totalTax - totalDelivery;
    const aov = orderList.length ? Math.round(totalRevenue / orderList.length) : 0;
    const prevRevenue = (prevOrders ?? []).reduce((s, o) => s + (o.total_pkr ?? 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;

    // Trend (daily)
    const trendMap = new Map<string, { revenue: number; orders: number; discount: number }>();
    for (const o of orderList) {
      const k = bucketByDay(new Date(o.created_at));
      const cur = trendMap.get(k) ?? { revenue: 0, orders: 0, discount: 0 };
      cur.revenue += o.total_pkr ?? 0;
      cur.discount += o.discount_pkr ?? 0;
      cur.orders += 1;
      trendMap.set(k, cur);
    }
    const trend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    // Monthly + yearly
    const monthlyMap = new Map<string, { revenue: number; orders: number }>();
    const yearlyMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of orderList) {
      const d = new Date(o.created_at);
      const mk = bucketByMonth(d);
      const yk = String(d.getUTCFullYear());
      const mm = monthlyMap.get(mk) ?? { revenue: 0, orders: 0 };
      mm.revenue += o.total_pkr ?? 0;
      mm.orders += 1;
      monthlyMap.set(mk, mm);
      const yy = yearlyMap.get(yk) ?? { revenue: 0, orders: 0 };
      yy.revenue += o.total_pkr ?? 0;
      yy.orders += 1;
      yearlyMap.set(yk, yy);
    }

    // Status breakdown
    const statusMap: Record<string, number> = {};
    for (const o of orderList) statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
    const completed = statusMap[TERMINAL_DELIVERED] ?? 0;
    const cancelled = statusMap[TERMINAL_CANCELLED] ?? 0;
    const cancellationRate = orderList.length ? (cancelled / orderList.length) * 100 : 0;

    // Processing time (created_at to updated_at when delivered)
    const deliveredOrders = orderList.filter((o) => o.status === TERMINAL_DELIVERED);
    const avgProcessingMin =
      deliveredOrders.length > 0
        ? Math.round(
            deliveredOrders.reduce(
              (s, o) =>
                s +
                (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60_000,
              0,
            ) / deliveredOrders.length,
          )
        : 0;

    // Delivery vs pickup
    let deliveryCount = 0;
    let pickupCount = 0;
    for (const o of orderList) {
      if ((o.fulfillment_method ?? "").toLowerCase() === "pickup") pickupCount++;
      else deliveryCount++;
    }

    // Product analytics
    const productAgg = new Map<
      string,
      { name: string; qty: number; revenue: number; category: string | null }
    >();
    for (const it of filteredItems) {
      const id = it.product_id ?? it.name ?? "unknown";
      const p = productMap.get(it.product_id ?? "");
      const cat = p?.category_id ? categoryMap.get(p.category_id) ?? null : null;
      const cur = productAgg.get(id) ?? { name: it.name ?? p?.name ?? id, qty: 0, revenue: 0, category: cat };
      const qty = it.qty ?? 0;
      cur.qty += qty;
      cur.revenue += qty * (it.unit_price_pkr ?? 0);
      productAgg.set(id, cur);
    }
    const productArr = [...productAgg.values()];
    const bestProducts = [...productArr].sort((a, b) => b.qty - a.qty).slice(0, 10);
    const worstProducts = [...productArr].sort((a, b) => a.qty - b.qty).slice(0, 5);
    const topRevenueProducts = [...productArr].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const lowRevenueProducts = [...productArr].sort((a, b) => a.revenue - b.revenue).slice(0, 5);

    // Category breakdown
    const categoryAgg = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const p of productArr) {
      const key = p.category ?? "Uncategorized";
      const c = categoryAgg.get(key) ?? { name: key, qty: 0, revenue: 0 };
      c.qty += p.qty;
      c.revenue += p.revenue;
      categoryAgg.set(key, c);
    }
    const categoryBreakdown = [...categoryAgg.values()].sort((a, b) => b.revenue - a.revenue);

    // Size + addon extraction from options jsonb
    const sizeMap = new Map<string, number>();
    const addonMap = new Map<string, number>();
    for (const it of filteredItems) {
      const opts = it.options as
        | { size?: string; sizeName?: string; addons?: Array<string | { name?: string }> }
        | null
        | undefined;
      if (opts) {
        const s = opts.size ?? opts.sizeName;
        if (typeof s === "string" && s) sizeMap.set(s, (sizeMap.get(s) ?? 0) + (it.qty ?? 0));
        const addons = Array.isArray(opts.addons) ? opts.addons : [];
        for (const a of addons) {
          const nm = typeof a === "string" ? a : a?.name;
          if (nm) addonMap.set(nm, (addonMap.get(nm) ?? 0) + (it.qty ?? 0));
        }
      }
    }
    const topSizes = [...sizeMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));
    const topAddons = [...addonMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    // Customer analytics
    const customerSpend = new Map<string, { orders: number; revenue: number }>();
    for (const o of orderList) {
      if (!o.user_id) continue;
      const c = customerSpend.get(o.user_id) ?? { orders: 0, revenue: 0 };
      c.orders += 1;
      c.revenue += o.total_pkr ?? 0;
      customerSpend.set(o.user_id, c);
    }
    const rangeFromDate = new Date(data.from);
    let newCustomers = 0;
    let returningCustomers = 0;
    for (const [uid] of customerSpend) {
      const p = profileMap.get(uid);
      if (p && new Date(p.created_at) >= rangeFromDate) newCustomers++;
      else returningCustomers++;
    }
    const uniqueCustomers = customerSpend.size;
    const repeatBuyers = [...customerSpend.values()].filter((c) => c.orders > 1).length;
    const repeatRate = uniqueCustomers ? (repeatBuyers / uniqueCustomers) * 100 : 0;
    const avgCustomerSpend = uniqueCustomers ? Math.round(totalRevenue / uniqueCustomers) : 0;

    const topCustomers = [...customerSpend.entries()]
      .map(([uid, v]) => ({
        id: uid,
        name: profileMap.get(uid)?.full_name ?? "Unknown",
        phone: profileMap.get(uid)?.phone ?? null,
        orders: v.orders,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const mostLoyal = [...customerSpend.entries()]
      .map(([uid, v]) => ({
        id: uid,
        name: profileMap.get(uid)?.full_name ?? "Unknown",
        orders: v.orders,
        tier: profileMap.get(uid)?.loyalty_tier ?? "bronze",
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    const referralLeaders = profiles
      .filter((p) => (p.referral_count ?? 0) > 0)
      .sort((a, b) => (b.referral_count ?? 0) - (a.referral_count ?? 0))
      .slice(0, 10)
      .map((p) => ({ id: p.id, name: p.full_name ?? "Unknown", count: p.referral_count ?? 0 }));

    const tierDist: Record<string, number> = {};
    for (const p of profiles) {
      const t = (p.loyalty_tier ?? "bronze").toLowerCase();
      tierDist[t] = (tierDist[t] ?? 0) + 1;
    }
    const daddyPassMembers = profiles.filter(
      (p) => (p.daddy_pass_status ?? "").toLowerCase() === "active",
    ).length;

    // Coupon analytics
    const couponUsage = new Map<string, number>();
    const couponDiscount = new Map<string, number>();
    for (const r of redemptions ?? []) {
      couponUsage.set(r.coupon_id, (couponUsage.get(r.coupon_id) ?? 0) + 1);
      couponDiscount.set(
        r.coupon_id,
        (couponDiscount.get(r.coupon_id) ?? 0) + (r.discount_pkr ?? 0),
      );
    }
    const nowIso = new Date().toISOString();
    const expiredCoupons = (coupons ?? []).filter(
      (c) => c.expires_at && c.expires_at < nowIso,
    ).length;
    const unusedCoupons = (coupons ?? []).filter((c) => (c.usage_count ?? 0) === 0).length;
    const totalCouponDiscount = [...couponDiscount.values()].reduce((s, v) => s + v, 0);
    const totalCouponUses = redemptions?.length ?? 0;
    const couponConversion = orderList.length
      ? (orderList.filter((o) => !!o.coupon_code).length / orderList.length) * 100
      : 0;

    const topCoupons = (coupons ?? [])
      .map((c) => ({
        id: c.id,
        code: c.code,
        label: c.label,
        uses: couponUsage.get(c.id) ?? 0,
        discount: couponDiscount.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 10);

    // Peak hours + best day heatmap
    const hourAgg = new Array(24).fill(0);
    const dowAgg = new Array(7).fill(0);
    const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const o of orderList) {
      const d = new Date(o.created_at);
      const h = bucketByHour(d);
      const w = bucketByDow(d);
      hourAgg[h] += 1;
      dowAgg[w] += 1;
      heatmap[w][h] += 1;
    }
    const bestHour = hourAgg.indexOf(Math.max(...hourAgg));
    const bestDayIdx = dowAgg.indexOf(Math.max(...dowAgg));
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Branch analytics
    const branchMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of orderList) {
      const k = o.branch_id ?? "unassigned";
      const cur = branchMap.get(k) ?? { revenue: 0, orders: 0 };
      cur.revenue += o.total_pkr ?? 0;
      cur.orders += 1;
      branchMap.set(k, cur);
    }
    const branchStats = (branches ?? []).map((b) => {
      const s = branchMap.get(b.id) ?? { revenue: 0, orders: 0 };
      return {
        id: b.id,
        name: b.name,
        city: b.city,
        revenue: s.revenue,
        orders: s.orders,
        avg_delivery_min: b.estimated_delivery_minutes ?? 0,
        is_active: b.is_active,
      };
    });
    const unassigned = branchMap.get("unassigned");
    if (unassigned && unassigned.orders > 0) {
      branchStats.push({
        id: "unassigned",
        name: "Unassigned",
        city: null,
        revenue: unassigned.revenue,
        orders: unassigned.orders,
        avg_delivery_min: 0,
        is_active: true,
      });
    }
    branchStats.sort((a, b) => b.revenue - a.revenue);

    // Promotion analytics
    const activePromos = (banners ?? []).filter(
      (b) =>
        b.is_active &&
        (!b.starts_at || b.starts_at <= nowIso) &&
        (!b.ends_at || b.ends_at >= nowIso),
    ).length;
    const scheduledPromos = (banners ?? []).filter(
      (b) => b.starts_at && b.starts_at > nowIso,
    ).length;

    return {
      range: { from: data.from, to: data.to },
      revenue: {
        total: totalRevenue,
        net: netRevenue,
        discount: totalDiscount,
        delivery: totalDelivery,
        tax: totalTax,
        aov,
        growthPct: revenueGrowth,
      },
      orders: {
        total: orderList.length,
        byStatus: statusMap,
        completed,
        cancelled,
        cancellationRate,
        avgProcessingMin,
        deliveryCount,
        pickupCount,
      },
      trend,
      monthly: [...monthlyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, ...v })),
      yearly: [...yearlyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, v]) => ({ year, ...v })),
      products: {
        best: bestProducts,
        worst: worstProducts,
        topRevenue: topRevenueProducts,
        lowRevenue: lowRevenueProducts,
        categories: categoryBreakdown,
        sizes: topSizes,
        addons: topAddons,
      },
      customers: {
        unique: uniqueCustomers,
        new: newCustomers,
        returning: returningCustomers,
        repeatRate,
        avgSpend: avgCustomerSpend,
        top: topCustomers,
        mostLoyal,
        referralLeaders,
        tierDist,
        daddyPassMembers,
      },
      coupons: {
        totalUses: totalCouponUses,
        totalDiscount: totalCouponDiscount,
        conversionRate: couponConversion,
        expired: expiredCoupons,
        unused: unusedCoupons,
        top: topCoupons,
      },
      promotions: {
        active: activePromos,
        scheduled: scheduledPromos,
        total: banners?.length ?? 0,
      },
      peak: {
        hourly: hourAgg.map((count, hour) => ({ hour, count })),
        dow: dowAgg.map((count, day) => ({ day: DAY_NAMES[day], count })),
        bestHour,
        bestDay: DAY_NAMES[bestDayIdx],
        heatmap,
      },
      branches: branchStats,
      meta: {
        branchOptions: (branches ?? []).map((b) => ({ id: b.id, name: b.name })),
        categoryOptions: (categories ?? []).map((c) => ({ id: c.id, name: c.name })),
        couponOptions: (coupons ?? []).map((c) => ({ code: c.code, label: c.label })),
      },
    };
  });

export type ReportsData = Awaited<ReturnType<typeof adminReports>>;
