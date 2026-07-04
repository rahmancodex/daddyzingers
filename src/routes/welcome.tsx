import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift, Trophy, Crown, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welcome to Daddy Zinger" },
      {
        name: "description",
        content:
          "You're in! Meet your rewards, points, exclusive offers and the upcoming Daddy Pass.",
      },
    ],
  }),
  component: WelcomePage,
});

const STEPS = [
  {
    icon: Sparkles,
    tag: "Welcome",
    title: (name: string) => `Welcome to the family${name ? `, ${name}` : ""}.`,
    body: "You just unlocked faster checkout, saved addresses, order tracking and exclusive member drops. Let's show you what's inside.",
  },
  {
    icon: Trophy,
    tag: "Rewards & Points",
    title: () => "Earn points on every order.",
    body: "Every rupee spent stacks Zinger Points. Redeem for free meals, sides, drinks — even birthday treats. Points appear on your dashboard automatically.",
  },
  {
    icon: Crown,
    tag: "Coming Soon",
    title: () => "Daddy Pass — the family club.",
    body: "Unlimited free delivery, 2× points, priority promotions and a premium birthday gift. Launching soon inside your dashboard.",
  },
] as const;

function WelcomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
    const fromMeta = meta?.full_name ?? meta?.name;
    if (fromMeta) {
      setFirstName(fromMeta.split(" ")[0]);
      return;
    }
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFirstName(data.full_name.split(" ")[0]);
      });
  }, [user]);

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AuthShell
      headline={<>Your table is <span className="text-primary">ready</span>.</>}
      subheadline="A quick tour of what your Daddy Zinger account unlocks."
    >
      <div className="min-h-[420px] flex flex-col">
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
              aria-hidden
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            className="flex-1"
          >
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
              <Icon className="h-7 w-7" />
            </div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              {s.tag}
            </div>
            <h2 className="mt-2 font-display text-2xl md:text-3xl font-extrabold leading-tight">
              {s.title(firstName)}
            </h2>
            <p className="mt-3 text-sm md:text-base text-muted-foreground">{s.body}</p>

            {step === 1 && (
              <ul className="mt-5 space-y-2 text-sm">
                {[
                  "1 point per PKR 10 spent",
                  "Birthday bonus: 200 points",
                  "Referral bonus: 100 points per friend",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-foreground/85">
                    <Check className="h-4 w-4 text-emerald-500" /> {t}
                  </li>
                ))}
              </ul>
            )}

            {step === 2 && (
              <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Gift className="h-4 w-4" /> Daddy Pass · Coming soon
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  We'll notify you the day it opens. No card required today.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            Skip
          </Button>
          <Button
            type="button"
            className="h-11 px-6 bg-primary text-primary-foreground font-semibold hover:bg-[var(--color-primary-hover)]"
            onClick={() => {
              if (isLast) navigate({ to: "/dashboard" });
              else setStep((s) => s + 1);
            }}
          >
            {isLast ? "Go to my dashboard" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
