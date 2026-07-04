/**
 * Deprecated shim. Prefer importing hooks directly from `@/lib/menu`.
 * Kept temporarily so any lingering `useMenu()` callers continue to work.
 */
export { menuQueryOptions, useMenuData as useMenu } from "./menu";
export type { MenuData as MenuPayload } from "./menu";
