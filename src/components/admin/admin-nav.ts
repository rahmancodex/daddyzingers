import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  LayoutGrid,
  Users,
  TicketPercent,
  Megaphone,
  BarChart3,
  Settings,
  ShieldCheck,
  ScrollText,
  Rocket,
  ClipboardCheck,
  XCircle,
  ChefHat,
  PackageCheck,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

export type AdminNavGroup = "overview" | "operations" | "catalog" | "marketing" | "insights" | "system";

export type AdminNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  group: AdminNavGroup;
  /** Optional search params to preset a filter. */
  search?: Record<string, string>;
};

export const ADMIN_NAV_GROUPS: Array<{ id: AdminNavGroup; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "operations", label: "Operations" },
  { id: "catalog", label: "Catalog" },
  { id: "marketing", label: "Marketing" },
  { id: "insights", label: "Insights" },
  { id: "system", label: "System" },
];

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, group: "overview" },
  { label: "Orders", to: "/admin/orders", icon: ShoppingBag, group: "operations" },
  { label: "Kitchen Display", to: "/admin/kitchen", icon: ChefHat, group: "operations" },
  { label: "Preparing", to: "/admin/orders", icon: ChefHat, group: "operations", search: { status: "preparing" } },
  { label: "Ready", to: "/admin/orders", icon: CheckCircle2, group: "operations", search: { status: "ready" } },
  { label: "Delivered", to: "/admin/orders", icon: PackageCheck, group: "operations", search: { status: "delivered" } },
  { label: "Cancelled", to: "/admin/orders", icon: XCircle, group: "operations", search: { status: "cancelled" } },
  { label: "Customers", to: "/admin/customers", icon: Users, group: "operations" },
  { label: "Menu", to: "/admin/menu", icon: UtensilsCrossed, group: "catalog" },
  { label: "Categories", to: "/admin/categories", icon: LayoutGrid, group: "catalog" },
  { label: "Coupons", to: "/admin/coupons", icon: TicketPercent, group: "marketing" },
  { label: "Promo Banners", to: "/admin/promo-banners", icon: Megaphone, group: "marketing" },
  { label: "Reports", to: "/admin/reports", icon: BarChart3, group: "insights" },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText, group: "insights" },
  { label: "Staff & Access", to: "/admin/staff", icon: ShieldCheck, group: "system" },
  { label: "Settings", to: "/admin/settings", icon: Settings, group: "system" },
  { label: "Production", to: "/admin/production", icon: Rocket, group: "system" },
  { label: "Launch Checklist", to: "/admin/launch", icon: ClipboardCheck, group: "system" },
];

