import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CmsModulePage } from "@/components/admin/cms/CmsModulePage";

export const Route = createFileRoute("/admin/content/layout/mobile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mobile Layout — Content · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <CmsModulePage
        module="layout_mobile"
        createTitle="Mobile layout draft"
        emptyHint="Layout blocks, spacing, and visibility rules for mobile viewports."
      />
    </AdminShell>
  ),
});
