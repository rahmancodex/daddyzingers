import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CustomersContent } from "@/components/admin/CustomersContent";

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
      <CustomersContent />
    </AdminShell>
  ),
});
