import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { purchaseOrderStatusSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const statusParsed = purchaseOrderStatusSchema.safeParse(body?.status);
  if (!statusParsed.success) {
    return NextResponse.json({ error: "Invalid status value. Must be 'draft', 'sent', 'received', or 'cancelled'." }, { status: 400 });
  }

  const newStatus = statusParsed.data;
  const supabase = getSupabase();

  // Fetch existing PO
  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (poErr || !po) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }

  // If status is transitioning to 'received', update stock
  if (newStatus === "received" && po.status !== "received") {
    const { data: items } = await supabase
      .from("purchase_order_items")
      .select("sku, quantity")
      .eq("purchase_order_id", orderId);

    if (items && items.length > 0) {
      for (const item of items) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock_qty")
          .eq("sku", item.sku)
          .single();

        const currentStock = prod?.stock_qty ?? 0;
        await supabase
          .from("products")
          .update({ stock_qty: currentStock + item.quantity })
          .eq("sku", item.sku);
      }
    }
  }

  // Update status
  const { data: updated, error: updateErr } = await supabase
    .from("purchase_orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ order: updated });
}
