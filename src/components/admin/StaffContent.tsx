import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  KeyRound,
  LogOut,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  ShieldOff,
  Trash2,
  UserPlus,
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
  type StaffRow,
} from "@/lib/admin-staff.functions";
import { adminMe } from "@/lib/admin-staff.functions";
import {
  ROLE_BADGE_CLASS,
  ROLE_LABEL,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  canEditRole,
  type AppRole,
} from "@/lib/rbac";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function fmtDate(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function RoleBadge({ role }: { role: AppRole | null | undefined }) {
  if (!role) return <Badge variant="outline">—</Badge>;
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", ROLE_BADGE_CLASS[role])}>
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
  return <Badge variant="outline" className={cn("capitalize", map[status])}>{status}</Badge>;
}

export function StaffContent() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListStaff);
  const invListFn = useServerFn(adminListInvitations);
  const branchesFn = useServerFn(adminListBranchesLite);
  const meFn = useServerFn(adminMe);

  const meQ = useQuery({ queryKey: ["admin", "me"], queryFn: () => meFn() });
  const staffQ = useQuery({ queryKey: ["admin", "staff"], queryFn: () => listFn() });
  const invQ = useQuery({ queryKey: ["admin", "invitations"], queryFn: () => invListFn() });
  const branchesQ = useQuery({
    queryKey: ["admin", "branches-lite"],
    queryFn: () => branchesFn(),
  });

  const [tab, setTab] = React.useState("staff");
  const [q, setQ] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const [drawer, setDrawer] = React.useState<
    { mode: "create" | "invite" | "edit"; row?: StaffRow } | null
  >(null);
  const [pwDialog, setPwDialog] = React.useState<StaffRow | null>(null);
  const [confirm, setConfirm] = React.useState<
    { row: StaffRow; kind: "delete" | "logout" } | null
  >(null);

  const inviteMut = useMutation({
    mutationFn: useServerFn(adminInviteStaff),
    onSuccess: () => {
      toast.success("Invitation sent");
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      setDrawer(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to invite"),
  });
  const createMut = useMutation({
    mutationFn: useServerFn(adminCreateStaff),
    onSuccess: () => {
      toast.success("Staff created");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      setDrawer(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create staff"),
  });
  const updateMut = useMutation({
    mutationFn: useServerFn(adminUpdateStaff),
    onSuccess: () => {
      toast.success("Staff updated");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      setDrawer(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update staff"),
  });
  const resetMut = useMutation({
    mutationFn: useServerFn(adminResetStaffPassword),
    onSuccess: () => {
      toast.success("Password reset");
      setPwDialog(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to reset password"),
  });
  const deleteMut = useMutation({
    mutationFn: useServerFn(adminDeleteStaff),
    onSuccess: () => {
      toast.success("Staff deleted");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      setConfirm(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });
  const logoutMut = useMutation({
    mutationFn: useServerFn(adminForceLogout),
    onSuccess: () => {
      toast.success("All sessions revoked");
      setConfirm(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to force logout"),
  });
  const revokeInvMut = useMutation({
    mutationFn: useServerFn(adminRevokeInvitation),
    onSuccess: () => {
      toast.success("Invitation revoked");
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const myRoles = (meQ.data?.roles ?? []) as AppRole[];

  const filtered = React.useMemo(() => {
    const list = staffQ.data ?? [];
    return list.filter((s) => {
      if (roleFilter !== "all" && !s.roles.includes(roleFilter as AppRole)) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
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
  }, [staffQ.data, q, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-black md:text-3xl">Staff & Access</h1>
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="staff">Staff ({staffQ.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invQ.data?.filter((i) => i.status === "pending").length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email or phone"
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-40">
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
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
            {staffQ.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No staff found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s) => {
                      const editable = canEditRole(myRoles, s.top_role ?? "customer");
                      return (
                        <TableRow key={s.user_id}>
                          <TableCell>
                            <div className="font-medium">{s.full_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              Added {fmtDate(s.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{s.email ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{s.phone ?? "—"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {s.roles.map((r) => (
                                <RoleBadge key={r} role={r} />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{s.branch_name ?? "—"}</TableCell>
                          <TableCell>
                            <StatusBadge status={s.status} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {fmtDate(s.last_login_at)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!editable}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDrawer({ mode: "edit", row: s })}>
                                  <Pencil className="h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setPwDialog(s)}>
                                  <KeyRound className="h-4 w-4" /> Reset password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setConfirm({ row: s, kind: "logout" })}
                                >
                                  <LogOut className="h-4 w-4" /> Force logout
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateMut.mutate({
                                      user_id: s.user_id,
                                      status: s.status === "suspended" ? "active" : "suspended",
                                    })
                                  }
                                >
                                  <ShieldOff className="h-4 w-4" />
                                  {s.status === "suspended" ? "Reactivate" : "Suspend"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setConfirm({ row: s, kind: "delete" })}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invitations">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Invited by</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invQ.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No invitations yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (invQ.data ?? []).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={i.role} />
                      </TableCell>
                      <TableCell className="capitalize">{i.status}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(i.expires_at)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {i.invited_by_email ?? "—"}
                      </TableCell>
                      <TableCell>
                        {i.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revokeInvMut.mutate({ id: i.id })}
                          >
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsMatrix />
        </TabsContent>
      </Tabs>

      {/* Drawer */}
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
          submitting={inviteMut.isPending || createMut.isPending || updateMut.isPending}
        />
      )}

      {/* Password dialog */}
      {pwDialog && (
        <PasswordDialog
          row={pwDialog}
          submitting={resetMut.isPending}
          onClose={() => setPwDialog(null)}
          onSubmit={(pw) => resetMut.mutate({ user_id: pwDialog.user_id, password: pw })}
        />
      )}

      {/* Confirm */}
      {confirm && (
        <Dialog open onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirm.kind === "delete" ? "Delete staff account?" : "Force logout?"}
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
                variant={confirm.kind === "delete" ? "destructive" : "default"}
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

// ---------- Drawer ----------
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
  onInvite: (v: { email: string; role: AppRole; branch_id?: string | null }) => void;
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
  const [branchId, setBranchId] = React.useState<string>(row?.branch_id ?? "none");
  const [status, setStatus] = React.useState<StaffRow["status"]>(row?.status ?? "active");
  const [notes, setNotes] = React.useState("");

  const availableRoles = STAFF_ROLES.filter((r) => (myRoles.includes("owner") ? true : r !== "owner"));

  const submit = () => {
    if (mode === "invite") {
      if (!email) return toast.error("Email required");
      onInvite({ email, role, branch_id: branchId === "none" ? null : branchId });
    } else if (mode === "create") {
      if (!email || !password || !fullName) return toast.error("All fields required");
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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "invite" ? "Invite staff" : mode === "create" ? "Add staff" : "Edit staff"}
          </SheetTitle>
          <SheetDescription>
            {mode === "invite"
              ? "Send an email invitation. They set their own password."
              : mode === "create"
                ? "Create a staff account with a password. They can log in immediately."
                : "Update role, branch, contact and status."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {mode !== "edit" && (
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
          )}

          {mode === "create" && (
            <>
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  value={password}
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}

          {mode === "edit" && (
            <>
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as StaffRow["status"])}>
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
              <div className="space-y-2">
                <Label>Internal notes</Label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}

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

          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="mb-1 font-semibold text-foreground">Permissions preview</div>
            <div className="flex flex-wrap gap-1">
              {ROLE_PERMISSIONS[role].map((p) => (
                <Badge key={p} variant="secondary" className="font-mono text-[10px]">
                  {p}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
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
            Set a new password for {row.email}. Share it with them via a secure channel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>New password</Label>
          <Input value={pw} type="password" onChange={(e) => setPw(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => (pw.length < 8 ? toast.error("Min 8 chars") : onSubmit(pw))}
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
  const allPerms = Array.from(
    new Set(STAFF_ROLES.flatMap((r) => ROLE_PERMISSIONS[r])),
  ).sort();
  return (
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
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
