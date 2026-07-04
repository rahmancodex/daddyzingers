import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================ */
/*  Types                                                       */
/* ============================================================ */

export type AdminCategory = {
  id: string;
  label: string;
  icon: string | null;
  tagline: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items_count: number;
};

export type AdminMenuItem = {
  id: string;
  category_id: string;
  category_label: string | null;
  name: string;
  price_pkr: number;
  short_description: string | null;
  long_description: string | null;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_hidden: boolean;
  sort_order: number;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type AdminItemSize = {
  id: string;
  item_id: string;
  size_key: string;
  label: string;
  price_pkr: number;
  sort_order: number;
};

export type AdminOptionChoice = {
  id: string;
  group_id: string;
  choice_key: string;
  label: string;
  price_delta_pkr: number;
  sort_order: number;
};

export type AdminOptionGroup = {
  id: string;
  item_id: string | null;
  category_id: string | null;
  group_key: string;
  label: string;
  selection_type: "single" | "multi";
  is_required: boolean;
  sort_order: number;
  choices: AdminOptionChoice[];
};

export type AdminMenuItemDetail = AdminMenuItem & {
  sizes: AdminItemSize[];
  option_groups: AdminOptionGroup[];
};

/* ============================================================ */
/*  Helpers                                                     */
/* ============================================================ */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueTextId(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  table: "menu_items" | "menu_categories",
  seed: string,
): Promise<string> {
  const base = slugify(seed) || "item";
  let candidate = base;
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.from(table).select("id").eq("id", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/* ============================================================ */
/*  Categories                                                  */
/* ============================================================ */

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<AdminCategory[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("menu_categories")
      .select("id,label,icon,tagline,image_url,sort_order,is_active,created_at,updated_at,menu_items(id)")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      tagline: c.tagline,
      image_url: c.image_url,
      sort_order: c.sort_order,
      is_active: c.is_active,
      created_at: c.created_at,
      updated_at: c.updated_at,
      items_count: Array.isArray(c.menu_items) ? c.menu_items.length : 0,
    }));
  });

