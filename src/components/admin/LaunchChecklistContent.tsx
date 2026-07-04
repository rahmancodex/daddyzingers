import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { getSystemHealth, listIntegrations } from "@/lib/admin-production.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type CheckState = "pass" | "warn" | "fail";

interface CheckRow {
  category: string;
  label: string;
  state: CheckState;
  detail?: string;
}

function StatusIcon({ state }: { state: CheckState }) {
  if (state === "pass") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (state === "warn") return <AlertCircle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

export function LaunchChecklistContent() {
  const fetchHealth = useServerFn(getSystemHealth);
  const fetchIntegrations = useServerFn(listIntegrations);

  const health = useQuery({
    queryKey: ["admin", "launch", "health"],
    queryFn: () => fetchHealth({}),
  });
  const integrations = useQuery({
    queryKey: ["admin", "launch", "integrations"],
    queryFn: () => fetchIntegrations({}),
  });

  const loading = health.isLoading || integrations.isLoading;

  const rows: CheckRow[] = [];
  if (health.data) {
    const h = health.data;
    rows.push({
      category: "Environment",
      label: "Required env vars present",
      state: h.checks.env?.ok ? "pass" : "fail",
      detail: h.checks.env?.ok ? "SUPABASE_URL and service role configured" : "Missing SUPABASE_URL or service role",
    });
    rows.push({
      category: "Database",
      label: "Supabase database reachable",
      state: h.checks.database?.ok ? "pass" : "fail",
      detail: h.checks.database?.ok
        ? `Responded in ${h.checks.database.latency_ms}ms`
        : h.checks.database?.note,
    });
    rows.push({
      category: "Storage",
      label: "Storage buckets reachable",
      state: h.checks.storage?.ok ? "pass" : "fail",
      detail: h.checks.storage?.ok
        ? `Responded in ${h.checks.storage.latency_ms}ms`
        : h.checks.storage?.note,
    });
    rows.push({
      category: "Realtime",
      label: "Realtime channel available",
      state: h.checks.realtime?.ok ? "pass" : "warn",
      detail: h.checks.realtime?.note,
    });
    rows.push({
      category: "Monitoring",
      label: "Error rate (24h)",
      state: h.metrics.errors_24h === 0 ? "pass" : h.metrics.errors_24h < 10 ? "warn" : "fail",
      detail: `${h.metrics.errors_24h} errors logged in the last 24h`,
    });
    rows.push({
      category: "Webhooks",
      label: "Webhook delivery health (24h)",
      state:
        h.metrics.failed_webhooks_24h === 0
          ? "pass"
          : h.metrics.failed_webhooks_24h < 5
            ? "warn"
            : "fail",
      detail: `${h.metrics.failed_webhooks_24h}/${h.metrics.webhooks_24h} deliveries failed`,
    });
  }

  if (integrations.data) {
    const byKey = (key: string) => integrations.data!.find((i: any) => i.key === key);
    const check = (key: string, label: string) => {
      const cfg = byKey(key);
      rows.push({
        category: "Integrations",
        label,
        state: cfg?.enabled ? "pass" : "warn",
        detail: cfg
          ? cfg.enabled
            ? `Enabled · ${cfg.mode ?? "production"}`
            : "Configured but disabled"
          : "Not configured",
      });
    };
    check("google_oauth", "Google OAuth");
    check("smtp", "Transactional email (SMTP)");
    check("stripe", "Payments — Stripe");
    check("jazzcash", "Payments — JazzCash");
    check("easypaisa", "Payments — EasyPaisa");
    check("cod", "Payments — Cash on Delivery");
  }

  const grouped = rows.reduce<Record<string, CheckRow[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const passCount = rows.filter((r) => r.state === "pass").length;
  const warnCount = rows.filter((r) => r.state === "warn").length;
  const failCount = rows.filter((r) => r.state === "fail").length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Launch Checklist</h1>
          <p className="text-sm text-muted-foreground">
            Live production readiness across environment, backend, integrations and monitoring.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            health.refetch();
            integrations.refetch();
          }}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Re-run checks
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Passing</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-500">{passCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Warnings</div>
          <div className="mt-1 text-2xl font-semibold text-amber-500">{warnCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Failing</div>
          <div className="mt-1 text-2xl font-semibold text-red-500">{failCount}</div>
        </Card>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Running checks…
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h2>
              <Badge variant="outline" className="text-[10px]">
                {items.length}
              </Badge>
            </div>
            <Card className="divide-y">
              {items.map((row, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  <StatusIcon state={row.state} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{row.label}</div>
                    {row.detail && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{row.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
