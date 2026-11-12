import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createPurchaseOrderInputSchema } from "@/lib/schemas";
import { addDaysInIndia } from "@/lib/dates";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await getSupabase()
    .from("purchase_orders")
    .select(`
      id,
      supplier_id,
      status,
      total_cost,
      expected_date,
      notes,
      created_at,
      suppliers (id, name, city, contact_email, lead_time_days),
      purchase_order_items (
        id,
        sku,
        quantity,
        unit_cost,
        products (name, category, unit)
      )
    `)
    .order("id", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data || []).map((po) => {
    const supplierObj = Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers;
    const items = (po.purchase_order_items || []).map((item) => {
      const prodObj = Array.isArray(item.products) ? item.products[0] : item.products;
      return {
        id: item.id,
        sku: item.sku,
        quantity: item.quantity,
        unit_cost: Number(item.unit_cost),
        name: prodObj?.name || item.sku,
        category: prodObj?.category,
        unit: prodObj?.unit,
      };
    });

    return {
      id: po.id,
      supplier_id: po.supplier_id,
      supplier_name: supplierObj?.name || po.supplier_id,
      supplier_city: supplierObj?.city,
      status: po.status,
      total_cost: Number(po.total_cost),
      expected_date: po.expected_date,
      notes: po.notes,
      created_at: po.created_at,
      items,
    };
  });

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createPurchaseOrderInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid purchase order payload", details: parsed.error.issues }, { status: 400 });
  }

  const { supplier_id, notes, items } = parsed.data;
  const supabase = getSupabase();

  // Verify supplier
  const { data: supplier, error: sErr } = await supabase
    .from("suppliers")
    .select("id, name, lead_time_days")
    .eq("id", supplier_id)
    .single();

  if (sErr || !supplier) {
    return NextResponse.json({ error: `Supplier '${supplier_id}' not found` }, { status: 404 });
  }

  // Get products pricing
  const skus = items.map((i) => i.sku);
  const { data: prods, error: pErr } = await supabase
    .from("products")
    .select("sku, unit_cost")
    .in("sku", skus);

  if (pErr || !prods) {
    return NextResponse.json({ error: "Failed to retrieve product pricing" }, { status: 500 });
  }

  const costMap = new Map(prods.map((p) => [p.sku, Number(p.unit_cost)]));
  let totalCost = 0;
  for (const item of items) {
    const unitCost = costMap.get(item.sku) ?? 0;
    totalCost += item.quantity * unitCost;
  }
  totalCost = Number(totalCost.toFixed(2));
  const expectedDate = addDaysInIndia(supplier.lead_time_days);

  // Insert PO
  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      supplier_id,
      status: "draft",
      total_cost: totalCost,
      expected_date: expectedDate,
      notes: notes || `Direct purchase order for ${supplier.name}`,
    })
    .select()
    .single();

  if (poErr || !po) {
    return NextResponse.json({ error: poErr?.message }, { status: 500 });
  }

  // Insert items
  const itemsToInsert = items.map((i) => ({
    purchase_order_id: po.id,
    sku: i.sku,
    quantity: i.quantity,
    unit_cost: costMap.get(i.sku) ?? 0,
  }));

  const { error: itemErr } = await supabase.from("purchase_order_items").insert(itemsToInsert);
  if (itemErr) {
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    return NextResponse.json({ error: itemErr.message }, { status: 500 });
  }

  return NextResponse.json({ order: po }, { status: 201 });
}
