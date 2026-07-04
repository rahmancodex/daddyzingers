import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

type PublicClientCandidate = {
  label: "vite" | "server";
  supabase: SupabaseClient<Database>;
};

function createPublicClient(url: string, key: string): SupabaseClient<Database> {
  return createClient<Database>(url, key,
    {
      global: { fetch: createSupabaseFetch(key) },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

function publicClientCandidates(): PublicClientCandidate[] {
  const envPairs = [
    {
      label: "vite" as const,
      url: process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL,
      key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    {
      label: "server" as const,
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_PUBLISHABLE_KEY,
    },
  ];

  const seen = new Set<string>();
  const candidates: PublicClientCandidate[] = [];
  for (const pair of envPairs) {
    const { label, url, key } = pair;
    if (!url || !key) continue;
    const fingerprint = `${url}\n${key}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    candidates.push({ label, supabase: createPublicClient(url, key) });
  }

  if (!candidates.length) {
    throw new Error(
      "Missing Supabase environment variable pair: VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return candidates;
}

export const listActiveBanners = createServerFn({ method: "GET" }).handler(async () => {
  let lastError: Error | undefined;

  for (const candidate of publicClientCandidates()) {
    try {
      return await loadActiveBanners(candidate.supabase);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[listActiveBanners] ${candidate.label} backend read failed`, lastError);
    }
  }

  throw lastError ?? new Error("Failed to load promo banners");
});

async function loadActiveBanners(supabase: SupabaseClient<Database>): Promise<PromoBanner[]> {
  const { data, error } = await supabase
    .from("promo_banners")
    .select(
      "id,title,subtitle,cta_text,cta_link,desktop_image_url,mobile_image_url,sort_order",
    )
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as PromoBanner[];
}
