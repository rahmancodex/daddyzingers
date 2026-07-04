import { Link } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------- Page & section headers ---------- */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl md:text-[34px] font-extrabold tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function SectionHeader({
  title,
  href,
  action,
  kicker,
}: {
  title: string;
  href?: string;
  action?: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        {kicker && (
          <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold mb-1">
            {kicker}
          </div>
        )}
        <h2 className="font-display text-xl md:text-2xl font-extrabold leading-tight">{title}</h2>
      </div>
      {action ??
        (href && (
          <Link
            to={href}
            className="text-sm text-primary hover:underline underline-offset-4 shrink-0"
          >
            View all
          </Link>
        ))}
    </div>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
  tone = "default",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta?: { label: string; to: string };
  tone?: "default" | "muted";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-dashed border-border p-10 md:p-14 text-center",
        tone === "default"
          ? "bg-gradient-to-br from-card via-card to-primary/5"
          : "bg-muted/20",
      )}
    >
      <div className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center ring-1 ring-primary/20">
          <Icon className="h-7 w-7" />
        </div>
        <div className="mt-5 font-display text-lg font-extrabold">{title}</div>
        <div className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">{body}</div>
        {cta && (
          <Link to={cta.to as never} className="inline-block mt-5">
            <Button size="sm" className="h-10 px-5 font-semibold">
              {cta.label}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

/* ---------- Loading skeleton ---------- */

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}

/* ---------- Status pill ---------- */

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  confirmed: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  preparing: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  out_for_delivery: "bg-primary/15 text-primary border-primary/30",
  delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const styles = STATUS_STYLES[key] ?? "bg-secondary text-foreground/80 border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        styles,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ---------- Progress ring ---------- */

export function ProgressRing({
  value,
  size = 132,
  stroke = 10,
  children,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border/60"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-primary transition-[stroke-dashoffset] duration-700 ease-out"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ---------- Loyalty helpers ---------- */

export const TIERS = [
  { code: "bronze", label: "Bronze", min: 0, next: 500, color: "text-amber-600", bg: "bg-amber-500/15" },
  { code: "silver", label: "Silver", min: 500, next: 1500, color: "text-slate-300", bg: "bg-slate-400/20" },
  { code: "gold", label: "Gold", min: 1500, next: 3500, color: "text-amber-400", bg: "bg-amber-400/15" },
  { code: "platinum", label: "Platinum", min: 3500, next: Infinity, color: "text-primary", bg: "bg-primary/15" },
] as const;

export function resolveTier(points: number) {
  const current = [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];
  const idx = TIERS.findIndex((t) => t.code === current.code);
  const next = TIERS[idx + 1];
  const span = next ? next.min - current.min : 1;
  const progress = next ? Math.round(((points - current.min) / span) * 100) : 100;
  return { current, next, progress: Math.max(0, Math.min(100, progress)) };
}
