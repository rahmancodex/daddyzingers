import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Clock,
  Fingerprint,
  Laptop,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { PageHeader, SectionHeader } from "@/components/dashboard/shared";

export const Route = createFileRoute("/_authenticated/dashboard/security")({
  head: () => ({ meta: [{ title: "Security — Daddy Zinger" }] }),
  component: SecurityPage,
});

const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

function SecurityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const currentDevice = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /Android|iPhone|iPad/i.test(currentDevice);

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Security"
        subtitle="Manage your password, devices and sign-in activity."
      />

      {/* Password card */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-5">
        <SectionHeader title="Change password" kicker="Access" />
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const parsed = passwordSchema.safeParse(pw);
            if (!parsed.success) return toast.error(parsed.error.issues[0].message);
            if (pw !== confirm) return toast.error("Passwords don't match");
            setSaving(true);
            const { error } = await supabase.auth.updateUser({ password: parsed.data });
            setSaving(false);
            if (error) return toast.error(error.message);
            setPw("");
            setConfirm("");
            toast.success("Password updated");
          }}
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>New password</Label>
              <PasswordField value={pw} onChange={(e) => setPw(e.target.value)} />
              {pw.length > 0 && <PasswordStrength password={pw} />}
            </div>
            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <PasswordField
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="h-11 px-6 bg-primary text-primary-foreground font-semibold hover:bg-[var(--color-primary-hover)]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </Button>
        </form>
      </section>

      {/* Two-factor placeholder */}
      <section className="rounded-2xl border border-dashed border-border bg-card p-5 md:p-7">
        <SectionHeader
          title="Two-factor authentication"
          kicker="Coming soon"
          action={<Badge variant="outline">Coming soon</Badge>}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: Smartphone, label: "SMS code" },
            { icon: Fingerprint, label: "Authenticator app" },
          ].map((o) => (
            <div
              key={o.label}
              className="rounded-xl border border-border bg-secondary/40 p-4 flex items-center gap-3 opacity-80"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <o.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{o.label}</div>
                <div className="text-xs text-muted-foreground">Enable extra sign-in protection</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trusted devices */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
        <SectionHeader
          title="Trusted devices"
          kicker="Sessions"
          action={<Badge variant="outline">Read-only</Badge>}
        />
        <ul className="divide-y divide-border">
          <li className="py-3 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              {isMobile ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold text-sm">This device</div>
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                  Active now
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email} · {isMobile ? "Mobile" : "Desktop"}
              </div>
            </div>
          </li>
          <li className="py-3 flex items-center gap-4 opacity-70">
            <div className="h-10 w-10 rounded-xl bg-secondary text-muted-foreground grid place-items-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Historical devices</div>
              <div className="text-xs text-muted-foreground">
                Full sign-in history and per-device revocation coming soon.
              </div>
            </div>
          </li>
        </ul>
      </section>

      {/* Sessions actions */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-4">
        <SectionHeader title="Sessions" kicker="Actions" />
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Signed out");
              navigate({ to: "/", replace: true });
            }}
            className="group text-left rounded-xl border border-border bg-secondary/40 p-4 flex items-start gap-3 hover:border-primary/40 hover:bg-secondary/60 transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm">Sign out</div>
              <div className="text-xs text-muted-foreground">End this session on this device.</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() =>
              toast("Sign out on all devices", {
                description: "Coming soon — global sign-out is on the roadmap.",
              })
            }
            className="group text-left rounded-xl border border-dashed border-border bg-secondary/20 p-4 flex items-start gap-3 opacity-80 hover:opacity-100 transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive grid place-items-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm">Sign out everywhere</div>
                <Badge variant="outline" className="text-[10px]">
                  Soon
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                End every active session across all devices.
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
