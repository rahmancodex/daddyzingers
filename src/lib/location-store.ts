import { useSyncExternalStore } from "react";

export type Branch = {
  id: "lodhran" | "bahawalpur";
  name: string;
  area: string;
  address: string;
  phone: string;
  etaMin: number;
  etaMax: number;
};

export const BRANCHES: Branch[] = [
  {
    id: "lodhran",
    name: "Lodhran Branch",
    area: "Old Hospital Chowk",
    address: "Near Ghori House, Lodhran",
    phone: "0339-3424042",
    etaMin: 22,
    etaMax: 32,
  },
  {
    id: "bahawalpur",
    name: "Bahawalpur Branch",
    area: "Fateh Chowk",
    address: "Model Town B, Bahawalpur",
    phone: "0339-3424042",
    etaMin: 25,
    etaMax: 40,
  },
];

const LS_KEY = "dz_branch_v1";
const LS_METHOD = "dz_order_method_v1";

export type OrderMethod = "delivery" | "pickup";

function load(): Branch["id"] {
  if (typeof window === "undefined") return "lodhran";
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v && BRANCHES.some((b) => b.id === v)) return v as Branch["id"];
  } catch {
    /* ignore */
  }
  return "lodhran";
}

function loadMethod(): OrderMethod {
  if (typeof window === "undefined") return "delivery";
  try {
    const v = localStorage.getItem(LS_METHOD);
    if (v === "delivery" || v === "pickup") return v;
  } catch {
    /* ignore */
  }
  return "delivery";
}

let currentId: Branch["id"] = load();
let currentMethod: OrderMethod = loadMethod();
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LS_KEY, currentId);
      localStorage.setItem(LS_METHOD, currentMethod);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

export function useBranch(): Branch {
  const id = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentId,
    () => "lodhran" as Branch["id"],
  );
  return BRANCHES.find((b) => b.id === id) ?? BRANCHES[0];
}

export function useOrderMethod(): OrderMethod {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentMethod,
    () => "delivery" as OrderMethod,
  );
}

export const branchActions = {
  set(id: Branch["id"]) {
    currentId = id;
    emit();
  },
  setMethod(m: OrderMethod) {
    currentMethod = m;
    emit();
  },
};
