import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Daddy Zinger" },
      { name: "description", content: "Sign in or create your Daddy Zinger account to save addresses, track orders and earn rewards." },
    ],
  }),
  component: AuthPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <p className="text-muted-foreground">Something went wrong: {error.message}</p>
    </div>
  ),
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(2, "Enter your name").max(80);

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.2s2.69-6.2 6-6.2c1.88 0 3.15.8 3.87 1.48l2.64-2.55C16.9 3.16 14.68 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 12S6.9 21.8 12 21.8c6.94 0 9.2-4.86 9.2-9.3 0-.62-.07-1.1-.15-1.5H12z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // If already signed in, punt to dashboard.
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-accent/20 blur-3xl" />

      <div className="relative z-10 container-dz py-8 md:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="mt-8 grid lg:grid-cols-2 gap-10 items-center">
          {/* Left brand panel */}
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
              Welcome to the <span className="text-primary">family</span>.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md">
              Save favorites, track orders, unlock rewards and reorder in one tap. Your table's ready.
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
          </motion.div>

          {/* Right card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.25, 1, 0.5, 1] }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-6 md:p-8 shadow-[var(--shadow-4)]">
              <div className="lg:hidden mb-6 flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-brand-black grid place-items-center">
                  <Logo className="h-8 w-8 object-contain" />
                </div>
                <div className="font-display text-lg font-extrabold">Daddy Zinger</div>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
                <TabsList className="grid grid-cols-2 w-full mb-6">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <GoogleButton />

                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span>or continue with email</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <TabsContent value="signin">
                  <SignInForm onSuccess={() => router.navigate({ to: "/dashboard" })} />
                </TabsContent>
                <TabsContent value="signup">
                  <SignUpForm onSwitch={() => setTab("signin")} />
                </TabsContent>
              </Tabs>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our Terms & Privacy.{" "}
              <Link to="/" className="underline underline-offset-4 hover:text-foreground">
                Continue as guest
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11 gap-2 font-semibold"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: `${window.location.origin}/auth/callback`,
        });
        if (result.error) {
          toast.error("Couldn't sign in with Google", { description: result.error.message });
          setLoading(false);
          return;
        }
        if (result.redirected) return; // browser will navigate
        window.location.href = "/dashboard";
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </Button>
  );
}

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const em = emailSchema.safeParse(email);
        const pw = passwordSchema.safeParse(password);
        if (!em.success) return toast.error(em.error.issues[0].message);
        if (!pw.success) return toast.error(pw.error.issues[0].message);
        setSubmitting(true);
        const { error } = await supabase.auth.signInWithPassword({
          email: em.data,
          password: pw.data,
        });
        setSubmitting(false);
        if (error) return toast.error("Sign-in failed", { description: error.message });
        toast.success("Welcome back!");
        onSuccess();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="si-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="si-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 h-11"
            placeholder="you@email.com"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="si-password">Password</Label>
          <ForgotPasswordLink email={email} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="si-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9 h-11"
            placeholder="••••••••"
            required
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-[var(--color-primary-hover)]"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const nm = nameSchema.safeParse(name);
        const em = emailSchema.safeParse(email);
        const pw = passwordSchema.safeParse(password);
        if (!nm.success) return toast.error(nm.error.issues[0].message);
        if (!em.success) return toast.error(em.error.issues[0].message);
        if (!pw.success) return toast.error(pw.error.issues[0].message);
        setSubmitting(true);
        const { data, error } = await supabase.auth.signUp({
          email: em.data,
          password: pw.data,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: nm.data },
          },
        });
        setSubmitting(false);
        if (error) return toast.error("Sign-up failed", { description: error.message });
        if (data.session) {
          toast.success("Account created — welcome!");
          window.location.href = "/dashboard";
        } else {
          toast.success("Check your email to verify your account.");
          onSwitch();
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="su-name">Full name</Label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-9 h-11"
            placeholder="Ali Raza"
            autoComplete="name"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 h-11"
            placeholder="you@email.com"
            autoComplete="email"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9 h-11"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Use 8+ characters. Longer is stronger.</p>
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-[var(--color-primary-hover)]"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
      </Button>
    </form>
  );
}

function ForgotPasswordLink({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  return (
    <button
      type="button"
      className="text-xs text-primary hover:underline underline-offset-4"
      disabled={sending}
      onClick={async () => {
        const em = emailSchema.safeParse(email);
        if (!em.success) return toast.error("Enter your email first, then tap Forgot password.");
        setSending(true);
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        setSending(false);
        if (error) return toast.error("Couldn't send reset link", { description: error.message });
        toast.success("Reset link sent", { description: "Check your inbox for next steps." });
      }}
    >
      {sending ? "Sending…" : "Forgot password?"}
    </button>
  );
}
