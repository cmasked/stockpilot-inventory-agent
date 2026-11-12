import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabase();

  // Fetch products and suppliers
  const [prodsRes, suppsRes, ordersRes] = await Promise.all([
    supabase
      .from("products")
      .select("sku, name, category, stock_qty, reorder_level, reorder_qty, avg_daily_sales, unit_cost, supplier_id, suppliers(name)"),
    supabase
      .from("suppliers")
      .select("id, name, lead_time_days, rating"),
    supabase
      .from("purchase_orders")
      .select("id, status, total_cost, created_at")
      .order("id", { ascending: false }),
  ]);

  if (prodsRes.error) return NextResponse.json({ error: prodsRes.error.message }, { status: 500 });

  const products = prodsRes.data || [];
  const suppliers = suppsRes.data || [];
  const orders = ordersRes.data || [];

  let lowStockCount = 0;
  let criticalRunwayCount = 0; // <= 2 days
  let estimatedRestockCost = 0;

  const lowStockItems = [];

  for (const p of products) {
    const isLow = p.stock_qty <= p.reorder_level;
    const avgSales = Number(p.avg_daily_sales);
    const daysLeft = avgSales > 0 ? Number((p.stock_qty / avgSales).toFixed(1)) : null;

    if (daysLeft !== null && daysLeft <= 2.0) {
      criticalRunwayCount++;
    }

    if (isLow) {
      lowStockCount++;
      const itemCost = p.reorder_qty * Number(p.unit_cost);
      estimatedRestockCost += itemCost;
      const suppObj = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers;

      lowStockItems.push({
        sku: p.sku,
        name: p.name,
        category: p.category,
        stock_qty: p.stock_qty,
        reorder_level: p.reorder_level,
        reorder_qty: p.reorder_qty,
        days_left: daysLeft,
        supplier_id: p.supplier_id,
        supplier_name: suppObj?.name || p.supplier_id,
      });
    }
  }

  // Sort lowest stock first
  lowStockItems.sort((a, b) => a.stock_qty - b.stock_qty);

  const draftOrdersCount = orders.filter((o) => o.status === "draft").length;
  const sentOrdersCount = orders.filter((o) => o.status === "sent").length;

  return NextResponse.json({
    metrics: {
      total_products: products.length,
      low_stock_count: lowStockCount,
      critical_runway_count: criticalRunwayCount,
      estimated_restock_cost: Number(estimatedRestockCost.toFixed(2)),
      suppliers_count: suppliers.length,
      total_orders: orders.length,
      draft_orders_count: draftOrdersCount,
      sent_orders_count: sentOrdersCount,
    },
    urgent_items: lowStockItems.slice(0, 8),
    recent_orders: orders.slice(0, 5),
  });
}
