import { createFileRoute } from "@tanstack/react-router";
import { Gift, Sparkles, Ticket } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./dashboard.orders";

export const Route = createFileRoute("/_authenticated/dashboard/rewards")({
  head: () => ({ meta: [{ title: "Rewards — Daddy Zinger" }] }),
  component: RewardsPage,
});

const COUPONS = [
  { code: "ZINGER10", body: "10% off any Zinger order over PKR 1,500", badge: "New" },
  { code: "FAMILYFEAST", body: "Free drink on any Family Platter", badge: "Popular" },
];

function RewardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Rewards & coupons" subtitle="The more you eat, the more you earn." />

      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 md:p-8">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-primary font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Zinger tier
        </div>
        <div className="mt-2 font-display text-3xl font-extrabold">2 / 5 orders</div>
        <p className="text-muted-foreground mt-1">3 more orders unlocks a free Zinger Burger.</p>
        <Progress value={40} className="mt-4" />
      </div>

      <section>
        <h2 className="font-display text-xl font-extrabold mb-3">Your coupons</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {COUPONS.map((c) => (
            <div
              key={c.code}
              className="relative rounded-2xl border border-dashed border-primary/40 bg-card p-5 overflow-hidden"
            >
              <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background border border-border" />
              <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background border border-border" />
              <div className="flex items-start justify-between gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <Ticket className="h-5 w-5" />
                </div>
                <Badge className="bg-primary/15 text-primary border-primary/30">{c.badge}</Badge>
              </div>
              <div className="mt-3 font-display text-2xl font-extrabold tracking-tight">
                {c.code}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <Gift className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm text-muted-foreground">
          Refer a friend and earn a free Loaded Fries on their first order. Referral codes launching soon.
        </div>
      </div>
    </div>
  );
}
