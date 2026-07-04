import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordField } from "@/components/auth/PasswordField";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Login — Daddy Zingers" },
      { name: "description", content: "Restricted access. Daddy Zingers admin panel." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      toast.error("Sign in failed", { description: err.message });
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/admin", replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-black text-neutral-50">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:items-center">
          {/* Left brand pane */}
          <div className="hidden flex-col gap-6 lg:flex">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-3)]">
                <span className="font-display text-lg font-black">DZ</span>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-primary">Admin Panel</div>
                <div className="font-display text-2xl font-black">Daddy Zingers</div>
              </div>
            </div>
            <h1 className="font-display text-4xl font-black leading-tight text-neutral-50">
              Run the kitchen.
              <br />
              <span className="text-primary">Rule the day.</span>
            </h1>
            <p className="max-w-md text-sm text-neutral-300">
              Manage orders, menu, promotions and customer experience — all from one premium
              control room built for Daddy Zingers.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-neutral-300 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Access is restricted to authorized staff only.
            </div>
          </div>

          {/* Right form pane */}
          <div className="w-full">
            <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[var(--shadow-modal)] backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <span className="font-display text-sm font-black">DZ</span>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-primary">
                    Admin Panel
                  </div>
                  <div className="font-display text-lg font-black">Daddy Zingers</div>
                </div>
              </div>

              <h2 className="font-display text-2xl font-black">Sign in</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Enter your admin credentials to continue.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-neutral-200">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                    <Input
                      id="admin-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@daddyzingers.com"
                      className="h-12 rounded-xl border-white/10 bg-white/5 pl-9 text-neutral-50 placeholder:text-neutral-500 focus-visible:border-primary focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="admin-password" className="text-neutral-200">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() =>
                        toast.info("Contact your administrator to reset your password.")
                      }
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PasswordField
                    id="admin-password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 rounded-xl border-white/10 bg-white/5 text-neutral-50 placeholder:text-neutral-500 focus-visible:border-primary focus-visible:ring-primary"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(Boolean(v))}
                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  Remember me on this device
                </label>

                {error && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-[var(--shadow-3)] hover:bg-primary-hover"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                    </>
                  ) : (
                    "Sign in to Admin"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-neutral-500">
                Not an admin?{" "}
                <Link to="/" className="text-primary hover:underline">
                  Return to Daddy Zingers
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
