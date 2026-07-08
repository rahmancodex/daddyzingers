import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CmsModulePage } from "@/components/admin/cms/CmsModulePage";

export const Route = createFileRoute("/admin/content/media")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Media Library — Content · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <CmsModulePage
        module="media_asset"
        emptyHint="Images and videos uploaded to the CMS. Use the upload button in each editor to add new files."
      />
    </AdminShell>
  ),
});
