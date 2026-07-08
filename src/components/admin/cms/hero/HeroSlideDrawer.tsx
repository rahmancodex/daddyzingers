// Full Hero Slide editor — opens in a right-side Sheet.
// Loads the entry + child row, edits every supported field, and saves in
// two atomic calls (entry patch + child upsert).
import * as React from "react";
import { toast } from "sonner";
import { Loader2, Save, Eye, Monitor, Smartphone } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  emptyHeroMeta,
  emptyHeroSlide,
  heroMetaSchema,
  heroSlideSchema,
  parseHeroMeta,
  parseHeroSlide,
  type HeroMeta,
  type HeroSlideFields,
} from "@/lib/hero-slide-schema";
import { useCmsChild, useCmsEntry, useCmsUpdate, useCmsUpsertChild } from "@/lib/use-cms";
import type { CmsEntry } from "@/lib/cms-shared";

import { HeroMediaField } from "./HeroMediaField";
import { HeroSlideStage } from "./HeroSlidePreview";

export function HeroSlideDrawer({
  entryId,
  open,
  onOpenChange,
}: {
  entryId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const entryQ = useCmsEntry(entryId ?? undefined);
  const childQ = useCmsChild<Record<string, unknown>>("cms_hero_slides", entryId ?? undefined);

  const [title, setTitle] = React.useState("");
  const [slide, setSlide] = React.useState<HeroSlideFields>(emptyHeroSlide);
  const [meta, setMeta] = React.useState<HeroMeta>(emptyHeroMeta);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");

  const update = useCmsUpdate("hero_slide");
  const upsertChild = useCmsUpsertChild("hero_slide", "cms_hero_slides");

  // Hydrate when a new entry loads
  React.useEffect(() => {
    if (!entryQ.data) return;
    const e = entryQ.data as CmsEntry;
    setTitle(e.title ?? "");
    setMeta(parseHeroMeta(e.meta));
    setSlide(parseHeroSlide(childQ.data ?? { headline: e.title }));
  }, [entryQ.data, childQ.data]);

  const saving = update.isPending || upsertChild.isPending;

  const save = async () => {
    if (!entryId) return;
    const slideParsed = heroSlideSchema.safeParse(slide);
    const metaParsed = heroMetaSchema.safeParse(meta);
    if (!slideParsed.success) {
      toast.error("Fix validation", { description: slideParsed.error.issues[0]?.message });
      return;
    }
    if (!metaParsed.success) {
      toast.error("Fix validation", { description: metaParsed.error.issues[0]?.message });
      return;
    }
    try {
      await update.mutateAsync({
        id: entryId,
        title: title.trim() || slideParsed.data.headline,
        meta: metaParsed.data as never,
      });
      await upsertChild.mutateAsync({ entry_id: entryId, values: slideParsed.data });
      toast.success("Slide saved");
    } catch {
      /* toast handled in hooks */
    }
  };

  const patchSlide = <K extends keyof HeroSlideFields>(k: K, v: HeroSlideFields[K]) =>
    setSlide((s) => ({ ...s, [k]: v }));
  const patchMeta = <K extends keyof HeroMeta>(k: K, v: HeroMeta[K]) =>
    setMeta((m) => ({ ...m, [k]: v }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[720px] lg:max-w-[960px] flex flex-col p-0"
      >
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" /> Hero Slide Editor
          </SheetTitle>
          <SheetDescription className="text-xs">
            Every field below is live — Save publishes changes instantly to whichever slides
            are currently Published.
          </SheetDescription>
        </SheetHeader>

        {entryQ.isLoading || childQ.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !entryId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a slide to edit.
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <ScrollArea className="min-h-0">
              <div className="space-y-6 p-5">
                {/* Content */}
                <Section label="Content">
                  <Field label="Internal Title">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                  <Field label="Eyebrow">
                    <Input value={slide.eyebrow} onChange={(e) => patchSlide("eyebrow", e.target.value)} />
                  </Field>
                  <Field label="Badge Text">
                    <Input value={meta.badge_text} onChange={(e) => patchMeta("badge_text", e.target.value)} />
                  </Field>
                  <Field label="Headline *">
                    <Input value={slide.headline} onChange={(e) => patchSlide("headline", e.target.value)} />
                  </Field>
                  <Field label="Sub Heading">
                    <Input value={slide.subheadline} onChange={(e) => patchSlide("subheadline", e.target.value)} />
                  </Field>
                  <Field label="Description">
                    <Textarea
                      rows={3}
                      value={meta.description}
                      onChange={(e) => patchMeta("description", e.target.value)}
                    />
                  </Field>
                </Section>

                {/* Buttons */}
                <Section label="Buttons">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Primary Button Text">
                      <Input
                        value={meta.primary_button_text}
                        onChange={(e) => patchMeta("primary_button_text", e.target.value)}
                      />
                    </Field>
                    <Field label="Primary Button Link">
                      <Input
                        value={meta.primary_button_link}
                        placeholder="/menu"
                        onChange={(e) => patchMeta("primary_button_link", e.target.value)}
                      />
                    </Field>
                    <Field label="Secondary Button Text">
                      <Input
                        value={meta.secondary_button_text}
                        onChange={(e) => patchMeta("secondary_button_text", e.target.value)}
                      />
                    </Field>
                    <Field label="Secondary Button Link">
                      <Input
                        value={meta.secondary_button_link}
                        placeholder="/menu"
                        onChange={(e) => patchMeta("secondary_button_link", e.target.value)}
                      />
                    </Field>
                    <Field label="Button Style">
                      <Select
                        value={meta.button_style}
                        onValueChange={(v) => patchMeta("button_style", v as HeroMeta["button_style"])}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="outline">Outline</SelectItem>
                          <SelectItem value="ghost">Ghost</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </Section>

                {/* Media */}
                <Section label="Media">
                  <Tabs defaultValue="desktop">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="desktop"><Monitor className="mr-1.5 h-3.5 w-3.5" /> Desktop</TabsTrigger>
                      <TabsTrigger value="mobile"><Smartphone className="mr-1.5 h-3.5 w-3.5" /> Mobile</TabsTrigger>
                    </TabsList>
                    <TabsContent value="desktop" className="mt-3 space-y-3">
                      <HeroMediaField
                        entryId={entryId}
                        label="Desktop Image"
                        kind="image"
                        value={meta.desktop_image_url || slide.image_url}
                        onChange={(url) => {
                          patchMeta("desktop_image_url", url);
                          patchSlide("image_url", url);
                        }}
                        altText={meta.alt_text}
                      />
                      <HeroMediaField
                        entryId={entryId}
                        label="Desktop GIF"
                        kind="gif"
                        value={meta.desktop_gif_url}
                        onChange={(url) => patchMeta("desktop_gif_url", url)}
                      />
                      <HeroMediaField
                        entryId={entryId}
                        label="Desktop Video"
                        kind="video"
                        value={meta.desktop_video_url || slide.video_url}
                        onChange={(url) => {
                          patchMeta("desktop_video_url", url);
                          patchSlide("video_url", url);
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="mobile" className="mt-3 space-y-3">
                      <HeroMediaField
                        entryId={entryId}
                        label="Mobile Image"
                        kind="image"
                        value={meta.mobile_image_url || slide.mobile_image_url}
                        onChange={(url) => {
                          patchMeta("mobile_image_url", url);
                          patchSlide("mobile_image_url", url);
                        }}
                        altText={meta.alt_text}
                      />
                      <HeroMediaField
                        entryId={entryId}
                        label="Mobile GIF"
                        kind="gif"
                        value={meta.mobile_gif_url}
                        onChange={(url) => patchMeta("mobile_gif_url", url)}
                      />
                      <HeroMediaField
                        entryId={entryId}
                        label="Mobile Video"
                        kind="video"
                        value={meta.mobile_video_url}
                        onChange={(url) => patchMeta("mobile_video_url", url)}
                      />
                    </TabsContent>
                  </Tabs>
                </Section>

                {/* Layout */}
                <Section label="Layout & Overlay">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Text Alignment">
                      <Select
                        value={slide.text_align}
                        onValueChange={(v) => patchSlide("text_align", v as HeroSlideFields["text_align"])}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Content Width">
                      <Select
                        value={meta.content_width}
                        onValueChange={(v) => patchMeta("content_width", v as HeroMeta["content_width"])}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="narrow">Narrow</SelectItem>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="wide">Wide</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Background Position">
                      <Select
                        value={meta.background_position}
                        onValueChange={(v) =>
                          patchMeta("background_position", v as HeroMeta["background_position"])
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["center","top","bottom","left","right","top-left","top-right","bottom-left","bottom-right"] as const).map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Overlay Color">
                      <Input
                        type="color"
                        value={meta.overlay_color}
                        onChange={(e) => patchMeta("overlay_color", e.target.value)}
                        className="h-9 w-full p-1"
                      />
                    </Field>
                    <Field label={`Overlay Opacity — ${(slide.overlay_opacity * 100).toFixed(0)}%`}>
                      <Slider
                        value={[Math.round(slide.overlay_opacity * 100)]}
                        onValueChange={([v]) => patchSlide("overlay_opacity", (v ?? 40) / 100)}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </Field>
                  </div>
                </Section>

                {/* Behavior */}
                <Section label="Behavior">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Animation">
                      <Select
                        value={meta.animation}
                        onValueChange={(v) => patchMeta("animation", v as HeroMeta["animation"])}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="slide">Slide</SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={`Slide Duration — ${(meta.slide_duration_ms / 1000).toFixed(1)}s`}>
                      <Slider
                        value={[meta.slide_duration_ms]}
                        onValueChange={([v]) => patchMeta("slide_duration_ms", v ?? 6000)}
                        min={1000}
                        max={20000}
                        step={500}
                      />
                    </Field>
                    <Toggle
                      label="Auto Play"
                      value={meta.autoplay}
                      onChange={(v) => patchMeta("autoplay", v)}
                    />
                    <Toggle
                      label="Loop"
                      value={meta.loop}
                      onChange={(v) => patchMeta("loop", v)}
                    />
                    <Toggle
                      label="Lazy Load Images"
                      value={meta.lazy_loading}
                      onChange={(v) => patchMeta("lazy_loading", v)}
                    />
                  </div>
                </Section>

                {/* SEO / Accessibility */}
                <Section label="SEO & Accessibility">
                  <Field label="Alt Text">
                    <Input value={meta.alt_text} onChange={(e) => patchMeta("alt_text", e.target.value)} />
                  </Field>
                  <Field label="SEO Image Title">
                    <Input
                      value={meta.seo_image_title}
                      onChange={(e) => patchMeta("seo_image_title", e.target.value)}
                    />
                  </Field>
                </Section>
              </div>
            </ScrollArea>

            {/* Preview */}
            <div className="hidden min-h-0 flex-col border-l bg-muted/30 p-4 lg:flex">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Live Preview
                </span>
                <div className="flex gap-1 rounded-full bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => setDevice("desktop")}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${device === "desktop" ? "bg-background shadow" : ""}`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("mobile")}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${device === "mobile" ? "bg-background shadow" : ""}`}
                  >
                    Mobile
                  </button>
                </div>
              </div>
              <div className="flex flex-1 items-start overflow-auto">
                <HeroSlideStage
                  slide={slide}
                  meta={meta}
                  device={device}
                  className={device === "mobile" ? "mx-auto w-[240px]" : "w-full"}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t bg-background p-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
          <Button onClick={save} disabled={saving || !entryId}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
      <Label className="text-xs font-medium">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
