import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Gift, Heart, MapPin, ReceiptText, Sparkles, Utensils } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPKR, MENU } from "@/lib/menu-data";
import { drawerActions } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Daddy Zinger" }] }),
  component: Overview,
});

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_pkr: number;
  created_at: string;
};

function Overview() {
  const { user } = useAuth();
  const [name, setName] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [addrCount, setAddrCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, o, f, a] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("orders")
          .select("id, order_number, status, total_pkr, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("user_favorites").select("product_id", { count: "exact", head: true }),
        supabase.from("user_addresses").select("id", { count: "exact", head: true }),
      ]);
      setName(p.data?.full_name ?? null);
      setOrders((o.data as OrderRow[]) ?? []);
      setFavCount(f.count ?? 0);
      setAddrCount(a.count ?? 0);
    })();
  }, [user]);

  const first = name?.split(" ")[0] || user?.email?.split("@")[0];
  const suggestions = MENU.filter((m) => m.tags.includes("bestseller")).slice(0, 3);

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-border p-8 md:p-10 bg-gradient-to-br from-primary/15 via-card to-accent/10"
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-primary font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Welcome back
          </div>
          <h1 className="mt-2 font-display text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
            Hey {first}, hungry?
          </h1>
          <p className="mt-2 text-muted-foreground max-w-lg">
            Reorder your usual, discover new drops, and track everything from here.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/menu">
              <Button className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)] font-semibold">
                Order now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/dashboard/orders">
              <Button variant="outline">View orders</Button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Stat tiles */}
      <section className="grid sm:grid-cols-3 gap-4">
        <StatTile icon={ReceiptText} label="Recent orders" value={String(orders.length)} to="/dashboard/orders" />
        <StatTile icon={Heart} label="Favorites saved" value={String(favCount)} to="/dashboard/favorites" />
        <StatTile icon={MapPin} label="Saved addresses" value={String(addrCount)} to="/dashboard/addresses" />
      </section>

      {/* Recent orders */}
      <section>
        <SectionHeader title="Recent orders" href="/dashboard/orders" />
        {orders.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No orders yet"
            body="Your first Zinger is one tap away."
            cta={{ label: "Browse menu", to: "/menu" }}
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <div>
                  <div className="font-semibold">#{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()} · {o.status}
                  </div>
                </div>
                <div className="font-display font-bold">{formatPKR(o.total_pkr)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rewards teaser */}
      <section className="rounded-2xl border border-border bg-card p-6 flex items-center gap-5">
        <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center text-primary">
          <Gift className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">You're 3 orders away from a free Zinger.</div>
          <div className="text-sm text-muted-foreground">
            Every 5 orders earns a free Zinger Burger on the house.
          </div>
        </div>
        <Link to="/dashboard/rewards">
          <Button variant="outline" size="sm">View</Button>
        </Link>
      </section>

      {/* Recommended */}
      <section>
        <SectionHeader title="Picked for you" href="/menu" />
        <div className="grid sm:grid-cols-3 gap-4">
          {suggestions.map((m) => (
            <button
              key={m.id}
              onClick={() => drawerActions.openById(m.id)}
              className="text-left rounded-2xl border border-border bg-card overflow-hidden group hover:shadow-[var(--shadow-2)] transition"
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

function StatTile({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
  to: "/dashboard/orders" | "/dashboard/favorites" | "/dashboard/addresses";
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 hover:border-primary/40 transition-colors"
    >
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-display text-2xl font-extrabold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </Link>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      <Link to={href} className="text-sm text-primary hover:underline underline-offset-4">
        View all
      </Link>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: typeof ReceiptText;
  title: string;
  body: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{body}</div>
      {cta && (
        <Link to={cta.to as never} className="inline-block mt-4">
          <Button variant="outline" size="sm">
            {cta.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
