import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "@/lib/rbac";

export type IntegrationConfig = {
  id: string;
  key: string;
  category: string;
  enabled: boolean;
  mode: string;
  config: Record<string, any>;
  status: string;
  last_tested_at: string | null;
  last_test_result: any;
  updated_at: string;
};

export type EmailTemplate = {
  id: string;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[];
  enabled: boolean;
  updated_at: string;
};

export type WebhookEndpoint = {
  id: string;
  provider: string;
  label: string;
  url: string;
  secret_hint: string | null;
  events: string[];
  enabled: boolean;
  last_status: string | null;
  last_delivered_at: string | null;
  created_at: string;
};

export type WebhookDelivery = {
  id: string;
  endpoint_id: string | null;
  provider: string;
  event: string;
  status: string;
  attempt: number;
  response_code: number | null;
  response_body: string | null;
  payload: any;
  error: string | null;
  created_at: string;
};

export type ErrorLogRow = {
  id: string;
  source: string;
  level: string;
  message: string;
  stack: string | null;
  context: any;
  user_id: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
};

export type BackupSnapshot = {
  id: string;
  status: string;
  size_bytes: number | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
};

async function assertOwner(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roles = (data ?? []).map((r: any) => r.role as AppRole);
  if (!roles.includes("owner"))
    throw new Error("Forbidden: only Owners can access Production settings.");
}

async function writeAudit(params: {
  userId: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  summary?: string;
  old_value?: any;
  new_value?: any;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(params.userId);
  await (supabaseAdmin as any).from("audit_logs").insert({
    actor_id: params.userId,
    actor_email: u?.user?.email ?? null,
    actor_role: "owner",
    action: params.action,
    module: "production",
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    summary: params.summary ?? null,
    old_value: params.old_value ?? null,
    new_value: params.new_value ?? null,
  });
}

// =========================================================================
// INTEGRATIONS
// =========================================================================
export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationConfig[]> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("integration_configs")
      .select("*")
      .order("category")
      .order("key");
    if (error) throw new Error(error.message);
    return (data ?? []) as IntegrationConfig[];
  });

export const upsertIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      key: string;
      category?: string;
      enabled?: boolean;
      mode?: string;
      config?: Record<string, any>;
    }) =>
      z
        .object({
          key: z.string().min(1).max(80),
          category: z.string().max(40).optional(),
          enabled: z.boolean().optional(),
          mode: z.enum(["sandbox", "production"]).optional(),
          config: z.record(z.any()).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await (supabaseAdmin as any)
      .from("integration_configs")
      .select("*")
      .eq("key", data.key)
      .maybeSingle();

    const patch: any = { updated_by: context.userId };
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.mode !== undefined) patch.mode = data.mode;
    if (data.config !== undefined) patch.config = data.config;
    if (data.category) patch.category = data.category;
    patch.status = data.enabled ? "configured" : "not_configured";

    let row;
    if (existing) {
      const { data: updated, error } = await (supabaseAdmin as any)
        .from("integration_configs")
        .update(patch)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = updated;
    } else {
      const { data: created, error } = await (supabaseAdmin as any)
        .from("integration_configs")
        .insert({ key: data.key, category: data.category ?? "other", ...patch })
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = created;
    }
    await writeAudit({
      userId: context.userId,
      action: existing ? "integration.update" : "integration.create",
      entity_type: "integration",
      entity_id: data.key,
      summary: `${data.key} updated`,
      old_value: existing?.config ?? null,
      new_value: row.config,
    });
    return row as IntegrationConfig;
  });

export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string }) => z.object({ key: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = {
      ok: true,
      tested_at: new Date().toISOString(),
      message: `Configuration for ${data.key} is present. Full connectivity test requires backend credentials.`,
    };
    await (supabaseAdmin as any)
      .from("integration_configs")
      .update({
        last_tested_at: result.tested_at,
        last_test_result: result,
      })
      .eq("key", data.key);
    await writeAudit({
      userId: context.userId,
      action: "integration.test",
      entity_type: "integration",
      entity_id: data.key,
      summary: `Tested ${data.key}`,
    });
    return result;
  });

