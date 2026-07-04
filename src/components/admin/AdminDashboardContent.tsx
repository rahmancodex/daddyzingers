import * as React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChefHat,
  CheckCircle2,
  Clock,
  DollarSign,
  Flame,
  MoreHorizontal,
  Package,
  PackageCheck,
  Plus,
  ShoppingBag,
  Sparkles,
  Ticket,
  Truck,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// -----------------------------------------------------------------------------
// Stat cards
// -----------------------------------------------------------------------------

type Stat = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "info" | "destructive" | "neutral";
};

const STATS: Stat[] = [
  { label: "Today's Orders", value: "128", delta: "+12.4%", trend: "up", icon: ShoppingBag, tone: "primary" },
  { label: "Revenue Today", value: "PKR 184,320", delta: "+8.1%", trend: "up", icon: DollarSign, tone: "success" },
  { label: "Pending Orders", value: "14", delta: "3 new", trend: "up", icon: Clock, tone: "warning" },
  { label: "Preparing", value: "22", delta: "+2", trend: "up", icon: ChefHat, tone: "info" },
  { label: "Delivered", value: "86", delta: "+18.2%", trend: "up", icon: PackageCheck, tone: "success" },
  { label: "Cancelled", value: "6", delta: "-1.4%", trend: "down", icon: XCircle, tone: "destructive" },
];

