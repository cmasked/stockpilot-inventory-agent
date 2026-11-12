import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { addDaysInIndia } from "../dates";

/**
 * Tool 1: getLowStockItems
 * Identifies products where current stock_qty <= reorder_level.
 */
const getLowStockItems = defineTool({
  name: "getLowStockItems",
  description:
    "Use this when the store manager asks which items are running low, out of stock, need reordering, or when checking inventory that requires replenishment. Can optionally filter by category or supplier.",
  writes: false,
  schema: z.object({
    category: z
      .string()
      .optional()
      .describe("Optional category filter (e.g. Dairy, Bakery, Beverages, Snacks, Staples, Personal Care, Household, Fruits & Vegetables, Spices, Frozen)"),
    supplier_id: z
      .string()
      .optional()
      .describe("Optional supplier ID filter (e.g. SUP01)"),
  }),
  run: async ({ category, supplier_id }) => {
    let query = getSupabase()
      .from("products")
      .select("sku, name, category, supplier_id, unit, stock_qty, reorder_level, reorder_qty, avg_daily_sales, unit_cost, selling_price, suppliers(name, lead_time_days, min_order_value)")
      .order("stock_qty", { ascending: true });

    if (category) query = query.ilike("category", category);
    if (supplier_id) query = query.eq("supplier_id", supplier_id);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch inventory: ${error.message}`);

    // Filter strictly by business rule: stock_qty <= reorder_level
    const lowStock = (data || []).filter((p) => p.stock_qty <= p.reorder_level);

    const items = lowStock.map((p) => {
      const avgSales = Number(p.avg_daily_sales);
      const daysLeft = avgSales > 0 ? Number((p.stock_qty / avgSales).toFixed(1)) : null;
      const supplierObj = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers;

      return {
        sku: p.sku,
        name: p.name,
        category: p.category,
        supplier_id: p.supplier_id,
        supplier_name: supplierObj?.name || p.supplier_id,
        supplier_lead_time_days: supplierObj?.lead_time_days ?? 1,
        stock_qty: p.stock_qty,
        reorder_level: p.reorder_level,
        reorder_qty: p.reorder_qty,
        unit: p.unit,
        unit_cost: Number(p.unit_cost),
        days_left: daysLeft,
        suggested_order_cost: Number((p.reorder_qty * Number(p.unit_cost)).toFixed(2)),
      };
    });

    return {
      count: items.length,
      items,
    };
  },
});

/**
 * Tool 2: getSupplierDetails
 * Retrieves supplier information, lead times, contact emails, and ratings.
 */
const getSupplierDetails = defineTool({
  name: "getSupplierDetails",
  description:
    "Use this when you need supplier contact info, lead time in days, rating, city, or minimum order value to group and draft purchase orders.",
  writes: false,
  schema: z.object({
    supplier_id: z
      .string()
      .optional()
      .describe("Supplier ID (e.g. SUP01). If omitted, returns all suppliers."),
  }),
  run: async ({ supplier_id }) => {
    let query = getSupabase()
      .from("suppliers")
      .select("id, name, city, contact_email, lead_time_days, rating, min_order_value")
      .order("id", { ascending: true });

    if (supplier_id) {
      query = query.eq("id", supplier_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch supplier details: ${error.message}`);
    if (supplier_id && (!data || data.length === 0)) {
      throw new Error(`Supplier with ID '${supplier_id}' not found.`);
    }

    return {
      count: data?.length || 0,
      suppliers: data || [],
    };
  },
});

/**
 * Tool 3: estimateDaysOfStockLeft
 * Calculates runway (days left) before current inventory runs out based on average daily sales.
 */
