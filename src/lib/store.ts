import { useSyncExternalStore } from "react";
import { CUSTOMIZATIONS, MEAL_UPGRADES, MENU, type MenuItem } from "./menu-data";

/* ============================================================ */
/*  A tiny global store with localStorage persistence.          */
/*  No external deps — powered by useSyncExternalStore.         */
/* ============================================================ */

type CustomEntry = { id: string; label: string; price: number };

export type CartLine = {
  /** Stable key based on item + customizations, so duplicates merge. */
  key: string;
  itemId: string;
  name: string;
  image: string;
  unitPrice: number; // includes add-ons per unit
  basePrice: number;
  qty: number;
  notes: string;
  customizations: CustomEntry[];
  upgrades: CustomEntry[];
};

type State = {
  cart: CartLine[];
  favorites: string[];
  drawerItemId: string | null;
  drawerOpen: boolean;
  searchOpen: boolean;
};

const LS_KEY = "dz_store_v1";

function loadInitial(): State {
  if (typeof window === "undefined")
    return { cart: [], favorites: [], drawerItemId: null, drawerOpen: false, searchOpen: false };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      cart: parsed.cart ?? [],
      favorites: parsed.favorites ?? [],
      drawerItemId: null,
      drawerOpen: false,
      searchOpen: false,
    };
  } catch {
    return { cart: [], favorites: [], drawerItemId: null, drawerOpen: false, searchOpen: false };
  }
}

let state: State = loadInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ cart: state.cart, favorites: state.favorites }),
    );
  } catch {
    /* ignore */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ---------- Selectors (with useSyncExternalStore) ---------- */

export function useCart() {
  return useSyncExternalStore(
    subscribe,
    () => state.cart,
    () => [] as CartLine[],
  );
}

export function useCartCount() {
  return useSyncExternalStore(
    subscribe,
    () => state.cart.reduce((n, l) => n + l.qty, 0),
    () => 0,
  );
}

export function useCartTotal() {
  return useSyncExternalStore(
    subscribe,
    () => state.cart.reduce((s, l) => s + l.unitPrice * l.qty, 0),
    () => 0,
  );
}

export function useFavorites() {
  return useSyncExternalStore(
    subscribe,
    () => state.favorites,
    () => [] as string[],
  );
}

export function useIsFavorite(id: string) {
  return useSyncExternalStore(
    subscribe,
    () => state.favorites.includes(id),
    () => false,
  );
}

export function useDrawer() {
  return useSyncExternalStore(
    subscribe,
    () => ({ id: state.drawerItemId, open: state.drawerOpen }),
    () => ({ id: null as string | null, open: false }),
  );
}

export function useSearchOpen() {
  return useSyncExternalStore(
    subscribe,
    () => state.searchOpen,
    () => false,
  );
}

/* ---------- Actions ---------- */

export const cartActions = {
  add(args: {
    item: MenuItem;
    qty: number;
    customizationIds: string[];
    upgradeIds: string[];
    notes: string;
  }) {
    const customizations: CustomEntry[] = CUSTOMIZATIONS.filter((c) =>
      args.customizationIds.includes(c.id),
    ).map((c) => ({ id: c.id, label: c.label, price: c.price }));
    const upgrades: CustomEntry[] = MEAL_UPGRADES.filter((u) =>
      args.upgradeIds.includes(u.id),
    ).map((u) => ({ id: u.id, label: u.label, price: u.price }));

    const addonsTotal =
      customizations.reduce((s, c) => s + c.price, 0) +
      upgrades.reduce((s, u) => s + u.price, 0);
    const unitPrice = args.item.price + addonsTotal;

    const keySrc = [
      args.item.id,
      customizations
        .map((c) => c.id)
        .sort()
        .join("|"),
      upgrades
        .map((u) => u.id)
        .sort()
        .join("|"),
      args.notes.trim(),
    ].join("::");

    setState((s) => {
      const existing = s.cart.find((l) => l.key === keySrc);
      const cart = existing
        ? s.cart.map((l) => (l.key === keySrc ? { ...l, qty: l.qty + args.qty } : l))
        : [
            ...s.cart,
            {
              key: keySrc,
              itemId: args.item.id,
              name: args.item.name,
              image: args.item.image,
              basePrice: args.item.price,
              unitPrice,
              qty: args.qty,
              notes: args.notes,
              customizations,
              upgrades,
            } satisfies CartLine,
          ];
      return { cart };
    });
  },

  updateQty(key: string, qty: number) {
    setState((s) => ({
      cart:
        qty <= 0
          ? s.cart.filter((l) => l.key !== key)
          : s.cart.map((l) => (l.key === key ? { ...l, qty } : l)),
    }));
  },

  remove(key: string) {
    setState((s) => ({ cart: s.cart.filter((l) => l.key !== key) }));
  },

  clear() {
    setState({ cart: [] });
  },
};

export const favoriteActions = {
  toggle(id: string): boolean {
    let added = false;
    setState((s) => {
      if (s.favorites.includes(id)) {
        return { favorites: s.favorites.filter((f) => f !== id) };
      }
      added = true;
      return { favorites: [...s.favorites, id] };
    });
    return added;
  },
};

export const drawerActions = {
  openById(id: string) {
    if (!MENU.some((m) => m.id === id)) return;
    setState({ drawerItemId: id, drawerOpen: true });
  },
  open(item: MenuItem) {
    setState({ drawerItemId: item.id, drawerOpen: true });
  },
  swap(item: MenuItem) {
    setState({ drawerItemId: item.id });
  },
  close() {
    setState({ drawerOpen: false });
  },
};

export const searchActions = {
  open() {
    setState({ searchOpen: true });
  },
  close() {
    setState({ searchOpen: false });
  },
  toggle() {
    setState((s) => ({ searchOpen: !s.searchOpen }));
  },
};

/* ---------- Helpers ---------- */

export function getMenuItem(id: string): MenuItem | undefined {
  return MENU.find((m) => m.id === id);
}
