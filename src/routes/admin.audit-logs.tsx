import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AuditLogsContent } from "@/components/admin/AuditLogsContent";

export const Route = createFileRoute("/admin/audit-logs")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Audit Logs — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell requiredPermission="audit.view">
      <AuditLogsContent />
    </AdminShell>
  ),
});
