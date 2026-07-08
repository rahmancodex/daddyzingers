// Shared RBAC definitions (client + server safe — no runtime imports)

export type AppRole =
  | "owner"
  | "admin"
  | "manager"
  | "kitchen"
  | "cashier"
  | "rider"
  | "support"
  | "cms_editor"
  | "customer";

export const STAFF_ROLES: AppRole[] = [
  "owner",
  "admin",
  "manager",
  "kitchen",
  "cashier",
  "rider",
  "support",
  "cms_editor",
];

export const ROLE_ORDER: Record<AppRole, number> = {
  owner: 1,
  admin: 2,
  manager: 3,
  cashier: 4,
  kitchen: 5,
  rider: 6,
  support: 7,
  cms_editor: 8,
  customer: 9,
};

export type Permission =
  | "dashboard.view"
  | "orders.view"
  | "orders.update"
  | "orders.refund"
  | "menu.view"
  | "menu.manage"
  | "categories.manage"
  | "coupons.manage"
  | "banners.manage"
  | "customers.view"
  | "customers.manage"
  | "reports.view"
  | "settings.manage"
  | "branches.manage"
  | "staff.view"
  | "staff.manage"
  | "audit.view"
  | "deliveries.view"
  | "production.manage"
  | "cms.view"
  | "cms.manage"
  | "cms.publish";


const FULL: Permission[] = [
  "dashboard.view",
  "orders.view",
  "orders.update",
  "orders.refund",
  "menu.view",
  "menu.manage",
  "categories.manage",
  "coupons.manage",
  "banners.manage",
  "customers.view",
  "customers.manage",
  "reports.view",
  "settings.manage",
  "branches.manage",
  "staff.view",
  "staff.manage",
  "audit.view",
  "deliveries.view",
  "production.manage",
  "cms.view",
  "cms.manage",
  "cms.publish",
];

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  owner: FULL,
  admin: FULL.filter((p) => p !== "production.manage"),

  manager: [
    "dashboard.view",
    "orders.view",
    "orders.update",
    "menu.view",
    "menu.manage",
    "categories.manage",
    "customers.view",
    "reports.view",
    "deliveries.view",
  ],
  kitchen: ["dashboard.view", "orders.view", "orders.update"],
  cashier: ["dashboard.view", "orders.view", "orders.update", "orders.refund"],
  rider: ["dashboard.view", "deliveries.view", "orders.view"],
  support: ["dashboard.view", "customers.view", "orders.view"],
  cms_editor: ["dashboard.view", "cms.view", "cms.manage", "cms.publish"],
  customer: [],
};

export function hasPermission(roles: AppRole[] | undefined, perm: Permission): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => ROLE_PERMISSIONS[r]?.includes(perm));
}

export function hasAnyRole(roles: AppRole[] | undefined, needed: AppRole[]): boolean {
  if (!roles) return false;
  return roles.some((r) => needed.includes(r));
}

export function topRole(roles: AppRole[] | undefined): AppRole | null {
  if (!roles || roles.length === 0) return null;
  return [...roles].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b])[0];
}

export function canEditRole(actor: AppRole[] | undefined, target: AppRole): boolean {
  const top = topRole(actor);
  if (!top) return false;
  if (top === "owner") return true;
  if (top === "admin") return target !== "owner" && target !== "admin";
  return false;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  kitchen: "Kitchen",
  cashier: "Cashier",
  rider: "Rider",
  support: "Support",
  cms_editor: "CMS Editor",
  customer: "Customer",
};

export const ROLE_BADGE_CLASS: Record<AppRole, string> = {
  owner: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  admin: "bg-primary/15 text-primary border-primary/30",
  manager: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  kitchen: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  cashier: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  rider: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  support: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  cms_editor: "bg-pink-500/15 text-pink-600 border-pink-500/30",
  customer: "bg-muted text-muted-foreground border-border",
};

// Route → required permission map used by AdminShell to enforce access
export const ROUTE_PERMISSION: Record<string, Permission> = {
  "/admin": "dashboard.view",
  "/admin/orders": "orders.view",
  "/admin/kitchen": "orders.view",
  "/admin/pos": "orders.update",
  "/admin/menu": "menu.view",
  "/admin/categories": "categories.manage",
  "/admin/customers": "customers.view",
  "/admin/coupons": "coupons.manage",
  "/admin/promo-banners": "banners.manage",
  "/admin/reports": "reports.view",
  "/admin/settings": "settings.manage",
  "/admin/staff": "staff.view",
  "/admin/audit-logs": "audit.view",
  "/admin/production": "production.manage",
  "/admin/launch": "production.manage",
  "/admin/content": "cms.view",
  "/admin/content/homepage": "cms.manage",
  "/admin/content/hero-slider": "cms.manage",
  "/admin/content/sections": "cms.manage",
  "/admin/content/reviews": "cms.manage",
  "/admin/content/video-testimonials": "cms.manage",
  "/admin/content/layout/homepage": "cms.manage",
  "/admin/content/layout/mobile": "cms.manage",
  "/admin/content/layout/desktop": "cms.manage",
  "/admin/content/media": "cms.manage",
};
