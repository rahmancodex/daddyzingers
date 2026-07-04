import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  CreditCard,
  Gift,
  Heart,
  Home,
  LogOut,
  MapPin,
  ReceiptText,
  Shield,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Daddy Zinger" }] }),
  component: DashboardLayout,
});

type Profile = { full_name: string | null; avatar_url: string | null; phone: string | null };

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: Home, exact: true },
  { to: "/dashboard/orders", label: "Orders", icon: ReceiptText },
  { to: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { to: "/dashboard/addresses", label: "Addresses", icon: MapPin },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { to: "/dashboard/rewards", label: "Rewards", icon: Gift },
  { to: "/dashboard/profile", label: "Profile", icon: UserIcon },
  { to: "/dashboard/security", label: "Security", icon: Shield },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

function DashboardLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const initials =
    (profile?.full_name || user?.email || "?")
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container-dz h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-brand-black grid place-items-center shadow-[var(--shadow-glow)]">
              <Logo className="h-8 w-8 object-contain" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-extrabold">Daddy Zinger</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground -mt-0.5">
                My account
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/menu">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                <ArrowLeft className="h-4 w-4" /> Back to menu
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Signed out");
                navigate({ to: "/", replace: true });
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="container-dz py-8 grid lg:grid-cols-[280px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-2)]"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="bg-primary/15 text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-semibold truncate">
                  {profile?.full_name || user?.email?.split("@")[0]}
                </div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Zinger member
            </div>
          </motion.div>

          <nav className="mt-4 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-2)]">
            {NAV.map(({ to, label, icon: Icon, exact }) => {
              const active = exact
                ? location.pathname === "/dashboard"
                : location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
