import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/coupons")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Coupons — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder
        title="Coupons"
        description="Create and manage discount coupons and campaigns."
      />
    </AdminShell>
  ),
});
