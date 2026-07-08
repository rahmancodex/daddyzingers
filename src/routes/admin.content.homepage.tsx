import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CmsModulePage } from "@/components/admin/cms/CmsModulePage";

export const Route = createFileRoute("/admin/content/homepage")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Homepage — Content · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <CmsModulePage
        module="homepage"
        createTitle="Homepage draft"
        emptyHint="Homepage settings shared by every section. Create the initial draft to start managing it."
      />
    </AdminShell>
  ),
});
