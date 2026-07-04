import { supabase } from "@/integrations/supabase/client";

export const PROMO_BANNERS_BUCKET = "promo-banners";
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX = 5 * 1024 * 1024;

export function validateBannerImage(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Only JPG, PNG or WEBP images are supported.";
  if (file.size > MAX) return "Image must be 5MB or smaller.";
  return null;
}

function extFromType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/**
 * Upload a banner image to the public `promo-banners` bucket and return
 * the public URL (bucket has a public SELECT policy on storage.objects).
 */
export async function uploadBannerImage(
  file: File,
  opts?: { prefix?: "desktop" | "mobile"; onProgress?: (pct: number) => void },
): Promise<{ url: string; path: string }> {
  const err = validateBannerImage(file);
  if (err) throw new Error(err);
  const prefix = opts?.prefix ?? "desktop";
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFromType(file.type)}`;
  opts?.onProgress?.(15);
  const { error } = await supabase.storage
    .from(PROMO_BANNERS_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
  opts?.onProgress?.(80);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(PROMO_BANNERS_BUCKET).getPublicUrl(path);
  opts?.onProgress?.(100);
  return { url: data.publicUrl, path };
}
