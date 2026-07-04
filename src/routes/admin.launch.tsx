import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { LaunchChecklistContent } from "@/components/admin/LaunchChecklistContent";

export const Route = createFileRoute("/admin/launch")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Launch Checklist — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell requiredPermission="production.manage">
      <LaunchChecklistContent />
    </AdminShell>
  ),
});
