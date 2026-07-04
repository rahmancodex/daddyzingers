import { createFileRoute } from "@tanstack/react-router";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./dashboard.orders";

export const Route = createFileRoute("/_authenticated/dashboard/payments")({
  head: () => ({ meta: [{ title: "Payments — Daddy Zinger" }] }),
  component: PaymentsPage,
});

const METHODS = [
  {
    id: "cod",
    label: "Cash on delivery",
    body: "Pay in cash when your food arrives.",
    icon: Banknote,
    ready: true,
  },
  {
    id: "jazzcash",
    label: "JazzCash",
    body: "Instant mobile wallet checkout.",
    icon: Smartphone,
    ready: true,
  },
  {
    id: "easypaisa",
    label: "EasyPaisa",
    body: "Fast, secure and everywhere.",
    icon: Smartphone,
    ready: true,
  },
  {
    id: "card",
    label: "Credit / debit card",
    body: "Visa & Mastercard support.",
    icon: CreditCard,
    ready: false,
  },
];

function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Payment methods" subtitle="Choose how you pay at checkout." />
      <div className="grid sm:grid-cols-2 gap-4">
        {METHODS.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border bg-card p-5 flex gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <m.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{m.label}</div>
                {m.ready ? (
                  <Badge className="bg-primary/15 text-primary border-primary/30">Available</Badge>
                ) : (
                  <Badge variant="outline">Coming soon</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{m.body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Saved cards and one-tap wallet linking are on the roadmap.
      </p>
    </div>
  );
}
