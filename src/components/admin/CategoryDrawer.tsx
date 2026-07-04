import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
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
  adminCreateCategory,
  adminUpdateCategory,
  type AdminCategory,
} from "@/lib/admin-menu.functions";
import { ImageUploader } from "./ImageUploader";

type Props = {
  mode: "create" | "edit";
  category?: AdminCategory;
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export function CategoryDrawer({ mode, category, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const createFn = useServerFn(adminCreateCategory);
  const updateFn = useServerFn(adminUpdateCategory);

  const [id, setId] = React.useState(category?.id ?? "");
  const [label, setLabel] = React.useState(category?.label ?? "");
  const [icon, setIcon] = React.useState(category?.icon ?? "🍽️");
  const [tagline, setTagline] = React.useState(category?.tagline ?? "");
  const [imageUrl, setImageUrl] = React.useState<string | null>(category?.image_url ?? null);
  const [sortOrder, setSortOrder] = React.useState<number>(category?.sort_order ?? 0);
  const [isActive, setIsActive] = React.useState<boolean>(category?.is_active ?? true);

  React.useEffect(() => {
    if (!open) return;
    setId(category?.id ?? "");
    setLabel(category?.label ?? "");
    setIcon(category?.icon ?? "🍽️");
    setTagline(category?.tagline ?? "");
    setImageUrl(category?.image_url ?? null);
    setSortOrder(category?.sort_order ?? 0);
    setIsActive(category?.is_active ?? true);
  }, [open, category]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        label: label.trim(),
        icon: icon.trim() || null,
        tagline: tagline.trim() || null,
        image_url: imageUrl,
        sort_order: sortOrder,
        is_active: isActive,
      };
      if (mode === "create") {
        return createFn({ data: { ...payload, id: id.trim() || undefined } });
      }
      return updateFn({ data: { ...payload, id: category!.id } });
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Category created" : "Category updated");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["admin", "menu-items"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave = label.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 px-6 py-5">
          <SheetTitle className="font-display text-xl font-black">
            {mode === "create" ? "Add Category" : `Edit ${category?.label ?? "Category"}`}
          </SheetTitle>
          <SheetDescription>
            Categories appear on the homepage and menu page in the order you set.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <ImageUploader
            value={imageUrl}
            onChange={setImageUrl}
            prefix="categories"
            label="Cover Image"
          />

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Name *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Burgers"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-[100px_1fr] gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Icon</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🍔"
                className="h-11 rounded-xl text-center text-lg"
                maxLength={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Slug / ID</Label>
              <Input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={mode === "create" ? "auto from name" : ""}
                disabled={mode === "edit"}
                className="h-11 rounded-xl font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Tagline</Label>
            <Textarea
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A tasty description shown on category cards"
              rows={2}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Sort Order</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div>
              <div className="text-sm font-semibold">Visible on site</div>
              <div className="text-xs text-muted-foreground">Hidden categories are not shown to customers.</div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <SheetFooter className="border-t border-border/60 bg-card px-6 py-4">
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
              className="rounded-xl bg-primary font-bold text-primary-foreground"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Category" : "Save Changes"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