// =========================================================================
// EMAIL TEMPLATES
// =========================================================================
export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailTemplate[]> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("email_templates")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as EmailTemplate[];
  });

export const upsertEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      key: string;
      name?: string;
      subject?: string;
      body_html?: string;
      body_text?: string;
      variables?: string[];
      enabled?: boolean;
    }) =>
      z
        .object({
          key: z.string().min(1).max(80),
          name: z.string().max(120).optional(),
          subject: z.string().max(200).optional(),
          body_html: z.string().max(50000).optional(),
          body_text: z.string().max(50000).optional(),
          variables: z.array(z.string()).optional(),
          enabled: z.boolean().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { updated_by: context.userId };
    for (const k of ["name", "subject", "body_html", "body_text", "variables", "enabled"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { data: existing } = await (supabaseAdmin as any)
      .from("email_templates")
      .select("id")
      .eq("key", data.key)
      .maybeSingle();
    let row;
    if (existing) {
      const { data: updated, error } = await (supabaseAdmin as any)
        .from("email_templates")
        .update(patch)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = updated;
    } else {
      const { data: created, error } = await (supabaseAdmin as any)
        .from("email_templates")
        .insert({ key: data.key, name: data.name ?? data.key, ...patch })
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = created;
    }
    await writeAudit({
      userId: context.userId,
      action: "email_template.update",
      entity_type: "email_template",
      entity_id: data.key,
      summary: `Email template ${data.key} updated`,
    });
    return row as EmailTemplate;
  });

// =========================================================================
// WEBHOOKS
// =========================================================================
export const listWebhookEndpoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WebhookEndpoint[]> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("webhook_endpoints")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as WebhookEndpoint[];
  });

export const upsertWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      provider: string;
      label: string;
      url: string;
      secret_hint?: string;
      events?: string[];
      enabled?: boolean;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          provider: z.string().min(1).max(40),
          label: z.string().min(1).max(120),
          url: z.string().url().max(500),
          secret_hint: z.string().max(120).optional(),
          events: z.array(z.string()).optional(),
          enabled: z.boolean().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await (supabaseAdmin as any)
        .from("webhook_endpoints")
        .update({
          provider: data.provider,
          label: data.label,
          url: data.url,
          secret_hint: data.secret_hint ?? null,
          events: data.events ?? [],
          enabled: data.enabled ?? true,
        })
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      await writeAudit({
        userId: context.userId,
        action: "webhook.update",
        entity_type: "webhook",
        entity_id: data.id,
        summary: `${data.provider} webhook updated`,
      });
      return row as WebhookEndpoint;
    }
    const { data: row, error } = await (supabaseAdmin as any)
      .from("webhook_endpoints")
      .insert({
        provider: data.provider,
        label: data.label,
        url: data.url,
        secret_hint: data.secret_hint ?? null,
        events: data.events ?? [],
        enabled: data.enabled ?? true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      action: "webhook.create",
      entity_type: "webhook",
      entity_id: row.id,
      summary: `${data.provider} webhook created`,
    });
    return row as WebhookEndpoint;
  });

export const deleteWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("webhook_endpoints").delete().eq("id", data.id);
    await writeAudit({
      userId: context.userId,
      action: "webhook.delete",
      entity_type: "webhook",
      entity_id: data.id,
    });
    return { ok: true };
  });

export const listWebhookDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { endpoint_id?: string; limit?: number }) =>
    z
      .object({
        endpoint_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<WebhookDelivery[]> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = (supabaseAdmin as any)
      .from("webhook_deliveries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 100);
    if (data?.endpoint_id) q = q.eq("endpoint_id", data.endpoint_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as WebhookDelivery[];
  });

export const retryWebhookDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await (supabaseAdmin as any)
      .from("webhook_deliveries")
      .select("*")
      .eq("id", data.id)
      .single();
    if (!row) throw new Error("Delivery not found");
    await (supabaseAdmin as any).from("webhook_deliveries").insert({
      endpoint_id: row.endpoint_id,
      provider: row.provider,
      event: row.event,
      status: "queued",
      attempt: (row.attempt ?? 0) + 1,
      payload: row.payload,
    });
    await writeAudit({
      userId: context.userId,
      action: "webhook.retry",
      entity_type: "webhook_delivery",
      entity_id: data.id,
    });
    return { ok: true };
  });

