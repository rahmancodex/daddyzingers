/** Utility helpers shared across the admin customers UI. */

export function formatPKR(n: number): string {
  return `Rs ${Math.max(0, Math.round(n)).toLocaleString("en-PK")}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

export const TIER_STYLE: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  silver: "bg-slate-200 text-slate-900 dark:bg-slate-500/20 dark:text-slate-100",
  gold: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-100",
  platinum: "bg-primary/20 text-foreground",
};

export const PASS_STYLE: Record<string, string> = {
  active: "bg-success/15 text-success-foreground",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
  none: "bg-muted text-muted-foreground",
};

export function initialsFrom(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
