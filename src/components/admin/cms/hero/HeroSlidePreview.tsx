// Live preview panel used inside the slide editor and on the public site.
import type { HeroMeta, HeroSlideFields } from "@/lib/hero-slide-schema";

const WIDTH_CLASS: Record<HeroMeta["content_width"], string> = {
  narrow: "max-w-xl",
  default: "max-w-2xl",
  wide: "max-w-4xl",
  full: "max-w-none",
};

const ALIGN_CLASS: Record<HeroSlideFields["text_align"], string> = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};

const BG_POSITION_CLASS: Record<HeroMeta["background_position"], string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
  "top-left": "object-left-top",
  "top-right": "object-right-top",
  "bottom-left": "object-left-bottom",
  "bottom-right": "object-right-bottom",
};

export function HeroSlideStage({
  slide,
  meta,
  device = "desktop",
  className = "",
}: {
  slide: HeroSlideFields;
  meta: HeroMeta;
  device?: "desktop" | "mobile";
  className?: string;
}) {
  const image =
    device === "mobile"
      ? meta.mobile_image_url || meta.desktop_image_url || slide.mobile_image_url || slide.image_url
      : meta.desktop_image_url || slide.image_url;
  const gif = device === "mobile" ? meta.mobile_gif_url : meta.desktop_gif_url;
  const video = device === "mobile" ? meta.mobile_video_url : meta.desktop_video_url || slide.video_url;
  const bg = video || gif || image;
  const overlay = meta.overlay_color || "#000000";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-neutral-900 text-white ${className}`}
      style={{ aspectRatio: device === "mobile" ? "9 / 16" : "16 / 7" }}
    >
      {video ? (
        <video
          src={video}
          autoPlay
          muted
          loop
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${BG_POSITION_CLASS[meta.background_position]}`}
        />
      ) : bg ? (
        <img
          src={bg}
          alt={meta.alt_text || slide.headline}
          title={meta.seo_image_title || undefined}
          loading={meta.lazy_loading ? "lazy" : "eager"}
          className={`absolute inset-0 h-full w-full object-cover ${BG_POSITION_CLASS[meta.background_position]}`}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
      )}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: overlay, opacity: slide.overlay_opacity }}
      />
      <div className="relative z-10 flex h-full flex-col justify-center px-6 py-8 sm:px-10">
        <div className={`flex w-full flex-col gap-3 ${ALIGN_CLASS[slide.text_align]} ${WIDTH_CLASS[meta.content_width]}`}>
          {meta.badge_text && (
            <span className="inline-flex w-fit rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur">
              {meta.badge_text}
            </span>
          )}
          {slide.eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              {slide.eyebrow}
            </p>
          )}
          <h2 className="font-display text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
            {slide.headline || "Your headline"}
          </h2>
          {slide.subheadline && (
            <p className="text-sm text-white/85 sm:text-base">{slide.subheadline}</p>
          )}
          {meta.description && (
            <p className="text-xs text-white/70 sm:text-sm">{meta.description}</p>
          )}
          <div className={`mt-1 flex flex-wrap gap-2 ${slide.text_align === "center" ? "justify-center" : slide.text_align === "right" ? "justify-end" : ""}`}>
            {(meta.primary_button_text || slide.cta_label) && (
              <a
                href={meta.primary_button_link || slide.cta_href || "#"}
                className={buttonClass(meta.button_style, "primary")}
              >
                {meta.primary_button_text || slide.cta_label}
              </a>
            )}
            {(meta.secondary_button_text || slide.secondary_cta_label) && (
              <a
                href={meta.secondary_button_link || slide.secondary_cta_href || "#"}
                className={buttonClass(meta.button_style, "secondary")}
              >
                {meta.secondary_button_text || slide.secondary_cta_label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buttonClass(style: HeroMeta["button_style"], variant: "primary" | "secondary") {
  const base = "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold sm:text-sm transition";
  if (style === "outline") {
    return `${base} border ${variant === "primary" ? "border-white bg-white/10 text-white hover:bg-white/20" : "border-white/60 text-white hover:bg-white/10"}`;
  }
  if (style === "ghost") {
    return `${base} ${variant === "primary" ? "bg-white/10 text-white hover:bg-white/20" : "text-white/80 hover:text-white"}`;
  }
  return `${base} ${variant === "primary" ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg" : "bg-white text-black hover:bg-white/90"}`;
}
