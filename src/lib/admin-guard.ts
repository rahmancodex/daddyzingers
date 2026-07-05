// Server-only RBAC guard shared by every admin server function.
// Uses the authenticated (RLS-scoped) supabase client from requireSupabaseAuth
// so a stale/revoked user simply reads back zero roles and is denied.
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ROLE_PERMISSIONS, type AppRole, type Permission } from "@/lib/rbac";

export type GuardContext = { supabase: any; userId: string };

export async function fetchActorRoles(context: GuardContext): Promise<AppRole[]> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(`Forbidden: ${error.message}`);
  return ((data ?? []).map((r: any) => r.role) as AppRole[]).filter(Boolean);
}

export function rolesHavePermission(roles: AppRole[], perm: Permission): boolean {
  return roles.some((r) => ROLE_PERMISSIONS[r]?.includes(perm));
}

export async function assertPermission(
  context: GuardContext,
  perm: Permission,
): Promise<AppRole[]> {
  const roles = await fetchActorRoles(context);
  if (!rolesHavePermission(roles, perm)) {
    throw new Error(`Forbidden: missing permission "${perm}".`);
  }
  return roles;
}

export async function assertAnyPermission(
  context: GuardContext,
  perms: Permission[],
): Promise<AppRole[]> {
  const roles = await fetchActorRoles(context);
  if (!perms.some((p) => rolesHavePermission(roles, p))) {
    throw new Error(`Forbidden: missing one of [${perms.join(", ")}].`);
  }
  return roles;
}

// Middleware factory: pair with requireSupabaseAuth in .middleware([...])
// e.g. .middleware([requireSupabaseAuth, requirePerm("orders.view")])
export const requirePerm = (perm: Permission) =>
  createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      await assertPermission(context as any, perm);
      return next();
    });

export const requireAnyPerm = (perms: Permission[]) =>
  createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      await assertAnyPermission(context as any, perms);
      return next();
    });
