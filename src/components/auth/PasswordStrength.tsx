import { Check, X } from "lucide-react";
import { scorePassword } from "@/lib/auth-schemas";
import { cn } from "@/lib/utils";

const LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"] as const;

export function PasswordStrength({ password }: { password: string }) {
  const { checks, score } = scorePassword(password);
  const label = LABELS[Math.min(score, LABELS.length - 1)];
  const barColor =
    score <= 1
      ? "bg-destructive"
      : score === 2
      ? "bg-amber-500"
      : score === 3
      ? "bg-amber-400"
      : score === 4
      ? "bg-emerald-500"
      : "bg-primary";

  const rules: Array<[keyof typeof checks, string]> = [
    ["length", "8+ characters"],
    ["upper", "Uppercase letter"],
    ["lower", "Lowercase letter"],
    ["number", "Number"],
    ["symbol", "Symbol (recommended)"],
  ];

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < score ? barColor : "bg-border/60",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Password strength</span>
        <span className={cn(score >= 4 ? "text-emerald-500" : "text-foreground/80")}>{label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-y-1 gap-x-3 text-[11px] text-muted-foreground pt-1">
        {rules.map(([key, text]) => {
          const ok = checks[key];
          return (
            <li key={key} className="flex items-center gap-1.5">
              {ok ? (
                <Check className="h-3 w-3 text-emerald-500" aria-hidden />
              ) : (
                <X className="h-3 w-3 text-muted-foreground/60" aria-hidden />
              )}
              <span className={ok ? "text-foreground/80" : ""}>{text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
