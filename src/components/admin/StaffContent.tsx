import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Bike,
  ChefHat,
  Crown,
  Eye,
  KeyRound,
  LogOut,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldOff,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import {
  adminCreateStaff,
  adminDeleteStaff,
  adminForceLogout,
  adminInviteStaff,
  adminListBranchesLite,
  adminListInvitations,
  adminListStaff,
  adminResetStaffPassword,
  adminRevokeInvitation,
  adminUpdateStaff,
  type InvitationRow,
  type StaffRow,
} from "@/lib/admin-staff.functions";
import { adminMe } from "@/lib/admin-staff.functions";
import { adminListAuditLogs, type AuditLogRow } from "@/lib/admin-audit.functions";
import {
  ROLE_BADGE_CLASS,
  ROLE_LABEL,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  canEditRole,
  type AppRole,
} from "@/lib/rbac";
import { fmtRelative, initialsFrom } from "@/lib/admin-customers";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ------------------------------ helpers ------------------------------ */

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtDay(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function isOnlineToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const now = new Date();
  const d = new Date(iso);
  return (
    now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth() &&
    now.getDate() === d.getDate()
  );
}

function RoleBadge({ role }: { role: AppRole | null | undefined }) {
  if (!role) return <Badge variant="outline">—</Badge>;
  return (
    <Badge
      variant="outline"
      className={cn("capitalize font-medium", ROLE_BADGE_CLASS[role])}
    >
      {ROLE_LABEL[role]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: StaffRow["status"] }) {
  const map: Record<StaffRow["status"], string> = {
    active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    suspended: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    disabled: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <Badge variant="outline" className={cn("capitalize", map[status])}>
      {status}
    </Badge>
  );
}

function InviteStatusBadge({
  status,
  expiresAt,
}: {
  status: string;
  expiresAt: string;
}) {
  const days = daysUntil(expiresAt);
  const expired = status === "pending" && days !== null && days <= 0;
  const effective = expired ? "expired" : status;
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    accepted: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    revoked: "bg-muted text-muted-foreground border-border",
    expired: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", map[effective] ?? map.pending)}
    >
      {effective}
    </Badge>
  );
}

/* --------------------------- KPI card --------------------------- */

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "info" | "danger" | "muted";
  loading?: boolean;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    info: "bg-blue-500/10 text-blue-600",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg",
            toneMap[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">
        {loading ? <Skeleton className="h-7 w-16" /> : value}
      </div>
    </div>
  );
}

/* ============================== main ============================== */

