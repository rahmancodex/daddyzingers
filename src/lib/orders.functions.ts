import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LineSchema = z.object({
  product_id: z.string().min(1),
  name: z.string().min(1),
  qty: z.number().int().min(1).max(50),
  unit_price_pkr: z.number().int().min(0),
  options: z
    .object({
      customizations: z.array(z.object({ id: z.string(), label: z.string(), price: z.number() })).optional(),
      upgrades: z.array(z.object({ id: z.string(), label: z.string(), price: z.number() })).optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

const AddressSnapshotSchema = z
  .object({
    label: z.string().optional(),
    recipient_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    address_line: z.string(),
    city: z.string(),
    area: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .nullable();

const InputSchema = z.object({
  items: z.array(LineSchema).min(1, "Cart is empty"),
  subtotal_pkr: z.number().int().min(0),
  delivery_fee_pkr: z.number().int().min(0),
  total_pkr: z.number().int().min(0),
  payment_method: z.enum(["cod", "card", "wallet"]),
  address_snapshot: AddressSnapshotSchema,
  notes: z.string().max(500).optional().nullable(),
  method: z.enum(["delivery", "pickup", "dinein"]),
  schedule_at: z.string().nullable().optional(),
});

export type PlaceOrderInput = z.infer<typeof InputSchema>;

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Bundle scheduling + method into notes for now (no dedicated column yet).
    const composedNotes = [
      data.notes?.trim(),
      data.method !== "delivery" ? `Method: ${data.method}` : null,
      data.schedule_at ? `Scheduled for: ${data.schedule_at}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        subtotal_pkr: data.subtotal_pkr,
        delivery_fee_pkr: data.delivery_fee_pkr,
        total_pkr: data.total_pkr,
        payment_method: data.payment_method,
        address_snapshot: data.address_snapshot ?? null,
        notes: composedNotes || null,
        status: "pending",
      })
      .select("id, order_number, status, total_pkr, created_at")
      .single();

    if (error || !order) {
      throw new Error(error?.message ?? "Failed to create order");
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      data.items.map((it) => ({
        order_id: order.id,
        product_id: it.product_id,
        name: it.name,
        qty: it.qty,
        unit_price_pkr: it.unit_price_pkr,
        options: it.options ?? {},
      })),
    );

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    return order;
  });
