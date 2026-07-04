import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { ReportsContent } from "@/components/admin/ReportsContent";

export const Route = createFileRoute("/admin/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reports — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <ReportsContent />
    </AdminShell>
  ),
});
