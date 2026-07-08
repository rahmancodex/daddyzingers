import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CmsModulePage } from "@/components/admin/cms/CmsModulePage";

export const Route = createFileRoute("/admin/content/reviews")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Customer Reviews — Content · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <CmsModulePage
        module="customer_review"
        createTitle="New customer review"
        emptyHint="Written testimonials featured on the customer website."
      />
    </AdminShell>
  ),
});
