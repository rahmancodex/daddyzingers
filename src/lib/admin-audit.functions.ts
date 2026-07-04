import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "@/lib/rbac";

export type AuditLogRow = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: AppRole | null;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string | null;
  old_value: any;
  new_value: any;
  ip_address: string | null;
  user_agent: string | null;
};

async function assertCanReadAudit(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roles = (data ?? []).map((r: any) => r.role as AppRole);
  if (!roles.some((r: AppRole) => ["owner", "admin", "manager"].includes(r)))
    throw new Error("Forbidden: audit logs require Owner, Admin, or Manager role.");
}

export const adminListAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d?: { search?: string; module?: string; actor_id?: string; limit?: number }) =>
      z
        .object({
          search: z.string().max(200).optional(),
          module: z.string().max(50).optional(),
          actor_id: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional()
        .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<AuditLogRow[]> => {
    await assertCanReadAudit(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 200);
    if (data?.module && data.module !== "all") q = q.eq("module", data.module);
    if (data?.actor_id) q = q.eq("actor_id", data.actor_id);
    if (data?.search) {
      const s = data.search;
      q = q.or(
        `summary.ilike.%${s}%,actor_email.ilike.%${s}%,action.ilike.%${s}%,entity_id.ilike.%${s}%`,
      );
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as AuditLogRow[];
  });

export const adminLogClientEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { action: string; module: string; summary?: string }) =>
    z
      .object({
        action: z.string().min(1).max(80),
        module: z.string().min(1).max(50),
        summary: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: u?.user?.email ?? null,
      actor_role: (roleRows?.[0] as any)?.role ?? null,
      action: data.action,
      module: data.module,
      summary: data.summary ?? null,
    });

    // Mirror last_login_at when action is login
    if (data.action === "login") {
      await supabaseAdmin
        .from("staff_profiles")
        .upsert({ user_id: context.userId, last_login_at: new Date().toISOString() });
    }
    return { ok: true };
  });
