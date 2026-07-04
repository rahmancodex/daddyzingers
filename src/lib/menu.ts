/**
 * Single source of truth for the customer-facing menu.
 *
 * Data is fetched from Supabase via the `getMenu` server function and
 * cached in TanStack Query. This module owns:
 *   - Public types (MenuItem, OptionGroup, ...) — kept structurally
 *     identical to the previous static shape so consumer components
 *     don't need to change their field access.
 *   - React Query hooks (useMenuItems, useMenuCategories, useMenuItem,
 *     useMenuData) that read from the shared cache.
 *   - Adapter helpers (`toMenuItem`) mapping DB rows to `MenuItem`.
 *   - Small pure helpers (`formatPKR`, `resolveItemOptions`) and
 *     UI-level constants (`POPULAR_SEARCHES`, `FILTERS`).
 *
 * There is intentionally no static MENU / CATEGORIES export anymore —
 * Supabase is the sole source.
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getMenu,
  type DbCategory,
  type DbMenuItem,
  type DbOptionGroup,
  type MenuPayload,
} from "./menu.functions";

/* ============================================================ */
/*  Public types (compat shape)                                 */
/* ============================================================ */

/** Category id, e.g. "burgers", "shawarma". String because the DB owns the list. */
export type MenuCategory = string;

export type OptionChoice = { id: string; label: string; priceDelta: number };
export type OptionGroup = {
  id: string;
  label: string;
  type: "single" | "multi";
  required?: boolean;
  choices: OptionChoice[];
};
export type SizeChoice = { id: string; label: string; price: number };

export type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  shortDescription: string;
  longDescription: string;
  image: string;
  gallery?: string[];
  rating: number;
  reviews: number;
  prepTime: number;
  calories: number;
  ingredients: string[];
  allergens: string[];
  tags: string[];
  sizes?: SizeChoice[];
  /** Item-specific option groups when present; category defaults otherwise. */
  options?: OptionGroup[];
  isAvailable: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
};

export type CategoryInfo = {
  id: MenuCategory;
  label: string;
  icon: string;
  tagline: string;
  image?: string;
};

/* ============================================================ */
/*  Adapters (DB -> compat shape)                               */
/* ============================================================ */

function toOptionGroup(g: DbOptionGroup): OptionGroup {
  return {
    id: g.group_key,
    label: g.label,
    type: g.selection_type,
    required: g.is_required || undefined,
    choices: g.choices.map((c) => ({
      id: c.choice_key,
      label: c.label,
      priceDelta: c.price_delta_pkr,
    })),
  };
}

export function toMenuItem(i: DbMenuItem): MenuItem {
  return {
    id: i.id,
    name: i.name,
    category: i.category_id,
    price: i.price_pkr,
    shortDescription: i.short_description ?? "",
    longDescription: i.long_description ?? "",
    image: i.image_url ?? "",
    gallery: i.gallery_urls.length ? i.gallery_urls : undefined,
    rating: i.rating,
    reviews: i.reviews_count,
    prepTime: i.prep_time_min,
    calories: i.calories,
    ingredients: i.ingredients,
    allergens: i.allergens,
    tags: i.tags,
    sizes: i.sizes.length
      ? i.sizes.map((s) => ({ id: s.size_key, label: s.label, price: s.price_pkr }))
      : undefined,
    options: i.item_options.length ? i.item_options.map(toOptionGroup) : undefined,
    isAvailable: i.is_available,
    isFeatured: i.is_featured,
    isBestseller: i.is_bestseller,
  };
}

function toCategoryInfo(c: DbCategory): CategoryInfo {
  return {
    id: c.id,
    label: c.label,
    icon: c.icon ?? "🍽️",
    tagline: c.tagline ?? "",
    image: c.image_url ?? undefined,
  };
}

export type MenuData = {
  items: MenuItem[];
  categories: CategoryInfo[];
  categoryOptions: Record<string, OptionGroup[]>;
  byId: Map<string, MenuItem>;
};

function adapt(payload: MenuPayload): MenuData {
  const items = payload.items.map(toMenuItem);
  const categories = payload.categories.map(toCategoryInfo);
  const categoryOptions: Record<string, OptionGroup[]> = {};
  for (const [catId, groups] of Object.entries(payload.categoryOptions)) {
    categoryOptions[catId] = groups.map(toOptionGroup);
  }
  const byId = new Map(items.map((i) => [i.id, i] as const));
  return { items, categories, categoryOptions, byId };
}

/* ============================================================ */
/*  React Query wiring                                          */
/* ============================================================ */

export const menuQueryOptions = queryOptions({
  queryKey: ["menu"] as const,
  queryFn: () => getMenu(),
  select: adapt,
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});

const EMPTY_DATA: MenuData = {
  items: [],
  categories: [],
  categoryOptions: {},
  byId: new Map(),
};

export function useMenuData(): MenuData {
  const { data } = useQuery(menuQueryOptions);
  return data ?? EMPTY_DATA;
}

export function useMenuItems(): MenuItem[] {
  return useMenuData().items;
}

export function useMenuCategories(): CategoryInfo[] {
  return useMenuData().categories;
}

export function useMenuItem(id: string | null | undefined): MenuItem | null {
  const { byId } = useMenuData();
  if (!id) return null;
  return byId.get(id) ?? null;
}

/**
 * Group items by category id — memoised on `items` reference.
 * The React Query cache keeps `items` stable across renders when the
 * underlying payload hasn't changed, so consumers don't need extra memoisation.
 */
export function useMenuByCategory(): Record<string, MenuItem[]> {
  const items = useMenuItems();
  return useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    for (const it of items) {
      (map[it.category] ??= []).push(it);
    }
    return map;
  }, [items]);
}

/* ============================================================ */
/*  Option resolution (item-level > category defaults)          */
/* ============================================================ */

/**
 * Resolve the option groups to show for an item, prepending a size
 * group when the item has size variants. Category defaults are looked
 * up from the passed `categoryOptions` map (from `useMenuData()`).
 */
export function resolveItemOptions(
  item: MenuItem,
  categoryOptions: Record<string, OptionGroup[]>,
): OptionGroup[] {
  const base = item.options ?? categoryOptions[item.category] ?? [];
  if (item.sizes && item.sizes.length) {
    const sizeGroup: OptionGroup = {
      id: "size",
      label: "Size",
      type: "single",
      required: true,
      choices: item.sizes.map((s) => ({
        id: s.id,
        label: `${s.label} · Rs ${s.price}`,
        priceDelta: 0, // size sets absolute base price; handled outside
      })),
    };
    return [sizeGroup, ...base.filter((g) => g.id !== "size")];
  }
  return base;
}

/* ============================================================ */
/*  UI constants                                                */
/* ============================================================ */

export const FILTERS = [
  { id: "popular", label: "Popular" },
  { id: "bestseller", label: "Best Seller" },
  { id: "new", label: "Newest" },
  { id: "price-asc", label: "Price ↑" },
  { id: "price-desc", label: "Price ↓" },
  { id: "spicy", label: "Spicy" },
  { id: "chicken", label: "Chicken" },
  { id: "beef", label: "Beef" },
  { id: "deal", label: "Deals" },
] as const;

export const POPULAR_SEARCHES = ["Zinger", "Loaded Fries", "Broast", "Paratha Roll", "Platter"];

export function formatPKR(n: number) {
  return `Rs ${n.toLocaleString("en-PK")}`;
}
