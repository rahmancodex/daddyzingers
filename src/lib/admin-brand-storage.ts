import { supabase } from "@/integrations/supabase/client";

export const BRAND_ASSETS_BUCKET = "brand-assets";
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
const MAX = 5 * 1024 * 1024;
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function validateBrandAsset(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Only JPG, PNG, WEBP, SVG or ICO images are supported.";
  if (file.size > MAX) return "Image must be 5MB or smaller.";
  return null;
}

function extFromType(type: string, fallback: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/svg+xml") return "svg";
  if (type === "image/x-icon" || type === "image/vnd.microsoft.icon") return "ico";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  return fallback;
}

export async function uploadBrandAsset(
  file: File,
  kind: "logo" | "logo-dark" | "favicon" | "loading" | "footer" | "og",
): Promise<{ url: string; path: string }> {
  const err = validateBrandAsset(file);
  if (err) throw new Error(err);
  const ext = extFromType(file.type, file.name.split(".").pop() ?? "png");
  const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data, error: signErr } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw new Error(signErr?.message ?? "Failed to sign URL");
  return { url: data.signedUrl, path };
}
