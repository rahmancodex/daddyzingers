import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ADMIN_NAV, ADMIN_NAV_GROUPS } from "./admin-nav";
import {
  hasPermission,
  ROUTE_PERMISSION,
  type AppRole,
} from "@/lib/rbac";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles?: AppRole[];
};

/**
 * Global admin command palette — keyboard-first navigation (⌘K / Ctrl-K).
 * Permission-filtered against the current user's roles; reuses the existing
 * admin nav registry so it never drifts from the sidebar.
 */
export function CommandPalette({ open, onOpenChange, roles }: Props) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = React.useMemo(
    () =>
      ADMIN_NAV.filter((item) => {
        const perm = ROUTE_PERMISSION[item.to];
        return !perm || hasPermission(roles, perm);
      }),
    [roles],
  );

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    }
    return ADMIN_NAV_GROUPS.map((g) => ({ ...g, items: map.get(g.id) ?? [] })).filter(
      (g) => g.items.length > 0,
    );
  }, [items]);

  const go = (to: string, search?: Record<string, string>) => {
    onOpenChange(false);
    // Defer to allow dialog close animation to start
    requestAnimationFrame(() => {
      navigate({ to, search: (search ?? {}) as never });
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to page, filter or action…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {grouped.map((g, gi) => (
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
                const keywords = [item.label, item.to.replace("/admin/", ""), filterKey ?? ""];
                return (
                  <CommandItem
                    key={`${item.to}-${filterKey ?? "base"}`}
                    value={`${item.label} ${filterKey ?? ""}`}
                    keywords={keywords}
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
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        current
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
