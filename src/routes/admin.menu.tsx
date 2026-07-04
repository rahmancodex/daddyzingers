import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/menu")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Menu — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder
        title="Menu"
        description="Manage menu items, sizes, options and availability."
      />
    </AdminShell>
  ),
});
