import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CmsModulePage } from "@/components/admin/cms/CmsModulePage";

export const Route = createFileRoute("/admin/content/layout/homepage")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Homepage Layout — Content · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <CmsModulePage
        module="layout_desktop"
        createTitle="Homepage layout draft"
        emptyHint="Section order, spacing, and visibility for the homepage."
      />
    </AdminShell>
  ),
});
