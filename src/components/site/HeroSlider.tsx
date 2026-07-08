// Public homepage Hero Slider — reads Published slides from Supabase CMS.
// Renders nothing until slides load; hides itself entirely when the CMS
// returns zero published slides so the rest of the page keeps working.
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { HeroSlideStage } from "@/components/admin/cms/hero/HeroSlidePreview";
import { parseHeroMeta, parseHeroSlide, type HeroMeta, type HeroSlideFields } from "@/lib/hero-slide-schema";

type PublicSlide = {
  id: string;
  title: string;
  sort_order: number | null;
  meta: unknown;
  slide: HeroSlideFields;
  metaParsed: HeroMeta;
};

async function fetchPublishedSlides(): Promise<PublicSlide[]> {
  const { data, error } = await supabase
    .from("cms_entries")
    .select(
      "id, title, sort_order, meta, cms_hero_slides ( headline, subheadline, eyebrow, image_url, mobile_image_url, video_url, cta_label, cta_href, secondary_cta_label, secondary_cta_href, overlay_opacity, text_align, theme )",
    )
    .eq("module", "hero_slide")
    .eq("status", "published")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    sort_order: row.sort_order,
    meta: row.meta,
    slide: parseHeroSlide(row.cms_hero_slides ?? { headline: row.title }),
    metaParsed: parseHeroMeta(row.meta),
  }));
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function HeroSlider() {
  const isMobile = useIsMobile();
  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["public", "hero_slides"],
    queryFn: fetchPublishedSlides,
    staleTime: 60_000,
  });

  const [index, setIndex] = React.useState(0);
  const active = slides[index];

  // Autoplay respects per-slide autoplay + loop + duration.
  React.useEffect(() => {
    if (!active || !active.metaParsed.autoplay || slides.length <= 1) return;
    const id = setTimeout(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= slides.length) return active.metaParsed.loop ? 0 : i;
        return next;
      });
    }, active.metaParsed.slide_duration_ms || 6000);
    return () => clearTimeout(id);
  }, [active, slides.length]);

  React.useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  if (isLoading) {
    return <div className="h-[280px] w-full animate-pulse bg-muted md:h-[520px]" aria-hidden />;
  }
  if (!active) return null;

  const goPrev = () =>
    setIndex((i) => (i - 1 + slides.length) % Math.max(slides.length, 1));
  const goNext = () => setIndex((i) => (i + 1) % Math.max(slides.length, 1));

  return (
    <section aria-label="Hero" className="relative w-full">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeroSlideStage
              slide={active.slide}
              meta={active.metaParsed}
              device={isMobile ? "mobile" : "desktop"}
              className="!rounded-none md:!rounded-none"
            />
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60 md:left-6"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60 md:right-6"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
