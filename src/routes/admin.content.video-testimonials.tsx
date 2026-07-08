import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CmsModulePage } from "@/components/admin/cms/CmsModulePage";

export const Route = createFileRoute("/admin/content/video-testimonials")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video Testimonials — Content · Daddy Zingers" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminShell>
      <CmsModulePage
        module="video_testimonial"
        createTitle="New video testimonial"
        emptyHint="Video reviews from customers, featured on the homepage."
      />
    </AdminShell>
  ),
});
