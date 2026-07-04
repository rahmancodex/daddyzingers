import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Cake, CheckCircle2, Loader2, Mail, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { PhoneField } from "@/components/auth/PhoneField";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/lib/auth";
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  pkPhoneSchema,
  birthdaySchema,
} from "@/lib/auth-schemas";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Daddy Zinger" },
      {
        name: "description",
        content:
          "Sign in or create your Daddy Zinger account to save addresses, track orders and earn rewards.",
      },
    ],
  }),
  component: AuthPage,
  errorComponent: ({ error }) => (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <p className="text-muted-foreground">Something went wrong: {error.message}</p>
    </div>
  ),
});

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.2s2.69-6.2 6-6.2c1.88 0 3.15.8 3.87 1.48l2.64-2.55C16.9 3.16 14.68 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 12S6.9 21.8 12 21.8c6.94 0 9.2-4.86 9.2-9.3 0-.62-.07-1.1-.15-1.5H12z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <AuthShell
      footer={
        <>
          By continuing you agree to our Terms & Privacy.{" "}
          <Link to="/" className="underline underline-offset-4 hover:text-foreground">
            Continue as guest
          </Link>
        </>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full mb-6 rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="signin" className="rounded-lg data-[state=active]:shadow-sm">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:shadow-sm">
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-0">
              <GoogleButton />
              <Divider />
              <SignInForm onSuccess={() => router.navigate({ to: "/dashboard" })} />
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className="font-semibold text-primary hover:underline underline-offset-4"
                >
                  Create Account
                </button>
              </p>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <GoogleButton />
              <Divider />
              <SignUpForm onDone={() => setTab("signin")} />
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signin")}
                  className="font-semibold text-primary hover:underline underline-offset-4"
                >
                  Sign in
                </button>
              </p>
            </TabsContent>
          </Tabs>
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span>or continue with email</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-12 gap-2 rounded-xl font-semibold transition-all hover:bg-accent hover:shadow-sm active:scale-[0.99]"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          toast.error("Couldn't sign in with Google", { description: error.message });
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </Button>
  );
}

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
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
        if (error) {
          const msg = error.message?.toLowerCase() ?? "";
          if (
            msg.includes("confirm") ||
            msg.includes("verif") ||
            (error as { code?: string }).code === "email_not_confirmed"
          ) {
            return toast.error("Email not verified", {
              description:
                "Your email hasn't been verified yet. Please check your inbox and click the verification link.",
            });
          }
          if (msg.includes("invalid")) {
            return toast.error("Invalid credentials", {
              description: "The email or password you entered is incorrect.",
            });
          }
          return toast.error("Sign-in failed", { description: error.message });
        }
        if (!remember) {
          window.addEventListener("beforeunload", () => {
            void supabase.auth.signOut({ scope: "local" });
          });
        }
        toast.success("Welcome back!");
        onSuccess();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="si-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="si-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-12 rounded-xl transition-shadow focus-visible:shadow-sm"
            placeholder="you@email.com"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="si-password">Password</Label>
          <ForgotPasswordLink email={email} />
        </div>
        <PasswordField
          id="si-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="h-12 rounded-xl transition-shadow focus-visible:shadow-sm"
          required
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
        <Checkbox
          id="si-remember"
          checked={remember}
          onCheckedChange={(v) => setRemember(v === true)}
        />
        Remember me on this device
      </label>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-glow)] hover:bg-[var(--color-primary-hover)] transition-all active:scale-[0.99] disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in…
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [birthday, setBirthday] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordsMatch = useMemo(
    () => confirm.length > 0 && confirm === password,
    [confirm, password],
  );

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const nm = nameSchema.safeParse(name);
        const em = emailSchema.safeParse(email);
        const ph = pkPhoneSchema.safeParse(phone);
        const pw = passwordSchema.safeParse(password);
        const bd = birthdaySchema.safeParse(birthday);
        if (!nm.success) return toast.error(nm.error.issues[0].message);
        if (!em.success) return toast.error(em.error.issues[0].message);
        if (!ph.success) return toast.error(ph.error.issues[0].message);
        if (!pw.success) return toast.error(pw.error.issues[0].message);
        if (!bd.success) return toast.error(bd.error.issues[0].message);
        if (password !== confirm) return toast.error("Passwords don't match");
        if (!terms) return toast.error("Please accept the Terms to continue");

        setSubmitting(true);
        const { data, error } = await supabase.auth.signUp({
          email: em.data,
          password: pw.data,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: nm.data,
              phone: ph.data,
              birthday: bd.data,
              marketing_opt_in: false,
            },
          },
        });
        if (error) {
          setSubmitting(false);
          return toast.error("Sign-up failed", { description: error.message });
        }
        // Do not auto-login: end any transient session Supabase returned.
        if (data.session) {
          await supabase.auth.signOut({ scope: "local" });
        }
        setSubmitting(false);
        toast.success("Account created successfully", {
          description: "Please verify your email before signing in.",
        });
        onDone();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="su-name">Full name</Label>
          <div className="relative">
            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="su-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 h-12 rounded-xl transition-shadow focus-visible:shadow-sm"
              placeholder="Ali Raza"
              autoComplete="name"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="su-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 rounded-xl transition-shadow focus-visible:shadow-sm"
              placeholder="you@email.com"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-phone">Mobile</Label>
          <PhoneField
            id="su-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 rounded-xl transition-shadow focus-visible:shadow-sm"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-password">Password</Label>
        <PasswordField
          id="su-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          className="h-12 rounded-xl transition-shadow focus-visible:shadow-sm"
          required
        />
        {password.length > 0 && <PasswordStrength password={password} />}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-confirm">Confirm password</Label>
        <PasswordField
          id="su-confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
          className="h-12 rounded-xl transition-shadow focus-visible:shadow-sm"
          required
        />
        {confirm.length > 0 && (
          <p
            className={`text-[11px] flex items-center gap-1 ${
              passwordsMatch ? "text-emerald-500" : "text-destructive"
            }`}
            aria-live="polite"
          >
            {passwordsMatch ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> Passwords match
              </>
            ) : (
              "Passwords don't match yet"
            )}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-bday">Birthday</Label>
        <div className="relative">
          <Cake className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-bday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="pl-10 h-12 rounded-xl transition-shadow focus-visible:shadow-sm"
            required
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Used for your birthday reward.</p>
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer select-none pt-1">
        <Checkbox
          id="su-terms"
          checked={terms}
          onCheckedChange={(v) => setTerms(v === true)}
          className="mt-0.5"
        />
        <span className="text-foreground/85">
          I agree to the{" "}
          <Link to="/" className="underline underline-offset-4 text-primary">
            Terms
          </Link>{" "}
          &{" "}
          <Link to="/" className="underline underline-offset-4 text-primary">
            Privacy
          </Link>
          .
        </span>
      </label>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-glow)] hover:bg-[var(--color-primary-hover)] transition-all active:scale-[0.99] disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating account…
          </>
        ) : (
          "Create Account"
        )}
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
