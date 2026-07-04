import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

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
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabasePublishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    const missing = [
      !supabaseUrl ? "SUPABASE_URL or VITE_SUPABASE_URL" : null,
      !supabasePublishableKey ? "SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY" : null,
    ].filter(Boolean);
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
  }

  const supabase = createClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      global: { fetch: createSupabaseFetch(supabasePublishableKey) },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
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
