import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DELIVERY_PRICING, type DeliveryPricing } from "@/lib/checkout-store";

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);

/**
 * Public, cache-friendly read of the admin-configured delivery pricing.
 * Uses the "Anyone can read settings" RLS policy on restaurant_settings.
 */
export function useDeliveryPricing() {
  return useQuery({
    queryKey: ["public", "delivery-pricing"],
    staleTime: 60_000,
    queryFn: async (): Promise<DeliveryPricing> => {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("delivery_settings")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      const d = ((data?.delivery_settings ?? {}) as Record<string, unknown>);
      return {
        defaultFee: num(d.default_fee, DEFAULT_DELIVERY_PRICING.defaultFee),
        freeThreshold: num(d.free_delivery_threshold, DEFAULT_DELIVERY_PRICING.freeThreshold),
        minOrder: num(d.min_order, DEFAULT_DELIVERY_PRICING.minOrder),
        deliveryEnabled: bool(d.delivery_enabled, DEFAULT_DELIVERY_PRICING.deliveryEnabled),
        pickupEnabled: bool(d.pickup_enabled, DEFAULT_DELIVERY_PRICING.pickupEnabled),
        etaDeliveryMinutes: num(d.estimated_minutes, DEFAULT_DELIVERY_PRICING.etaDeliveryMinutes),
        etaPickupMinutes: num(d.estimated_pickup_minutes, DEFAULT_DELIVERY_PRICING.etaPickupMinutes),
      };
    },
  });
}
