import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — Daddy Zinger" }] }),
  component: ResetPassword,
});

const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <div className="mt-6 rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-[var(--shadow-4)]">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="h-10 w-10 rounded-xl bg-brand-black grid place-items-center">
              <Logo className="h-8 w-8 object-contain" />
            </div>
            <div className="font-display text-lg font-extrabold">Set a new password</div>
          </div>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const pw = passwordSchema.safeParse(password);
              if (!pw.success) return toast.error(pw.error.issues[0].message);
              if (password !== confirm) return toast.error("Passwords don't match");
              setSubmitting(true);
              const { error } = await supabase.auth.updateUser({ password: pw.data });
              setSubmitting(false);
              if (error) return toast.error("Couldn't update password", { description: error.message });
              toast.success("Password updated");
              navigate({ to: "/dashboard" });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="rp-password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="rp-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-confirm">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="rp-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-[var(--color-primary-hover)]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
