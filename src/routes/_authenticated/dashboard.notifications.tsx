import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, Loader2, MessageSquare, Sparkles, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader, SectionHeader } from "@/components/dashboard/shared";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Daddy Zinger" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("marketing_opt_in")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setMarketing(!!data?.marketing_opt_in);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />;

  const rows: Array<{
    icon: typeof Truck;
    title: string;
    body: string;
    checked: boolean;
    onChange?: (v: boolean) => void;
    live?: boolean;
    locked?: string;
  }> = [
    {
      icon: Truck,
      title: "Order updates",
      body: "Confirmation, kitchen status, out-for-delivery and delivered.",
      checked: true,
      live: true,
      locked: "Always on",
    },
    {
      icon: Sparkles,
      title: "New drops & menu updates",
      body: "Be first to try new Zingers and limited-time items.",
      checked: false,
      locked: "Coming soon",
    },
    {
      icon: MessageSquare,
      title: "Marketing & offers",
      body: "Occasional promotions and family deals from Daddy Zinger.",
      checked: marketing,
      onChange: setMarketing,
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Notifications"
        subtitle="Only the messages you want, on the channels you choose."
      />

      <section>
        <SectionHeader title="Preferences" kicker="Email" />
        <div className="grid gap-3">
          {rows.map((r) => (
            <label
              key={r.title}
              className="group rounded-2xl border border-border bg-card p-4 md:p-5 flex items-center gap-4 hover:border-primary/40 transition-colors cursor-pointer"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <r.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold">{r.title}</div>
                  {r.live && (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                      Live
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{r.body}</div>
              </div>
              <Switch checked={r.checked} onCheckedChange={r.onChange} />
            </label>
          ))}
        </div>
        <div className="mt-5">
          <Button
            disabled={saving}
            className="h-11 px-6 bg-primary text-primary-foreground font-semibold hover:bg-[var(--color-primary-hover)]"
            onClick={async () => {
              if (!user) return;
              setSaving(true);
              const { error } = await supabase
                .from("profiles")
                .update({ marketing_opt_in: marketing })
                .eq("id", user.id);
              setSaving(false);
              if (error) return toast.error(error.message);
              toast.success("Notification preferences saved");
            }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save preferences"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-border p-5 md:p-6 bg-secondary/30 flex items-start gap-3 text-sm text-muted-foreground">
        <Bell className="h-4 w-4 text-primary mt-0.5" />
        <div>
          Push notifications, WhatsApp updates and SMS delivery are on the roadmap. For now, order
          messages arrive to your registered email.
        </div>
      </section>
    </div>
  );
}
