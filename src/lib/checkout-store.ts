import { useSyncExternalStore } from "react";

/* ============================================================ */
/*  Checkout store — delivery method, coupon, schedule, tip.    */
/*  Session-scoped (sessionStorage) so it never leaks across    */
/*  tabs or users. Cart state lives in the global cart store.   */
/* ============================================================ */

export type DeliveryMethod = "delivery" | "pickup" | "dinein";

export type AppliedCoupon = {
  code: string;
  label: string;
  /** Percent discount 0-100 OR flat amount in PKR — use one of the two. */
  percent?: number;
  flat?: number;
  minSubtotal?: number;
};

export type NewAddressDraft = {
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  area: string;
  notes: string;
};

export type CheckoutState = {
  method: DeliveryMethod;
  coupon: AppliedCoupon | null;
  scheduleAt: string | null; // ISO or null = ASAP
  tip: number;
  selectedAddressId: string | null;
  contactPhone: string;
  contactAltPhone: string;
  notes: string;
  paymentMethod: "cod" | "card" | "wallet";
  useNewAddress: boolean;
  newAddress: NewAddressDraft;
  branchId: string | null;

};

const LS_KEY = "dz_checkout_v1";

const EMPTY_NEW_ADDRESS: NewAddressDraft = {
  recipient_name: "",
  phone: "",
  address_line: "",
  city: "",
  area: "",
  notes: "",
};

const DEFAULT: CheckoutState = {
  method: "delivery",
  coupon: null,
  scheduleAt: null,
  tip: 0,
  selectedAddressId: null,
  contactPhone: "",
  contactAltPhone: "",
  notes: "",
  paymentMethod: "cod",
  useNewAddress: false,
  newAddress: EMPTY_NEW_ADDRESS,
  branchId: null,
};


function load(): CheckoutState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = sessionStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<CheckoutState>) };
  } catch {
    return DEFAULT;
  }
}

let state: CheckoutState = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function setState(patch: Partial<CheckoutState>) {
  state = { ...state, ...patch };
  emit();
}

const SSR_STATE = DEFAULT;
export function useCheckout() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SSR_STATE,
  );
}

export const checkoutActions = {
  setMethod(m: DeliveryMethod) {
    setState({ method: m });
  },
  setCoupon(c: AppliedCoupon | null) {
    setState({ coupon: c });
  },
  setSchedule(iso: string | null) {
    setState({ scheduleAt: iso });
  },
  setTip(v: number) {
    setState({ tip: Math.max(0, Math.round(v)) });
  },
  setAddress(id: string | null) {
    setState({ selectedAddressId: id });
  },
  setContact(patch: Partial<Pick<CheckoutState, "contactPhone" | "contactAltPhone" | "notes">>) {
    setState(patch);
  },
  setPayment(p: CheckoutState["paymentMethod"]) {
    setState({ paymentMethod: p });
  },
  setUseNewAddress(v: boolean) {
    setState({ useNewAddress: v });
  },
  setNewAddress(patch: Partial<NewAddressDraft>) {
    setState({ newAddress: { ...state.newAddress, ...patch } });
  },
  resetNewAddress() {
    setState({ newAddress: EMPTY_NEW_ADDRESS, useNewAddress: false });
  },
  setBranch(id: string | null) {
    setState({ branchId: id });
  },
  reset() {
    setState(DEFAULT);
  },
};


/* -------------- Fees & totals -------------- */

/**
 * Non-delivery fees. Delivery pricing is NOT hardcoded — it is resolved from
 * admin settings and the selected branch via {@link resolveDeliveryFee}.
 */
export const FEES = {
  serviceFee: 30,
  taxRate: 0, // future-ready
} as const;

export type DeliveryPricing = {
  defaultFee: number;
  freeThreshold: number; // 0 = disabled
  minOrder: number;      // 0 = disabled
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  etaDeliveryMinutes: number;
  etaPickupMinutes: number;
};

export const DEFAULT_DELIVERY_PRICING: DeliveryPricing = {
  defaultFee: 0,
  freeThreshold: 0,
  minOrder: 0,
  deliveryEnabled: true,
  pickupEnabled: true,
  etaDeliveryMinutes: 45,
  etaPickupMinutes: 15,
};

/**
 * Resolve the delivery fee for a checkout attempt.
 * Branch-level `delivery_charges` (when set) override the global default.
 * Free-delivery threshold zeroes the fee once subtotal is at or above it.
 */
export function resolveDeliveryFee(args: {
  method: DeliveryMethod;
  subtotal: number;
  pricing: DeliveryPricing;
  branchFee?: number | null;
}): number {
  if (args.method !== "delivery") return 0;
  const base =
    typeof args.branchFee === "number" && Number.isFinite(args.branchFee)
      ? Math.max(0, Math.round(args.branchFee))
      : Math.max(0, Math.round(args.pricing.defaultFee));
  if (args.pricing.freeThreshold > 0 && args.subtotal >= args.pricing.freeThreshold) return 0;
  return base;
}

export function computeTotals(args: {
  subtotal: number;
  coupon: AppliedCoupon | null;
  tip: number;
  deliveryFee: number;
}) {
  const deliveryFee = Math.max(0, Math.round(args.deliveryFee));
  const serviceFee = FEES.serviceFee;

  let discount = 0;
  if (args.coupon && (!args.coupon.minSubtotal || args.subtotal >= args.coupon.minSubtotal)) {
    if (args.coupon.percent) discount = Math.round((args.subtotal * args.coupon.percent) / 100);
    if (args.coupon.flat) discount = Math.max(discount, args.coupon.flat);
    discount = Math.min(discount, args.subtotal);
  }

  const taxableBase = Math.max(0, args.subtotal - discount) + deliveryFee + serviceFee;
  const tax = Math.round(taxableBase * FEES.taxRate);
  const total = taxableBase + tax + args.tip;

  return { deliveryFee, serviceFee, discount, tax, total };
}

