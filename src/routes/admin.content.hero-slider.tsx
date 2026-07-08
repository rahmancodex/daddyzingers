import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CmsModulePage } from "@/components/admin/cms/CmsModulePage";

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
      <CmsModulePage
        module="hero_slide"
        createTitle="New hero slide"
        emptyHint="Rotating slides shown at the very top of the homepage."
      />
    </AdminShell>
  ),
});
