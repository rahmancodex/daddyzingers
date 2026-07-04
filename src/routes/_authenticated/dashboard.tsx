import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CreditCard,
  Crown,
  Gift,
  Heart,
  Home,
  LogOut,
  MapPin,
  ReceiptText,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/site/Logo";
import { resolveTier } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Daddy Zinger" }] }),
  component: DashboardLayout,
});

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  reward_points?: number | null;
  loyalty_tier?: string | null;
  daddy_pass_status?: string | null;
};

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  group: "orders" | "account";
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: Home, exact: true, group: "orders" },
  { to: "/dashboard/orders", label: "Orders", icon: ReceiptText, group: "orders" },
  { to: "/dashboard/favorites", label: "Favorites", icon: Heart, group: "orders" },
  { to: "/dashboard/rewards", label: "Rewards", icon: Gift, group: "orders" },
  { to: "/dashboard/addresses", label: "Addresses", icon: MapPin, group: "account" },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard, group: "account" },
  { to: "/dashboard/profile", label: "Profile", icon: UserIcon, group: "account" },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell, group: "account" },
  { to: "/dashboard/security", label: "Security", icon: Shield, group: "account" },
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
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as Profile | null));
  }, [user]);

  const initials =
    (profile?.full_name || user?.email || "?")
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const points = profile?.reward_points ?? 0;
  const { current: tier } = resolveTier(points);
  const passActive = profile?.daddy_pass_status === "active";

  const orderNav = NAV.filter((n) => n.group === "orders");
  const accountNav = NAV.filter((n) => n.group === "account");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="container-dz h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-brand-black grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
              <Logo className="h-8 w-8 object-contain" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-display text-base font-extrabold truncate">Daddy Zinger</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground -mt-0.5 truncate">
                My account
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
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
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container-dz py-6 md:py-10 grid lg:grid-cols-[300px_1fr] gap-6 lg:gap-10">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
          {/* Identity card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-[var(--shadow-2)]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <Avatar className="h-14 w-14 ring-2 ring-primary/40 ring-offset-2 ring-offset-card">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="bg-primary/15 text-primary font-bold text-lg">
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
            <div className="relative mt-4 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  tier.bg,
                  tier.color,
                )}
              >
                <Crown className="h-3 w-3" /> {tier.label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {points.toLocaleString()} pts
              </span>
            </div>
            {passActive ? (
              <div className="relative mt-3 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary flex items-center gap-1.5">
                <Crown className="h-3 w-3" /> Daddy Pass · Active
              </div>
            ) : (
              <div className="relative mt-3 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                Daddy Pass · Coming soon
              </div>
            )}
          </motion.div>

          {/* Nav — mobile horizontal scroll, desktop stacked */}
          <nav className="lg:hidden -mx-4 overflow-x-auto">
            <div className="flex gap-2 px-4 pb-1">
              {NAV.map(({ to, label, icon: Icon, exact }) => {
                const active = exact ? location.pathname === "/dashboard" : location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold border transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                        : "bg-card text-foreground/80 border-border hover:border-primary/40",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <nav className="hidden lg:block rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-2)]">
            <NavGroup label="My orders" items={orderNav} location={location.pathname} />
            <div className="my-2 h-px bg-border" />
            <NavGroup label="My account" items={accountNav} location={location.pathname} />
          </nav>

          <div className="hidden lg:block rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            Need help? Chat with us anytime — we usually reply in under a minute.
          </div>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  location,
}: {
  label: string;
  items: NavItem[];
  location: string;
}) {
  return (
    <div className="p-1">
      <div className="px-3 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground font-semibold">
        {label}
      </div>
      {items.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? location === "/dashboard" : location === to;
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              active
                ? "bg-primary/10 text-primary"
                : "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "h-7 w-7 rounded-md grid place-items-center transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary/60 text-muted-foreground group-hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 truncate">{label}</span>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-all",
                active
                  ? "opacity-100 translate-x-0 text-primary"
                  : "opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0",
              )}
            />
          </Link>
        );
      })}
    </div>
  );
}
