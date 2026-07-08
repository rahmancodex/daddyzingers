import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CmsModulePage } from "@/components/admin/cms/CmsModulePage";

export const Route = createFileRoute("/admin/content/sections")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Homepage Sections — Content · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <CmsModulePage
        module="homepage_section"
        createTitle="New section"
        emptyHint="Bestsellers, deals, categories, why-us and other homepage blocks."
      />
    </AdminShell>
  ),
});
