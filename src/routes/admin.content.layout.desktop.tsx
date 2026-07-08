import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CmsModulePage } from "@/components/admin/cms/CmsModulePage";

export const Route = createFileRoute("/admin/content/layout/desktop")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Desktop Layout — Content · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <CmsModulePage
        module="layout_desktop"
        createTitle="Desktop layout draft"
        emptyHint="Layout blocks, spacing, and visibility rules for desktop viewports."
      />
    </AdminShell>
  ),
});
