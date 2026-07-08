import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { HeroSliderPage } from "@/components/admin/cms/hero/HeroSliderPage";

export const Route = createFileRoute("/admin/content/hero-slider")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hero Slider — Content · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <HeroSliderPage />
    </AdminShell>
  ),
});
