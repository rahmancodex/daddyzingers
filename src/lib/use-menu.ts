import { queryOptions, useQuery } from "@tanstack/react-query";
import { getMenu, type MenuPayload } from "./menu.functions";

/**
 * Reactive Supabase-backed menu. Wraps `getMenu` in a shared React Query
 * cache. Existing static exports in `menu-data.ts` remain the source of
 * truth for the UI so no visible layout change is introduced; new admin
 * surfaces and future components should read from here.
 */
export const menuQueryOptions = queryOptions({
  queryKey: ["menu"],
  queryFn: () => getMenu(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});

export function useMenu() {
  return useQuery(menuQueryOptions);
}

export type { MenuPayload };
