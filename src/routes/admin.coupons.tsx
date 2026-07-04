import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CouponsContent } from "@/components/admin/CouponsContent";

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
      <CouponsContent />
    </AdminShell>
  ),
});
