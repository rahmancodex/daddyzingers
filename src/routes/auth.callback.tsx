import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Signing you in — Daddy Zinger" }] }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    // Give the SDK a moment to persist the session from the hash / code exchange.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else navigate({ to: "/auth", replace: true });
    };
    const t = setTimeout(check, 400);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      cancelled = true;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-dvh grid place-items-center bg-background text-foreground">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Signing you in…
      </div>
    </div>
  );
}
