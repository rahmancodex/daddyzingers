import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

type PublicClientCandidate = {
  label: "vite" | "server";
  url: string;
  key: string;
  supabase: SupabaseClient<Database>;
};

function createPublicClient(url: string, key: string): SupabaseClient<Database> {
  return createClient<Database>(url, key,
    {
      global: { fetch: createSupabaseFetch(key) },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

/**
 * Publishable-key server clients for public reads. Menu tables have
 * anon-scoped SELECT policies, so no service role is needed.
 *
 * Vercel can expose both runtime server variables and build-time VITE variables.
 * Treat them as full pairs and try the client-configured pair first so a stale
 * server-only pair cannot silently point functions at the wrong backend.
 */
function publicClientCandidates(): PublicClientCandidate[] {
  const envPairs = [
    {
      label: "vite" as const,
      url: process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL,
      key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    {
      label: "server" as const,
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_PUBLISHABLE_KEY,
    },
  ];

  const seen = new Set<string>();
  const candidates = envPairs.flatMap((pair) => {
    if (!pair.url || !pair.key) return [];
    const fingerprint = `${pair.url}\n${pair.key}`;
    if (seen.has(fingerprint)) return [];
    seen.add(fingerprint);
    return [{ ...pair, supabase: createPublicClient(pair.url, pair.key) }];
  });

  if (!candidates.length) {
    throw new Error(
      "Missing Supabase environment variable pair: VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return candidates;
}

export type DbCategory = {
  id: string;
  label: string;
  icon: string | null;
  tagline: string | null;
  image_url: string | null;
  sort_order: number;
};

export type DbSize = { size_key: string; label: string; price_pkr: number };
export type DbChoice = {
  choice_key: string;
  label: string;
  price_delta_pkr: number;
};
export type DbOptionGroup = {
  group_key: string;
  label: string;
  selection_type: "single" | "multi";
  is_required: boolean;
  sort_order: number;
  choices: DbChoice[];
};

export type DbMenuItem = {
  id: string;
  category_id: string;
  name: string;
  price_pkr: number;
  short_description: string | null;
  long_description: string | null;
  image_url: string | null;
  gallery_urls: string[];
  rating: number;
  reviews_count: number;
  prep_time_min: number;
  calories: number;
  ingredients: string[];
  allergens: string[];
  tags: string[];
  is_available: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  sort_order: number;
  sizes: DbSize[];
  item_options: DbOptionGroup[];
};

export type MenuPayload = {
  categories: DbCategory[];
  items: DbMenuItem[];
  categoryOptions: Record<string, DbOptionGroup[]>;
};

/** Load the entire public menu in one round-trip. Cached client-side by React Query. */
export const getMenu = createServerFn({ method: "GET" }).handler(async () => {
  let lastError: Error | undefined;

  for (const candidate of publicClientCandidates()) {
    try {
      return await loadMenu(candidate.supabase);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[getMenu] ${candidate.label} backend read failed`, lastError);
    }
  }

  throw lastError ?? new Error("Failed to load menu");
});

async function loadMenu(supabase: SupabaseClient<Database>): Promise<MenuPayload> {
  const [catsRes, itemsRes, sizesRes, groupsRes, choicesRes] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id,label,icon,tagline,image_url,sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id,category_id,name,price_pkr,short_description,long_description,image_url,gallery_urls,rating,reviews_count,prep_time_min,calories,ingredients,allergens,tags,is_available,is_featured,is_bestseller,sort_order",
      )
      .eq("is_hidden", false)
      .order("sort_order"),
    supabase
      .from("menu_item_sizes")
      .select("item_id,size_key,label,price_pkr,sort_order")
      .order("sort_order"),
    supabase
      .from("option_groups")
      .select("id,item_id,category_id,group_key,label,selection_type,is_required,sort_order")
      .order("sort_order"),
    supabase
      .from("option_choices")
      .select("group_id,choice_key,label,price_delta_pkr,sort_order")
      .order("sort_order"),
  ]);

  if (catsRes.error) throw new Error(catsRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (sizesRes.error) throw new Error(sizesRes.error.message);
  if (groupsRes.error) throw new Error(groupsRes.error.message);
  if (choicesRes.error) throw new Error(choicesRes.error.message);

  const choicesByGroup = new Map<string, DbChoice[]>();
  for (const c of choicesRes.data ?? []) {
    const arr = choicesByGroup.get(c.group_id) ?? [];
    arr.push({
      choice_key: c.choice_key,
      label: c.label,
      price_delta_pkr: c.price_delta_pkr,
    });
    choicesByGroup.set(c.group_id, arr);
  }
  const itemGroups = new Map<string, DbOptionGroup[]>();
  const categoryOptions: Record<string, DbOptionGroup[]> = {};
  for (const g of groupsRes.data ?? []) {
    const grp: DbOptionGroup = {
      group_key: g.group_key,
      label: g.label,
      selection_type: g.selection_type as "single" | "multi",
      is_required: g.is_required,
      sort_order: g.sort_order,
      choices: choicesByGroup.get(g.id) ?? [],
    };
    if (g.item_id) {
      const arr = itemGroups.get(g.item_id) ?? [];
      arr.push(grp);
      itemGroups.set(g.item_id, arr);
    } else if (g.category_id) {
      const arr = categoryOptions[g.category_id] ?? [];
      arr.push(grp);
      categoryOptions[g.category_id] = arr;
    }
  }
  const sizesByItem = new Map<string, DbSize[]>();
  for (const s of sizesRes.data ?? []) {
    const arr = sizesByItem.get(s.item_id) ?? [];
    arr.push({ size_key: s.size_key, label: s.label, price_pkr: s.price_pkr });
    sizesByItem.set(s.item_id, arr);
  }
  const items: DbMenuItem[] = (itemsRes.data ?? []).map((i) => ({
    ...i,
    gallery_urls: i.gallery_urls ?? [],
    ingredients: i.ingredients ?? [],
    allergens: i.allergens ?? [],
    tags: i.tags ?? [],
    sizes: sizesByItem.get(i.id) ?? [],
    item_options: itemGroups.get(i.id) ?? [],
  }));

  const payload: MenuPayload = {
    categories: (catsRes.data ?? []) as DbCategory[],
    items,
    categoryOptions,
  };
  return payload;
}
