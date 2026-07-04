import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { BannersContent } from "@/components/admin/BannersContent";

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
      <BannersContent />
    </AdminShell>
  ),
});
