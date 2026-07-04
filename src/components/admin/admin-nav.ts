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
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Orders", to: "/admin/orders", icon: ShoppingBag },
  { label: "Menu", to: "/admin/menu", icon: UtensilsCrossed },
  { label: "Categories", to: "/admin/categories", icon: LayoutGrid },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Coupons", to: "/admin/coupons", icon: TicketPercent },
  { label: "Promo Banners", to: "/admin/promo-banners", icon: Megaphone },
  { label: "Reports", to: "/admin/reports", icon: BarChart3 },
  { label: "Staff & Access", to: "/admin/staff", icon: ShieldCheck },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];
