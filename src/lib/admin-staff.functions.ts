import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STAFF_ROLES, type AppRole, ROLE_ORDER } from "@/lib/rbac";

const RoleEnum = z.enum([
  "owner",
  "admin",
  "manager",
  "kitchen",
  "cashier",
  "rider",
  "support",
  "customer",
]);

export type StaffRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  status: "active" | "suspended" | "disabled";
  branch_id: string | null;
  branch_name: string | null;
  roles: AppRole[];
  top_role: AppRole | null;
  last_login_at: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
};

async function assertCanManageStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: any) => r.role as AppRole);
  if (!roles.includes("owner") && !roles.includes("admin")) {
    throw new Error("Forbidden: staff management requires Owner or Admin role.");
  }
  return roles;
}

async function logAudit(params: {
  actorId: string;
  actorRole: AppRole | null;
  action: string;
  module: string;
  entity_type?: string;
  entity_id?: string;
  summary?: string;
  old_value?: any;
  new_value?: any;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(params.actorId);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: params.actorId,
      actor_email: userRes?.user?.email ?? null,
      actor_role: params.actorRole,
      action: params.action,
      module: params.module,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      summary: params.summary ?? null,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
    });
  } catch (e) {
    console.error("[audit] failed to log", e);
  }
}

// ============ Get current user context (roles + permissions) ============
export const adminMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = ((data ?? []).map((r: any) => r.role) as AppRole[]).filter(Boolean);
    const top = roles.length
      ? [...roles].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b])[0]
      : null;
    return { userId: context.userId, roles, topRole: top };
  });

// ============ List staff ============
export const adminListStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffRow[]> => {
    const actorRoles = await assertCanManageStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", STAFF_ROLES);
    if (rErr) throw new Error(rErr.message);

    const userIds = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
    if (userIds.length === 0) return [];

    const [profRes, branchRes, listUsersRes] = await Promise.all([
      supabaseAdmin.from("staff_profiles").select("*").in("user_id", userIds),
      supabaseAdmin.from("branches").select("id, name"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);

    const profiles = new Map<string, any>((profRes.data ?? []).map((p: any) => [p.user_id, p]));
    const branches = new Map<string, string>(
      (branchRes.data ?? []).map((b: any) => [b.id, b.name]),
    );
    const users = new Map<string, any>(
      (listUsersRes.data?.users ?? []).map((u: any) => [u.id, u]),
    );

    const rolesByUser = new Map<string, AppRole[]>();
    for (const r of roleRows ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      rolesByUser.set(r.user_id, arr);
    }

    void actorRoles;

    return userIds.map((uid) => {
      const roles = rolesByUser.get(uid) ?? [];
      const top = roles.length
        ? [...roles].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b])[0]
        : null;
      const p = profiles.get(uid);
      const u = users.get(uid);
      return {
        user_id: uid,
        email: u?.email ?? null,
        full_name: p?.full_name ?? u?.user_metadata?.full_name ?? null,
        phone: p?.phone ?? u?.phone ?? null,
        status: (p?.status ?? "active") as StaffRow["status"],
        branch_id: p?.branch_id ?? null,
        branch_name: p?.branch_id ? branches.get(p.branch_id) ?? null : null,
        roles,
        top_role: top,
        last_login_at: p?.last_login_at ?? u?.last_sign_in_at ?? null,
        created_by: p?.created_by ?? null,
        created_by_email: p?.created_by ? users.get(p.created_by)?.email ?? null : null,
        created_at: p?.created_at ?? u?.created_at ?? new Date().toISOString(),
      };
    });
  });

// ============ Invite staff ============
export const adminInviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; role: AppRole; branch_id?: string | null }) =>
    z
      .object({
        email: z.string().email(),
        role: RoleEnum,
        branch_id: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const actorRoles = await assertCanManageStaff(context);
    if (data.role === "owner" && !actorRoles.includes("owner"))
      throw new Error("Only Owner can invite Owner.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Send Supabase invite email
    const { data: invRes, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
    );
    if (invErr && !String(invErr.message).toLowerCase().includes("already"))
      throw new Error(invErr.message);

    const invitedUserId = invRes?.user?.id;

    const { error } = await supabaseAdmin.from("staff_invitations").insert({
      email: data.email,
      role: data.role,
      branch_id: data.branch_id ?? null,
      invited_by: context.userId,
    });
    if (error) throw new Error(error.message);

    // If Supabase created a user immediately, seed staff_profile + role
    if (invitedUserId) {
      await supabaseAdmin.from("staff_profiles").upsert({
        user_id: invitedUserId,
        status: "active",
        branch_id: data.branch_id ?? null,
        invited_by: context.userId,
        created_by: context.userId,
      });
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: invitedUserId, role: data.role, assigned_by: context.userId });
    }

    await logAudit({
      actorId: context.userId,
      actorRole: null,
      action: "staff.invite",
      module: "staff",
      entity_type: "invitation",
      entity_id: data.email,
      summary: `Invited ${data.email} as ${data.role}`,
      new_value: data,
    });

    return { ok: true };
  });

