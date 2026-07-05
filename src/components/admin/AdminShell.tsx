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
import { Input } from "@/components/ui/input";
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

import { ADMIN_NAV } from "./admin-nav";
import { useServerFn } from "@tanstack/react-start";
import { adminMe } from "@/lib/admin-staff.functions";
import { adminLogClientEvent } from "@/lib/admin-audit.functions";
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
  failOpen,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  roles?: AppRole[];
  failOpen?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = ADMIN_NAV.filter((item) => {
    if (failOpen) return true;
    const perm = ROUTE_PERMISSION[item.to];
    return !perm || hasPermission(roles, perm);
  });
  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const active =
          item.to === "/admin"
            ? pathname === "/admin"
            : pathname === item.to || pathname.startsWith(item.to + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? item.label : undefined}
          >
            {active && (
              <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />
            )}
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-foreground")} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function useAdminAuth() {
  const navigate = useNavigate();
  const meFn = useServerFn(adminMe);
  const logFn = useServerFn(adminLogClientEvent);
  const [state, setState] = React.useState<{
    status: "loading" | "ok" | "unauth" | "error";
    email?: string;
    userId?: string;
    roles?: AppRole[];
    topRole?: AppRole | null;
    errorMessage?: string;
  }>({ status: "loading" });

  const loadRoles = React.useCallback(
    async (userId: string, email?: string) => {
      try {
        const me = await meFn();
        setState({
          status: "ok",
          email,
          userId,
          roles: me.roles as AppRole[],
          topRole: (me.topRole ?? null) as AppRole | null,
        });
      } catch (err) {
        console.error("[admin] failed to load roles:", err);
        setState({
          status: "error",
          email,
          userId,
          errorMessage: err instanceof Error ? err.message : "Failed to load permissions.",
        });
      }
    },
    [meFn],
  );

  const retry = React.useCallback(() => {
    setState((s) => ({ ...s, status: "loading" }));
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setState({ status: "unauth" });
        navigate({ to: "/admin/login", replace: true });
        return;
      }
      loadRoles(data.user.id, data.user.email ?? undefined);
    });
  }, [loadRoles, navigate]);

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.user) {
        setState({ status: "unauth" });
        navigate({ to: "/admin/login", replace: true });
        return;
      }
      loadRoles(data.user.id, data.user.email ?? undefined);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setState({ status: "unauth" });
        navigate({ to: "/admin/login", replace: true });
      } else {
        loadRoles(session.user.id, session.user.email ?? undefined);
        if (event === "SIGNED_IN") {
          logFn({ data: { action: "login", module: "auth", summary: "Admin sign-in" } }).catch(
            () => {},
          );
        }
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, loadRoles, logFn]);

  // Realtime role revocation: if any row in user_roles for the current user
  // changes, re-verify permissions. Deleted/downgraded users are kicked out.
  React.useEffect(() => {
    if (state.status !== "ok" || !state.userId) return;
    const uid = state.userId;
    const channel = supabase
      .channel(`user-roles-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${uid}` },
        () => loadRoles(uid, state.email),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.status, state.userId, state.email, loadRoles]);

  return { ...state, retry };
}


function Topbar({
  onOpenMobileNav,
  email,
  onSignOut,
}: {
  onOpenMobileNav: () => void;
  email?: string;
  onSignOut: () => void;
}) {
  const initials = React.useMemo(() => {
    if (!email) return "AD";
    return email.slice(0, 2).toUpperCase();
  }, [email]);

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

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders, customers, items…"
          className="h-10 rounded-xl border-transparent bg-muted/60 pl-9 focus-visible:border-input focus-visible:bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

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

  const onSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/admin/login", replace: true });
  };

  if (auth.status === "loading" || auth.status === "unauth") {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40 p-6">
        <div className="max-w-md rounded-3xl border border-border/70 bg-background p-8 text-center shadow-[var(--shadow-2)]">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-black">Couldn't verify permissions</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {auth.errorMessage ?? "A temporary error prevented us from loading your role."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={auth.retry}>Retry</Button>
            <Button variant="outline" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const roles = auth.roles ?? [];
  const permitted = !requiredPermission || hasPermission(roles, requiredPermission);

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
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
            aria-label="Collapse sidebar"
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
        />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {permitted ? children : <AccessDenied requiredPermission={requiredPermission!} />}
        </main>
      </div>
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
