import * as React from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu as MenuIcon,
  Search,
  UserRound,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { ADMIN_NAV, ADMIN_NAV_GROUPS, type AdminNavGroup } from "./admin-nav";
import { useServerFn } from "@tanstack/react-start";
import { adminLogClientEvent } from "@/lib/admin-audit.functions";
import { requireAdmin } from "@/lib/require-admin";
import { ShieldAlert } from "lucide-react";
import {
  hasPermission,
  ROUTE_PERMISSION,
  ROLE_BADGE_CLASS,
  ROLE_LABEL,
  type AppRole,
  type Permission,
} from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { CommandPalette } from "./CommandPalette";
import { NotificationsBell } from "./NotificationsBell";

function BrandMark({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-2)]">
        <span className="font-display text-base font-black">DZ</span>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate text-sm font-black leading-tight">Daddy Zingers</div>
          <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
            Admin Panel
          </div>
        </div>
      )}
    </div>
  );
}

function NavList({
  collapsed,
  onNavigate,
  roles,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  roles?: AppRole[];
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = ADMIN_NAV.filter((item) => {
    const perm = ROUTE_PERMISSION[item.to];
    return !perm || hasPermission(roles, perm);
  });
  const byGroup = new Map<AdminNavGroup, typeof items>();
  for (const it of items) {
    const arr = byGroup.get(it.group) ?? [];
    arr.push(it);
    byGroup.set(it.group, arr);
  }
  return (
    <nav className="flex flex-col gap-4 px-2">
      {ADMIN_NAV_GROUPS.map((g) => {
        const groupItems = byGroup.get(g.id);
        if (!groupItems || groupItems.length === 0) return null;
        return (
          <div key={g.id} className="flex flex-col gap-0.5">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {g.label}
              </div>
            )}
            {collapsed && <div className="mx-2 my-1 h-px bg-border/60" />}
            {groupItems.map((item) => {
              const itemFilter = item.search ? Object.values(item.search)[0] : undefined;
              const active =
                item.to === "/admin"
                  ? pathname === "/admin"
                  : itemFilter
                    ? false // filter-preset items don't own the "active" state; base route does
                    : pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={`${item.to}-${itemFilter ?? "base"}`}
                  to={item.to}
                  search={item.search as never}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-foreground/[0.06] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.6)]"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-2",
                    itemFilter && "pl-6 text-[13px]",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {active && !collapsed && (
                    <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <Icon
                    className={cn(
                      "h-[17px] w-[17px] shrink-0 transition-colors",
                      active ? "text-foreground" : "text-muted-foreground/80 group-hover:text-foreground",
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function useAdminAuth() {
  const navigate = useNavigate();
  const logFn = useServerFn(adminLogClientEvent);
  const [state, setState] = React.useState<{
    status: "loading" | "ok";
    email?: string;
    userId?: string;
    roles?: AppRole[];
    topRole?: AppRole | null;
  }>({ status: "loading" });

  const goRedirect = React.useCallback(
    (to: "/profile" | "/", message: string) => {
      toast.error(message);
      navigate({ to, replace: true });
    },
    [navigate],
  );

  const goLogin = React.useCallback(() => {
    navigate({ to: "/admin/login", replace: true });
  }, [navigate]);

  const check = React.useCallback(async () => {
    const result = await requireAdmin();
    if (!result.authenticated) {
      goLogin();
      return;
    }
    if (result.errored) {
      goRedirect("/", "Unable to verify your access. Please try again.");
      return;
    }
    if (!result.isAdmin) {
      goRedirect("/profile", "You don't have permission to access the Admin Panel.");
      return;
    }
    setState({
      status: "ok",
      email: result.email,
      userId: result.userId,
      roles: result.roles,
      topRole: result.role,
    });
  }, [goLogin, goRedirect]);

  React.useEffect(() => {
    let mounted = true;
    check().catch((e) => {
      if (!mounted) return;
      console.error("[admin] gate check failed", e);
      goRedirect("/", "Unable to verify your access. Please try again.");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setState({ status: "loading" });
        goLogin();
        return;
      }
      if (event === "SIGNED_IN") {
        logFn({ data: { action: "login", module: "auth", summary: "Admin sign-in" } }).catch(
          () => {},
        );
        check();
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [check, goLogin, goRedirect, logFn]);

  // Realtime role revocation
  React.useEffect(() => {
    if (state.status !== "ok" || !state.userId) return;
    const uid = state.userId;
    const channel = supabase
      .channel(`user-roles-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${uid}` },
        () => check(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.status, state.userId, check]);

  return state;
}



function Topbar({
  onOpenMobileNav,
  email,
  onSignOut,
  onOpenPalette,
  roles,
}: {
  onOpenMobileNav: () => void;
  email?: string;
  onSignOut: () => void;
  onOpenPalette: () => void;
  roles?: AppRole[];
}) {
  const initials = React.useMemo(() => {
    if (!email) return "AD";
    return email.slice(0, 2).toUpperCase();
  }, [email]);
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobileNav}
        className="lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon className="h-5 w-5" />
      </Button>

      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Open command palette"
        className="group relative hidden h-10 max-w-md flex-1 items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:border-input focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:flex"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Search or jump to…</span>
        <kbd className="pointer-events-none hidden items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-flex">
          <span className="text-[11px]">{isMac ? "⌘" : "Ctrl"}</span>K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenPalette}
          className="rounded-xl md:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>

        <NotificationsBell roles={roles} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-accent"
              aria-label="Account menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <div className="text-xs font-semibold">Admin</div>
                <div className="max-w-[140px] truncate text-[11px] text-muted-foreground">
                  {email ?? "—"}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel className="truncate">{email ?? "Admin"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserRound className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell className="h-4 w-4" /> Notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AdminShell({
  children,
  requiredPermission,
}: {
  children: React.ReactNode;
  requiredPermission?: Permission;
}) {
  const auth = useAdminAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/admin/login", replace: true });
  };

  if (auth.status !== "ok") {
    return <AdminBootScreen />;
  }



  const roles = auth.roles ?? [];
  const permitted = !requiredPermission || hasPermission(roles, requiredPermission);

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/70 bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-[248px]",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/70 px-2">
          <BrandMark collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-8 w-8 shrink-0 rounded-lg lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <NavList collapsed={collapsed} roles={roles} />
        </div>

        <div className="border-t border-border/70 p-2">
          {auth.topRole && !collapsed && (
            <div className="mb-2 px-2">
              <Badge
                variant="outline"
                className={cn("capitalize", ROLE_BADGE_CLASS[auth.topRole])}
              >
                {ROLE_LABEL[auth.topRole]}
              </Badge>
            </div>
          )}
          <button
            onClick={onSignOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <span className="sr-only" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] border-r border-border/70 bg-sidebar p-0">
          <div className="flex h-16 items-center border-b border-border/70 px-4">
            <BrandMark />
          </div>
          <div className="py-3">
            <NavList roles={roles} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[248px]",
        )}
      >
        <Topbar
          onOpenMobileNav={() => setMobileOpen(true)}
          email={auth.email}
          onSignOut={onSignOut}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main id="admin-main" className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {permitted ? children : <AccessDenied requiredPermission={requiredPermission!} />}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} roles={roles} />
    </div>
  );
}

function AccessDenied({ requiredPermission }: { requiredPermission: Permission }) {
  return (
    <div className="mx-auto grid max-w-lg place-items-center py-16 text-center">
      <div className="rounded-3xl border border-border/70 bg-background p-8 shadow-[var(--shadow-2)]">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-black">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have permission to view this page. Ask an Owner or Admin to grant you the{" "}
          <span className="font-mono text-foreground">{requiredPermission}</span> permission.
        </p>
        <Link
          to="/admin"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function AdminBootScreen() {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-gradient-to-br from-background via-background to-muted/60">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-2)]">
            <span className="font-display text-xl font-black">DZ</span>
          </div>
          <div className="absolute -inset-2 animate-ping rounded-3xl border border-primary/40" />
        </div>
        <div className="text-center">
          <div className="font-display text-base font-black tracking-tight">Daddy Zingers</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Verifying access…
          </div>
        </div>
        <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
      <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}
