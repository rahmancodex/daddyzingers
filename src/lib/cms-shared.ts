// Client-safe CMS module registry, types, labels, and status metadata.
// No runtime imports beyond types so any component can consume this.

import type { Database } from "@/integrations/supabase/types";

export type CmsStatus = Database["public"]["Enums"]["cms_status"];
export type CmsModule = Database["public"]["Enums"]["cms_module"];

export const CMS_STATUSES: CmsStatus[] = [
  "draft",
  "scheduled",
  "published",
  "inactive",
  "archived",
];

export const CMS_STATUS_LABEL: Record<CmsStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  inactive: "Inactive",
  archived: "Archived",
};

// Semantic classes only — no hardcoded palette outside the design tokens.
export const CMS_STATUS_CLASS: Record<CmsStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  published: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  inactive: "bg-slate-500/15 text-slate-600 border-slate-500/30",
  archived: "bg-destructive/10 text-destructive border-destructive/30",
};

export type CmsModuleMeta = {
  module: CmsModule;
  label: string;
  route: string;
  childTable:
    | "cms_hero_slides"
    | "cms_homepage_sections"
    | "cms_customer_reviews"
    | "cms_video_testimonials"
    | "cms_layout_configs"
    | "cms_media_assets"
    | null;
  description: string;
};

export const CMS_MODULES: Record<CmsModule, CmsModuleMeta> = {
  homepage: {
    module: "homepage",
    label: "Homepage",
    route: "/admin/content/homepage",
    childTable: null,
    description: "Top-level homepage settings shared by every section.",
  },
  hero_slide: {
    module: "hero_slide",
    label: "Hero Slider",
    route: "/admin/content/hero-slider",
    childTable: "cms_hero_slides",
    description: "Rotating slides at the top of the homepage.",
  },
  homepage_section: {
    module: "homepage_section",
    label: "Homepage Sections",
    route: "/admin/content/sections",
    childTable: "cms_homepage_sections",
    description: "Bestsellers, deals, categories, why-us, and other blocks.",
  },
  customer_review: {
    module: "customer_review",
    label: "Customer Reviews",
    route: "/admin/content/reviews",
    childTable: "cms_customer_reviews",
    description: "Written customer testimonials shown on the website.",
  },
  video_testimonial: {
    module: "video_testimonial",
    label: "Video Testimonials",
    route: "/admin/content/video-testimonials",
    childTable: "cms_video_testimonials",
    description: "Video reviews from customers, featured on the homepage.",
  },
  layout_desktop: {
    module: "layout_desktop",
    label: "Desktop Layout",
    route: "/admin/content/layout/desktop",
    childTable: "cms_layout_configs",
    description: "Section order, spacing, and visibility on desktop.",
  },
  layout_mobile: {
    module: "layout_mobile",
    label: "Mobile Layout",
    route: "/admin/content/layout/mobile",
    childTable: "cms_layout_configs",
    description: "Section order, spacing, and visibility on mobile.",
  },
  media_asset: {
    module: "media_asset",
    label: "Media Library",
    route: "/admin/content/media",
    childTable: "cms_media_assets",
    description: "Images and videos used across the website.",
  },
};

export type CmsEntry = Database["public"]["Tables"]["cms_entries"]["Row"];
export type CmsEntryInsert = Database["public"]["Tables"]["cms_entries"]["Insert"];
export type CmsEntryUpdate = Database["public"]["Tables"]["cms_entries"]["Update"];

/** Compute the effective status locally (mirror of public.cms_effective_status). */
export function effectiveCmsStatus(
  status: CmsStatus,
  is_active: boolean,
  publish_at: string | null,
  unpublish_at: string | null,
  now: Date = new Date(),
): CmsStatus {
  if (status === "archived") return "archived";
  if (!is_active) return "inactive";
  const t = now.getTime();
  if (status === "scheduled" && publish_at && new Date(publish_at).getTime() <= t) {
    return "published";
  }
  if (status === "published" && unpublish_at && new Date(unpublish_at).getTime() <= t) {
    return "inactive";
  }
  return status;
}