export function StaffContent() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListStaff);
  const invListFn = useServerFn(adminListInvitations);
  const branchesFn = useServerFn(adminListBranchesLite);
  const meFn = useServerFn(adminMe);

  const meQ = useQuery({ queryKey: ["admin", "me"], queryFn: () => meFn() });
  const staffQ = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: () => listFn(),
  });
  const invQ = useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: () => invListFn(),
  });
  const branchesQ = useQuery({
    queryKey: ["admin", "branches-lite"],
    queryFn: () => branchesFn(),
  });

  const [tab, setTab] = React.useState("staff");
  const [q, setQ] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [branchFilter, setBranchFilter] = React.useState<string>("all");

  const [drawer, setDrawer] = React.useState<
    { mode: "create" | "invite" | "edit"; row?: StaffRow } | null
  >(null);
  const [profile, setProfile] = React.useState<StaffRow | null>(null);
  const [pwDialog, setPwDialog] = React.useState<StaffRow | null>(null);
  const [confirm, setConfirm] = React.useState<
    { row: StaffRow; kind: "delete" | "logout" } | null
  >(null);

  const inviteFn = useServerFn(adminInviteStaff);
  const createFn = useServerFn(adminCreateStaff);
  const updateFn = useServerFn(adminUpdateStaff);
  const resetFn = useServerFn(adminResetStaffPassword);
  const deleteFn = useServerFn(adminDeleteStaff);
  const logoutFn = useServerFn(adminForceLogout);
  const revokeFn = useServerFn(adminRevokeInvitation);

  const inviteMut = useMutation({
    mutationFn: (v: Parameters<typeof adminInviteStaff>[0]["data"]) =>
      inviteFn({ data: v }),
    onSuccess: () => {
      toast.success("Invitation sent");
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      setDrawer(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to invite"),
  });
  const createMut = useMutation({
    mutationFn: (v: Parameters<typeof adminCreateStaff>[0]["data"]) =>
      createFn({ data: v }),
    onSuccess: () => {
      toast.success("Staff created");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      setDrawer(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create staff"),
  });
  const updateMut = useMutation({
    mutationFn: (v: Parameters<typeof adminUpdateStaff>[0]["data"]) =>
      updateFn({ data: v }),
    onSuccess: () => {
      toast.success("Staff updated");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      setDrawer(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update staff"),
  });
  const resetMut = useMutation({
    mutationFn: (v: { user_id: string; password: string }) =>
      resetFn({ data: v }),
    onSuccess: () => {
      toast.success("Password reset");
      setPwDialog(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to reset password"),
  });
  const deleteMut = useMutation({
    mutationFn: (v: { user_id: string }) => deleteFn({ data: v }),
    onSuccess: () => {
      toast.success("Staff deleted");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      setConfirm(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });
  const logoutMut = useMutation({
    mutationFn: (v: { user_id: string }) => logoutFn({ data: v }),
    onSuccess: () => {
      toast.success("All sessions revoked");
      setConfirm(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to force logout"),
  });
  const revokeInvMut = useMutation({
    mutationFn: (v: { id: string }) => revokeFn({ data: v }),
    onSuccess: () => {
      toast.success("Invitation revoked");
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const resendInvMut = useMutation({
    mutationFn: (v: { email: string; role: AppRole; branch_id?: string | null }) =>
      inviteFn({ data: v }),
    onSuccess: () => {
      toast.success("Invitation resent");
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to resend"),
  });

  const myRoles = (meQ.data?.roles ?? []) as AppRole[];

  /* ---------- derived stats ---------- */
  const stats = React.useMemo(() => {
    const list = staffQ.data ?? [];
    const invs = invQ.data ?? [];
    const byRole = (role: AppRole) =>
      list.filter((s) => s.roles.includes(role)).length;
    return {
      total: list.length,
      active: list.filter((s) => s.status === "active").length,
      online: list.filter((s) => isOnlineToday(s.last_login_at)).length,
      pending: invs.filter(
        (i) => i.status === "pending" && (daysUntil(i.expires_at) ?? 0) > 0,
      ).length,
      owners: byRole("owner"),
      managers: byRole("manager"),
      kitchen: byRole("kitchen"),
      cashiers: byRole("cashier"),
      riders: byRole("rider"),
    };
  }, [staffQ.data, invQ.data]);

  const filtered = React.useMemo(() => {
    const list = staffQ.data ?? [];
    return list.filter((s) => {
      if (roleFilter !== "all" && !s.roles.includes(roleFilter as AppRole))
        return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (branchFilter !== "all") {
        if (branchFilter === "none" && s.branch_id) return false;
        if (branchFilter !== "none" && s.branch_id !== branchFilter) return false;
      }
      if (q) {
        const t = q.toLowerCase();
        if (
          !(s.full_name ?? "").toLowerCase().includes(t) &&
          !(s.email ?? "").toLowerCase().includes(t) &&
          !(s.phone ?? "").toLowerCase().includes(t)
        )
          return false;
      }
      return true;
    });
  }, [staffQ.data, q, roleFilter, statusFilter, branchFilter]);

  const invStats = React.useMemo(() => {
    const rows = invQ.data ?? [];
    let pending = 0;
    let accepted = 0;
    let expired = 0;
    for (const i of rows) {
      if (i.status === "accepted") accepted++;
      else if (i.status === "pending") {
        const d = daysUntil(i.expires_at) ?? 0;
        if (d <= 0) expired++;
        else pending++;
      } else if (i.status === "revoked") {
        // not counted separately
      }
    }
    return { pending, accepted, expired };
  }, [invQ.data]);

  const hasFilters =
    q !== "" ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    branchFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-black md:text-3xl">
            Staff &amp; Access
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage team members, roles and permissions across your branches.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDrawer({ mode: "invite" })}>
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
          <Button onClick={() => setDrawer({ mode: "create" })}>
            <Plus className="h-4 w-4" /> Add staff
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total Staff"
          value={stats.total}
          icon={Users}
          tone="primary"
          loading={staffQ.isLoading}
        />
        <KpiCard
          label="Active"
          value={stats.active}
          icon={UserCog}
          tone="success"
          loading={staffQ.isLoading}
        />
        <KpiCard
          label="Online Today"
          value={stats.online}
          icon={Activity}
          tone="info"
          loading={staffQ.isLoading}
        />
        <KpiCard
          label="Pending Invites"
          value={stats.pending}
          icon={Mail}
          tone="warning"
          loading={invQ.isLoading}
        />
        <KpiCard
          label="Owners"
          value={stats.owners}
          icon={Crown}
          tone="warning"
          loading={staffQ.isLoading}
        />
        <KpiCard
          label="Managers"
          value={stats.managers}
          icon={UserCog}
          tone="info"
          loading={staffQ.isLoading}
        />
        <KpiCard
          label="Kitchen"
          value={stats.kitchen}
          icon={ChefHat}
          tone="warning"
          loading={staffQ.isLoading}
        />
        <KpiCard
          label="Cashiers"
          value={stats.cashiers}
          icon={Wallet}
          tone="success"
          loading={staffQ.isLoading}
        />
        <KpiCard
          label="Riders"
          value={stats.riders}
          icon={Bike}
          tone="primary"
          loading={staffQ.isLoading}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="staff">
            Staff ({staffQ.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invStats.pending})
          </TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        {/* ------------------------ STAFF ------------------------ */}
        <TabsContent value="staff" className="space-y-4">
          {/* Sticky filter bar */}
          <div className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, email or phone"
                  className="pl-9"
                  aria-label="Search staff"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 md:flex md:flex-none">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="md:w-36" aria-label="Filter by role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {STAFF_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    className="md:w-36"
                    aria-label="Filter by status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger
                    className="md:w-40"
                    aria-label="Filter by branch"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    <SelectItem value="none">— No branch —</SelectItem>
                    {(branchesQ.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasFilters && (
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing {filtered.length} of {staffQ.data?.length ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setBranchFilter("all");
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {staffQ.isError ? (
            <ErrorCard
              onRetry={() =>
                qc.invalidateQueries({ queryKey: ["admin", "staff"] })
              }
              message="Couldn't load staff. Please try again."
            />
          ) : staffQ.isLoading ? (
            <div className="space-y-2 rounded-2xl border border-border/70 bg-background p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyCard
              icon={Users}
              title={hasFilters ? "No matches" : "No staff yet"}
              description={
                hasFilters
                  ? "Try adjusting the filters above."
                  : "Invite your first team member to get started."
              }
              action={
                !hasFilters ? (
                  <Button onClick={() => setDrawer({ mode: "invite" })}>
                    <UserPlus className="h-4 w-4" /> Invite staff
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-background md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last active</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => {
                      const editable = canEditRole(
                        myRoles,
                        s.top_role ?? "customer",
                      );
                      const online = isOnlineToday(s.last_login_at);
                      return (
                        <TableRow
                          key={s.user_id}
                          className="cursor-pointer"
                          onClick={() => setProfile(s)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-primary/20 text-xs font-bold">
                                    {initialsFrom(s.full_name ?? s.email, "?")}
                                  </AvatarFallback>
                                </Avatar>
                                {online && (
                                  <span
                                    aria-label="Online today"
                                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500"
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium">
                                  {s.full_name ?? "—"}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {s.email ?? "—"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.phone ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {s.roles.length === 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              ) : (
                                s.roles.map((r) => (
                                  <RoleBadge key={r} role={r} />
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.branch_name ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={s.status} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums">
                            {fmtRelative(s.last_login_at)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums">
                            {fmtDay(s.created_at)}
                          </TableCell>
                          <TableCell
                            onClick={(e) => e.stopPropagation()}
                            className="text-right"
                          >
                            <RowActions
                              row={s}
                              editable={editable}
                              onView={() => setProfile(s)}
                              onEdit={() => setDrawer({ mode: "edit", row: s })}
                              onResetPw={() => setPwDialog(s)}
                              onForceLogout={() =>
                                setConfirm({ row: s, kind: "logout" })
                              }
                              onToggleSuspend={() =>
                                updateMut.mutate({
                                  user_id: s.user_id,
                                  status:
                                    s.status === "suspended"
                                      ? "active"
                                      : "suspended",
                                })
                              }
                              onDelete={() =>
                                setConfirm({ row: s, kind: "delete" })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-2 md:hidden">
                {filtered.map((s) => {
                  const editable = canEditRole(
                    myRoles,
                    s.top_role ?? "customer",
                  );
                  const online = isOnlineToday(s.last_login_at);
                  return (
                    <div
                      key={s.user_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setProfile(s)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setProfile(s);
                        }
                      }}
                      className="rounded-2xl border border-border/70 bg-background p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/20 text-xs font-bold">
                              {initialsFrom(s.full_name ?? s.email, "?")}
                            </AvatarFallback>
                          </Avatar>
                          {online && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {s.full_name ?? "—"}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {s.email ?? "—"}
                              </div>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <RowActions
                                row={s}
                                editable={editable}
                                onView={() => setProfile(s)}
                                onEdit={() =>
                                  setDrawer({ mode: "edit", row: s })
                                }
                                onResetPw={() => setPwDialog(s)}
                                onForceLogout={() =>
                                  setConfirm({ row: s, kind: "logout" })
                                }
                                onToggleSuspend={() =>
                                  updateMut.mutate({
                                    user_id: s.user_id,
                                    status:
                                      s.status === "suspended"
                                        ? "active"
                                        : "suspended",
                                  })
                                }
                                onDelete={() =>
                                  setConfirm({ row: s, kind: "delete" })
                                }
                              />
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {s.roles.map((r) => (
                              <RoleBadge key={r} role={r} />
                            ))}
                            <StatusBadge status={s.status} />
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <div className="text-[10px] uppercase tracking-wide">
                                Branch
                              </div>
                              <div className="truncate text-foreground">
                                {s.branch_name ?? "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wide">
                                Last active
                              </div>
                              <div className="text-foreground tabular-nums">
                                {fmtRelative(s.last_login_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* ------------------------ INVITATIONS ------------------------ */}
        <TabsContent value="invitations" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <KpiCard
              label="Pending"
              value={invStats.pending}
              icon={Mail}
              tone="warning"
              loading={invQ.isLoading}
            />
            <KpiCard
              label="Accepted"
              value={invStats.accepted}
              icon={UserCog}
              tone="success"
              loading={invQ.isLoading}
            />
            <KpiCard
              label="Expired"
              value={invStats.expired}
              icon={AlertTriangle}
              tone="danger"
              loading={invQ.isLoading}
            />
          </div>

          {invQ.isError ? (
            <ErrorCard
              onRetry={() =>
                qc.invalidateQueries({ queryKey: ["admin", "invitations"] })
              }
              message="Couldn't load invitations."
            />
          ) : invQ.isLoading ? (
            <div className="space-y-2 rounded-2xl border border-border/70 bg-background p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (invQ.data ?? []).length === 0 ? (
            <EmptyCard
              icon={Mail}
              title="No invitations yet"
              description="Invite team members to see them here."
            />
          ) : (
            <InvitationsList
              rows={invQ.data ?? []}
              onRevoke={(id) => revokeInvMut.mutate({ id })}
              onResend={(i) =>
                resendInvMut.mutate({
                  email: i.email,
                  role: i.role,
                  branch_id: i.branch_id,
                })
              }
              revokingId={revokeInvMut.variables?.id ?? null}
              resendingEmail={
                resendInvMut.isPending ? resendInvMut.variables?.email ?? null : null
              }
            />
          )}
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsMatrix />
        </TabsContent>
      </Tabs>

      {/* Profile drawer (view) */}
      {profile && (
        <ProfileDrawer
          row={profile}
          onClose={() => setProfile(null)}
          onEdit={() => {
            setDrawer({ mode: "edit", row: profile });
            setProfile(null);
          }}
        />
      )}

      {/* Create / invite / edit drawer */}
      {drawer && (
        <StaffDrawer
          mode={drawer.mode}
          row={drawer.row}
          branches={branchesQ.data ?? []}
          myRoles={myRoles}
          onClose={() => setDrawer(null)}
          onInvite={(v) => inviteMut.mutate(v)}
          onCreate={(v) => createMut.mutate(v)}
          onUpdate={(v) => updateMut.mutate(v)}
          submitting={
            inviteMut.isPending || createMut.isPending || updateMut.isPending
          }
        />
      )}

      {/* Password dialog */}
      {pwDialog && (
        <PasswordDialog
          row={pwDialog}
          submitting={resetMut.isPending}
          onClose={() => setPwDialog(null)}
          onSubmit={(pw) =>
            resetMut.mutate({ user_id: pwDialog.user_id, password: pw })
          }
        />
      )}

      {/* Confirm */}
      {confirm && (
        <Dialog open onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirm.kind === "delete"
                  ? "Delete staff account?"
                  : "Force logout?"}
              </DialogTitle>
              <DialogDescription>
                {confirm.kind === "delete"
                  ? `This permanently removes ${confirm.row.email ?? "the account"} and all their access. This cannot be undone.`
                  : `Revoke every active session for ${confirm.row.email ?? "this user"} across all devices.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant={
                  confirm.kind === "delete" ? "destructive" : "default"
                }
                onClick={() =>
                  confirm.kind === "delete"
                    ? deleteMut.mutate({ user_id: confirm.row.user_id })
                    : logoutMut.mutate({ user_id: confirm.row.user_id })
                }
                disabled={deleteMut.isPending || logoutMut.isPending}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* --------------------------- Row actions --------------------------- */

function RowActions({
  row,
  editable,
  onView,
  onEdit,
  onResetPw,
  onForceLogout,
  onToggleSuspend,
  onDelete,
}: {
  row: StaffRow;
  editable: boolean;
  onView: () => void;
  onEdit: () => void;
  onResetPw: () => void;
  onForceLogout: () => void;
  onToggleSuspend: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${row.full_name ?? row.email ?? "staff"}`}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4" /> View profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit} disabled={!editable}>
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResetPw} disabled={!editable}>
          <KeyRound className="h-4 w-4" /> Reset password
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onForceLogout} disabled={!editable}>
          <LogOut className="h-4 w-4" /> Force logout
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleSuspend} disabled={!editable}>
          <ShieldOff className="h-4 w-4" />
          {row.status === "suspended" ? "Reactivate" : "Suspend"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          disabled={!editable}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --------------------------- States --------------------------- */

function EmptyCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="mt-3 font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
      <div className="mt-2 font-semibold">Something went wrong</div>
      <div className="mt-1 text-sm text-muted-foreground">{message}</div>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={onRetry}
      >
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    </div>
  );
}

/* --------------------------- Invitations list --------------------------- */

function InvitationsList({
  rows,
  onRevoke,
  onResend,
  revokingId,
  resendingEmail,
}: {
  rows: InvitationRow[];
  onRevoke: (id: string) => void;
  onResend: (i: InvitationRow) => void;
  revokingId: string | null;
  resendingEmail: string | null;
}) {
  const sorted = React.useMemo(
    () =>
      [...rows].sort((a, b) => {
        const rank = (r: InvitationRow) => {
          if (r.status === "pending") {
            const d = daysUntil(r.expires_at) ?? 0;
            return d > 0 ? 0 : 2;
          }
          if (r.status === "accepted") return 1;
          return 3;
        };
        return rank(a) - rank(b);
      }),
    [rows],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
      {/* Desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Invited by</TableHead>
              <TableHead className="w-40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((i) => {
              const days = daysUntil(i.expires_at);
              const expired = i.status === "pending" && (days ?? 0) <= 0;
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={i.role} />
                  </TableCell>
                  <TableCell>
                    <InviteStatusBadge
                      status={i.status}
                      expiresAt={i.expires_at}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    <div>{fmtDate(i.expires_at)}</div>
                    {i.status === "pending" && (
                      <div
                        className={cn(
                          "mt-0.5 text-[11px]",
                          expired
                            ? "text-destructive"
                            : (days ?? 0) <= 2
                              ? "text-amber-600"
                              : "text-muted-foreground",
                        )}
                      >
                        {expired
                          ? "Expired"
                          : `${days} day${days === 1 ? "" : "s"} left`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {i.invited_by_email ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(i.status === "pending" || expired) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResend(i)}
                          disabled={resendingEmail === i.email}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Resend
                        </Button>
                      )}
                      {i.status === "pending" && !expired && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRevoke(i.id)}
                          disabled={revokingId === i.id}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {/* Mobile */}
      <div className="grid gap-2 p-2 md:hidden">
        {sorted.map((i) => {
          const days = daysUntil(i.expires_at);
          const expired = i.status === "pending" && (days ?? 0) <= 0;
          return (
            <div
              key={i.id}
              className="rounded-xl border border-border/70 bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{i.email}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <RoleBadge role={i.role} />
                    <InviteStatusBadge
                      status={i.status}
                      expiresAt={i.expires_at}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                {i.status === "pending" ? (
                  expired ? (
                    <span className="text-destructive">
                      Expired {fmtDate(i.expires_at)}
                    </span>
                  ) : (
                    <>
                      {days} day{days === 1 ? "" : "s"} left ·{" "}
                      {fmtDate(i.expires_at)}
                    </>
                  )
                ) : (
                  fmtDate(i.expires_at)
                )}
              </div>
              {(i.status === "pending" || expired) && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onResend(i)}
                    disabled={resendingEmail === i.email}
                  >
                    <Send className="h-3.5 w-3.5" /> Resend
                  </Button>
                  {i.status === "pending" && !expired && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => onRevoke(i.id)}
                      disabled={revokingId === i.id}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- Profile Drawer --------------------------- */

function ProfileDrawer({
  row,
  onClose,
  onEdit,
}: {
  row: StaffRow;
  onClose: () => void;
  onEdit: () => void;
}) {
  const auditFn = useServerFn(adminListAuditLogs);
  const auditQ = useQuery({
    queryKey: ["admin", "staff-audit", row.user_id],
    queryFn: () => auditFn({ data: { actor_id: row.user_id, limit: 25 } }),
    staleTime: 30_000,
  });

  const perms = row.top_role ? ROLE_PERMISSIONS[row.top_role] : [];
  const online = isOnlineToday(row.last_login_at);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>Staff profile</SheetTitle>
          <SheetDescription>
            Contact, role, permissions and recent activity.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div className="relative">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary/20 text-base font-bold">
                  {initialsFrom(row.full_name ?? row.email, "?")}
                </AvatarFallback>
              </Avatar>
              {online && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold">
                {row.full_name ?? "—"}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {row.email ?? "—"}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <RoleBadge role={row.top_role} />
                <StatusBadge status={row.status} />
                {online && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  >
                    Online today
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Phone" value={row.phone ?? "—"} />
            <DetailField label="Branch" value={row.branch_name ?? "—"} />
            <DetailField label="Last active" value={fmtRelative(row.last_login_at)} />
            <DetailField label="Joined" value={fmtDay(row.created_at)} />
            <DetailField
              label="Invited by"
              value={row.created_by_email ?? "—"}
              className="col-span-2"
            />
          </div>

          {/* Roles */}
          {row.roles.length > 0 && (
            <section>
              <SectionTitle>Assigned roles</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {row.roles.map((r) => (
                  <RoleBadge key={r} role={r} />
                ))}
              </div>
            </section>
          )}

          {/* Permissions */}
          <section>
            <SectionTitle>Permissions</SectionTitle>
            {perms.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No permissions granted.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {perms.map((p) => (
                  <Badge
                    key={p}
                    variant="secondary"
                    className="font-mono text-[10px]"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section>
            <SectionTitle>Recent activity</SectionTitle>
            {auditQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : auditQ.isError ? (
              <div className="text-sm text-muted-foreground">
                Activity unavailable.
              </div>
            ) : (auditQ.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No recorded activity yet.
              </div>
            ) : (
              <ol className="space-y-2">
                {(auditQ.data ?? []).slice(0, 10).map((a: AuditLogRow) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-border/60 bg-background p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {a.summary ?? a.action}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {a.action}
                          {a.entity_type ? ` · ${a.entity_type}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {fmtRelative(a.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-background p-3",
        className,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm">{value}</div>
    </div>
  );
}

/* --------------------------- Staff form drawer --------------------------- */

function StaffDrawer({
  mode,
  row,
  branches,
  myRoles,
  onClose,
  onInvite,
  onCreate,
  onUpdate,
  submitting,
}: {
  mode: "create" | "invite" | "edit";
  row?: StaffRow;
  branches: { id: string; name: string }[];
  myRoles: AppRole[];
  onClose: () => void;
  onInvite: (v: {
    email: string;
    role: AppRole;
    branch_id?: string | null;
  }) => void;
  onCreate: (v: {
    email: string;
    password: string;
    full_name: string;
    phone?: string | null;
    role: AppRole;
    branch_id?: string | null;
  }) => void;
  onUpdate: (v: {
    user_id: string;
    full_name?: string;
    phone?: string | null;
    branch_id?: string | null;
    role?: AppRole;
    status?: "active" | "suspended" | "disabled";
    notes?: string | null;
  }) => void;
  submitting: boolean;
}) {
  const [email, setEmail] = React.useState(row?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState(row?.full_name ?? "");
  const [phone, setPhone] = React.useState(row?.phone ?? "");
  const [role, setRole] = React.useState<AppRole>(row?.top_role ?? "cashier");
  const [branchId, setBranchId] = React.useState<string>(
    row?.branch_id ?? "none",
  );
  const [status, setStatus] = React.useState<StaffRow["status"]>(
    row?.status ?? "active",
  );
  const [notes, setNotes] = React.useState("");

  const availableRoles = STAFF_ROLES.filter((r) =>
    myRoles.includes("owner") ? true : r !== "owner",
  );

  const submit = () => {
    if (mode === "invite") {
      if (!email) return toast.error("Email required");
      onInvite({
        email,
        role,
        branch_id: branchId === "none" ? null : branchId,
      });
    } else if (mode === "create") {
      if (!email || !password || !fullName)
        return toast.error("All fields required");
      onCreate({
        email,
        password,
        full_name: fullName,
        phone: phone || null,
        role,
        branch_id: branchId === "none" ? null : branchId,
      });
    } else if (mode === "edit" && row) {
      onUpdate({
        user_id: row.user_id,
        full_name: fullName,
        phone: phone || null,
        branch_id: branchId === "none" ? null : branchId,
        role,
        status,
        notes: notes || null,
      });
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 p-6 text-left">
          <SheetTitle>
            {mode === "invite"
              ? "Invite staff"
              : mode === "create"
                ? "Add staff"
                : "Edit staff"}
          </SheetTitle>
          <SheetDescription>
            {mode === "invite"
              ? "Send an email invitation. They set their own password."
              : mode === "create"
                ? "Create a staff account with a password. They can log in immediately."
                : "Update role, branch, contact and status."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {mode !== "edit" && (
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />
            </div>
          )}

          {mode === "create" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-name">Full name</Label>
                <Input
                  id="staff-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-phone">Phone</Label>
                <Input
                  id="staff-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-pw">Password</Label>
                <Input
                  id="staff-pw"
                  value={password}
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          {mode === "edit" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-name">Full name</Label>
                <Input
                  id="staff-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-phone">Phone</Label>
                <Input
                  id="staff-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as StaffRow["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-notes">Internal notes</Label>
                <Textarea
                  id="staff-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No branch —</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Permissions preview
              </span>
              <span className="tabular-nums">
                {ROLE_PERMISSIONS[role].length} granted
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {ROLE_PERMISSIONS[role].length === 0 ? (
                <span>No permissions.</span>
              ) : (
                ROLE_PERMISSIONS[role].map((p) => (
                  <Badge
                    key={p}
                    variant="secondary"
                    className="font-mono text-[10px]"
                  >
                    {p}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 bg-background/80 p-4 backdrop-blur">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PasswordDialog({
  row,
  onClose,
  onSubmit,
  submitting,
}: {
  row: StaffRow;
  onClose: () => void;
  onSubmit: (pw: string) => void;
  submitting: boolean;
}) {
  const [pw, setPw] = React.useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {row.email}. Share it with them via a secure
            channel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="new-pw">New password</Label>
          <Input
            id="new-pw"
            value={pw}
            type="password"
            onChange={(e) => setPw(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              pw.length < 8 ? toast.error("Min 8 chars") : onSubmit(pw)
            }
            disabled={submitting}
          >
            Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsMatrix() {
  const allPerms = React.useMemo(
    () =>
      Array.from(new Set(STAFF_ROLES.flatMap((r) => ROLE_PERMISSIONS[r]))).sort(),
    [],
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Read-only overview of what each role can access.
      </p>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Permission</TableHead>
                {STAFF_ROLES.map((r) => (
                  <TableHead key={r} className="text-center">
                    <RoleBadge role={r} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPerms.map((p) => (
                <TableRow key={p}>
                  <TableCell className="font-mono text-xs">{p}</TableCell>
                  {STAFF_ROLES.map((r) => (
                    <TableCell key={r} className="text-center">
                      {ROLE_PERMISSIONS[r].includes(p) ? (
                        <span
                          aria-label="Granted"
                          className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
                        />
                      ) : (
                        <span
                          aria-label="Not granted"
                          className="inline-block h-2.5 w-2.5 rounded-full bg-muted"
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
