import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/categories")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Categories — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder
        title="Categories"
        description="Organize your menu into categories and sub-categories."
      />
    </AdminShell>
  ),
});