const TONE: Record<Stat["tone"], string> = {
  primary: "bg-primary/15 text-foreground",
  success: "bg-success/15 text-success-foreground",
  warning: "bg-warning/20 text-warning-foreground",
  info: "bg-info/15 text-info",
  destructive: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-foreground",
};

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  return (
    <div className="group rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", TONE[stat.tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {stat.delta && (
          <div
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              stat.trend === "down"
                ? "bg-destructive/10 text-destructive"
                : "bg-success/15 text-success-foreground",
            )}
          >
            {stat.trend === "down" ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <ArrowUpRight className="h-3 w-3" />
            )}
            {stat.delta}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {stat.label}
        </div>
        <div className="mt-1 font-display text-2xl font-black tracking-tight">{stat.value}</div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Revenue chart placeholder
// -----------------------------------------------------------------------------

function RevenueChart() {
  const points = [22, 34, 28, 46, 40, 58, 52, 66, 60, 78, 72, 88];
  const max = Math.max(...points);
  const w = 560;
  const h = 180;
  const step = w / (points.length - 1);
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * (h - 20) - 10}`)
    .join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-1)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Revenue this week
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-3xl font-black">PKR 1.24M</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success-foreground">
              <ArrowUpRight className="h-3 w-3" /> 14.6%
            </span>
          </div>
        </div>
        <div className="hidden gap-2 sm:flex">
          {["7D", "30D", "90D"].map((r, i) => (
            <button
              key={r}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                i === 0
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 h-[200px] w-full overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#rev)" />
          <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Order status overview
// -----------------------------------------------------------------------------

const STATUS = [
  { label: "Pending", value: 14, color: "bg-warning" },
  { label: "Preparing", value: 22, color: "bg-info" },
  { label: "Out for delivery", value: 18, color: "bg-primary" },
  { label: "Delivered", value: 86, color: "bg-success" },
  { label: "Cancelled", value: 6, color: "bg-destructive" },
];

function OrderStatusOverview() {
  const total = STATUS.reduce((a, s) => a + s.value, 0);
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-1)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Order status
          </div>
          <div className="mt-1 font-display text-2xl font-black">{total} orders</div>
        </div>
        <Package className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted">
        {STATUS.map((s) => (
          <div key={s.label} className={cn("h-full", s.color)} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-5 space-y-3">
        {STATUS.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
              <span className="text-foreground/80">{s.label}</span>
            </span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Recent orders table
// -----------------------------------------------------------------------------

type OrderRow = {
  id: string;
  customer: string;
  items: number;
  total: string;
  status: "Pending" | "Preparing" | "Out for delivery" | "Delivered" | "Cancelled";
  time: string;
};

const ORDERS: OrderRow[] = [
  { id: "#DZ-10428", customer: "Ahmed Raza", items: 3, total: "PKR 2,140", status: "Preparing", time: "2m ago" },
  { id: "#DZ-10427", customer: "Sara Khan", items: 5, total: "PKR 3,890", status: "Pending", time: "6m ago" },
  { id: "#DZ-10426", customer: "Bilal Ahmed", items: 2, total: "PKR 1,260", status: "Out for delivery", time: "12m ago" },
  { id: "#DZ-10425", customer: "Hina Malik", items: 4, total: "PKR 2,720", status: "Delivered", time: "24m ago" },
  { id: "#DZ-10424", customer: "Usman Tariq", items: 1, total: "PKR 780", status: "Cancelled", time: "31m ago" },
  { id: "#DZ-10423", customer: "Ayesha Iqbal", items: 6, total: "PKR 4,510", status: "Delivered", time: "42m ago" },
];

const STATUS_STYLE: Record<OrderRow["status"], string> = {
  Pending: "bg-warning/20 text-warning-foreground",
  Preparing: "bg-info/15 text-info",
  "Out for delivery": "bg-primary/20 text-foreground",
  Delivered: "bg-success/15 text-success-foreground",
  Cancelled: "bg-destructive/15 text-destructive",
};

function RecentOrders() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <div className="font-display text-lg font-black">Recent Orders</div>
          <div className="text-xs text-muted-foreground">Live feed from the last hour</div>
        </div>
        <Button variant="ghost" size="sm" className="rounded-lg">
          View all
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-semibold">Order</th>
              <th className="px-2 py-3 font-semibold">Customer</th>
              <th className="px-2 py-3 font-semibold">Items</th>
              <th className="px-2 py-3 font-semibold">Total</th>
              <th className="px-2 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 text-right font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((o) => (
              <tr key={o.id} className="border-t border-border/50 transition-colors hover:bg-muted/40">
                <td className="px-6 py-3 font-mono text-xs font-semibold">{o.id}</td>
                <td className="px-2 py-3">{o.customer}</td>
                <td className="px-2 py-3 tabular-nums text-muted-foreground">{o.items}</td>
                <td className="px-2 py-3 font-semibold tabular-nums">{o.total}</td>
                <td className="px-2 py-3">
                  <Badge className={cn("rounded-full font-semibold", STATUS_STYLE[o.status])} variant="secondary">
                    {o.status}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-right text-xs text-muted-foreground">{o.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Latest customers
// -----------------------------------------------------------------------------

const CUSTOMERS = [
  { name: "Zainab Fatima", email: "zainab@example.com", orders: 12, joined: "Today" },
  { name: "Kamran Ali", email: "kamran@example.com", orders: 4, joined: "Today" },
  { name: "Noor Shahid", email: "noor@example.com", orders: 1, joined: "Yesterday" },
  { name: "Rehan Qureshi", email: "rehan@example.com", orders: 8, joined: "Yesterday" },
  { name: "Aiman Sheikh", email: "aiman@example.com", orders: 2, joined: "2d ago" },
];

function LatestCustomers() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <div className="font-display text-lg font-black">Latest Customers</div>
          <div className="text-xs text-muted-foreground">New sign-ups</div>
        </div>
        <Users className="h-4 w-4 text-muted-foreground" />
      </div>
      <ul className="divide-y divide-border/60">
        {CUSTOMERS.map((c) => (
          <li key={c.email} className="flex items-center gap-3 px-6 py-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/20 text-xs font-bold">
                {c.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{c.name}</div>
              <div className="truncate text-xs text-muted-foreground">{c.email}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums">{c.orders}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.joined}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Top selling items
// -----------------------------------------------------------------------------

const TOP_ITEMS = [
  { name: "Zinger Burger", sold: 148, revenue: "PKR 88,800" },
  { name: "Crispy Wings (12 pc)", sold: 96, revenue: "PKR 62,400" },
  { name: "Loaded Fries", sold: 84, revenue: "PKR 33,600" },
  { name: "Peri Peri Rice Bowl", sold: 72, revenue: "PKR 50,400" },
  { name: "Family Feast", sold: 41, revenue: "PKR 102,500" },
];

function TopSellingItems() {
  const max = Math.max(...TOP_ITEMS.map((i) => i.sold));
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <div className="font-display text-lg font-black">Top Selling Items</div>
          <div className="text-xs text-muted-foreground">This week</div>
        </div>
        <Flame className="h-4 w-4 text-primary" />
      </div>
      <ul className="space-y-4 p-6">
        {TOP_ITEMS.map((item) => (
          <li key={item.name}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-semibold">{item.name}</span>
              <span className="text-xs text-muted-foreground">
                {item.sold} sold · <span className="font-semibold text-foreground">{item.revenue}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                style={{ width: `${(item.sold / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Quick actions
// -----------------------------------------------------------------------------

const ACTIONS = [
  { label: "Add menu item", icon: Plus, tone: "bg-primary/15 text-foreground" },
  { label: "Create coupon", icon: Ticket, tone: "bg-info/15 text-info" },
  { label: "New promo banner", icon: Sparkles, tone: "bg-warning/20 text-warning-foreground" },
  { label: "Dispatch order", icon: Truck, tone: "bg-success/15 text-success-foreground" },
  { label: "Mark order ready", icon: CheckCircle2, tone: "bg-primary/15 text-foreground" },
  { label: "Manage staff", icon: Users, tone: "bg-muted text-foreground" },
];

function QuickActions() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-1)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-display text-lg font-black">Quick Actions</div>
          <div className="text-xs text-muted-foreground">Shortcuts to common tasks</div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-2)]"
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-lg", a.tone)}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page composition
// -----------------------------------------------------------------------------

export function AdminDashboardContent() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of today's kitchen performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl">
            Export
          </Button>
          <Button className="rounded-xl">
            <Plus className="h-4 w-4" /> New order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {STATS.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <OrderStatusOverview />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentOrders />
        </div>
        <LatestCustomers />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopSellingItems />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}
