// Client-safe schema + types for hero slides.
// Core typed fields live on `cms_hero_slides`; extended settings live in
// `cms_entries.meta` so we don't need per-field schema migrations.
import { z } from "zod";

export type TextAlign = "left" | "center" | "right";
export type ButtonStyle = "solid" | "outline" | "ghost";
export type ContentWidth = "narrow" | "default" | "wide" | "full";
export type SlideAnimation = "fade" | "slide" | "zoom" | "none";
export type BackgroundPosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export const heroMetaSchema = z.object({
  badge_text: z.string().max(80).optional().default(""),
  description: z.string().max(500).optional().default(""),
  primary_button_text: z.string().max(60).optional().default(""),
  primary_button_link: z.string().max(500).optional().default(""),
  secondary_button_text: z.string().max(60).optional().default(""),
  secondary_button_link: z.string().max(500).optional().default(""),
  button_style: z.enum(["solid", "outline", "ghost"]).optional().default("solid"),
  content_width: z.enum(["narrow", "default", "wide", "full"]).optional().default("default"),
  animation: z.enum(["fade", "slide", "zoom", "none"]).optional().default("fade"),
  autoplay: z.boolean().optional().default(true),
  loop: z.boolean().optional().default(true),
  slide_duration_ms: z.number().int().min(1000).max(60000).optional().default(6000),
  overlay_color: z.string().max(32).optional().default("#000000"),
  background_position: z
    .enum([
      "center",
      "top",
      "bottom",
      "left",
      "right",
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ])
    .optional()
    .default("center"),
  alt_text: z.string().max(200).optional().default(""),
  seo_image_title: z.string().max(200).optional().default(""),
  lazy_loading: z.boolean().optional().default(true),
  // Extended media (device-specific + GIF + video variants)
  desktop_image_url: z.string().optional().default(""),
  mobile_image_url: z.string().optional().default(""),
  desktop_gif_url: z.string().optional().default(""),
  mobile_gif_url: z.string().optional().default(""),
  desktop_video_url: z.string().optional().default(""),
  mobile_video_url: z.string().optional().default(""),
});

export type HeroMeta = z.infer<typeof heroMetaSchema>;

export const heroSlideSchema = z.object({
  headline: z.string().trim().min(1, "Headline is required").max(200),
  subheadline: z.string().max(300).optional().default(""),
  eyebrow: z.string().max(80).optional().default(""),
  image_url: z.string().optional().default(""),
  mobile_image_url: z.string().optional().default(""),
  video_url: z.string().optional().default(""),
  cta_label: z.string().max(60).optional().default(""),
  cta_href: z.string().max(500).optional().default(""),
  secondary_cta_label: z.string().max(60).optional().default(""),
  secondary_cta_href: z.string().max(500).optional().default(""),
  overlay_opacity: z.number().min(0).max(1).default(0.4),
  text_align: z.enum(["left", "center", "right"]).default("left"),
  theme: z.string().max(20).default("dark"),
});

export type HeroSlideFields = z.infer<typeof heroSlideSchema>;

export const emptyHeroMeta: HeroMeta = heroMetaSchema.parse({});
export const emptyHeroSlide: HeroSlideFields = heroSlideSchema.parse({
  headline: "New hero slide",
});

/** Merge stored raw meta with defaults so components can rely on every key. */
export function parseHeroMeta(raw: unknown): HeroMeta {
  const parsed = heroMetaSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : emptyHeroMeta;
}

/** Merge stored raw slide row with defaults. */
export function parseHeroSlide(raw: unknown): HeroSlideFields {
  const src = (raw ?? {}) as Partial<HeroSlideFields>;
  return heroSlideSchema.parse({
    headline: src.headline ?? "",
    subheadline: src.subheadline ?? "",
    eyebrow: src.eyebrow ?? "",
    image_url: src.image_url ?? "",
    mobile_image_url: src.mobile_image_url ?? "",
    video_url: src.video_url ?? "",
    cta_label: src.cta_label ?? "",
    cta_href: src.cta_href ?? "",
    secondary_cta_label: src.secondary_cta_label ?? "",
    secondary_cta_href: src.secondary_cta_href ?? "",
    overlay_opacity: typeof src.overlay_opacity === "number" ? src.overlay_opacity : 0.4,
    text_align: (src.text_align as TextAlign) ?? "left",
    theme: src.theme ?? "dark",
  });
}
