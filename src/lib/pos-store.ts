import { useSyncExternalStore } from "react";
import type { MenuItem, OptionChoice } from "./menu";

/* ============================================================ */
/*  POS-only cart store — kept isolated from the customer cart. */
/*  Persists in localStorage under dz_pos_v1. Supports          */
/*  suspend/resume ("parked" carts) so a cashier can hold an    */
/*  order and start another.                                    */
/* ============================================================ */

export type POSChoice = { id: string; label: string; price: number };

export type POSLine = {
  key: string;
  itemId: string;
  name: string;
  image: string;
  basePrice: number;
  unitPrice: number;
  qty: number;
  notes: string;
  sizeId: string | null;
  sizeLabel: string | null;
  customizations: POSChoice[];
  upgrades: POSChoice[];
};

export type POSCustomer = {
  /** null = walk-in (no profile linkage) */
  id: string | null;
  name: string;
  phone: string;
  email: string | null;
};

export type POSSuspended = {
  id: string;
  createdAt: string;
  label: string;
  customer: POSCustomer;
  cart: POSLine[];
};

export type POSState = {
  cart: POSLine[];
  customer: POSCustomer;
  suspended: POSSuspended[];
};

const LS_KEY = "dz_pos_v1";
const WALK_IN: POSCustomer = { id: null, name: "", phone: "", email: null };
const DEFAULT: POSState = { cart: [], customer: WALK_IN, suspended: [] };

function load(): POSState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<POSState>) };
  } catch {
    return DEFAULT;
  }
}

let state: POSState = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
function emit() {
  persist();
  listeners.forEach((l) => l());
}
function set(patch: Partial<POSState> | ((s: POSState) => Partial<POSState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  emit();
}

/* -------- selectors -------- */
export function usePOSCart() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => state.cart,
    () => DEFAULT.cart,
  );
}
export function usePOSCustomer() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => state.customer,
    () => DEFAULT.customer,
  );
}
export function usePOSSuspended() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => state.suspended,
    () => DEFAULT.suspended,
  );
}
export function usePOSSubtotal() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => state.cart.reduce((s, l) => s + l.unitPrice * l.qty, 0),
    () => 0,
  );
}

/* -------- helpers -------- */
export function buildLineKey(args: {
  itemId: string;
  basePrice: number;
  sizeId: string | null;
  customizations: POSChoice[];
  upgrades: POSChoice[];
  notes: string;
}) {
  return [
    args.itemId,
    args.basePrice,
    args.sizeId ?? "",
    args.customizations.map((c) => c.id).sort().join("|"),
    args.upgrades.map((u) => u.id).sort().join("|"),
    args.notes.trim(),
  ].join("::");
}

export function choiceFromOption(c: OptionChoice): POSChoice {
  return { id: c.id, label: c.label, price: c.priceDelta };
}

/* -------- actions -------- */
export const posActions = {
  add(args: {
    item: MenuItem;
    qty: number;
    sizeId: string | null;
    sizeLabel: string | null;
    basePriceOverride?: number;
    customizations: POSChoice[];
    upgrades: POSChoice[];
    notes: string;
  }) {
    const base = args.basePriceOverride ?? args.item.price;
    const addons =
      args.customizations.reduce((s, c) => s + c.price, 0) +
      args.upgrades.reduce((s, c) => s + c.price, 0);
    const unitPrice = base + addons;
    const key = buildLineKey({
      itemId: args.item.id,
      basePrice: base,
      sizeId: args.sizeId,
      customizations: args.customizations,
      upgrades: args.upgrades,
      notes: args.notes,
    });
    set((s) => {
      const existing = s.cart.find((l) => l.key === key);
      const cart = existing
        ? s.cart.map((l) => (l.key === key ? { ...l, qty: l.qty + args.qty } : l))
        : [
            ...s.cart,
            {
              key,
              itemId: args.item.id,
              name: args.item.name,
              image: args.item.image,
              basePrice: base,
              unitPrice,
              qty: args.qty,
              notes: args.notes,
              sizeId: args.sizeId,
              sizeLabel: args.sizeLabel,
              customizations: args.customizations,
              upgrades: args.upgrades,
            } satisfies POSLine,
          ];
      return { cart };
    });
  },
  updateQty(key: string, qty: number) {
    set((s) => ({
      cart:
        qty <= 0
          ? s.cart.filter((l) => l.key !== key)
          : s.cart.map((l) => (l.key === key ? { ...l, qty } : l)),
    }));
  },
  remove(key: string) {
    set((s) => ({ cart: s.cart.filter((l) => l.key !== key) }));
  },
  clear() {
    set({ cart: [] });
  },
  setCustomer(c: POSCustomer) {
    set({ customer: c });
  },
  clearCustomer() {
    set({ customer: WALK_IN });
  },
  suspend(label?: string) {
    if (state.cart.length === 0) return;
    const entry: POSSuspended = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      label: label?.trim() || state.customer.name.trim() || "Held ticket",
      customer: state.customer,
      cart: state.cart,
    };
    set((s) => ({
      cart: [],
      customer: WALK_IN,
      suspended: [entry, ...s.suspended].slice(0, 20),
    }));
  },
  resume(id: string) {
    const entry = state.suspended.find((t) => t.id === id);
    if (!entry) return;
    set((s) => ({
      cart: entry.cart,
      customer: entry.customer,
      suspended: s.suspended.filter((t) => t.id !== id),
    }));
  },
  dropSuspended(id: string) {
    set((s) => ({ suspended: s.suspended.filter((t) => t.id !== id) }));
  },
  resetAll() {
    set({ cart: [], customer: WALK_IN });
  },
};
