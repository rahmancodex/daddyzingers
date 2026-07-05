// Client-side admin gate helper. Centralizes the "am I allowed in /admin?"
// decision so every admin surface has identical UX and never leaks DB errors.
import { supabase } from "@/integrations/supabase/client";
import { adminMe } from "@/lib/admin-staff.functions";
import { STAFF_ROLES, ROLE_ORDER, type AppRole } from "@/lib/rbac";

export type RequireAdminResult = {
  authenticated: boolean;
  isAdmin: boolean;
  role: AppRole | null;
  roles: AppRole[];
  userId?: string;
  email?: string;
  /** Set when the check itself failed (network/DB/schema). Callers should
   * treat as "not admin" and show a generic toast — never surface. */
  errored?: boolean;
};

export async function requireAdmin(): Promise<RequireAdminResult> {
  let userId: string | undefined;
  let email: string | undefined;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { authenticated: false, isAdmin: false, role: null, roles: [] };
    }
    userId = data.user.id;
    email = data.user.email ?? undefined;
  } catch (e) {
    console.error("[require-admin] auth check failed", e);
    return { authenticated: false, isAdmin: false, role: null, roles: [] };
  }

  try {
    const me = await adminMe();
    const roles = ((me.roles ?? []) as AppRole[]).filter(Boolean);
    const staffRoles = roles.filter((r) => STAFF_ROLES.includes(r));
    const top = staffRoles.length
      ? [...staffRoles].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b])[0]
      : null;
    return {
      authenticated: true,
      isAdmin: staffRoles.length > 0,
      role: top,
      roles,
      userId,
      email,
    };
  } catch (e) {
    console.error("[require-admin] role lookup failed", e);
    return {
      authenticated: true,
      isAdmin: false,
      role: null,
      roles: [],
      userId,
      email,
      errored: true,
    };
  }
}
