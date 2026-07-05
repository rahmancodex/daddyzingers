import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Package, ReceiptText, RefreshCw, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/menu";
import {
  EmptyState,
  PageHeader,
  SkeletonBlock,
  StatusPill,
} from "@/components/dashboard/shared";

// Re-export so pages importing PageHeader from ./dashboard.orders keep working.
export { PageHeader } from "@/components/dashboard/shared";

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
  order_items?: { name: string; qty: number }[];
};

function OrdersPage() {
  const { user } = useAuth();

  const { data: orders, isLoading, isError, error, refetch } = useQuery<OrderRow[]>({
    queryKey: ["customer-orders", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, total_pkr, payment_method, created_at, order_items(name, qty)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as OrderRow[]) ?? [];
    },
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Your orders"
        subtitle="Track, reorder and view every meal."
        action={
          orders && orders.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => refetch()} aria-label="Refresh orders">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={Package}
          title="Couldn't load orders"
          body={(error as Error)?.message ?? "Please try again in a moment."}
          cta={{ label: "Browse menu", to: "/menu" }}
        />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          body="Once you place an order, it'll live here — with reorder, tracking and receipts."
          cta={{ label: "Browse menu", to: "/menu" }}
        />
      ) : (
        <ul className="space-y-3 md:space-y-4">
          {orders.map((o, i) => {
            const items = o.order_items ?? [];
            const itemsTotal = items.reduce((n, it) => n + (it.qty ?? 0), 0);
            return (
              <motion.li
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.03 }}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-[var(--shadow-2)] transition-all"
              >
                <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 text-primary grid place-items-center">
                      <ReceiptText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">#{o.order_number}</span>
                        <StatusPill status={o.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(o.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {" · "}
                        {o.payment_method.toUpperCase()}
                        {itemsTotal > 0 && (
                          <>
                            {" · "}
                            {itemsTotal} item{itemsTotal === 1 ? "" : "s"}
                          </>
                        )}
                      </div>
                      {items.length > 0 && (
                        <div className="mt-2 text-xs text-foreground/70 line-clamp-1">
                          {items
                            .slice(0, 3)
                            .map((it) => `${it.qty}× ${it.name}`)
                            .join(", ")}
                          {items.length > 3 && ` +${items.length - 3} more`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 md:gap-6 justify-between md:justify-end">
                    <div className="font-display font-extrabold text-xl">
                      {formatPKR(o.total_pkr)}
                    </div>
                    <div className="flex gap-2">
                      <Link to="/menu">
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-3.5 w-3.5" /> Reorder
                        </Button>
                      </Link>
                      <Link
                        to="/dashboard/orders/$orderId"
                        params={{ orderId: o.id }}
                      >
                        <Button size="sm">
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
