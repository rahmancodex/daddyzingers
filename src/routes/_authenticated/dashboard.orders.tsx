import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ReceiptText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/menu-data";
import { EmptyState } from "./dashboard.index";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({ meta: [{ title: "Orders — Daddy Zinger" }] }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_pkr: number;
  payment_method: string;
  created_at: string;
};

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id, order_number, status, total_pkr, payment_method, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as OrderRow[]) ?? []));
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader title="Your orders" subtitle="Track, reorder and view invoices." />
      {orders === null ? (
        <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No orders yet"
          body="Once you place an order, it'll live here — with reorder, tracking and invoice download."
          cta={{ label: "Browse menu", to: "/menu" }}
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl border border-border bg-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-6"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">#{o.order_number}</span>
                  <Badge variant="outline" className="capitalize">
                    {o.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(o.created_at).toLocaleString()} · {o.payment_method.toUpperCase()}
                </div>
              </div>
              <div className="font-display font-bold text-lg">{formatPKR(o.total_pkr)}</div>
              <div className="flex gap-2">
                <Link to="/menu">
                  <Button size="sm" variant="outline">
                    <RefreshCw className="h-3.5 w-3.5" /> Reorder
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" disabled title="Coming soon">
                  Invoice
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