// ============ Create staff (direct, with password) ============
export const adminCreateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      email: string;
      password: string;
      full_name: string;
      phone?: string | null;
      role: AppRole;
      branch_id?: string | null;
    }) =>
      z
        .object({
          email: z.string().email(),
          password: z.string().min(8),
          full_name: z.string().min(1).max(120),
          phone: z.string().max(40).nullable().optional(),
          role: RoleEnum,
          branch_id: z.string().uuid().nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actorRoles = await assertCanManageStaff(context);
    if (data.role === "owner" && !actorRoles.includes("owner"))
      throw new Error("Only Owner can create Owner.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, phone: data.phone },
    });
    if (cErr || !created?.user) throw new Error(cErr?.message ?? "Failed to create user");

    const uid = created.user.id;
    await supabaseAdmin.from("staff_profiles").upsert({
      user_id: uid,
      full_name: data.full_name,
      phone: data.phone ?? null,
      status: "active",
      branch_id: data.branch_id ?? null,
      created_by: context.userId,
    });
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: uid, role: data.role, assigned_by: context.userId });

    await logAudit({
      actorId: context.userId,
      actorRole: null,
      action: "staff.create",
      module: "staff",
      entity_type: "user",
      entity_id: uid,
      summary: `Created ${data.email} as ${data.role}`,
      new_value: { email: data.email, role: data.role, branch_id: data.branch_id ?? null },
    });

    return { ok: true, user_id: uid };
  });

// ============ Update staff ============
export const adminUpdateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      user_id: string;
      full_name?: string;
      phone?: string | null;
      branch_id?: string | null;
      role?: AppRole;
      status?: "active" | "suspended" | "disabled";
      notes?: string | null;
    }) =>
      z
        .object({
          user_id: z.string().uuid(),
          full_name: z.string().min(1).max(120).optional(),
          phone: z.string().max(40).nullable().optional(),
          branch_id: z.string().uuid().nullable().optional(),
          role: RoleEnum.optional(),
          status: z.enum(["active", "suspended", "disabled"]).optional(),
          notes: z.string().max(2000).nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actorRoles = await assertCanManageStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch target's current top role for permission check
    const { data: tRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    const targetTop = (tRoles ?? [])
      .map((r: any) => r.role as AppRole)
      .sort((a: AppRole, b: AppRole) => ROLE_ORDER[a] - ROLE_ORDER[b])[0];

    if (targetTop === "owner" && !actorRoles.includes("owner"))
      throw new Error("Only Owner can modify an Owner account.");

    if (data.role === "owner" && !actorRoles.includes("owner"))
      throw new Error("Only Owner can assign Owner role.");

    const patch: any = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.branch_id !== undefined) patch.branch_id = data.branch_id;
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.suspended_at = data.status === "suspended" ? new Date().toISOString() : null;
    }
    if (data.notes !== undefined) patch.notes = data.notes;

    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin
        .from("staff_profiles")
        .upsert({ user_id: data.user_id, ...patch });
      if (error) throw new Error(error.message);
    }

    // Update role: remove staff roles and add new one
    if (data.role) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .in("role", STAFF_ROLES);
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role, assigned_by: context.userId });
    }

    // If disabled, ban user via admin API
    if (data.status === "disabled") {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: "876000h" });
    } else if (data.status === "active") {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: "none" });
    }

    await logAudit({
      actorId: context.userId,
      actorRole: null,
      action: "staff.update",
      module: "staff",
      entity_type: "user",
      entity_id: data.user_id,
      summary: `Updated staff ${data.user_id}`,
      new_value: data,
    });

    return { ok: true };
  });

// ============ Reset password ============
export const adminResetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; password: string }) =>
    z.object({ user_id: z.string().uuid(), password: z.string().min(8) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanManageStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    await logAudit({
      actorId: context.userId,
      actorRole: null,
      action: "staff.reset_password",
      module: "staff",
      entity_type: "user",
      entity_id: data.user_id,
      summary: "Password reset by admin",
    });
    return { ok: true };
  });

// ============ Force logout (revoke all refresh tokens) ============
export const adminForceLogout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.signOut(data.user_id, "global");
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: context.userId,
      actorRole: null,
      action: "staff.force_logout",
      module: "staff",
      entity_type: "user",
      entity_id: data.user_id,
      summary: "Force logout — all sessions revoked",
    });
    return { ok: true };
  });

// ============ Delete staff ============
export const adminDeleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actorRoles = await assertCanManageStaff(context);
    if (data.user_id === context.userId) throw new Error("You cannot delete your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    const rolesArr = (tRoles ?? []).map((r: any) => r.role as AppRole);
    if (rolesArr.includes("owner") && !actorRoles.includes("owner"))
      throw new Error("Only Owner can delete an Owner account.");
    if (rolesArr.includes("owner")) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "owner");
      if ((count ?? 0) <= 1)
        throw new Error("Cannot delete the last remaining Owner account.");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);

    await logAudit({
      actorId: context.userId,
      actorRole: null,
      action: "staff.delete",
      module: "staff",
      entity_type: "user",
      entity_id: data.user_id,
      summary: "Deleted staff account",
      old_value: { user_id: data.user_id, roles: rolesArr },
    });
    return { ok: true };
  });

// ============ Invitations ============
export type InvitationRow = {
  id: string;
  email: string;
  role: AppRole;
  branch_id: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by_email: string | null;
};

export const adminListInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InvitationRow[]> => {
    await assertCanManageStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("staff_invitations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const inviterIds = Array.from(
      new Set((data ?? []).map((r: any) => r.invited_by).filter(Boolean)),
    );
    const emails = new Map<string, string>();
    if (inviterIds.length > 0) {
      const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      for (const u of list.data?.users ?? []) if (u.email) emails.set(u.id, u.email);
    }
    return (data ?? []).map((r: any) => ({
      ...r,
      invited_by_email: r.invited_by ? emails.get(r.invited_by) ?? null : null,
    }));
  });

export const adminRevokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("staff_invitations")
      .update({ status: "revoked" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Branches list (lookup) ============
export const adminListBranchesLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCanManageStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("branches")
      .select("id, name")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; name: string }[];
  });
