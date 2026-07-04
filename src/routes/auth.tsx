import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Cake,
  CheckCircle2,
  Loader2,
  Mail,
  Smartphone,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { PhoneField } from "@/components/auth/PhoneField";
import { OtpInput } from "@/components/auth/OtpInput";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/lib/auth";
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  pkPhoneSchema,
  birthdaySchema,
} from "@/lib/auth-schemas";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/phone-otp.functions";

type Mode = "auth" | "phone" | "otp" | "verify";

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

function AppleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.42 2.24-1.19 3.04-.83.87-2.19 1.54-3.32 1.45-.14-1.1.42-2.25 1.16-3.02.83-.86 2.24-1.51 3.35-1.47zM20.5 17.19c-.55 1.27-.81 1.84-1.52 2.96-.99 1.57-2.39 3.52-4.13 3.53-1.55.02-1.95-1-4.05-.99-2.1.01-2.53 1.01-4.08.99-1.74-.02-3.06-1.78-4.05-3.35C-.04 16.29-.28 11.14 1.35 8.4c1.15-1.93 2.97-3.06 4.69-3.06 1.75 0 2.85.96 4.29.96 1.4 0 2.25-.96 4.28-.96 1.53 0 3.15.83 4.31 2.28-3.79 2.08-3.17 7.5.58 9.57z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [mode, setMode] = useState<Mode>("auth");
  const [phone, setPhone] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");

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
        {mode === "auth" && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-5">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <div className="space-y-2.5">
                <GoogleButton />
                <button
                  type="button"
                  onClick={() => setMode("phone")}
                  className="w-full h-11 gap-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-sm font-semibold hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Smartphone className="h-4 w-4" />
                  Continue with phone
                </button>
                <button
                  type="button"
                  disabled
                  aria-label="Sign in with Apple — coming soon"
                  className="w-full h-11 gap-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-sm font-semibold text-muted-foreground opacity-70 cursor-not-allowed"
                >
                  <AppleIcon />
                  Apple <span className="text-[10px] uppercase tracking-wider">Soon</span>
                </button>
              </div>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>or continue with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <TabsContent value="signin">
                <SignInForm onSuccess={() => router.navigate({ to: "/dashboard" })} />
              </TabsContent>
              <TabsContent value="signup">
                <SignUpForm onNeedsVerification={(email) => { setVerifyEmail(email); setMode("verify"); }} />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {mode === "phone" && (
          <PhoneStep
            key="phone"
            phone={phone}
            setPhone={setPhone}
            onBack={() => setMode("auth")}
            onSent={() => setMode("otp")}
          />
        )}

        {mode === "otp" && (
          <OtpStep
            key="otp"
            phone={phone}
            onBack={() => setMode("phone")}
          />
        )}

        {mode === "verify" && (
          <VerifyEmailStep
            key="verify"
            email={verifyEmail}
            onBack={() => setMode("auth")}
          />
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11 gap-2 font-semibold"
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
        if (error) return toast.error("Sign-in failed", { description: error.message });
        // "Remember me" hint — session persistence is handled by the SDK;
        // if unchecked, ask the browser to drop the session on tab close.
        if (!remember) {
          window.addEventListener("beforeunload", () => {
            void supabase.auth.signOut({ scope: "local" });
          });
        }
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
        <PasswordField
          id="si-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
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
        className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-[var(--color-primary-hover)]"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [birthday, setBirthday] = useState("");
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(true);
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
              marketing_opt_in: marketing,
            },
          },
        });
        setSubmitting(false);
        if (error) return toast.error("Sign-up failed", { description: error.message });
        if (data.session) {
          toast.success("Account created — welcome!");
          navigate({ to: "/welcome" });
        } else {
          toast.success("Check your email to verify your account.");
          onSwitch();
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
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
          <Label htmlFor="su-phone">Mobile</Label>
          <PhoneField
            id="su-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <PasswordField
          id="su-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
        {password.length > 0 && <PasswordStrength password={password} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="su-confirm">Confirm password</Label>
        <PasswordField
          id="su-confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
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

      <div className="space-y-2">
        <Label htmlFor="su-bday">Birthday</Label>
        <div className="relative">
          <Cake className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-bday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="pl-9 h-11"
            required
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Used for your birthday reward.</p>
      </div>

      <div className="space-y-2 pt-1">
        <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
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
        <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
          <Checkbox
            id="su-marketing"
            checked={marketing}
            onCheckedChange={(v) => setMarketing(v === true)}
            className="mt-0.5"
          />
          <span className="text-muted-foreground">
            Send me exclusive offers, drops and rewards. You can opt out anytime.
          </span>
        </label>
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

function PhoneStep({
  phone,
  setPhone,
  onBack,
  onSent,
}: {
  phone: string;
  setPhone: (v: string) => void;
  onBack: () => void;
  onSent: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="font-display text-2xl font-extrabold">Sign in with phone</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        We'll text a 6-digit code to your Pakistan mobile number.
      </p>
      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = pkPhoneSchema.safeParse(phone);
          if (!parsed.success) return toast.error(parsed.error.issues[0].message);
          setBusy(true);
          try {
            const res = await sendPhoneOtp({ data: { phone: parsed.data } });
            if (res.ok) {
              toast.info(res.message);
              onSent();
            }
          } catch (err) {
            toast.error("Couldn't send code", {
              description: err instanceof Error ? err.message : "Please try again.",
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="phone-input">Mobile number</Label>
          <PhoneField
            id="phone-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            Pakistan numbers only. Format: 03XX XXXXXXX.
          </p>
        </div>
        <Button
          type="submit"
          disabled={busy}
          className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-[var(--color-primary-hover)]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
        </Button>
      </form>
    </motion.div>
  );
}

function OtpStep({ phone, onBack }: { phone: string; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const parsedPhone = useMemo(() => {
    const p = pkPhoneSchema.safeParse(phone);
    return p.success ? p.data : phone;
  }, [phone]);

  async function verify(next: string) {
    setVerifying(true);
    setError(false);
    try {
      const res = await verifyPhoneOtp({ data: { phone: parsedPhone, code: next } });
      if (!res.ok) {
        setError(true);
        toast.info(res.message);
      }
    } catch (err) {
      setError(true);
      toast.error("Couldn't verify code", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Change number
      </button>
      <h2 className="font-display text-2xl font-extrabold">Enter verification code</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        We sent it to <span className="font-medium text-foreground">{parsedPhone}</span>
      </p>

      <div className="mt-6 flex justify-center">
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError(false);
          }}
          onComplete={verify}
          disabled={verifying}
          error={error}
          autoFocus
        />
      </div>

      <div className="mt-5 text-center text-sm text-muted-foreground">
        Didn't get it?{" "}
        {secondsLeft > 0 ? (
          <span>Resend in {secondsLeft}s</span>
        ) : (
          <button
            type="button"
            className="text-primary font-medium hover:underline underline-offset-4"
            disabled={resending}
            onClick={async () => {
              setResending(true);
              try {
                const res = await sendPhoneOtp({ data: { phone: parsedPhone } });
                if (res.ok) {
                  toast.info(res.message);
                  setSecondsLeft(res.cooldownSeconds ?? 60);
                }
              } finally {
                setResending(false);
              }
            }}
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
        )}
      </div>

      <Button
        type="button"
        disabled={code.length !== 6 || verifying}
        onClick={() => verify(code)}
        className="mt-6 w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-[var(--color-primary-hover)]"
      >
        {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & continue"}
      </Button>
    </motion.div>
  );
}
