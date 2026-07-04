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

let currentId: Branch["id"] = load();
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LS_KEY, currentId);
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

export const branchActions = {
  set(id: Branch["id"]) {
    currentId = id;
    emit();
  },
};
