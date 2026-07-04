import * as React from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadBannerImage, validateBannerImage } from "@/lib/admin-banner-storage";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  prefix?: "desktop" | "mobile";
  aspect?: "wide" | "tall";
  label?: string;
  hint?: string;
};

export function BannerImageUploader({
  value,
  onChange,
  prefix = "desktop",
  aspect = "wide",
  label = "Image",
  hint,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [pct, setPct] = React.useState(0);
  const [dragOver, setDragOver] = React.useState(false);

  async function handleFile(file: File) {
    const err = validateBannerImage(file);
    if (err) return toast.error(err);
    setUploading(true);
    setPct(0);
    try {
      const { url } = await uploadBannerImage(file, { prefix, onProgress: setPct });
      onChange(url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setPct(0);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">{label}</label>
        {value && !uploading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onChange(null)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        )}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/30 transition-colors",
          aspect === "wide" ? "aspect-[21/9]" : "aspect-[9/16]",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-foreground/40",
        )}
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-black">
                Click to replace
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-background shadow-sm">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="text-sm font-semibold">
              {uploading ? "Uploading…" : "Drop image or click to upload"}
            </div>
            <div className="text-xs text-muted-foreground">{hint ?? "JPG, PNG or WEBP · up to 5MB"}</div>
          </div>
        )}
      </div>
      {uploading && <Progress value={pct} className="h-1.5" />}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