const CategoryUpsertInput = z.object({
  id: z.string().min(1).max(60).optional(),
  label: z.string().min(1).max(80),
  icon: z.string().max(20).nullable().optional(),
  tagline: z.string().max(240).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

export const adminCreateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CategoryUpsertInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.id?.trim() || (await uniqueTextId(supabaseAdmin, "menu_categories", data.label));
    const { error } = await supabaseAdmin.from("menu_categories").insert({
      id,
      label: data.label,
      icon: data.icon ?? null,
      tagline: data.tagline ?? null,
      image_url: data.image_url ?? null,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const adminUpdateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().min(1),
        label: z.string().min(1).max(80).optional(),
        icon: z.string().max(20).nullable().optional(),
        tagline: z.string().max(240).nullable().optional(),
        image_url: z.string().url().nullable().optional(),
        sort_order: z.number().int().min(0).max(9999).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("menu_categories").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("category_id", data.id);
    if ((count ?? 0) > 0) {
      throw new Error(
        `Category has ${count} item${count === 1 ? "" : "s"}. Move or delete them first.`,
      );
    }
    const { error } = await supabaseAdmin.from("menu_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================ */
/*  Menu Items                                                  */
/* ============================================================ */

const ListItemsInput = z.object({
  search: z.string().max(120).optional(),
  category_id: z.string().optional(),
  featured: z.boolean().optional(),
  available: z.boolean().optional(),
  sort: z.enum(["newest", "name", "price_asc", "price_desc"]).optional(),
});

export const adminListMenuItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ListItemsInput.parse(data ?? {}))
  .handler(async ({ data }): Promise<AdminMenuItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("menu_items")
      .select(
        "id,category_id,name,price_pkr,short_description,long_description,image_url,is_available,is_featured,is_bestseller,is_hidden,sort_order,tags,created_at,updated_at,menu_categories(label)",
      );

    if (data.category_id) query = query.eq("category_id", data.category_id);
    if (typeof data.featured === "boolean") query = query.eq("is_featured", data.featured);
    if (typeof data.available === "boolean") query = query.eq("is_available", data.available);
    if (data.search?.trim()) {
      const s = data.search.trim();
      query = query.or(`name.ilike.%${s}%,short_description.ilike.%${s}%,id.ilike.%${s}%`);
    }

    switch (data.sort ?? "newest") {
      case "name":
        query = query.order("name", { ascending: true });
        break;
      case "price_asc":
        query = query.order("price_pkr", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price_pkr", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => ({
      id: r.id,
      category_id: r.category_id,
      category_label:
        (r.menu_categories as { label: string } | null)?.label ?? null,
      name: r.name,
      price_pkr: r.price_pkr,
      short_description: r.short_description,
      long_description: r.long_description,
      image_url: r.image_url,
      is_available: r.is_available,
      is_featured: r.is_featured,
      is_bestseller: r.is_bestseller,
      is_hidden: r.is_hidden,
      sort_order: r.sort_order,
      tags: r.tags ?? [],
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  });

export const adminGetMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<AdminMenuItemDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("menu_items")
      .select(
        "id,category_id,name,price_pkr,short_description,long_description,image_url,is_available,is_featured,is_bestseller,is_hidden,sort_order,tags,created_at,updated_at,menu_categories(label)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const [sizesRes, groupsRes] = await Promise.all([
      supabaseAdmin
        .from("menu_item_sizes")
        .select("id,item_id,size_key,label,price_pkr,sort_order")
        .eq("item_id", data.id)
        .order("sort_order"),
      supabaseAdmin
        .from("option_groups")
        .select("id,item_id,category_id,group_key,label,selection_type,is_required,sort_order")
        .eq("item_id", data.id)
        .order("sort_order"),
    ]);
    if (sizesRes.error) throw new Error(sizesRes.error.message);
    if (groupsRes.error) throw new Error(groupsRes.error.message);

    const groupIds = (groupsRes.data ?? []).map((g) => g.id);
    let choices: AdminOptionChoice[] = [];
    if (groupIds.length) {
      const { data: choicesData, error: choicesErr } = await supabaseAdmin
        .from("option_choices")
        .select("id,group_id,choice_key,label,price_delta_pkr,sort_order")
        .in("group_id", groupIds)
        .order("sort_order");
      if (choicesErr) throw new Error(choicesErr.message);
      choices = choicesData ?? [];
    }
    const choicesByGroup = new Map<string, AdminOptionChoice[]>();
    for (const c of choices) {
      const arr = choicesByGroup.get(c.group_id) ?? [];
      arr.push(c);
      choicesByGroup.set(c.group_id, arr);
    }

    return {
      id: row.id,
      category_id: row.category_id,
      category_label: (row.menu_categories as { label: string } | null)?.label ?? null,
      name: row.name,
      price_pkr: row.price_pkr,
      short_description: row.short_description,
      long_description: row.long_description,
      image_url: row.image_url,
      is_available: row.is_available,
      is_featured: row.is_featured,
      is_bestseller: row.is_bestseller,
      is_hidden: row.is_hidden,
      sort_order: row.sort_order,
      tags: row.tags ?? [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      sizes: sizesRes.data ?? [],
      option_groups: (groupsRes.data ?? []).map((g) => ({
        ...g,
        selection_type: g.selection_type as "single" | "multi",
        choices: choicesByGroup.get(g.id) ?? [],
      })),
    };
  });

const SizeInput = z.object({
  size_key: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  price_pkr: z.number().int().min(0).max(10_000_000),
  sort_order: z.number().int().min(0).max(999).optional(),
});

const ChoiceInput = z.object({
  choice_key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  price_delta_pkr: z.number().int().min(-10_000_000).max(10_000_000),
  sort_order: z.number().int().min(0).max(999).optional(),
});

const GroupInput = z.object({
  group_key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  selection_type: z.enum(["single", "multi"]),
  is_required: z.boolean(),
  sort_order: z.number().int().min(0).max(999).optional(),
  choices: z.array(ChoiceInput).max(50),
});

const ItemUpsertInput = z.object({
  id: z.string().max(60).optional(),
  category_id: z.string().min(1),
  name: z.string().min(1).max(120),
  price_pkr: z.number().int().min(0).max(10_000_000),
  short_description: z.string().max(240).nullable().optional(),
  long_description: z.string().max(4000).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  is_available: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_bestseller: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  tags: z.array(z.string().max(40)).max(30).optional(),
  sizes: z.array(SizeInput).max(20).optional(),
  option_groups: z.array(GroupInput).max(20).optional(),
});

async function replaceSizesAndOptions(
  supabaseAdmin: import("@supabase/supabase-js").SupabaseClient,
  itemId: string,
  sizes: z.infer<typeof SizeInput>[] | undefined,
  groups: z.infer<typeof GroupInput>[] | undefined,
) {
  // Sizes: replace-all strategy (small tables, simplest correctness).
  await supabaseAdmin.from("menu_item_sizes").delete().eq("item_id", itemId);
  if (sizes && sizes.length) {
    const { error } = await supabaseAdmin.from("menu_item_sizes").insert(
      sizes.map((s, i) => ({
        item_id: itemId,
        size_key: s.size_key,
        label: s.label,
        price_pkr: s.price_pkr,
        sort_order: s.sort_order ?? i,
      })),
    );
    if (error) throw new Error(error.message);
  }

  // Option groups + choices: cascade-delete via FK, then re-insert.
  await supabaseAdmin.from("option_groups").delete().eq("item_id", itemId);
  if (groups && groups.length) {
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const { data: inserted, error } = await supabaseAdmin
        .from("option_groups")
        .insert({
          item_id: itemId,
          category_id: null,
          group_key: g.group_key,
          label: g.label,
          selection_type: g.selection_type,
          is_required: g.is_required,
          sort_order: g.sort_order ?? gi,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (g.choices.length) {
        const { error: cErr } = await supabaseAdmin.from("option_choices").insert(
          g.choices.map((c, ci) => ({
            group_id: inserted!.id,
            choice_key: c.choice_key,
            label: c.label,
            price_delta_pkr: c.price_delta_pkr,
            sort_order: c.sort_order ?? ci,
          })),
        );
        if (cErr) throw new Error(cErr.message);
      }
    }
  }
}

export const adminCreateMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ItemUpsertInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.id?.trim() || (await uniqueTextId(supabaseAdmin, "menu_items", data.name));
    const { error } = await supabaseAdmin.from("menu_items").insert({
      id,
      category_id: data.category_id,
      name: data.name,
      price_pkr: data.price_pkr,
      short_description: data.short_description ?? null,
      long_description: data.long_description ?? null,
      image_url: data.image_url ?? null,
      is_available: data.is_available ?? true,
      is_featured: data.is_featured ?? false,
      is_bestseller: data.is_bestseller ?? false,
      sort_order: data.sort_order ?? 0,
      tags: data.tags ?? [],
    });
    if (error) throw new Error(error.message);
    await replaceSizesAndOptions(supabaseAdmin, id, data.sizes, data.option_groups);
    return { id };
  });

export const adminUpdateMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    ItemUpsertInput.extend({ id: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, sizes, option_groups, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("menu_items")
      .update({
        category_id: patch.category_id,
        name: patch.name,
        price_pkr: patch.price_pkr,
        short_description: patch.short_description ?? null,
        long_description: patch.long_description ?? null,
        image_url: patch.image_url ?? null,
        is_available: patch.is_available ?? true,
        is_featured: patch.is_featured ?? false,
        is_bestseller: patch.is_bestseller ?? false,
        sort_order: patch.sort_order ?? 0,
        tags: patch.tags ?? [],
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await replaceSizesAndOptions(supabaseAdmin, id, sizes, option_groups);
    return { ok: true };
  });

export const adminDuplicateMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: src, error } = await supabaseAdmin
      .from("menu_items")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!src) throw new Error("Item not found");
    const newId = await uniqueTextId(supabaseAdmin, "menu_items", `${src.name}-copy`);
    const { id: _omit, created_at: _c, updated_at: _u, ...rest } = src as Record<string, unknown>;
    void _omit; void _c; void _u;
    const { error: insErr } = await supabaseAdmin.from("menu_items").insert({
      ...rest,
      id: newId,
      name: `${src.name} (Copy)`,
      is_featured: false,
      is_bestseller: false,
    });
    if (insErr) throw new Error(insErr.message);

    // Copy sizes
    const { data: sizes } = await supabaseAdmin
      .from("menu_item_sizes")
      .select("size_key,label,price_pkr,sort_order")
      .eq("item_id", data.id);
    if (sizes?.length) {
      await supabaseAdmin
        .from("menu_item_sizes")
        .insert(sizes.map((s) => ({ ...s, item_id: newId })));
    }

    // Copy option groups + choices
    const { data: groups } = await supabaseAdmin
      .from("option_groups")
      .select("id,group_key,label,selection_type,is_required,sort_order")
      .eq("item_id", data.id);
    for (const g of groups ?? []) {
      const { data: ins } = await supabaseAdmin
        .from("option_groups")
        .insert({
          item_id: newId,
          category_id: null,
          group_key: g.group_key,
          label: g.label,
          selection_type: g.selection_type,
          is_required: g.is_required,
          sort_order: g.sort_order,
        })
        .select("id")
        .single();
      const { data: choices } = await supabaseAdmin
        .from("option_choices")
        .select("choice_key,label,price_delta_pkr,sort_order")
        .eq("group_id", g.id);
      if (ins && choices?.length) {
        await supabaseAdmin
          .from("option_choices")
          .insert(choices.map((c) => ({ ...c, group_id: ins.id })));
      }
    }
    return { id: newId };
  });

export const adminSetItemFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().min(1),
        is_available: z.boolean().optional(),
        is_featured: z.boolean().optional(),
        is_bestseller: z.boolean().optional(),
        is_hidden: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("menu_items").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("menu_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
