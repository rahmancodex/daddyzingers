import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  adminCreateMenuItem,
  adminGetMenuItem,
  adminUpdateMenuItem,
  type AdminCategory,
  type AdminMenuItemDetail,
} from "@/lib/admin-menu.functions";
import { ImageUploader } from "./ImageUploader";

type Props = {
  mode: "create" | "edit" | "view";
  itemId?: string;
  categories: AdminCategory[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

type SizeDraft = { size_key: string; label: string; price_pkr: number };
type ChoiceDraft = { choice_key: string; label: string; price_delta_pkr: number };
type GroupDraft = {
  group_key: string;
  label: string;
  selection_type: "single" | "multi";
  is_required: boolean;
  max_selections?: number | null;
  choices: ChoiceDraft[];
};

type Draft = {
  name: string;
  category_id: string;
  price_pkr: number;
  short_description: string;
  long_description: string;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  sort_order: number;
  tags: string;
  sizes: SizeDraft[];
  option_groups: GroupDraft[];
};

const EMPTY_DRAFT: Draft = {
  name: "",
  category_id: "",
  price_pkr: 0,
  short_description: "",
  long_description: "",
  image_url: null,
  is_available: true,
  is_featured: false,
  is_bestseller: false,
  sort_order: 0,
  tags: "",
  sizes: [],
  option_groups: [],
};

function fromDetail(d: AdminMenuItemDetail): Draft {
  return {
    name: d.name,
    category_id: d.category_id,
    price_pkr: d.price_pkr,
    short_description: d.short_description ?? "",
    long_description: d.long_description ?? "",
    image_url: d.image_url,
    is_available: d.is_available,
    is_featured: d.is_featured,
    is_bestseller: d.is_bestseller,
    sort_order: d.sort_order,
    tags: (d.tags ?? []).join(", "),
    sizes: d.sizes.map((s) => ({
      size_key: s.size_key,
      label: s.label,
      price_pkr: s.price_pkr,
    })),
    option_groups: d.option_groups.map((g) => ({
      group_key: g.group_key,
      label: g.label,
      selection_type: g.selection_type,
      is_required: g.is_required,
      choices: g.choices.map((c) => ({
        choice_key: c.choice_key,
        label: c.label,
        price_delta_pkr: c.price_delta_pkr,
      })),
    })),
  };
}

export function MenuItemDrawer({ mode, itemId, categories, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const getItem = useServerFn(adminGetMenuItem);
  const createFn = useServerFn(adminCreateMenuItem);
  const updateFn = useServerFn(adminUpdateMenuItem);

  const readOnly = mode === "view";
  const isEdit = mode === "edit" || (mode === "view" && !!itemId);

  const detail = useQuery({
    enabled: isEdit && !!itemId,
    queryKey: ["admin", "menu-item", itemId],
    queryFn: () => getItem({ data: { id: itemId! } }),
  });

  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setDraft(EMPTY_DRAFT);
      setInitialized(false);
      return;
    }
    if (mode === "create") {
      setDraft({
        ...EMPTY_DRAFT,
        category_id: categories[0]?.id ?? "",
      });
      setInitialized(true);
    } else if (detail.data && !initialized) {
      setDraft(fromDetail(detail.data));
      setInitialized(true);
    }
  }, [open, mode, detail.data, categories, initialized]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category_id: draft.category_id,
        name: draft.name.trim(),
        price_pkr: Math.round(draft.price_pkr),
        short_description: draft.short_description.trim() || null,
        long_description: draft.long_description.trim() || null,
        image_url: draft.image_url,
        is_available: draft.is_available,
        is_featured: draft.is_featured,
        is_bestseller: draft.is_bestseller,
        sort_order: draft.sort_order,
        tags: draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        sizes: draft.sizes
          .filter((s) => s.size_key.trim() && s.label.trim())
          .map((s) => ({ ...s, price_pkr: Math.round(s.price_pkr) })),
        option_groups: draft.option_groups
          .filter((g) => g.group_key.trim() && g.label.trim())
          .map((g) => ({
            group_key: g.group_key.trim(),
            label: g.label.trim(),
            selection_type: g.selection_type,
            is_required: g.is_required,
            choices: g.choices
              .filter((c) => c.choice_key.trim() && c.label.trim())
              .map((c) => ({ ...c, price_delta_pkr: Math.round(c.price_delta_pkr) })),
          })),
      };
      if (mode === "create") return createFn({ data: payload });
      return updateFn({ data: { ...payload, id: itemId! } });
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Product created" : "Product updated");
      qc.invalidateQueries({ queryKey: ["admin", "menu-items"] });
      qc.invalidateQueries({ queryKey: ["admin", "menu-item", itemId] });
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const canSave = draft.name.trim().length > 0 && draft.category_id && draft.price_pkr >= 0;
  const loading = isEdit && detail.isLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate font-display text-xl font-black">
                {mode === "create"
                  ? "Add Product"
                  : mode === "edit"
                  ? `Edit ${draft.name || "Product"}`
                  : draft.name || "Product"}
              </SheetTitle>
              <SheetDescription>
                {mode === "create"
                  ? "New products appear on the customer menu as soon as they're saved."
                  : readOnly
                  ? "Read-only preview."
                  : "Changes go live instantly on the customer site."}
              </SheetDescription>
            </div>
            {!readOnly && (
              <div className="flex shrink-0 items-center gap-2">
                {draft.is_available ? (
                  <span className="rounded-full bg-success/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
                    Available
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Off menu
                  </span>
                )}
                {draft.is_featured && (
                  <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    Featured
                  </span>
                )}
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <fieldset disabled={readOnly} className="space-y-6">
              <Tabs defaultValue="basic">
                <TabsList className="w-full rounded-xl">
                  <TabsTrigger value="basic" className="flex-1 rounded-lg">Basic</TabsTrigger>
                  <TabsTrigger value="sizes" className="flex-1 rounded-lg">
                    Sizes{draft.sizes.length > 0 && ` (${draft.sizes.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="options" className="flex-1 rounded-lg">
                    Options{draft.option_groups.length > 0 && ` (${draft.option_groups.length})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-5 space-y-6">
                  <Section title="Image" hint="A square, well-lit photo works best.">
                    <ImageUploader
                      value={draft.image_url}
                      onChange={(url) => setDraft((d) => ({ ...d, image_url: url }))}
                      prefix="items"
                    />
                  </Section>

                  <Section title="Basic Information">
                    <Field label="Product Name" required>
                      <Input
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Zinger Burger"
                        className="h-11 rounded-xl"
                      />
                    </Field>

                    <Field label="Short Description">
                      <Input
                        value={draft.short_description}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, short_description: e.target.value }))
                        }
                        placeholder="A quick, tasty one-liner"
                        className="h-11 rounded-xl"
                      />
                    </Field>

                    <Field label="Description">
                      <Textarea
                        value={draft.long_description}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, long_description: e.target.value }))
                        }
                        rows={4}
                        placeholder="Detailed description shown on the product drawer"
                        className="rounded-xl"
                      />
                    </Field>
                  </Section>

                  <Section title="Category & Pricing">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Category" required>
                        <Select
                          value={draft.category_id}
                          onValueChange={(v) => setDraft((d) => ({ ...d, category_id: v }))}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Base Price (PKR)" required>
                        <Input
                          type="number"
                          min={0}
                          value={draft.price_pkr}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, price_pkr: Number(e.target.value) || 0 }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section title="Display & Metadata">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Display Order">
                        <Input
                          type="number"
                          value={draft.sort_order}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </Field>
                      <Field label="Tags (comma separated)">
                        <Input
                          value={draft.tags}
                          onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                          placeholder="spicy, new"
                          className="h-11 rounded-xl"
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section title="Visibility">
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                      <ToggleRow
                        label="Available"
                        desc="Customers can order this item."
                        checked={draft.is_available}
                        onChange={(v) => setDraft((d) => ({ ...d, is_available: v }))}
                      />
                      <ToggleRow
                        label="Featured"
                        desc="Highlighted on the homepage."
                        checked={draft.is_featured}
                        onChange={(v) => setDraft((d) => ({ ...d, is_featured: v }))}
                      />
                      <ToggleRow
                        label="Bestseller"
                        desc="Shows a bestseller badge."
                        checked={draft.is_bestseller}
                        onChange={(v) => setDraft((d) => ({ ...d, is_bestseller: v }))}
                      />
                    </div>
                  </Section>
                </TabsContent>


                <TabsContent value="sizes" className="mt-5 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Add sizes to override the base price. Leave empty if the item has a single price.
                  </p>
                  {draft.sizes.map((s, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_1.5fr_120px_auto] items-end gap-2 rounded-xl border border-border/60 bg-card p-3"
                    >
                      <Field label="Key" small>
                        <Input
                          value={s.size_key}
                          onChange={(e) =>
                            setDraft((d) => {
                              const sizes = [...d.sizes];
                              sizes[i] = { ...sizes[i], size_key: e.target.value };
                              return { ...d, sizes };
                            })
                          }
                          className="h-9 rounded-lg"
                          placeholder="small"
                        />
                      </Field>
                      <Field label="Label" small>
                        <Input
                          value={s.label}
                          onChange={(e) =>
                            setDraft((d) => {
                              const sizes = [...d.sizes];
                              sizes[i] = { ...sizes[i], label: e.target.value };
                              return { ...d, sizes };
                            })
                          }
                          className="h-9 rounded-lg"
                          placeholder="Small"
                        />
                      </Field>
                      <Field label="Price PKR" small>
                        <Input
                          type="number"
                          value={s.price_pkr}
                          onChange={(e) =>
                            setDraft((d) => {
                              const sizes = [...d.sizes];
                              sizes[i] = { ...sizes[i], price_pkr: Number(e.target.value) || 0 };
                              return { ...d, sizes };
                            })
                          }
                          className="h-9 rounded-lg"
                        />
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove size"
                        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            sizes: d.sizes.filter((_, idx) => idx !== i),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        sizes: [
                          ...d.sizes,
                          { size_key: "", label: "", price_pkr: d.price_pkr || 0 },
                        ],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" /> Add size
                  </Button>
                </TabsContent>

                <TabsContent value="options" className="mt-5 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Option groups let customers pick add-ons, flavors, drinks, etc. Extra prices are per choice.
                  </p>
                  {draft.option_groups.map((g, gi) => (
                    <div
                      key={gi}
                      className="space-y-3 rounded-2xl border border-border/60 bg-card p-4"
                    >
                      <div className="grid grid-cols-[1fr_1.5fr_130px_auto] items-end gap-2">
                        <Field label="Key" small>
                          <Input
                            value={g.group_key}
                            onChange={(e) =>
                              setDraft((d) => {
                                const groups = [...d.option_groups];
                                groups[gi] = { ...groups[gi], group_key: e.target.value };
                                return { ...d, option_groups: groups };
                              })
                            }
                            className="h-9 rounded-lg"
                            placeholder="flavor"
                          />
                        </Field>
                        <Field label="Label" small>
                          <Input
                            value={g.label}
                            onChange={(e) =>
                              setDraft((d) => {
                                const groups = [...d.option_groups];
                                groups[gi] = { ...groups[gi], label: e.target.value };
                                return { ...d, option_groups: groups };
                              })
                            }
                            className="h-9 rounded-lg"
                            placeholder="Choose flavor"
                          />
                        </Field>
                        <Field label="Type" small>
                          <Select
                            value={g.selection_type}
                            onValueChange={(v) =>
                              setDraft((d) => {
                                const groups = [...d.option_groups];
                                groups[gi] = {
                                  ...groups[gi],
                                  selection_type: v as "single" | "multi",
                                };
                                return { ...d, option_groups: groups };
                              })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="multi">Multiple</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove option group"
                          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              option_groups: d.option_groups.filter((_, idx) => idx !== gi),
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Switch
                          checked={g.is_required}
                          onCheckedChange={(v) =>
                            setDraft((d) => {
                              const groups = [...d.option_groups];
                              groups[gi] = { ...groups[gi], is_required: v };
                              return { ...d, option_groups: groups };
                            })
                          }
                        />
                        Required
                      </label>

                      <div className="space-y-2 border-t border-border/50 pt-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Choices
                        </div>
                        {g.choices.map((c, ci) => (
                          <div
                            key={ci}
                            className="grid grid-cols-[1fr_1.5fr_110px_auto] items-center gap-2"
                          >
                            <Input
                              value={c.choice_key}
                              onChange={(e) =>
                                setDraft((d) => {
                                  const groups = [...d.option_groups];
                                  const choices = [...groups[gi].choices];
                                  choices[ci] = { ...choices[ci], choice_key: e.target.value };
                                  groups[gi] = { ...groups[gi], choices };
                                  return { ...d, option_groups: groups };
                                })
                              }
                              placeholder="key"
                              className="h-9 rounded-lg"
                            />
                            <Input
                              value={c.label}
                              onChange={(e) =>
                                setDraft((d) => {
                                  const groups = [...d.option_groups];
                                  const choices = [...groups[gi].choices];
                                  choices[ci] = { ...choices[ci], label: e.target.value };
                                  groups[gi] = { ...groups[gi], choices };
                                  return { ...d, option_groups: groups };
                                })
                              }
                              placeholder="Label"
                              className="h-9 rounded-lg"
                            />
                            <Input
                              type="number"
                              value={c.price_delta_pkr}
                              onChange={(e) =>
                                setDraft((d) => {
                                  const groups = [...d.option_groups];
                                  const choices = [...groups[gi].choices];
                                  choices[ci] = {
                                    ...choices[ci],
                                    price_delta_pkr: Number(e.target.value) || 0,
                                  };
                                  groups[gi] = { ...groups[gi], choices };
                                  return { ...d, option_groups: groups };
                                })
                              }
                              placeholder="+PKR"
                              className="h-9 rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Remove choice"
                              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setDraft((d) => {
                                  const groups = [...d.option_groups];
                                  groups[gi] = {
                                    ...groups[gi],
                                    choices: groups[gi].choices.filter((_, idx) => idx !== ci),
                                  };
                                  return { ...d, option_groups: groups };
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() =>
                            setDraft((d) => {
                              const groups = [...d.option_groups];
                              groups[gi] = {
                                ...groups[gi],
                                choices: [
                                  ...groups[gi].choices,
                                  { choice_key: "", label: "", price_delta_pkr: 0 },
                                ],
                              };
                              return { ...d, option_groups: groups };
                            })
                          }
                        >
                          <Plus className="h-3.5 w-3.5" /> Add choice
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        option_groups: [
                          ...d.option_groups,
                          {
                            group_key: "",
                            label: "",
                            selection_type: "single",
                            is_required: false,
                            choices: [],
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" /> Add option group
                  </Button>
                </TabsContent>
              </Tabs>
            </fieldset>
          )}
        </div>

        <SheetFooter className="border-t border-border/60 bg-card px-6 py-4">
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
                className="rounded-xl bg-primary font-bold text-primary-foreground"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Product" : "Save Changes"}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  small,
  children,
}: {
  label: string;
  required?: boolean;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={small ? "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" : "text-sm font-semibold"}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
