import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { KitchenContent } from "@/components/admin/KitchenContent";

export const Route = createFileRoute("/admin/kitchen")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kitchen Display — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <KitchenContent />
    </AdminShell>
  ),
});
