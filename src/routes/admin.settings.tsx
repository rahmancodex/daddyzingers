import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminPlaceholder
        title="Settings"
        description="Store settings, branding, delivery zones and integrations."
      />
    </AdminShell>
  ),
});
