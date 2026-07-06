import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Banknote,
  Bike,
  ChevronDown,
  CreditCard,
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Ticket,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import {
  formatPKR,
  useMenuData,
  type MenuItem,
  type OptionChoice,
  type OptionGroup,
} from "@/lib/menu";
import {
  computeTotals,
  resolveDeliveryFee,
  type AppliedCoupon,
  type DeliveryMethod,
} from "@/lib/checkout-store";
import { useDeliveryPricing } from "@/lib/use-delivery-pricing";
import { validateCoupon } from "@/lib/coupons";
import { placeOrder } from "@/lib/orders.functions";
import { adminListCustomers, type AdminCustomerRow } from "@/lib/admin-customers.functions";

import { PageHeader } from "./ui/page-header";
import {
  posActions,
  usePOSCart,
  usePOSCustomer,
  usePOSSubtotal,
  usePOSSuspended,
  type POSChoice,
  type POSLine,
} from "@/lib/pos-store";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                 */
/* ------------------------------------------------------------------ */

type BranchRow = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  pickup_available: boolean;
  delivery_available: boolean;
  delivery_charges: number | null;
  estimated_delivery_minutes: number | null;
  sort_order: number;
};

function useActiveBranches() {
  return useQuery({
    queryKey: ["public", "branches", "active"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select(
          "id,name,city,address,phone,pickup_available,delivery_available,delivery_charges,estimated_delivery_minutes,sort_order",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BranchRow[];
    },
  });
}

type ReceiptData = {
  order_number: string;
  total_pkr: number;
  created_at: string;
  status: string;
  cart: POSLine[];
  customer_name: string;
  customer_phone: string;
  method: DeliveryMethod;
  payment_method: "cod" | "card" | "wallet";
  branch_name: string | null;
  discount: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  subtotal: number;
};

/* ------------------------------------------------------------------ */
/*  Item composer — sizes + option groups                             */
/* ------------------------------------------------------------------ */

function ItemComposer({
  item,
  categoryOptions,
  open,
  onOpenChange,
  onAdd,
}: {
  item: MenuItem | null;
  categoryOptions: Record<string, OptionGroup[]>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (args: {
    item: MenuItem;
    qty: number;
    sizeId: string | null;
    sizeLabel: string | null;
    basePriceOverride?: number;
    customizations: POSChoice[];
    upgrades: POSChoice[];
    notes: string;
  }) => void;
}) {
  const [qty, setQty] = React.useState(1);
  const [sizeId, setSizeId] = React.useState<string | null>(null);
  const [picks, setPicks] = React.useState<Record<string, Set<string>>>({});
  const [notes, setNotes] = React.useState("");

  const groups: OptionGroup[] = React.useMemo(() => {
    if (!item) return [];
    return item.options ?? categoryOptions[item.category] ?? [];
  }, [item, categoryOptions]);

  React.useEffect(() => {
    if (!item) return;
    setQty(1);
    setSizeId(item.sizes?.[0]?.id ?? null);
    setPicks({});
    setNotes("");
  }, [item?.id]);

  if (!item) return null;

  const size = item.sizes?.find((s) => s.id === sizeId) ?? null;
  const basePrice = size?.price ?? item.price;

  const flat: OptionChoice[] = [];
  for (const g of groups) {
    const ids = picks[g.id] ?? new Set();
    for (const c of g.choices) if (ids.has(c.id)) flat.push(c);
  }
  const addons = flat.reduce((s, c) => s + c.priceDelta, 0);
  const unit = basePrice + addons;

  const togglePick = (group: OptionGroup, choiceId: string) => {
    setPicks((prev) => {
      const cur = new Set(prev[group.id] ?? []);
      if (group.type === "single") {
        cur.clear();
        cur.add(choiceId);
      } else {
        if (cur.has(choiceId)) cur.delete(choiceId);
        else cur.add(choiceId);
      }
      return { ...prev, [group.id]: cur };
    });
  };

  const missing = groups.filter((g) => g.required && !(picks[g.id]?.size ?? 0)).map((g) => g.label);
  const canAdd = missing.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          {item.shortDescription && (
            <DialogDescription>{item.shortDescription}</DialogDescription>
          )}
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {item.sizes && item.sizes.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Size
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {item.sizes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSizeId(s.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition",
                      sizeId === s.id
                        ? "border-primary bg-primary/10 font-semibold"
                        : "hover:border-primary/50",
                    )}
                  >
                    <div>{s.label}</div>
                    <div className="text-xs text-muted-foreground">{formatPKR(s.price)}</div>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {groups.map((g) => (
            <fieldset key={g.id}>
              <legend className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g.label}
                {g.required && <span className="text-destructive">*</span>}
                <span className="ml-auto normal-case text-[10px] text-muted-foreground/70">
                  {g.type === "single" ? "Pick one" : "Pick any"}
                </span>
              </legend>
              <div className="grid grid-cols-1 gap-1.5">
                {g.choices.map((c) => {
                  const active = picks[g.id]?.has(c.id) ?? false;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePick(g, c.id)}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-sm transition",
                        active
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/50",
                      )}
                    >
                      <span>{c.label}</span>
                      {c.priceDelta > 0 && (
                        <span className="text-xs text-muted-foreground">
                          +{formatPKR(c.priceDelta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div>
            <Label className="text-xs">Special instructions</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="No onions, extra sauce..."
              className="mt-1 h-16 text-sm"
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="h-9 w-9"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setQty((q) => Math.min(50, q + 1))}
              aria-label="Increase quantity"
              className="h-9 w-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="h-10"
            disabled={!canAdd}
            onClick={() => {
              onAdd({
                item,
                qty,
                sizeId: size?.id ?? null,
                sizeLabel: size?.label ?? null,
                basePriceOverride: basePrice,
                customizations: flat.map((c) => ({
                  id: c.id,
                  label: c.label,
                  price: c.priceDelta,
                })),
                upgrades: [],
                notes,
              });
              onOpenChange(false);
            }}
          >
            {canAdd
              ? `Add ${qty} · ${formatPKR(unit * qty)}`
              : `Choose ${missing.join(", ")}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer picker                                                   */
/* ------------------------------------------------------------------ */

function CustomerPicker({ disabled }: { disabled?: boolean }) {
  const customer = usePOSCustomer();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const listCustomers = useServerFn(adminListCustomers);

  const query = useQuery({
    queryKey: ["pos", "customers"],
    queryFn: () => listCustomers(),
    enabled: open,
    staleTime: 60_000,
  });

  const results = React.useMemo(() => {
    const rows: AdminCustomerRow[] = query.data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return rows.slice(0, 30);
    return rows
      .filter(
        (r) =>
          (r.full_name ?? "").toLowerCase().includes(s) ||
          (r.phone ?? "").toLowerCase().includes(s) ||
          (r.email ?? "").toLowerCase().includes(s),
      )
      .slice(0, 30);
  }, [query.data, q]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {customer.name.trim() || "Walk-in customer"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {customer.phone || (customer.id ? customer.email ?? "" : "No contact")}
          </div>
        </div>
        {customer.id || customer.name || customer.phone ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => posActions.clearCustomer()}
            disabled={disabled}
            aria-label="Clear customer"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="h-8" disabled={disabled}>
              Change
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Customer</SheetTitle>
              <SheetDescription>
                Search an existing customer or type walk-in details below.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, phone or email"
                  className="h-9 pl-8"
                  autoFocus
                />
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
                {query.isLoading ? (
                  <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                  </div>
                ) : query.isError ? (
                  <div className="p-3 text-xs text-muted-foreground">
                    Customer search unavailable — use walk-in below.
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No matches</div>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        posActions.setCustomer({
                          id: c.id,
                          name: c.full_name ?? "",
                          phone: c.phone ?? "",
                          email: c.email,
                        });
                        setOpen(false);
                      }}
                      className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      <div className="font-medium">{c.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.phone ?? "no phone"}
                        {c.total_orders ? ` · ${c.total_orders} orders` : ""}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Walk-in customer
                </div>
                <WalkInForm onSaved={() => setOpen(false)} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function WalkInForm({ onSaved }: { onSaved: () => void }) {
  const c = usePOSCustomer();
  const [name, setName] = React.useState(c.id ? "" : c.name);
  const [phone, setPhone] = React.useState(c.id ? "" : c.phone);
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9"
          placeholder="Customer name"
        />
      </div>
      <div>
        <Label className="text-xs">Phone (optional)</Label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-9"
          inputMode="tel"
          placeholder="03xx-xxxxxxx"
        />
      </div>
      <Button
        size="sm"
        className="w-full"
        disabled={name.trim().length < 2}
        onClick={() => {
          posActions.setCustomer({
            id: null,
            name: name.trim(),
            phone: phone.trim(),
            email: null,
          });
          onSaved();
        }}
      >
        Use walk-in
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main POS component                                                */
/* ------------------------------------------------------------------ */

export function POSContent() {
  const menu = useMenuData();
  const pricingQ = useDeliveryPricing();
  const pricing = pricingQ.data;
  const branchesQ = useActiveBranches();
  const branches = branchesQ.data ?? [];

  const cart = usePOSCart();
  const customer = usePOSCustomer();
  const subtotal = usePOSSubtotal();
  const suspended = usePOSSuspended();

  const [activeCategory, setActiveCategory] = React.useState<string>("");
  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [composerItem, setComposerItem] = React.useState<MenuItem | null>(null);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [editingLineKey, setEditingLineKey] = React.useState<string | null>(null);
  const [mobileTab, setMobileTab] = React.useState<"menu" | "cart">("menu");
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [receipt, setReceipt] = React.useState<ReceiptData | null>(null);

  const [method, setMethod] = React.useState<DeliveryMethod>("pickup");
  const [branchId, setBranchId] = React.useState<string | null>(null);
  const [payment, setPayment] = React.useState<"cod" | "card" | "wallet">("cod");
  const [paid, setPaid] = React.useState<boolean>(true);
  const [couponCode, setCouponCode] = React.useState("");
  const [couponBusy, setCouponBusy] = React.useState(false);
  const [coupon, setCoupon] = React.useState<AppliedCoupon | null>(null);
  const [notes, setNotes] = React.useState("");
  const [addressLine, setAddressLine] = React.useState("");
  const [addressCity, setAddressCity] = React.useState("");
  const [placing, setPlacing] = React.useState(false);

  const placeOrderFn = useServerFn(placeOrder);

  // Default category
  React.useEffect(() => {
    if (!activeCategory && menu.categories.length > 0) {
      setActiveCategory(menu.categories[0].id);
    }
  }, [menu.categories, activeCategory]);

  // Default branch = first active
  React.useEffect(() => {
    if (!branchId && branches.length > 0) setBranchId(branches[0].id);
  }, [branches, branchId]);

  const selectedBranch = branches.find((b) => b.id === branchId) ?? null;

  // Method availability
  const deliveryAvailable = (pricing?.deliveryEnabled ?? true) && (selectedBranch?.delivery_available ?? true);
  const pickupAvailable = (pricing?.pickupEnabled ?? true) && (selectedBranch?.pickup_available ?? true);
  React.useEffect(() => {
    if (!pricing) return;
    if (method === "delivery" && !deliveryAvailable && pickupAvailable) setMethod("pickup");
    else if (method === "pickup" && !pickupAvailable && deliveryAvailable) setMethod("delivery");
  }, [pricing, method, deliveryAvailable, pickupAvailable]);

  const deliveryFee = React.useMemo(
    () =>
      pricing
        ? resolveDeliveryFee({
            method,
            subtotal,
            pricing,
            branchFee: selectedBranch?.delivery_charges ?? null,
          })
        : 0,
    [pricing, method, subtotal, selectedBranch],
  );

  const totals = React.useMemo(
    () => computeTotals({ subtotal, coupon, tip: 0, deliveryFee }),
    [subtotal, coupon, deliveryFee],
  );

  // Barcode-scanner friendly: hitting Enter in search when a single item matches adds it.
  const filteredItems = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    const base = s
      ? menu.items.filter(
          (i) =>
            i.isAvailable &&
            (i.name.toLowerCase().includes(s) ||
              i.tags.some((t) => t.toLowerCase().includes(s)) ||
              i.id.toLowerCase() === s),
        )
      : menu.items.filter((i) => i.isAvailable && i.category === activeCategory);
    return base;
  }, [menu.items, search, activeCategory]);

  const openItem = React.useCallback(
    (item: MenuItem) => {
      const hasChoice =
        (item.sizes && item.sizes.length > 1) ||
        ((item.options ?? menu.categoryOptions[item.category] ?? []).some(
          (g) => g.choices.length > 0,
        ));
      if (!hasChoice) {
        posActions.add({
          item,
          qty: 1,
          sizeId: item.sizes?.[0]?.id ?? null,
          sizeLabel: item.sizes?.[0]?.label ?? null,
          basePriceOverride: item.sizes?.[0]?.price ?? item.price,
          customizations: [],
          upgrades: [],
          notes: "",
        });
      } else {
        setComposerItem(item);
        setComposerOpen(true);
      }
    },
    [menu.categoryOptions],
  );

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (filteredItems.length === 1) {
      const it = filteredItems[0];
      openItem(it);
      setSearch("");
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponBusy(true);
    try {
      const res = await validateCoupon(couponCode, subtotal);
      if (res.ok) {
        setCoupon(res.coupon);
        toast.success(`Coupon "${res.coupon.code}" applied`);
      } else {
        toast.error(res.error);
      }
    } finally {
      setCouponBusy(false);
    }
  };

  const clearCoupon = () => {
    setCoupon(null);
    setCouponCode("");
  };

  const editLine = (line: POSLine) => {
    const item = menu.byId.get(line.itemId);
    if (!item) {
      toast.error("Item is no longer on the menu");
      return;
    }
    posActions.remove(line.key);
    setEditingLineKey(line.key);
    setComposerItem(item);
    setComposerOpen(true);
  };

  const canPlace =
    cart.length > 0 &&
    !!branchId &&
    (method !== "delivery" || addressLine.trim().length >= 4) &&
    (customer.id !== null || customer.name.trim().length >= 2 || method !== "delivery");

  const handlePlace = async () => {
    if (!canPlace || placing) return;
    setPlacing(true);
    try {
      const order = await placeOrderFn({
        data: {
          items: cart.map((l) => ({
            product_id: l.itemId,
            name: l.name,
            qty: l.qty,
            unit_price_pkr: l.unitPrice,
            options: {
              customizations: l.customizations,
              upgrades: l.upgrades,
              notes: l.notes || undefined,
            },
          })),
          subtotal_pkr: subtotal,
          delivery_fee_pkr: totals.deliveryFee,
          tax_pkr: totals.tax,
          discount_pkr: totals.discount,
          total_pkr: totals.total,
          payment_method: payment,
          fulfillment_method: method,
          schedule_at: null,
          coupon_code: coupon?.code ?? null,
          address_snapshot:
            method === "delivery"
              ? {
                  label: "POS delivery",
                  recipient_name: customer.name || null,
                  phone: customer.phone || null,
                  address_line: addressLine,
                  city: addressCity || (selectedBranch?.city ?? ""),
                  area: null,
                  notes: null,
                }
              : method === "pickup"
                ? {
                    label: "POS pickup",
                    recipient_name: customer.name || "Walk-in",
                    phone: customer.phone || null,
                    address_line: `Pickup · ${selectedBranch?.name ?? ""}`,
                    city: selectedBranch?.city ?? "",
                    area: null,
                    notes: null,
                  }
                : null,
          notes: [
            `POS · ${paid ? "Paid" : "Pay later"}`,
            notes.trim() ? notes.trim() : null,
          ]
            .filter(Boolean)
            .join(" · "),
          special_instructions: null,
          branch_id: branchId,
        },
      });

      const rd: ReceiptData = {
        order_number: order.order_number,
        total_pkr: order.total_pkr,
        created_at: order.created_at,
        status: order.status,
        cart,
        customer_name: customer.name || "Walk-in",
        customer_phone: customer.phone,
        method,
        payment_method: payment,
        branch_name: selectedBranch?.name ?? null,
        discount: totals.discount,
        deliveryFee: totals.deliveryFee,
        serviceFee: totals.serviceFee,
        tax: totals.tax,
        subtotal,
      };

      setReceipt(rd);
      posActions.clear();
      posActions.clearCustomer();
      setCoupon(null);
      setCouponCode("");
      setNotes("");
      setAddressLine("");
      setAddressCity("");
      toast.success(`Order ${order.order_number} placed`);
    } catch (e) {
      toast.error("Could not place order", {
        description: e instanceof Error ? e.message : "Please retry.",
      });
    } finally {
      setPlacing(false);
    }
  };

  /* ---------- render helpers ---------- */

  const MenuPanel = (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border bg-card">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search or scan barcode…"
            className="h-10 pl-8"
            aria-label="Search menu or scan barcode"
          />
        </div>
        <div className="mt-2 -mx-1 overflow-x-auto">
          <div className="flex gap-1 px-1">
            {menu.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCategory(c.id);
                  setSearch("");
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  activeCategory === c.id && !search
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {menu.items.length === 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="grid place-items-center py-16 text-sm text-muted-foreground">
            No items match "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => openItem(it)}
                className="group flex flex-col rounded-xl border bg-background p-2 text-left transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Add ${it.name}, ${formatPKR(it.price)}`}
              >
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                  {it.image ? (
                    <img
                      src={it.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="mt-2 line-clamp-2 text-xs font-semibold leading-tight">
                  {it.name}
                </div>
                <div className="mt-1 text-xs font-bold text-primary">
                  {formatPKR(it.price)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const CartLine = ({ l }: { l: POSLine }) => (
    <li className="flex items-start gap-2 rounded-lg border bg-background p-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="min-w-0 flex-1 truncate text-sm font-semibold">{l.name}</div>
          <div className="shrink-0 text-xs font-bold tabular-nums">
            {formatPKR(l.unitPrice * l.qty)}
          </div>
        </div>
        {(l.sizeLabel || l.customizations.length > 0) && (
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {[l.sizeLabel, ...l.customizations.map((c) => c.label)].filter(Boolean).join(" · ")}
          </div>
        )}
        {l.notes && (
          <div className="mt-0.5 truncate text-[11px] italic text-muted-foreground">
            "{l.notes}"
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7"
            onClick={() => posActions.updateQty(l.key, l.qty - 1)}
            aria-label={`Decrease ${l.name}`}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-6 text-center text-xs font-semibold tabular-nums">{l.qty}</span>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7"
            onClick={() => posActions.updateQty(l.key, l.qty + 1)}
            aria-label={`Increase ${l.name}`}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-1 h-7 px-2 text-[11px]"
            onClick={() => editLine(l)}
          >
            Edit
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto h-7 w-7 text-destructive"
            onClick={() => posActions.remove(l.key)}
            aria-label={`Remove ${l.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );

  const CartPanel = (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border bg-card">
      <div className="space-y-3 border-b p-3">
        <CustomerPicker disabled={placing} />

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Branch
            </span>
            <Select value={branchId ?? ""} onValueChange={(v) => setBranchId(v)}>
              <SelectTrigger className="h-9" aria-label="Branch">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fulfillment
            </span>
            <div className="flex overflow-hidden rounded-md border">
              <button
                type="button"
                onClick={() => setMethod("pickup")}
                disabled={!pickupAvailable}
                className={cn(
                  "flex-1 px-2 py-1.5 text-xs font-medium transition disabled:opacity-40",
                  method === "pickup" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
                aria-pressed={method === "pickup"}
              >
                <Store className="mx-auto h-3.5 w-3.5" />
                Pickup
              </button>
              <button
                type="button"
                onClick={() => setMethod("delivery")}
                disabled={!deliveryAvailable}
                className={cn(
                  "flex-1 border-l px-2 py-1.5 text-xs font-medium transition disabled:opacity-40",
                  method === "delivery" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
                aria-pressed={method === "delivery"}
              >
                <Bike className="mx-auto h-3.5 w-3.5" />
                Delivery
              </button>
            </div>
          </label>
        </div>

        {method === "delivery" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="Delivery address"
              className="h-9 text-sm"
              aria-label="Delivery address"
            />
            <Input
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              placeholder="City"
              className="h-9 text-sm"
              aria-label="City"
            />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {cart.length === 0 ? (
          <div className="grid place-items-center py-14 text-center text-sm text-muted-foreground">
            <ShoppingCart className="mb-2 h-8 w-8 opacity-40" />
            Cart is empty
          </div>
        ) : (
          <ul className="space-y-2">
            {cart.map((l) => (
              <CartLine key={l.key} l={l} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 border-t p-3">
        {/* Coupon */}
        <div className="flex items-center gap-1.5">
          {coupon ? (
            <div className="flex flex-1 items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-xs">
              <Ticket className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-semibold">{coupon.code}</span>
              <span className="ml-auto tabular-nums text-emerald-700 dark:text-emerald-400">
                −{formatPKR(totals.discount)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={clearCoupon}
                aria-label="Remove coupon"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="h-9 text-sm"
                aria-label="Coupon code"
                disabled={cart.length === 0}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={applyCoupon}
                disabled={couponBusy || cart.length === 0 || !couponCode.trim()}
              >
                {couponBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
              </Button>
            </>
          )}
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Order note (optional)"
          className="h-14 text-xs"
          maxLength={200}
        />

        {/* Totals */}
        <dl className="space-y-1 text-xs">
          <Row label="Subtotal" value={formatPKR(subtotal)} />
          <Row label="Service fee" value={formatPKR(totals.serviceFee)} />
          {method === "delivery" && (
            <Row label="Delivery" value={formatPKR(totals.deliveryFee)} />
          )}
          {totals.discount > 0 && (
            <Row label="Discount" value={`−${formatPKR(totals.discount)}`} accent="emerald" />
          )}
          {totals.tax > 0 && <Row label="Tax" value={formatPKR(totals.tax)} />}
          <div className="mt-1 flex items-baseline justify-between border-t pt-1.5">
            <dt className="text-sm font-semibold">Total</dt>
            <dd className="font-display text-lg font-black tabular-nums">
              {formatPKR(totals.total)}
            </dd>
          </div>
        </dl>

        {/* Payment */}
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { k: "cod", l: "Cash", i: Banknote },
              { k: "card", l: "Card", i: CreditCard },
              { k: "wallet", l: "Online", i: Wallet },
            ] as const
          ).map((p) => (
            <button
              key={p.k}
              type="button"
              onClick={() => setPayment(p.k)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md border py-1.5 text-[11px] font-medium transition",
                payment === p.k
                  ? "border-primary bg-primary/10 text-foreground"
                  : "hover:border-primary/50",
              )}
              aria-pressed={payment === p.k}
            >
              <p.i className="h-4 w-4" />
              {p.l}
            </button>
          ))}
        </div>

        <div className="flex overflow-hidden rounded-md border text-xs">
          <button
            type="button"
            onClick={() => setPaid(true)}
            className={cn(
              "flex-1 py-1.5",
              paid ? "bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-400" : "hover:bg-muted",
            )}
            aria-pressed={paid}
          >
            Mark Paid
          </button>
          <button
            type="button"
            onClick={() => setPaid(false)}
            className={cn(
              "flex-1 border-l py-1.5",
              !paid ? "bg-warning/15 font-semibold text-warning-foreground" : "hover:bg-muted",
            )}
            aria-pressed={!paid}
          >
            Pay Later
          </button>
        </div>

        <Button
          className="h-12 w-full text-base font-semibold"
          disabled={!canPlace || placing}
          onClick={handlePlace}
        >
          {placing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing…
            </>
          ) : (
            <>Place Order · {formatPKR(totals.total)}</>
          )}
        </Button>
        {!canPlace && cart.length > 0 && (
          <p className="text-[11px] text-destructive">
            {!branchId
              ? "Select a branch"
              : method === "delivery" && addressLine.trim().length < 4
                ? "Enter a delivery address"
                : "Add customer info"}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-6rem)] min-h-0 flex-col gap-3">
      <PageHeader
        title="Point of Sale"
        description="In-store ordering — reuses menu, pricing, coupons and order flow."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => posActions.clear()}
              disabled={cart.length === 0}
              className="h-9"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => posActions.suspend()}
              disabled={cart.length === 0}
              className="h-9"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Suspend</span>
            </Button>
            <Sheet open={suspendOpen} onOpenChange={setSuspendOpen}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-9">
                  Held
                  {suspended.length > 0 && (
                    <Badge variant="secondary" className="ml-1 tabular-nums">
                      {suspended.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Suspended tickets</SheetTitle>
                  <SheetDescription>Resume a held cart to continue.</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  {suspended.length === 0 ? (
                    <div className="rounded-md border p-6 text-center text-xs text-muted-foreground">
                      Nothing held.
                    </div>
                  ) : (
                    suspended.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 rounded-lg border bg-background p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{t.label}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {t.cart.length} item{t.cart.length === 1 ? "" : "s"} ·{" "}
                            {new Date(t.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (cart.length > 0) posActions.suspend();
                            posActions.resume(t.id);
                            setSuspendOpen(false);
                          }}
                        >
                          Resume
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => posActions.dropSuspended(t.id)}
                          aria-label="Discard ticket"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        }
      />

      {/* Mobile tabs */}
      <div className="md:hidden">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as "menu" | "cart")}>
          <TabsList className="w-full">
            <TabsTrigger value="menu" className="flex-1">
              Menu
            </TabsTrigger>
            <TabsTrigger value="cart" className="flex-1">
              Cart
              {cart.length > 0 && (
                <Badge variant="secondary" className="ml-1 tabular-nums">
                  {cart.reduce((n, l) => n + l.qty, 0)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Layout */}
      <div className="min-h-0 flex-1">
        <div className="hidden h-full gap-3 md:grid md:grid-cols-[minmax(0,1fr)_22rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
          {MenuPanel}
          {CartPanel}
        </div>
        <div className="md:hidden h-full">
          {mobileTab === "menu" ? MenuPanel : CartPanel}
        </div>
      </div>

      <ItemComposer
        item={composerItem}
        categoryOptions={menu.categoryOptions}
        open={composerOpen}
        onOpenChange={(v) => {
          setComposerOpen(v);
          if (!v) {
            setComposerItem(null);
            setEditingLineKey(null);
          }
        }}
        onAdd={(args) => {
          posActions.add(args);
          setEditingLineKey(null);
        }}
      />

      <ReceiptDialog
        receipt={receipt}
        onClose={() => setReceipt(null)}
      />
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums font-medium",
          accent === "emerald" && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Receipt                                                           */
/* ------------------------------------------------------------------ */

function ReceiptDialog({
  receipt,
  onClose,
}: {
  receipt: ReceiptData | null;
  onClose: () => void;
}) {
  if (!receipt) return null;
  const print = () => {
    const w = window.open("", "pos-receipt", "width=380,height=640");
    if (!w) return;
    const rows = receipt.cart
      .map(
        (l) => `
        <tr>
          <td>${escapeHtml(l.name)}${l.sizeLabel ? ` (${escapeHtml(l.sizeLabel)})` : ""}
            ${l.customizations.length ? `<div style="font-size:10px;color:#555">${l.customizations.map((c) => escapeHtml(c.label)).join(", ")}</div>` : ""}
            ${l.notes ? `<div style="font-size:10px;color:#555;font-style:italic">${escapeHtml(l.notes)}</div>` : ""}
          </td>
          <td style="text-align:center">${l.qty}</td>
          <td style="text-align:right">${formatPKR(l.unitPrice * l.qty)}</td>
        </tr>`,
      )
      .join("");
    w.document.write(`<!doctype html><html><head><title>Receipt ${receipt.order_number}</title>
      <style>
        body{font-family:ui-monospace,Menlo,monospace;padding:12px;font-size:12px;color:#000}
        h1{font-size:16px;margin:0 0 4px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        td{padding:2px 0;vertical-align:top}
        .totals td{padding:1px 0}
        .r{text-align:right}
        hr{border:none;border-top:1px dashed #999;margin:8px 0}
      </style></head><body>
      <h1>Order #${receipt.order_number}</h1>
      <div>${new Date(receipt.created_at).toLocaleString()}</div>
      <div>${escapeHtml(receipt.customer_name)}${receipt.customer_phone ? ` · ${escapeHtml(receipt.customer_phone)}` : ""}</div>
      <div>${receipt.method.toUpperCase()}${receipt.branch_name ? ` · ${escapeHtml(receipt.branch_name)}` : ""}</div>
      <hr>
      <table><thead><tr><td>Item</td><td style="text-align:center">Qty</td><td class="r">Amount</td></tr></thead><tbody>${rows}</tbody></table>
      <hr>
      <table class="totals">
        <tr><td>Subtotal</td><td class="r">${formatPKR(receipt.subtotal)}</td></tr>
        <tr><td>Service</td><td class="r">${formatPKR(receipt.serviceFee)}</td></tr>
        ${receipt.method === "delivery" ? `<tr><td>Delivery</td><td class="r">${formatPKR(receipt.deliveryFee)}</td></tr>` : ""}
        ${receipt.discount ? `<tr><td>Discount</td><td class="r">−${formatPKR(receipt.discount)}</td></tr>` : ""}
        ${receipt.tax ? `<tr><td>Tax</td><td class="r">${formatPKR(receipt.tax)}</td></tr>` : ""}
        <tr><td><strong>TOTAL</strong></td><td class="r"><strong>${formatPKR(receipt.total_pkr)}</strong></td></tr>
        <tr><td>Payment</td><td class="r">${receipt.payment_method.toUpperCase()}</td></tr>
      </table>
      <hr>
      <div style="text-align:center;font-size:11px">Thank you!</div>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={!!receipt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Order #{receipt.order_number}
          </DialogTitle>
          <DialogDescription>
            {receipt.customer_name} · {receipt.method} · {receipt.payment_method.toUpperCase()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-sm">
          {receipt.cart.map((l) => (
            <div key={l.key} className="flex justify-between text-xs">
              <span className="truncate">
                {l.qty}× {l.name}
              </span>
              <span className="tabular-nums">{formatPKR(l.unitPrice * l.qty)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-baseline justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatPKR(receipt.total_pkr)}</span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={print}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                window.location.href = `/admin/orders?q=${encodeURIComponent(receipt.order_number)}`;
              }}
            >
              View order
            </Button>
            <Button onClick={onClose}>
              <Plus className="h-4 w-4" /> New order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
