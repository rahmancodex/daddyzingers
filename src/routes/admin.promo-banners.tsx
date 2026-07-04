import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/promo-banners")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Promo Banners — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder
        title="Promo Banners"
        description="Manage homepage promotional banners and carousels."
      />
    </AdminShell>
  ),
});
