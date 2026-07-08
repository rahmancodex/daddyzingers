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
  Store,
  Home,
  Images,
  LayoutTemplate,
  Star,
  Video,
  Monitor,
  Smartphone,
  FolderOpen,
  Layers,
  type LucideIcon,
} from "lucide-react";

export type AdminNavGroup =
  | "overview"
  | "operations"
  | "catalog"
  | "marketing"
  | "content"
  | "insights"
  | "system";

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
  { id: "content", label: "Content Management" },
  { id: "insights", label: "Insights" },
  { id: "system", label: "System" },
];

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, group: "overview" },
  { label: "Orders", to: "/admin/orders", icon: ShoppingBag, group: "operations" },
  { label: "POS", to: "/admin/pos", icon: Store, group: "operations" },
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
  // Content Management
  { label: "Homepage", to: "/admin/content/homepage", icon: Home, group: "content" },
  { label: "Hero Slider", to: "/admin/content/hero-slider", icon: Images, group: "content" },
  { label: "Homepage Sections", to: "/admin/content/sections", icon: Layers, group: "content" },
  { label: "Customer Reviews", to: "/admin/content/reviews", icon: Star, group: "content" },
  { label: "Video Testimonials", to: "/admin/content/video-testimonials", icon: Video, group: "content" },
  { label: "Homepage Layout", to: "/admin/content/layout/homepage", icon: LayoutTemplate, group: "content" },
  { label: "Desktop Layout", to: "/admin/content/layout/desktop", icon: Monitor, group: "content" },
  { label: "Mobile Layout", to: "/admin/content/layout/mobile", icon: Smartphone, group: "content" },
  { label: "Media Library", to: "/admin/content/media", icon: FolderOpen, group: "content" },
  // Insights + System
  { label: "Reports", to: "/admin/reports", icon: BarChart3, group: "insights" },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText, group: "insights" },
  { label: "Staff & Access", to: "/admin/staff", icon: ShieldCheck, group: "system" },
  { label: "Settings", to: "/admin/settings", icon: Settings, group: "system" },
  { label: "Production", to: "/admin/production", icon: Rocket, group: "system" },
  { label: "Launch Checklist", to: "/admin/launch", icon: ClipboardCheck, group: "system" },
];


