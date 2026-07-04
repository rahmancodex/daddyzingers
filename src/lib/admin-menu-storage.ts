import { supabase } from "@/integrations/supabase/client";

export const MENU_IMAGES_BUCKET = "menu-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPG, PNG and WEBP images are supported.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be 5MB or smaller.";
  }
  return null;
}

function extFromType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/**
 * Upload a menu image to the "menu-images" bucket and return a very
 * long-lived signed URL suitable for storing in menu_items.image_url.
 * The bucket is private with a public SELECT policy on storage.objects,
 * so we sign a 10-year URL to render publicly on the customer site.
 */
export async function uploadMenuImage(
  file: File,
  opts?: { prefix?: "items" | "categories"; onProgress?: (pct: number) => void },
): Promise<{ url: string; path: string }> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const prefix = opts?.prefix ?? "items";
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFromType(file.type)}`;

  // supabase-js v2 does not yet expose upload progress reliably; report a
  // simple pseudo-progress so the UI stays responsive.
  opts?.onProgress?.(10);
  const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  opts?.onProgress?.(80);
  if (error) throw new Error(error.message);

  const { data: signed, error: sErr } = await supabase.storage
    .from(MENU_IMAGES_BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (sErr || !signed?.signedUrl) throw new Error(sErr?.message ?? "Failed to sign URL");

  opts?.onProgress?.(100);
  return { url: signed.signedUrl, path };
}
