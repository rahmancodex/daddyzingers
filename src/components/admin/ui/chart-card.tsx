import * as React from "react";
import { Download, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Serialize the first <svg> inside a container to a PNG download. */
async function exportSvgAsPng(container: HTMLElement | null, filename: string) {
  if (!container) return;
  const svg = container.querySelector("svg");
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bbox = svg.getBoundingClientRect();
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(bbox.width));
  clone.setAttribute("height", String(bbox.height));
  // Inline background from CSS var so exported PNG is readable
  const bg = getComputedStyle(container).backgroundColor || "#ffffff";
  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  const scale = 2; // hi-dpi
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = bbox.width * scale;
  canvas.height = bbox.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, "image/png");
}

export function ChartCard({
  title,
  subtitle,
  actions,
  headerRight,
  children,
  className,
  bodyClassName,
  exportName = "chart",
  fullscreenTitle,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  exportName?: string;
  fullscreenTitle?: string;
}) {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [fs, setFs] = React.useState(false);

  return (
    <>
      <div
        className={cn(
          "group/chart relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card",
          "shadow-[0_1px_0_0_hsl(var(--foreground)/0.02),0_1px_2px_-1px_hsl(var(--foreground)/0.06)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <div className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
              {title}
            </div>
            {subtitle && (
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {headerRight}
            {actions}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Export as PNG"
              className="h-8 w-8 rounded-lg text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/chart:opacity-100 focus-visible:opacity-100"
              onClick={() => exportSvgAsPng(bodyRef.current, `${exportName}.png`)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fullscreen"
              className="h-8 w-8 rounded-lg text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/chart:opacity-100 focus-visible:opacity-100"
              onClick={() => setFs(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div ref={bodyRef} className={cn("mt-4 flex-1 px-2 pb-4 sm:px-3 sm:pb-5", bodyClassName)}>
          {children}
        </div>
      </div>

      <Dialog open={fs} onOpenChange={setFs}>
        <DialogContent className="max-w-[min(1200px,95vw)] p-0 sm:rounded-2xl">
          <DialogTitle className="sr-only">{fullscreenTitle ?? String(title)}</DialogTitle>
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold">{title}</div>
              {subtitle && (
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-2 rounded-lg"
                onClick={() =>
                  exportSvgAsPng(
                    document.getElementById(`chart-fs-${exportName}`),
                    `${exportName}.png`,
                  )
                }
              >
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="h-8 w-8 rounded-lg"
                onClick={() => setFs(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div id={`chart-fs-${exportName}`} className="h-[72vh] w-full p-4 sm:p-6">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
