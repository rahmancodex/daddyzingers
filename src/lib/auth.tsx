import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1) Listener FIRST — so we never miss an event.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
      }
      // Honor the "Remember me" preference set at sign-in time. When the user
      // opted out we clear the persisted session on next boot instead of
      // stacking a beforeunload listener on every sign-in.
      if (event === "INITIAL_SESSION" && s) {
        try {
          if (localStorage.getItem("dz_session_ephemeral") === "1") {
            localStorage.removeItem("dz_session_ephemeral");
            void supabase.auth.signOut({ scope: "local" });
          }
        } catch {
          /* ignore */
        }
      }
    });
    // 2) Then hydrate current session.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Memoized so consumers of useAuth() don't re-render on every
  // AuthProvider render — only when session/loading actually change.
  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

