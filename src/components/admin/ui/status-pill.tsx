import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  primary: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  success:
    "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400",
  warning:
    "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/20 dark:text-sky-400",
  destructive: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
  neutral: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

const DOT_CLASS: Record<StatusTone, string> = {
  primary: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground/50",
};

export function StatusPill({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[tone])} />}
      {children}
    </span>
  );
}

export { TONE_CLASS as STATUS_TONE_CLASS, DOT_CLASS as STATUS_DOT_CLASS };
