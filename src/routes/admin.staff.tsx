import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { StaffContent } from "@/components/admin/StaffContent";

export const Route = createFileRoute("/admin/staff")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff & Access — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell requiredPermission="staff.view">
      <StaffContent />
    </AdminShell>
  ),
});
