import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Crown,
  Gift,
  Heart,
  MapPin,
  Menu as MenuIcon,
  Package,
  ReceiptText,
  RefreshCw,
  Sparkles,
  Truck,
  Utensils,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPKR, useMenuItems } from "@/lib/menu";
import { drawerActions } from "@/lib/store";
import {
  ProgressRing,
  SectionHeader,
  SkeletonBlock,
  StatusPill,
  resolveTier,
} from "@/components/dashboard/shared";
import { EmptyState } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Daddy Zinger" }] }),
  component: Overview,
});

// Re-export shared helpers for back-compat with older imports.
export { EmptyState } from "@/components/dashboard/shared";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_pkr: number;
  created_at: string;
};

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  reward_points?: number | null;
  loyalty_tier?: string | null;
  daddy_pass_status?: string | null;
  referral_code?: string | null;
  total_orders?: number | null;
};

function greetingByHour(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Good night";
}

function Overview() {
  const { user } = useAuth();
  const menu = useMenuItems();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [favCount, setFavCount] = useState(0);
  const [addrCount, setAddrCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, o, f, a] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("orders")
          .select("id, order_number, status, total_pkr, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("user_favorites").select("product_id", { count: "exact", head: true }),
        supabase.from("user_addresses").select("id", { count: "exact", head: true }),
      ]);
      setProfile((p.data as Profile | null) ?? null);
      setOrders((o.data as OrderRow[]) ?? []);
      setFavCount(f.count ?? 0);
      setAddrCount(a.count ?? 0);
    })();
  }, [user]);

  const first = (profile?.full_name || user?.email?.split("@")[0] || "").split(" ")[0];
  const points = profile?.reward_points ?? 0;
  const { current: tier, next, progress } = resolveTier(points);
  const suggestions = menu.filter((m) => m.isBestseller || m.tags.includes("bestseller")).slice(0, 3);
  const lastOrder = orders?.[0] ?? null;

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Hero greeting */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-border p-6 md:p-9 bg-gradient-to-br from-primary/15 via-card to-accent/10"
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.28em] text-primary font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> {greetingByHour()}
            </div>
            <h1 className="mt-2 font-display text-3xl md:text-5xl font-extrabold leading-[1.05] tracking-tight">
              {greetingByHour()},{" "}
              <span className="text-primary">{first || "friend"}</span>.
            </h1>
            <p className="mt-2 text-muted-foreground max-w-lg text-sm md:text-base">
              Reorder your usual, discover new drops, and track everything from one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link to="/menu">
                <Button className="h-11 px-5 bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] font-semibold">
                  Order now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard/orders">
                <Button variant="outline" className="h-11 px-5">
                  View orders
                </Button>
              </Link>
            </div>
          </div>

          {/* Rewards ring — desktop only inside hero for tight composition */}
          <div className="hidden md:block">
            <div className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 min-w-[220px]">
              <div className="flex items-center gap-4">
                <ProgressRing value={progress} size={92} stroke={9}>
                  <div className="text-center leading-none">
                    <div className="font-display text-xl font-extrabold">{points}</div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                      points
                    </div>
                  </div>
                </ProgressRing>
                <div>
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      tier.bg,
                      tier.color,
                    )}
                  >
                    <Crown className="h-3 w-3" /> {tier.label}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {next
                      ? `${(next.min - points).toLocaleString()} to ${next.label}`
                      : "Top tier"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Quick actions */}
      <section>
        <SectionHeader kicker="Shortcuts" title="What would you like to do?" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <QuickAction
            to="/menu"
            icon={RefreshCw}
            title="Order again"
            body="Reorder your last favorite"
            tone="primary"
          />
          <QuickAction
            to="/menu"
            icon={MenuIcon}
            title="Browse menu"
            body="Full Daddy Zinger catalogue"
          />
          <QuickAction
            to="/dashboard/orders"
            icon={Truck}
            title="Track last order"
            body={lastOrder ? `#${lastOrder.order_number}` : "No active orders"}
          />
          <QuickAction
            to="/dashboard/rewards"
            icon={Gift}
            title="Your rewards"
            body={`${points.toLocaleString()} pts · ${tier.label}`}
          />
          <QuickAction
            to="/dashboard/addresses"
            icon={MapPin}
            title="Addresses"
            body={`${addrCount} saved`}
          />
          <QuickAction
            to="/dashboard/favorites"
            icon={Heart}
            title="Favorites"
            body={`${favCount} saved`}
          />
        </div>
      </section>

      {/* Recent orders */}
      <section>
        <SectionHeader title="Recent orders" href="/dashboard/orders" />
        {orders === null ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            body="Your first Zinger is one tap away. Explore the menu and pick a favorite."
            cta={{ label: "Browse menu", to: "/menu" }}
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <motion.li
                key={o.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="group rounded-2xl border border-border bg-card p-4 md:p-5 hover:border-primary/40 hover:shadow-[var(--shadow-2)] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">#{o.order_number}</span>
                      <StatusPill status={o.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(o.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                  <div className="font-display font-bold text-lg text-right">
                    {formatPKR(o.total_pkr)}
                  </div>
                  <Link to="/menu" className="sm:ml-2">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                      <RefreshCw className="h-3.5 w-3.5" /> Reorder
                    </Button>
                  </Link>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      {/* Rewards teaser + Referral */}
      <section className="grid md:grid-cols-3 gap-4 md:gap-5">
        <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-6 md:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid grid-cols-[auto_1fr] gap-5 md:gap-7 items-center">
            <ProgressRing value={progress}>
              <div className="text-center leading-none">
                <div className="font-display text-2xl font-extrabold">{points}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  points
                </div>
              </div>
            </ProgressRing>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.24em] text-primary font-semibold">
                Zinger Rewards
              </div>
              <div className="mt-1 font-display text-xl md:text-2xl font-extrabold">
                {next
                  ? `${(next.min - points).toLocaleString()} points to ${next.label}`
                  : "You've reached the top tier."}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Earn 1 point per PKR 10 spent. Redeem for free meals, sides and drinks.
              </p>
              <Link to="/dashboard/rewards" className="inline-flex mt-3">
                <Button size="sm" variant="outline">
                  View rewards <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-primary font-bold">
            <Crown className="h-3 w-3" /> Daddy Pass
          </div>
          <div className="mt-2 font-display text-xl font-extrabold">Coming soon.</div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Unlimited free delivery, 2× points, and a premium birthday gift.
          </p>
          <Button size="sm" variant="outline" className="mt-4 w-full" disabled>
            <Bell className="h-3.5 w-3.5" /> Notify me
          </Button>
        </div>
      </section>

      {/* Recommended */}
      <section>
        <SectionHeader title="Picked for you" href="/menu" kicker="Bestsellers" />
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {suggestions.map((m) => (
            <button
              key={m.id}
              onClick={() => drawerActions.openById(m.id)}
              className="text-left rounded-2xl border border-border bg-card overflow-hidden group hover:border-primary/40 hover:shadow-[var(--shadow-2)] transition-all"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={m.image}
                  alt={m.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold truncate">{m.name}</div>
                  <div className="font-display font-bold text-primary">{formatPKR(m.price)}</div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {m.shortDescription}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <Utensils className="h-3 w-3" /> Quick add
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  body,
  tone,
}: {
  to: string;
  icon: typeof RefreshCw;
  title: string;
  body: string;
  tone?: "primary";
}) {
  return (
    <Link
      to={to as never}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 md:p-5 transition-all hover:-translate-y-0.5",
        tone === "primary"
          ? "border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 hover:shadow-[var(--shadow-glow)]"
          : "border-border bg-card hover:border-primary/40 hover:shadow-[var(--shadow-2)]",
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-xl grid place-items-center transition-transform group-hover:scale-110",
          tone === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 font-semibold leading-tight">{title}</div>
      <div className="mt-0.5 text-[11px] md:text-xs text-muted-foreground line-clamp-1">
        {body}
      </div>
      <ArrowRight className="absolute right-3 top-3 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
