import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "./dashboard.orders";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Daddy Zinger" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [productDrops, setProductDrops] = useState(true);

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

  const Row = ({
    title,
    body,
    checked,
    onChange,
  }: {
    title: string;
    body: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-none">
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle="Only the messages you want." />
      <div className="rounded-2xl border border-border bg-card p-6 max-w-2xl">
        <Row
          title="Order updates"
          body="Confirmation, kitchen status, out-for-delivery and delivered."
          checked={orderUpdates}
          onChange={setOrderUpdates}
        />
        <Row
          title="New drops & menu updates"
          body="Be first to try new Zingers and limited-time items."
          checked={productDrops}
          onChange={setProductDrops}
        />
        <Row
          title="Marketing & offers"
          body="Occasional promotions and family deals from Daddy Zinger."
          checked={marketing}
          onChange={setMarketing}
        />

        <div className="pt-4">
          <Button
            disabled={saving}
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
      </div>
      <p className="text-xs text-muted-foreground max-w-2xl">
        Push notifications and SMS delivery are on the roadmap. For now, order-related messages are
        sent to your registered email.
      </p>
    </div>
  );
}
