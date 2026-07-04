import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/customers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Customers — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder
        title="Customers"
        description="View, search and manage customer accounts."
      />
    </AdminShell>
  ),
});
