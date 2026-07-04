import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, Check, Copy, Crown, Gift, Sparkles, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  ProgressRing,
  resolveTier,
  SectionHeader,
  TIERS,
} from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/rewards")({
  head: () => ({ meta: [{ title: "Rewards — Daddy Zinger" }] }),
  component: RewardsPage,
});

const COUPONS = [
  { code: "ZINGER10", body: "10% off any Zinger order over PKR 1,500", badge: "New" },
  { code: "FAMILYFEAST", body: "Free drink on any Family Platter", badge: "Popular" },
];

const MILESTONES = [
  { points: 200, reward: "Free regular drink", unlocked: 0 },
  { points: 500, reward: "Free loaded fries", unlocked: 0 },
  { points: 1200, reward: "Free Zinger burger", unlocked: 0 },
  { points: 2500, reward: "Free family platter", unlocked: 0 },
];

type Profile = {
  reward_points: number | null;
  loyalty_tier: string | null;
  daddy_pass_status: string | null;
  referral_code: string | null;
  referral_count: number | null;
};

function RewardsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("reward_points, loyalty_tier, daddy_pass_status, referral_code, referral_count")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile((data as Profile | null) ?? null));
  }, [user]);

  const points = profile?.reward_points ?? 0;
  const { current: tier, next, progress } = resolveTier(points);
  const referralCode = profile?.referral_code ?? "—";
  const referralCount = profile?.referral_count ?? 0;

  return (
    <div className="space-y-8 md:space-y-10">
      <PageHeader
        title="Rewards"
        subtitle="Every bite earns points. Every point unlocks something delicious."
      />

      {/* Hero — points + tier progress */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 md:p-9"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
          <ProgressRing value={progress} size={168} stroke={12}>
            <div className="text-center leading-none">
              <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Points
              </div>
              <div className="font-display text-4xl font-extrabold mt-1">
                {points.toLocaleString()}
              </div>
            </div>
          </ProgressRing>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.24em] text-primary font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Current tier
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-xs uppercase tracking-wider",
                  tier.bg,
                  tier.color,
                )}
              >
                <Crown className="h-3.5 w-3.5" /> {tier.label}
              </div>
              {next && (
                <span className="text-xs text-muted-foreground">
                  Next: <span className="font-semibold text-foreground">{next.label}</span>
                </span>
              )}
            </div>
            <div className="mt-4 font-display text-2xl md:text-3xl font-extrabold leading-tight">
              {next
                ? `${(next.min - points).toLocaleString()} points to ${next.label}.`
                : "You've hit the top tier. Legend."}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
              Earn 1 point per PKR 10 spent. Birthday bonus, referral bonus and 2× on Daddy Pass.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Tier ladder */}
      <section>
        <SectionHeader title="Your journey" kicker="Tiers" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TIERS.map((t) => {
            const isCurrent = t.code === tier.code;
            return (
              <div
                key={t.code}
                className={cn(
                  "relative rounded-2xl border p-4 transition-all",
                  isCurrent
                    ? "border-primary/50 bg-gradient-to-br from-primary/10 to-transparent shadow-[var(--shadow-2)]"
                    : "border-border bg-card",
                )}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl grid place-items-center",
                    t.bg,
                    t.color,
                  )}
                >
                  <Crown className="h-4 w-4" />
                </div>
                <div className="mt-3 font-display font-extrabold">{t.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {t.min.toLocaleString()}
                  {t.next !== Infinity ? `–${t.next.toLocaleString()}` : "+"} pts
                </div>
                {isCurrent && (
                  <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                    You
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Milestones */}
      <section>
        <SectionHeader title="Reward milestones" kicker="Redeem" />
        <ul className="grid sm:grid-cols-2 gap-3">
          {MILESTONES.map((m) => {
            const unlocked = points >= m.points;
            const pct = Math.min(100, Math.round((points / m.points) * 100));
            return (
              <li
                key={m.points}
                className={cn(
                  "rounded-2xl border p-4 md:p-5 flex gap-4 items-center transition-all",
                  unlocked
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-card",
                )}
              >
                <div
                  className={cn(
                    "h-11 w-11 rounded-xl grid place-items-center shrink-0",
                    unlocked
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {unlocked ? <Check className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{m.reward}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.points.toLocaleString()} pts
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-border/60 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        unlocked ? "bg-emerald-500" : "bg-primary",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Coupons + Referral */}
      <section className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionHeader title="Your coupons" kicker="Save" />
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
        </div>

        {/* Referral */}
        <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 md:p-6">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-primary font-bold">
            <Users className="h-3 w-3" /> Referrals
          </div>
          <div className="mt-2 font-display text-xl font-extrabold">Bring the family.</div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Share your code — you both get bonus points on their first order.
          </p>
          <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Your code
              </div>
              <div className="font-display font-extrabold text-lg tracking-wider truncate">
                {referralCode}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={!profile?.referral_code}
              onClick={async () => {
                if (!profile?.referral_code) return;
                try {
                  await navigator.clipboard.writeText(profile.referral_code);
                  setCopied(true);
                  toast.success("Code copied");
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  toast.error("Couldn't copy");
                }
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{referralCount}</span> friends joined
          </div>
        </div>
      </section>

      {/* Daddy Pass — coming soon */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-primary font-bold">
              <Crown className="h-3.5 w-3.5" /> Daddy Pass
            </div>
            <div className="mt-2 font-display text-2xl md:text-3xl font-extrabold leading-tight">
              The family club. Coming soon.
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-foreground/85">
              {[
                "Unlimited free delivery",
                "2× reward points on every order",
                "Exclusive member-only discounts",
                "Priority promotions & early access",
                "Premium birthday gift",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" /> {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <Badge className="self-start md:self-end bg-primary/15 text-primary border-primary/30">
              Coming soon
            </Badge>
            <Button variant="outline" disabled className="w-full md:w-auto">
              <Bell className="h-4 w-4" /> Notify me when it launches
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