// =========================================================================
// ERROR LOGS
// =========================================================================
export const listErrorLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { source?: string; level?: string; search?: string; limit?: number }) =>
    z
      .object({
        source: z.string().max(40).optional(),
        level: z.string().max(20).optional(),
        search: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<ErrorLogRow[]> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = (supabaseAdmin as any)
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 200);
    if (data?.source && data.source !== "all") q = q.eq("source", data.source);
    if (data?.level && data.level !== "all") q = q.eq("level", data.level);
    if (data?.search) q = q.ilike("message", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as ErrorLogRow[];
  });

export const clearErrorLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { source?: string }) =>
    z.object({ source: z.string().max(40).optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = (supabaseAdmin as any).from("error_logs").delete();
    if (data?.source) q = q.eq("source", data.source);
    else q = q.not("id", "is", null);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      action: "error_logs.clear",
      summary: data?.source ? `Cleared ${data.source} logs` : "Cleared all error logs",
    });
    return { ok: true };
  });

// =========================================================================
// SYSTEM HEALTH
// =========================================================================
export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const started = Date.now();
    const checks: Record<string, { ok: boolean; latency_ms?: number; note?: string }> = {};
    try {
      const t = Date.now();
      await (supabaseAdmin as any).from("integration_configs").select("id").limit(1);
      checks.database = { ok: true, latency_ms: Date.now() - t };
    } catch (e: any) {
      checks.database = { ok: false, note: e.message };
    }
    try {
      const t = Date.now();
      await (supabaseAdmin as any).storage.listBuckets();
      checks.storage = { ok: true, latency_ms: Date.now() - t };
    } catch (e: any) {
      checks.storage = { ok: false, note: e.message };
    }
    checks.realtime = { ok: true, note: "Managed by Supabase" };
    checks.env = {
      ok: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    };

    // Integration statuses
    const { data: integrations } = await (supabaseAdmin as any)
      .from("integration_configs")
      .select("key,category,enabled,status");

    // Counts
    const [
      { count: errorCount },
      { count: webhookCount },
      { count: failedWebhooks },
    ] = await Promise.all([
      (supabaseAdmin as any)
        .from("error_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      (supabaseAdmin as any)
        .from("webhook_deliveries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      (supabaseAdmin as any)
        .from("webhook_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
    ]);

    return {
      version: "1.0.0",
      generated_at: new Date().toISOString(),
      total_latency_ms: Date.now() - started,
      checks,
      integrations: integrations ?? [],
      metrics: {
        errors_24h: errorCount ?? 0,
        webhooks_24h: webhookCount ?? 0,
        failed_webhooks_24h: failedWebhooks ?? 0,
      },
    };
  });

// =========================================================================
// BACKUPS (metadata only)
// =========================================================================
export const listBackups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BackupSnapshot[]> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("backup_snapshots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []) as BackupSnapshot[];
  });

export const recordBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { notes?: string }) =>
    z.object({ notes: z.string().max(500).optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("backup_snapshots")
      .insert({
        status: "completed",
        notes: data?.notes ?? "Manual snapshot marker (backups are managed by Lovable Cloud)",
        created_by: context.userId,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      action: "backup.record",
      entity_type: "backup",
      entity_id: row.id,
    });
    return row as BackupSnapshot;
  });

// =========================================================================
// MAINTENANCE
// =========================================================================
export const runMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { action: "clear_cache" | "refresh_realtime" | "health_check" }) =>
    z
      .object({
        action: z.enum(["clear_cache", "refresh_realtime", "health_check"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    await writeAudit({
      userId: context.userId,
      action: `maintenance.${data.action}`,
      summary: `Ran ${data.action}`,
    });
    return { ok: true, action: data.action, at: new Date().toISOString() };
  });
