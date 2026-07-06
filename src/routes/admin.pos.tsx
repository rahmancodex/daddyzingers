import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { POSContent } from "@/components/admin/POSContent";

export const Route = createFileRoute("/admin/pos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "POS — Admin · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <POSContent />
    </AdminShell>
  ),
});
