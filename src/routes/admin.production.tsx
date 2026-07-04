import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductionContent } from "@/components/admin/ProductionContent";

export const Route = createFileRoute("/admin/production")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Production — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell requiredPermission="production.manage">
      <ProductionContent />
    </AdminShell>
  ),
});
