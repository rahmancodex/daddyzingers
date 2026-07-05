import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, ShieldCheck } from "lucide-react";

import { adminListAuditLogs, type AuditLogRow } from "@/lib/admin-audit.functions";
import { ROLE_BADGE_CLASS, ROLE_LABEL, type AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MODULES = [
  "all",
  "auth",
  "orders",
  "menu",
  "categories",
  "coupons",
  "banners",
  "customers",
  "settings",
  "staff",
  "roles",
];

function moduleOf(row: AuditLogRow) {
  const value = row.metadata?.module;
  return typeof value === "string" && value.trim() ? value : "—";
}

function fmt(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
}

function ActionBadge({ action }: { action: string }) {
  const kind = action.split(".")[1] ?? action;
  const map: Record<string, string> = {
    create: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    invite: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    update: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    delete: "bg-destructive/15 text-destructive border-destructive/30",
    login: "bg-primary/15 text-primary border-primary/30",
    logout: "bg-muted text-muted-foreground border-border",
    reset_password: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    force_logout: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  };
  return (
    <Badge variant="outline" className={cn("font-mono text-xs", map[kind] ?? "")}>
      {action}
    </Badge>
  );
}

export function AuditLogsContent() {
  const listFn = useServerFn(adminListAuditLogs);
  const [q, setQ] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [detail, setDetail] = React.useState<AuditLogRow | null>(null);

  const query = useQuery({
    queryKey: ["admin", "audit", q, moduleFilter],
    queryFn: () => listFn({ data: { search: q || undefined, module: moduleFilter } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-2xl font-black md:text-3xl">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            A complete history of admin activity. Read-only.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Tamper-evident. Written server-side.
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email, action, entity or summary"
            className="pl-9"
          />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODULES.map((m) => (
              <SelectItem key={m} value={m}>
                {m === "all" ? "All modules" : m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No activity yet.
                  </TableCell>
                </TableRow>
              ) : (
                (query.data ?? []).map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40">
                    <TableCell className="whitespace-nowrap text-xs">{fmt(r.created_at)}</TableCell>
                    <TableCell className="text-sm">{r.actor_email ?? "—"}</TableCell>
                    <TableCell>
                      {r.actor_role ? (
                        <Badge
                          variant="outline"
                          className={cn("capitalize", ROLE_BADGE_CLASS[r.actor_role as AppRole])}
                        >
                          {ROLE_LABEL[r.actor_role as AppRole]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={r.action} />
                    </TableCell>
                    <TableCell className="text-sm capitalize">{moduleOf(r)}</TableCell>
                    <TableCell className="max-w-[420px] truncate text-sm text-muted-foreground">
                      {r.summary ?? r.entity_id ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {detail && (
        <Dialog open onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit entry</DialogTitle>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted-foreground">Time</dt>
              <dd>{fmt(detail.created_at)}</dd>
              <dt className="text-muted-foreground">Actor</dt>
              <dd>{detail.actor_email ?? "—"}</dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd>{detail.actor_role ?? "—"}</dd>
              <dt className="text-muted-foreground">Action</dt>
              <dd className="font-mono">{detail.action}</dd>
              <dt className="text-muted-foreground">Module</dt>
              <dd className="capitalize">{moduleOf(detail)}</dd>
              <dt className="text-muted-foreground">Entity</dt>
              <dd className="font-mono text-xs">
                {detail.entity_type ?? "—"} {detail.entity_id ? `· ${detail.entity_id}` : ""}
              </dd>
              <dt className="text-muted-foreground">Summary</dt>
              <dd className="col-span-1">{detail.summary ?? "—"}</dd>
            </dl>
            {(detail.before_state || detail.after_state) && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {detail.before_state && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Before</div>
                    <pre className="overflow-auto rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
                      {JSON.stringify(detail.before_state, null, 2)}
                    </pre>
                  </div>
                )}
                {detail.after_state && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">After</div>
                    <pre className="overflow-auto rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
                      {JSON.stringify(detail.after_state, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
