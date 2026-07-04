import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PromoBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  sort_order: number;
};

export const listActiveBanners = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("promo_banners")
    .select(
      "id,title,subtitle,cta_text,cta_link,desktop_image_url,mobile_image_url,sort_order",
    )
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as PromoBanner[];
});
