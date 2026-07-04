import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { MenuContent } from "@/components/admin/MenuContent";

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
      <MenuContent />
    </AdminShell>
  ),
});
