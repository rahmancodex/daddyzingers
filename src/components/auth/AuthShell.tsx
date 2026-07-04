import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  headline?: string;
  subheadline?: string;
  footer?: ReactNode;
};

/**
 * Shared brand + card shell for every auth surface (sign-in, sign-up,
 * phone / OTP, welcome). Keeps spacing, glow, and logo identical across
 * the flow so the experience feels like one continuous product.
 */
export function AuthShell({ children, headline, subheadline, footer }: Props) {
  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-accent/20 blur-3xl" />

      <div className="relative z-10 container-dz py-6 md:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="mt-6 md:mt-8 grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          {/* Left brand panel — desktop only */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
            className="hidden lg:block"
          >
            <div className="inline-flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-brand-black grid place-items-center shadow-[var(--shadow-glow)]">
                <Logo className="h-10 w-10 object-contain" />
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold">Daddy Zinger</div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  Choice of the family
                </div>
              </div>
            </div>
            <h1 className="mt-8 font-display text-5xl xl:text-6xl font-extrabold leading-[1.02] tracking-tight">
              {headline ?? (
                <>
                  Welcome to the <span className="text-primary">family</span>.
                </>
              )}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md">
              {subheadline ??
                "Save favorites, track orders, unlock rewards and reorder in one tap. Your table's ready."}
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "18-minute delivery across the city",
                "House-sauced. Hand-breaded. Always fresh.",
                "JazzCash, EasyPaisa and cash on delivery",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-foreground/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-10 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Secured with 256-bit encryption.
            </div>
          </motion.div>

          {/* Right auth card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.25, 1, 0.5, 1] }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-5 sm:p-6 md:p-8 shadow-[var(--shadow-4)]">
              <div className="lg:hidden mb-5 flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-brand-black grid place-items-center">
                  <Logo className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <div className="font-display text-lg font-extrabold leading-none">
                    Daddy Zinger
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground mt-1">
                    Choice of the family
                  </div>
                </div>
              </div>
              {children}
            </div>
            {footer ? (
              <div className="mt-5 text-center text-xs text-muted-foreground">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
