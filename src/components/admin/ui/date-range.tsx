import * as React from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  differenceInCalendarDays,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "custom";

export type AdminDateRange = {
  preset: DateRangePreset;
  from: Date;
  to: Date;
};

export const PRESET_LABEL: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  this_month: "This month",
  last_month: "Last month",
  custom: "Custom range",
};

export function resolvePreset(preset: Exclude<DateRangePreset, "custom">): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last_7_days":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "last_30_days":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
  }
}

const DEFAULT: AdminDateRange = (() => {
  const r = resolvePreset("today");
  return { preset: "today", from: r.from, to: r.to };
})();

const Ctx = React.createContext<{
  range: AdminDateRange;
  setRange: (r: AdminDateRange) => void;
} | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = React.useState<AdminDateRange>(DEFAULT);
  const value = React.useMemo(() => ({ range, setRange }), [range]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDateRange() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useDateRange must be used inside DateRangeProvider");
  return ctx;
}

/** Number of days in range (min 1). Useful for weekly/monthly bucketing. */
export function useRangeDays() {
  const { range } = useDateRange();
  return Math.max(1, differenceInCalendarDays(range.to, range.from) + 1);
}

const PRESETS: Array<Exclude<DateRangePreset, "custom">> = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_month",
  "last_month",
];

export function DateRangePicker({ className }: { className?: string }) {
  const { range, setRange } = useDateRange();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"presets" | "custom">(
    range.preset === "custom" ? "custom" : "presets",
  );
  const [draft, setDraft] = React.useState<{ from?: Date; to?: Date }>({
    from: range.from,
    to: range.to,
  });

  const label = React.useMemo(() => {
    if (range.preset !== "custom") return PRESET_LABEL[range.preset];
    return `${format(range.from, "d MMM")} – ${format(range.to, "d MMM yyyy")}`;
  }, [range]);

  const pickPreset = (p: Exclude<DateRangePreset, "custom">) => {
    const r = resolvePreset(p);
    setRange({ preset: p, from: r.from, to: r.to });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!draft.from || !draft.to) return;
    setRange({
      preset: "custom",
      from: startOfDay(draft.from),
      to: endOfDay(draft.to),
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 rounded-lg border-border/70 bg-background px-3 text-sm font-medium",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="tabular-nums">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto rounded-xl p-0" sideOffset={8}>
        <div className="flex">
          <div className="flex w-44 flex-col gap-0.5 border-r border-border/60 p-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => pickPreset(p)}
                className={cn(
                  "flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  range.preset === p && "bg-primary/10 text-foreground font-semibold",
                )}
              >
                {PRESET_LABEL[p]}
              </button>
            ))}
            <button
              onClick={() => setMode("custom")}
              className={cn(
                "mt-1 flex items-center justify-between rounded-md border-t border-border/60 px-2.5 py-1.5 pt-2 text-left text-sm transition-colors hover:bg-accent",
                mode === "custom" && "text-foreground font-semibold",
              )}
            >
              Custom range…
            </button>
          </div>
          {mode === "custom" && (
            <div className="p-3">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={{ from: draft.from, to: draft.to }}
                onSelect={(s) => setDraft({ from: s?.from, to: s?.to })}
                className={cn("pointer-events-auto")}
              />
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/60 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="h-8 rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={applyCustom}
                  disabled={!draft.from || !draft.to}
                  className="h-8 rounded-md"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
