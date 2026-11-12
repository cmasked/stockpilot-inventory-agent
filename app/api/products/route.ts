import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lowStockOnly = searchParams.get("low_stock") === "true";
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const supplierId = searchParams.get("supplier_id");

  let query = getSupabase()
    .from("products")
    .select("sku, name, category, supplier_id, unit, stock_qty, reorder_level, reorder_qty, avg_daily_sales, unit_cost, selling_price, suppliers(name, lead_time_days, min_order_value)")
    .order("stock_qty", { ascending: true });

  if (category && category !== "all") query = query.ilike("category", category);
  if (supplierId && supplierId !== "all") query = query.eq("supplier_id", supplierId);
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allItems = (data || []).map((p) => {
    const avgSales = Number(p.avg_daily_sales);
    const daysLeft = avgSales > 0 ? Number((p.stock_qty / avgSales).toFixed(1)) : null;
    const isLowStock = p.stock_qty <= p.reorder_level;
    const supplierObj = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers;

    return {
      sku: p.sku,
      name: p.name,
      category: p.category,
      supplier_id: p.supplier_id,
      unit: p.unit,
      stock_qty: p.stock_qty,
      reorder_level: p.reorder_level,
      reorder_qty: p.reorder_qty,
      avg_daily_sales: avgSales,
      unit_cost: Number(p.unit_cost),
      selling_price: Number(p.selling_price),
      days_left: daysLeft,
      is_low_stock: isLowStock,
      suppliers: supplierObj,
    };
  });

  const lowStockCount = allItems.filter((i) => i.is_low_stock).length;
  const filtered = lowStockOnly ? allItems.filter((i) => i.is_low_stock) : allItems;

  return NextResponse.json({
    products: filtered,
    total: allItems.length,
    low_stock_count: lowStockCount,
  });
}
