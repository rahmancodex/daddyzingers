import { createFileRoute } from "@tanstack/react-router";
import { Banknote, CreditCard, Lock, Smartphone, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/payments")({
  head: () => ({ meta: [{ title: "Payments — Daddy Zinger" }] }),
  component: PaymentsPage,
});

type Method = {
  id: string;
  label: string;
  body: string;
  icon: typeof Banknote;
  ready: boolean;
  accent: string;
};

const METHODS: Method[] = [
  {
    id: "cod",
    label: "Cash on delivery",
    body: "Pay in cash when your food arrives at the door.",
    icon: Banknote,
    ready: true,
    accent: "from-emerald-500/20 to-transparent",
  },
  {
    id: "jazzcash",
    label: "JazzCash",
    body: "Instant mobile wallet checkout.",
    icon: Smartphone,
    ready: true,
    accent: "from-amber-500/20 to-transparent",
  },
  {
    id: "easypaisa",
    label: "EasyPaisa",
    body: "Fast, secure and everywhere.",
    icon: Wallet,
    ready: true,
    accent: "from-sky-500/20 to-transparent",
  },
  {
    id: "card",
    label: "Credit / debit card",
    body: "Visa & Mastercard support.",
    icon: CreditCard,
    ready: false,
    accent: "from-primary/20 to-transparent",
  },
];

function PaymentsPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Payment methods"
        subtitle="Choose how you pay at checkout. Saved cards are coming soon."
      />

      <SectionHeader title="Available at checkout" kicker="Live" />
      <div className="grid sm:grid-cols-2 gap-4">
        {METHODS.map((m) => (
          <div
            key={m.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-5 md:p-6 transition-all",
              m.ready
                ? "border-border bg-card hover:border-primary/40 hover:shadow-[var(--shadow-2)]"
                : "border-dashed border-border bg-card/50",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl bg-gradient-to-br",
                m.accent,
              )}
            />
            <div className="relative flex items-start gap-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-xl grid place-items-center shrink-0",
                  m.ready ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                <m.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold">{m.label}</div>
                  {m.ready ? (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="outline">Coming soon</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{m.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-border p-5 md:p-6 flex items-start gap-3 text-sm text-muted-foreground bg-secondary/30">
        <Lock className="h-4 w-4 text-primary mt-0.5" />
        <div>
          Saved cards, one-tap wallet linking and Apple Pay are on the roadmap. All payments are
          processed with bank-grade encryption.
        </div>
      </div>
    </div>
  );
}
