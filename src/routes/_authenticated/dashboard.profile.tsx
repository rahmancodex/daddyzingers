import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "./dashboard.orders";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — Daddy Zinger" }] }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
  avatar_url: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(500)
    .optional()
    .or(z.literal("")),
});

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", avatar_url: "" });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setForm({
          full_name: data?.full_name ?? "",
          phone: data?.phone ?? "",
          avatar_url: data?.avatar_url ?? "",
        });
        setLoading(false);
      });
  }, [user]);

  const initials =
    (form.full_name || user?.email || "?")
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  if (loading) return <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="How you appear in the Daddy Zinger family." />
      <form
        className="rounded-2xl border border-border bg-card p-6 space-y-5 max-w-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!user) return;
          const parsed = schema.safeParse(form);
          if (!parsed.success) return toast.error(parsed.error.issues[0].message);
          setSaving(true);
          const { error } = await supabase
            .from("profiles")
            .update({
              full_name: parsed.data.full_name,
              phone: parsed.data.phone || null,
              avatar_url: parsed.data.avatar_url || null,
            })
            .eq("id", user.id);
          setSaving(false);
          if (error) return toast.error(error.message);
          toast.success("Profile updated");
        }}
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-primary/30">
            <AvatarImage src={form.avatar_url || undefined} alt="" />
            <AvatarFallback className="bg-primary/15 text-primary font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Label>Avatar URL</Label>
            <Input
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="https://…"
              className="mt-1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Paste a link to an image. Uploads coming soon.
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Full name</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="opacity-70" />
            <p className="text-[11px] text-muted-foreground">Email changes require verification.</p>
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="03xx xxxxxxx"
            />
          </div>
        </div>
        <div className="pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
