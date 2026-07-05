import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Clock,
  History,
  Plus,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  TicketPercent,
  ShieldCheck,
  LayoutGrid,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_NAV, ADMIN_NAV_GROUPS } from "./admin-nav";
import {
  hasPermission,
  ROUTE_PERMISSION,
  type AppRole,
  type Permission,
} from "@/lib/rbac";
import { adminListOrders } from "@/lib/admin-orders.functions";
import { adminListCustomers } from "@/lib/admin-customers.functions";
import { adminListMenuItems } from "@/lib/admin-menu.functions";
import { adminListCoupons } from "@/lib/admin-promos.functions";
import { adminListStaff } from "@/lib/admin-staff.functions";
import { adminListCategories } from "@/lib/admin-menu.functions";

const RECENT_KEY = "admin:cmdk:recent";
const RECENT_MAX = 6;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles?: AppRole[];
};

type EntityHit = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  perm: Permission;
  onSelect: () => void;
};

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((v) => typeof v === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  if (typeof window === "undefined") return;
  const t = term.trim();
  if (!t || t.length < 2) return;
  const prev = readRecent().filter((v) => v.toLowerCase() !== t.toLowerCase());
  const next = [t, ...prev].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/**
 * Global admin command palette — keyboard-first navigation (⌘K / Ctrl-K).
 * Permission-filtered, reuses admin nav registry + existing entity server fns.
 */
export function CommandPalette({ open, onOpenChange, roles }: Props) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>(() => readRecent());
  const debouncedQuery = useDebounced(query.trim(), 220);
  const hasQuery = debouncedQuery.length >= 2;

  // Reset query when dialog closes so it opens fresh next time.
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setRecent(readRecent());
    }
  }, [open]);

  const listOrders = useServerFn(adminListOrders);
  const listCustomers = useServerFn(adminListCustomers);
  const listMenu = useServerFn(adminListMenuItems);
  const listCoupons = useServerFn(adminListCoupons);
  const listStaff = useServerFn(adminListStaff);
  const listCategories = useServerFn(adminListCategories);

  const canOrders = hasPermission(roles, "orders.view");
  const canCustomers = hasPermission(roles, "customers.view");
  const canMenu = hasPermission(roles, "menu.view");
  const canCoupons = hasPermission(roles, "coupons.manage");
  const canStaff = hasPermission(roles, "staff.view");
  const canCategories = hasPermission(roles, "categories.manage");

  const go = React.useCallback(
    (to: string, search?: Record<string, string>) => {
      if (query.trim().length >= 2) pushRecent(query);
      onOpenChange(false);
      requestAnimationFrame(() => {
        navigate({ to, search: (search ?? {}) as never });
      });
    },
    [navigate, onOpenChange, query],
  );

  // Nav items (permission-filtered)
  const navItems = React.useMemo(
    () =>
      ADMIN_NAV.filter((item) => {
        const perm = ROUTE_PERMISSION[item.to];
        return !perm || hasPermission(roles, perm);
      }),
    [roles],
  );
  const groupedNav = React.useMemo(() => {
    const map = new Map<string, typeof navItems>();
    for (const it of navItems) {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    }
    return ADMIN_NAV_GROUPS.map((g) => ({ ...g, items: map.get(g.id) ?? [] })).filter(
      (g) => g.items.length > 0,
    );
  }, [navItems]);

  // ── Entity queries (each gated on permission + hasQuery) ────────────────
  const orders = useQuery({
    queryKey: ["cmdk", "orders", debouncedQuery],
    queryFn: () => listOrders({ data: { search: debouncedQuery, limit: 6 } }),
    enabled: open && hasQuery && canOrders,
    staleTime: 30_000,
  });
  const customers = useQuery({
    queryKey: ["cmdk", "customers"],
    queryFn: () => listCustomers(),
    enabled: open && hasQuery && canCustomers,
    staleTime: 60_000,
  });
  const menu = useQuery({
    queryKey: ["cmdk", "menu", debouncedQuery],
    queryFn: () => listMenu({ data: { search: debouncedQuery, limit: 6 } }),
    enabled: open && hasQuery && canMenu,
    staleTime: 30_000,
  });
  const coupons = useQuery({
    queryKey: ["cmdk", "coupons"],
    queryFn: () => listCoupons(),
    enabled: open && hasQuery && canCoupons,
    staleTime: 60_000,
  });
  const staff = useQuery({
    queryKey: ["cmdk", "staff"],
    queryFn: () => listStaff(),
    enabled: open && hasQuery && canStaff,
    staleTime: 60_000,
  });
  const categories = useQuery({
    queryKey: ["cmdk", "categories"],
    queryFn: () => listCategories(),
    enabled: open && hasQuery && canCategories,
    staleTime: 60_000,
  });

  const q = debouncedQuery.toLowerCase();

  const orderHits: EntityHit[] = React.useMemo(() => {
    if (!hasQuery || !canOrders) return [];
    return (orders.data ?? []).slice(0, 6).map((o) => ({
      id: o.id,
      label: `#${o.order_number}`,
      hint: [o.customer_name, o.status, `Rs ${o.total_pkr}`].filter(Boolean).join(" · "),
      icon: ShoppingBag,
      perm: "orders.view",
      onSelect: () => go("/admin/orders", { q: o.order_number }),
    }));
  }, [orders.data, hasQuery, canOrders, go]);

  const customerHits: EntityHit[] = React.useMemo(() => {
    if (!hasQuery || !canCustomers) return [];
    const rows = (customers.data ?? []).filter((c) => {
      const name = (c.full_name ?? "").toLowerCase();
      const phone = (c.phone ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
    return rows.slice(0, 6).map((c) => ({
      id: c.id,
      label: c.full_name ?? c.email ?? c.phone ?? "Customer",
      hint: [c.email, c.phone].filter(Boolean).join(" · "),
      icon: Users,
      perm: "customers.view",
      onSelect: () => go("/admin/customers"),
    }));
  }, [customers.data, hasQuery, canCustomers, q, go]);

  const menuHits: EntityHit[] = React.useMemo(() => {
    if (!hasQuery || !canMenu) return [];
    return (menu.data ?? []).slice(0, 6).map((m: any) => ({
      id: m.id,
      label: m.name,
      hint: [m.category_name, m.is_active ? "Active" : "Hidden"].filter(Boolean).join(" · "),
      icon: UtensilsCrossed,
      perm: "menu.view",
      onSelect: () => go("/admin/menu"),
    }));
  }, [menu.data, hasQuery, canMenu, go]);

  const couponHits: EntityHit[] = React.useMemo(() => {
    if (!hasQuery || !canCoupons) return [];
    const rows = (coupons.data ?? []).filter((c: any) => {
      const code = (c.code ?? "").toLowerCase();
      const label = (c.label ?? "").toLowerCase();
      return code.includes(q) || label.includes(q);
    });
    return rows.slice(0, 6).map((c: any) => ({
      id: c.id,
      label: c.code,
      hint: c.label,
      icon: TicketPercent,
      perm: "coupons.manage" as Permission,
      onSelect: () => go("/admin/coupons"),
    }));
  }, [coupons.data, hasQuery, canCoupons, q, go]);

  const staffHits: EntityHit[] = React.useMemo(() => {
    if (!hasQuery || !canStaff) return [];
    const rows = (staff.data ?? []).filter((s: any) => {
      const name = (s.full_name ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const phone = (s.phone ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
    return rows.slice(0, 6).map((s: any) => ({
      id: s.user_id,
      label: s.full_name ?? s.email ?? "Staff member",
      hint: [s.top_role, s.email].filter(Boolean).join(" · "),
      icon: ShieldCheck,
      perm: "staff.view" as Permission,
      onSelect: () => go("/admin/staff"),
    }));
  }, [staff.data, hasQuery, canStaff, q, go]);

  const categoryHits: EntityHit[] = React.useMemo(() => {
    if (!hasQuery || !canCategories) return [];
    const rows = (categories.data ?? []).filter((c: any) =>
      (c.name ?? "").toLowerCase().includes(q),
    );
    return rows.slice(0, 5).map((c: any) => ({
      id: c.id,
      label: c.name,
      hint: c.is_active ? "Active" : "Hidden",
      icon: LayoutGrid,
      perm: "categories.manage" as Permission,
      onSelect: () => go("/admin/categories"),
    }));
  }, [categories.data, hasQuery, canCategories, q, go]);

  const isSearching =
    hasQuery &&
    (orders.isFetching ||
      customers.isFetching ||
      menu.isFetching ||
      coupons.isFetching ||
      staff.isFetching ||
      categories.isFetching);

  const totalHits =
    orderHits.length +
    customerHits.length +
    menuHits.length +
    couponHits.length +
    staffHits.length +
    categoryHits.length;

  const quickActions = React.useMemo(() => {
    const acts: Array<{ id: string; label: string; icon: LucideIcon; onSelect: () => void }> = [];
    if (canMenu) acts.push({ id: "qa-menu-new", label: "New menu item", icon: Plus, onSelect: () => go("/admin/menu") });
    if (canCoupons) acts.push({ id: "qa-coupon-new", label: "New coupon", icon: Plus, onSelect: () => go("/admin/coupons") });
    if (canStaff) acts.push({ id: "qa-staff-new", label: "Invite staff", icon: Plus, onSelect: () => go("/admin/staff") });
    if (canOrders) acts.push({ id: "qa-orders-live", label: "Live orders (Preparing)", icon: ShoppingBag, onSelect: () => go("/admin/orders", { status: "preparing" }) });
    return acts;
  }, [canMenu, canCoupons, canStaff, canOrders, go]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search orders, customers, menu, coupons, staff…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
              Searching…
            </span>
          ) : hasQuery ? (
            "No matches."
          ) : (
            "Start typing to search."
          )}
        </CommandEmpty>

        {/* Idle state: recent + quick actions + nav */}
        {!hasQuery && recent.length > 0 && (
          <CommandGroup heading="Recent searches">
            {recent.map((r) => (
              <CommandItem
                key={`recent-${r}`}
                value={`recent ${r}`}
                onSelect={() => setQuery(r)}
                className="gap-3"
              >
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{r}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">recent</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!hasQuery && quickActions.length > 0 && (
          <>
            {recent.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Quick actions">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <CommandItem key={a.id} value={a.label} onSelect={a.onSelect} className="gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{a.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {/* Search state: entity hits */}
        {hasQuery && totalHits > 0 && (
          <>
            {orderHits.length > 0 && (
              <CommandGroup heading="Orders">
                {orderHits.map((h) => (
                  <EntityRow key={`o-${h.id}`} hit={h} />
                ))}
              </CommandGroup>
            )}
            {customerHits.length > 0 && (
              <>
                {orderHits.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Customers">
                  {customerHits.map((h) => (
                    <EntityRow key={`c-${h.id}`} hit={h} />
                  ))}
                </CommandGroup>
              </>
            )}
            {menuHits.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Menu items">
                  {menuHits.map((h) => (
                    <EntityRow key={`m-${h.id}`} hit={h} />
                  ))}
                </CommandGroup>
              </>
            )}
            {categoryHits.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Categories">
                  {categoryHits.map((h) => (
                    <EntityRow key={`cat-${h.id}`} hit={h} />
                  ))}
                </CommandGroup>
              </>
            )}
            {couponHits.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Coupons">
                  {couponHits.map((h) => (
                    <EntityRow key={`cp-${h.id}`} hit={h} />
                  ))}
                </CommandGroup>
              </>
            )}
            {staffHits.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Staff">
                  {staffHits.map((h) => (
                    <EntityRow key={`s-${h.id}`} hit={h} />
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}

        {/* Nav always available */}
        <CommandSeparator />
        {groupedNav.map((g, gi) => (
          <React.Fragment key={g.id}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={g.label}>
              {g.items.map((item) => {
                const Icon = item.icon;
                const filterKey = item.search ? Object.values(item.search)[0] : undefined;
                const active =
                  !filterKey &&
                  (item.to === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.to || pathname.startsWith(item.to + "/"));
                return (
                  <CommandItem
                    key={`${item.to}-${filterKey ?? "base"}`}
                    value={`${item.label} ${filterKey ?? ""}`}
                    keywords={[item.label, item.to.replace("/admin/", ""), filterKey ?? ""]}
                    onSelect={() => go(item.to, item.search)}
                    className="gap-3"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {filterKey && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {filterKey}
                      </span>
                    )}
                    {active && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        <Clock className="h-3 w-3" /> current
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

function EntityRow({ hit }: { hit: EntityHit }) {
  const Icon = hit.icon;
  return (
    <CommandItem
      value={`${hit.label} ${hit.hint ?? ""}`}
      onSelect={hit.onSelect}
      className="gap-3"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{hit.label}</span>
        {hit.hint && (
          <span className="truncate text-[11px] text-muted-foreground">{hit.hint}</span>
        )}
      </span>
    </CommandItem>
  );
}