const estimateDaysOfStockLeft = defineTool({
  name: "estimateDaysOfStockLeft",
  description:
    "Use this when the store manager asks how long current stock will last, days of runway, or depletion urgency before a product or category runs out.",
  writes: false,
  schema: z.object({
    sku: z.string().optional().describe("Specific product SKU (e.g. SKU001)"),
    category: z.string().optional().describe("Category to analyze (e.g. Dairy, Snacks, Staples)"),
  }),
  run: async ({ sku, category }) => {
    let query = getSupabase()
      .from("products")
      .select("sku, name, category, stock_qty, reorder_level, avg_daily_sales, unit")
      .order("stock_qty", { ascending: true });

    if (sku) query = query.eq("sku", sku);
    if (category) query = query.ilike("category", category);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to estimate stock runway: ${error.message}`);

    const estimates = (data || []).map((p) => {
      const dailySales = Number(p.avg_daily_sales);
      const daysLeft = dailySales > 0 ? Number((p.stock_qty / dailySales).toFixed(1)) : null;

      let urgency: "critical" | "warning" | "adequate" = "adequate";
      if (daysLeft !== null) {
        if (daysLeft <= 2 || p.stock_qty <= p.reorder_level) urgency = "critical";
        else if (daysLeft <= 5) urgency = "warning";
      }

      return {
        sku: p.sku,
        name: p.name,
        category: p.category,
        stock_qty: p.stock_qty,
        unit: p.unit,
        avg_daily_sales: dailySales,
        days_left: daysLeft,
        urgency,
      };
    });

    return {
      count: estimates.length,
      estimates,
    };
  },
});

/**
 * Tool 4: createPurchaseOrder
 * Atomically drafts a purchase order in Supabase with line items, calculating totals and delivery dates.
 */
const createPurchaseOrder = defineTool({
  name: "createPurchaseOrder",
  description:
    "Use this when the store manager explicitly asks to create, draft, or generate a purchase order for a supplier with specified products and quantities.",
  writes: true,
  schema: z.object({
    supplier_id: z.string().trim().min(1).describe("Supplier ID (e.g. SUP01)"),
    notes: z.string().optional().describe("Optional note for this purchase order"),
    items: z
      .array(
        z.object({
          sku: z.string().trim().min(1).describe("Product SKU to reorder"),
          quantity: z.number().int().positive().describe("Order quantity (must equal product's reorder_qty)"),
        })
      )
      .min(1)
      .describe("List of line items to order"),
  }),
  run: async ({ supplier_id, notes, items }) => {
    const supabase = getSupabase();

    // 1. Verify supplier
    const { data: supplier, error: suppErr } = await supabase
      .from("suppliers")
      .select("id, name, lead_time_days, min_order_value")
      .eq("id", supplier_id)
      .single();

    if (suppErr || !supplier) {
      throw new Error(`Supplier '${supplier_id}' not found. Cannot create purchase order.`);
    }

    // 2. Fetch authoritative product unit costs from DB (never trust hallucinated prices)
    const skus = items.map((i) => i.sku);
    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("sku, name, supplier_id, unit_cost, reorder_qty")
      .in("sku", skus);

    if (prodErr || !dbProducts) {
      throw new Error(`Failed to load product pricing: ${prodErr?.message}`);
    }

    const productMap = new Map(dbProducts.map((p) => [p.sku, p]));

    // Validate that all SKUs belong to this supplier
    for (const item of items) {
      const prod = productMap.get(item.sku);
      if (!prod) {
        throw new Error(`Product '${item.sku}' not found in database.`);
      }
      if (prod.supplier_id !== supplier_id) {
        throw new Error(
          `Product '${item.sku}' (${prod.name}) belongs to supplier '${prod.supplier_id}', not '${supplier_id}'. Each PO must have items from only 1 supplier.`
        );
      }
    }

    // 3. Compute costs and line items
    let totalCost = 0;
    const orderItemsPayload = items.map((item) => {
      const prod = productMap.get(item.sku)!;
      const unitCost = Number(prod.unit_cost);
      const lineCost = item.quantity * unitCost;
      totalCost += lineCost;

      return {
        sku: item.sku,
        name: prod.name,
        quantity: item.quantity,
        unit_cost: unitCost,
        line_total: Number(lineCost.toFixed(2)),
      };
    });

    totalCost = Number(totalCost.toFixed(2));
    const expectedDate = addDaysInIndia(supplier.lead_time_days);

    // 4. Create purchase_orders record (status 'draft')
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({
        supplier_id,
        status: "draft",
        total_cost: totalCost,
        expected_date: expectedDate,
        notes: notes || `Autonomous restock order generated by StockPilot for ${supplier.name}`,
      })
      .select("id, supplier_id, status, total_cost, expected_date, notes, created_at")
      .single();

    if (poErr || !po) {
      throw new Error(`Failed to create purchase order: ${poErr?.message}`);
    }

    // 5. Insert purchase_order_items (with rollback emulation on failure)
    const itemsToInsert = orderItemsPayload.map((item) => ({
      purchase_order_id: po.id,
      sku: item.sku,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
    }));

    const { error: itemsErr } = await supabase.from("purchase_order_items").insert(itemsToInsert);

    if (itemsErr) {
      // Rollback: delete the created PO header to avoid orphaned draft
      await supabase.from("purchase_orders").delete().eq("id", po.id);
      throw new Error(`Failed to insert order line items: ${itemsErr.message}. Order cancelled.`);
    }

    // 6. Check min_order_value warning (informational only)
    let minOrderWarning: string | undefined;
    const minOrderVal = Number(supplier.min_order_value);
    if (minOrderVal > 0 && totalCost < minOrderVal) {
      minOrderWarning = `Total order amount (₹${totalCost}) is below supplier's minimum order value of ₹${minOrderVal}. Order drafted as requested, but please verify with supplier.`;
    }

    return {
      success: true,
      purchase_order_id: po.id,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      status: po.status,
      total_cost: totalCost,
      expected_delivery_date: expectedDate,
      lead_time_days: supplier.lead_time_days,
      item_count: orderItemsPayload.length,
      items: orderItemsPayload,
      warning: minOrderWarning,
    };
  },
});

