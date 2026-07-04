import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "./dashboard.orders";

export const Route = createFileRoute("/_authenticated/dashboard/security")({
  head: () => ({ meta: [{ title: "Security — Daddy Zinger" }] }),
  component: SecurityPage,
});

const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

function SecurityPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Keep your account locked down." />

      <form
        className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-xl"
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
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Change password
        </div>
        <div className="space-y-1">
          <Label>New password</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Confirm new password</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-xl">
        <div className="text-sm font-semibold">Sessions</div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Signed out");
              navigate({ to: "/", replace: true });
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toast("Sign out on all devices", {
                description: "Coming soon — global sign-out is on the roadmap.",
              })
            }
          >
            Sign out on all devices
          </Button>
        </div>
      </div>
    </div>
  );
}
