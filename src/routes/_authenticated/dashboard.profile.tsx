import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Cake, Camera, Check, Copy, Loader2, Mail, Phone, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader, SectionHeader } from "@/components/dashboard/shared";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — Daddy Zinger" }] }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  avatar_url: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
});

type Form = z.input<typeof schema>;

type Profile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  birthday: string | null;
  referral_code: string | null;
  favorite_category: string | null;
};

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Form>({
    full_name: "",
    phone: "",
    avatar_url: "",
    birthday: "",
  });
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, avatar_url, birthday, referral_code, favorite_category")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as Profile | null;
        setProfile(p);
        setForm({
          full_name: p?.full_name ?? "",
          phone: p?.phone ?? "",
          avatar_url: p?.avatar_url ?? "",
          birthday: p?.birthday ?? "",
        });
        setLoading(false);
      });
  }, [user]);

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      return toast.error("Please choose an image file");
    }
    if (file.size > 3 * 1024 * 1024) {
      return toast.error("Image must be under 3 MB");
    }
    setUploading(true);
    // Preview immediately (revoked on unmount by browser).
    const previewUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, avatar_url: previewUrl }));
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signed) throw signErr ?? new Error("Could not sign URL");
      const url = signed.signedUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setForm((f) => ({ ...f, avatar_url: url }));
      toast.success("Avatar updated");
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setForm((f) => ({ ...f, avatar_url: profile?.avatar_url ?? "" }));
    } finally {
      setUploading(false);
    }
  }

  const initials =
    (form.full_name || user?.email || "?")
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  if (loading) {
    return <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader title="Profile" subtitle="How you appear in the Daddy Zinger family." />

      {/* Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border">
        <div className="h-28 md:h-36 bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30" />
        <div className="relative -mt-12 md:-mt-14 px-5 md:px-7 pb-6 md:pb-7 flex flex-col md:flex-row md:items-end gap-4 md:gap-6 bg-card">
          <div className="relative group">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-4 ring-card shadow-[var(--shadow-2)]">
              <AvatarImage src={form.avatar_url || undefined} alt="" />
              <AvatarFallback className="bg-primary/15 text-primary font-bold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-2)] hover:scale-105 transition-transform disabled:opacity-70 disabled:cursor-wait"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>
          <div className="min-w-0 flex-1 pt-2 md:pt-0">
            <div className="font-display text-2xl font-extrabold truncate">
              {form.full_name || user?.email?.split("@")[0]}
            </div>
            <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
            {profile?.referral_code && (
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                Referral code:
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(profile.referral_code!);
                      setCopied(true);
                      toast.success("Code copied");
                      setTimeout(() => setCopied(false), 1500);
                    } catch {
                      toast.error("Couldn't copy");
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 font-mono font-semibold text-foreground hover:border-primary/40 transition-colors"
                >
                  {profile.referral_code}
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Edit profile */}
      <form
        className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-5"
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
              birthday: parsed.data.birthday || null,
            })
            .eq("id", user.id);
          setSaving(false);
          if (error) return toast.error(error.message);
          toast.success("Profile updated");
        }}
      >
        <SectionHeader title="Edit profile" kicker="Personal" />

        <div className="space-y-1.5">
          <Label>Avatar URL</Label>
          <Input
            value={form.avatar_url}
            onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
            placeholder="https://…"
            className="h-11"
          />
          <p className="text-[11px] text-muted-foreground">
            Paste a link to an image. Uploads coming soon.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                className="pl-9 h-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Birthday</Label>
            <div className="relative">
              <Cake className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={form.birthday ?? ""}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                className="pl-9 h-11"
              />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={user?.email ?? ""} disabled className="pl-9 h-11 opacity-70" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Email changes require verification.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="03xx xxxxxxx"
                className="pl-9 h-11"
              />
            </div>
          </div>
        </div>

        {profile?.favorite_category && (
          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            Your most-ordered category:{" "}
            <span className="font-semibold text-foreground capitalize">
              {profile.favorite_category}
            </span>
          </div>
        )}

        <div className="pt-1">
          <Button
            type="submit"
            disabled={saving}
            className="h-11 px-6 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] font-semibold"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