/**
 * Tool 5: updateStock
 * Updates inventory stock quantities when goods are received or updates PO status to 'received'.
 */
const updateStock = defineTool({
  name: "updateStock",
  description:
    "Use this when the store manager confirms that goods or a purchase order have been received at FreshMart, to replenish inventory stock levels.",
  writes: true,
  schema: z.object({
    purchase_order_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("ID of the purchase order being received (e.g. 1)"),
    adjustments: z
      .array(
        z.object({
          sku: z.string().trim().min(1).describe("Product SKU"),
          quantity_received: z.number().int().positive().describe("Units received to add to current stock"),
        })
      )
      .optional()
      .describe("Optional manual stock adjustments if not receiving a full purchase order"),
  }),
  run: async ({ purchase_order_id, adjustments }) => {
    const supabase = getSupabase();
    const updatedProducts: Array<{ sku: string; previous_stock: number; new_stock: number }> = [];

    // Case A: Receiving a Purchase Order
    if (purchase_order_id) {
      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .select("id, status, supplier_id")
        .eq("id", purchase_order_id)
        .single();

      if (poErr || !po) {
        throw new Error(`Purchase order #${purchase_order_id} not found.`);
      }

      if (po.status === "received") {
        throw new Error(`Purchase order #${purchase_order_id} has already been marked as received.`);
      }

      // Fetch items in this PO
      const { data: items, error: itemsErr } = await supabase
        .from("purchase_order_items")
        .select("sku, quantity")
        .eq("purchase_order_id", purchase_order_id);

      if (itemsErr || !items || items.length === 0) {
        throw new Error(`No items found for purchase order #${purchase_order_id}.`);
      }

      // Update each product's stock_qty
      for (const item of items) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock_qty")
          .eq("sku", item.sku)
          .single();

        const currentStock = prod?.stock_qty ?? 0;
        const newStock = currentStock + item.quantity;

        await supabase.from("products").update({ stock_qty: newStock }).eq("sku", item.sku);
        updatedProducts.push({ sku: item.sku, previous_stock: currentStock, new_stock: newStock });
      }

      // Update PO status to 'received'
      await supabase.from("purchase_orders").update({ status: "received" }).eq("id", purchase_order_id);

      return {
        success: true,
        purchase_order_id,
        status: "received",
        message: `Purchase Order #${purchase_order_id} marked as received. Stock replenished for ${updatedProducts.length} items.`,
        updated_products: updatedProducts,
      };
    }

    // Case B: Manual stock adjustments
    if (adjustments && adjustments.length > 0) {
      for (const adj of adjustments) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock_qty")
          .eq("sku", adj.sku)
          .single();

        const currentStock = prod?.stock_qty ?? 0;
        const newStock = currentStock + adj.quantity_received;

        await supabase.from("products").update({ stock_qty: newStock }).eq("sku", adj.sku);
        updatedProducts.push({ sku: adj.sku, previous_stock: currentStock, new_stock: newStock });
      }

      return {
        success: true,
        message: `Successfully updated stock for ${updatedProducts.length} products.`,
        updated_products: updatedProducts,
      };
    }

    throw new Error("Must provide either a purchase_order_id or adjustments array to update stock.");
  },
});

export const tools: AgentTool[] = [
  getLowStockItems,
  getSupplierDetails,
  estimateDaysOfStockLeft,
  createPurchaseOrder,
  updateStock,
];
