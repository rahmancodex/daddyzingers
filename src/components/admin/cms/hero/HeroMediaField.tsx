// Upload + Library picker for hero slide media.
// - Uploads go to the private `cms-media` bucket via the authenticated browser
//   client (RLS permits cms_editor/admin/owner).
// - We store a long-lived signed URL directly on the slide so the public
//   homepage doesn't need any auth to render the asset.
// - Every successful upload is also registered into `cms_media_assets` so the
//   Media Library can reuse it without a re-upload.
import * as React from "react";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, X, LibraryBig } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

const BUCKET = "cms-media";
// 100 years — the URL becomes the effective public URL for the asset.
const SIGN_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 100;

export type MediaKind = "image" | "gif" | "video";

const ACCEPT: Record<MediaKind, string> = {
  image: "image/png,image/jpeg,image/webp,image/avif",
  gif: "image/gif",
  video: "video/mp4,video/webm",
};

function slugifyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 120);
}

async function signedUrlFor(path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGN_EXPIRY_SECONDS);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

async function registerAsset(params: {
  path: string;
  mime: string | null;
  size: number | null;
  altText: string | null;
}) {
  // Create a cms_entries row + cms_media_assets row so the Library sees it.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: entry, error: entryErr } = await supabase
    .from("cms_entries")
    .insert({
      module: "media_asset",
      title: params.path.split("/").pop() ?? params.path,
      status: "published",
      is_active: true,
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (entryErr || !entry) return; // best-effort — don't block upload UX
  await supabase.from("cms_media_assets").insert({
    entry_id: entry.id,
    bucket: BUCKET,
    path: params.path,
    mime_type: params.mime,
    size_bytes: params.size,
    alt_text: params.altText,
    origin_module: "hero_slide",
  });
}

export function HeroMediaField({
  label,
  value,
  onChange,
  kind = "image",
  entryId,
  altText,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind?: MediaKind;
  entryId: string;
  altText?: string;
  hint?: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setProgress(10);
    try {
      const path = `hero-slides/${entryId}/${kind}-${Date.now()}-${slugifyName(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      setProgress(70);
      const url = await signedUrlFor(path);
      setProgress(90);
      await registerAsset({
        path,
        mime: file.type || null,
        size: file.size,
        altText: altText ?? null,
      });
      onChange(url);
      setProgress(100);
      toast.success("Uploaded");
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const clear = () => onChange("");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {value ? (
          <Button type="button" size="sm" variant="ghost" onClick={clear} className="h-7 px-2">
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
        {value ? (
          <div className="flex gap-3">
            <div className="h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
              {kind === "video" ? (
                <video src={value} className="h-full w-full object-cover" muted playsInline />
              ) : (
                <img src={value} alt={altText ?? label} className="h-full w-full object-cover" loading="lazy" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 text-xs"
                spellCheck={false}
              />
              {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground/70" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {hint ?? `Upload or pick a ${kind} from the library.`}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-8"
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            {uploading ? `Uploading ${progress}%` : "Upload"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setLibraryOpen(true)}
            className="h-8"
          >
            <LibraryBig className="mr-1.5 h-3.5 w-3.5" />
            Library
          </Button>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept={ACCEPT[kind]}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {uploading && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <MediaLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onPick={(url) => {
          onChange(url);
          setLibraryOpen(false);
        }}
        kind={kind}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Media Library dialog — lists assets in cms_media_assets, generates a fresh
// signed URL when the editor picks one so we always store a usable link.
// ---------------------------------------------------------------------------

type LibraryRow = {
  entry_id: string;
  bucket: string;
  path: string;
  mime_type: string | null;
};

function MediaLibraryDialog({
  open,
  onOpenChange,
  onPick,
  kind,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (url: string) => void;
  kind: MediaKind;
}) {
  const [rows, setRows] = React.useState<LibraryRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [picking, setPicking] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("cms_media_assets")
      .select("entry_id, bucket, path, mime_type")
      .eq("bucket", BUCKET)
      .order("entry_id", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) toast.error("Couldn't load library", { description: error.message });
        setRows((data as LibraryRow[]) ?? []);
        setLoading(false);
      });
  }, [open]);

  const filtered = rows.filter((r) => {
    const m = (r.mime_type ?? "").toLowerCase();
    if (kind === "video") return m.startsWith("video/");
    if (kind === "gif") return m === "image/gif";
    return m.startsWith("image/") && m !== "image/gif";
  });

  const pick = async (row: LibraryRow) => {
    setPicking(row.path);
    try {
      const url = await signedUrlFor(row.path);
      onPick(url);
    } catch (e) {
      toast.error("Couldn't select asset", { description: (e as Error).message });
    } finally {
      setPicking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>
            Pick a previously uploaded {kind} — no duplicate uploads.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No {kind}s in the library yet. Upload one and it will appear here.
          </Card>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-auto p-1 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((row) => (
              <button
                key={row.path}
                type="button"
                onClick={() => pick(row)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted transition hover:border-primary"
                disabled={picking === row.path}
              >
                {kind === "video" ? (
                  <video
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    // We only preview from public URL via signed fetch on demand; skip src here for perf
                  />
                ) : (
                  <LibraryThumb path={row.path} />
                )}
                {picking === row.path && (
                  <div className="absolute inset-0 grid place-items-center bg-background/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LibraryThumb({ path }: { path: string }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className="h-full w-full animate-pulse bg-muted" />;
  return <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />;
}
