PS D: \building ai > git push origin main
fatal: not a git repository(or any of the parent directories): .git
PS D: \building ai > git status
fatal: not a git repository(or any of the parent directories): .git
PS D: \building ai > 

import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";

/**
 * Tool 1: getLowStockItems (READ ONLY)
 * Purpose: Retrieve products that require replenishment where stock_qty <= reorder_level.
 * Description begins with "Use this when..."
 */
export const getLowStockItems = defineTool({
  name: "getLowStockItems",
  description:
    "Use this when the store manager asks which items are running low, out of stock, or need replenishment. Returns products where current stock is at or below the reorder level, sorted by stock urgency (maximum 20 items).",
  writes: false,
  schema: z.object({
    category: z
      .string()
      .optional()
      .describe("Optional category to filter by (e.g. Dairy, Bakery, Beverages, Snacks, Staples, Personal Care, Household, Fruits & Vegetables, Spices, Frozen)"),
    supplier_id: z
      .string()
      .optional()
      .describe("Optional supplier ID to filter by (e.g. SUP01)"),
  }),
  run: async ({ category, supplier_id }) => {
    try {
      let query = getSupabase()
        .from("products")
        .select(`
          sku,
          name,
          category,
          supplier_id,
          unit,
          stock_qty,
          reorder_level,
          reorder_qty,
          avg_daily_sales,
          unit_cost,
          suppliers (id, name, city, contact_email, lead_time_days, rating, min_order_value)
        `)
        .order("stock_qty", { ascending: true });

      if (category && category.trim() !== "" && category.toLowerCase() !== "all") {
        query = query.ilike("category", category.trim());
      }
      if (supplier_id && supplier_id.trim() !== "" && supplier_id.toLowerCase() !== "all") {
        query = query.eq("supplier_id", supplier_id.trim());
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Business rule: stock_qty <= reorder_level
      const lowStockProducts = (data || []).filter(
        (product) => Number(product.stock_qty) <= Number(product.reorder_level)
      );

      // Sort prioritizing most urgent stock situations (lowest stock relative to reorder level first)
      lowStockProducts.sort((a, b) => {
        const ratioA = a.reorder_level > 0 ? a.stock_qty / a.reorder_level : a.stock_qty;
        const ratioB = b.reorder_level > 0 ? b.stock_qty / b.reorder_level : b.stock_qty;
        if (ratioA !== ratioB) return ratioA - ratioB;
        return a.stock_qty - b.stock_qty;
      });

      // Apply maximum result limit of 20
      const limited = lowStockProducts.slice(0, 20);

      const items = limited.map((p) => {
        const avgDailySales = Number(p.avg_daily_sales);
        const daysRemaining =
          avgDailySales > 0 ? Number((p.stock_qty / avgDailySales).toFixed(1)) : null;

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
          avg_daily_sales: avgDailySales,
          unit_cost: Number(p.unit_cost),
          days_remaining: daysRemaining,
          supplier: supplierObj
            ? {
              id: supplierObj.id,
              name: supplierObj.name,
              city: supplierObj.city,
              contact_email: supplierObj.contact_email,
              lead_time_days: supplierObj.lead_time_days,
              rating: Number(supplierObj.rating),
              min_order_value: Number(supplierObj.min_order_value),
            }
            : null,
        };
      });

      return {
        count: items.length,
        items,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected database error";
      throw new Error(`Failed to retrieve low-stock items: ${message}`);
    }
  },
});

/**
 * Tool 2: getSupplierDetails (READ ONLY)
 * Purpose: Retrieve supplier information for inventory and purchase order decisions.
 * Description begins with "Use this when..."
 */
export const getSupplierDetails = defineTool({
  name: "getSupplierDetails",
  description:
    "Use this when you need supplier information such as contact details, city, lead time in days, rating, or minimum order value. Can look up a specific supplier by ID or list all suppliers.",
  writes: false,
  schema: z.object({
    supplier_id: z
      .string()
      .optional()
      .describe("Supplier ID to look up (e.g. SUP01). If omitted, returns all active suppliers."),
  }),
  run: async ({ supplier_id }) => {
    try {
      let query = getSupabase()
        .from("suppliers")
        .select("id, name, city, contact_email, lead_time_days, rating, min_order_value")
        .order("id", { ascending: true });

      if (supplier_id && supplier_id.trim() !== "") {
        query = query.eq("id", supplier_id.trim());
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      if (supplier_id && (!data || data.length === 0)) {
        throw new Error(`Supplier with ID '${supplier_id}' was not found in FreshMart database.`);
      }

      const formatSupplier = (s: {
        id: string;
        name: string;
        city: string;
        contact_email: string;
        lead_time_days: number;
        rating: number | string;
        min_order_value: number | string;
      }) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        contact_email: s.contact_email,
        lead_time_days: Number(s.lead_time_days),
        rating: Number(s.rating),
        min_order_value: Number(s.min_order_value),
      });

      if (supplier_id) {
        return {
          supplier: formatSupplier(data[0]),
        };
      }

      return {
        count: data?.length || 0,
        suppliers: (data || []).map(formatSupplier),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected database error";
      throw new Error(`Failed to retrieve supplier details: ${message}`);
    }
  },
});

/**
 * Tool 3: estimateDaysOfStockLeft (READ ONLY)
 * Purpose: Estimate how many days current inventory can support expected sales (stock_qty / avg_daily_sales).
 * Description begins with "Use this when..."
 */
export const estimateDaysOfStockLeft = defineTool({
  name: "estimateDaysOfStockLeft",
  description:
    "Use this when the store manager asks how many days of stock are remaining, depletion runway, or when an item will run out of stock based on daily sales velocity.",
  writes: false,
  schema: z.object({
    sku: z
      .string()
      .trim()
      .min(1)
      .describe("Product SKU to estimate stock runway for (e.g. SKU001)"),
  }),
  run: async ({ sku }) => {
    try {
      const { data, error } = await getSupabase()
        .from("products")
        .select("sku, name, category, unit, stock_qty, reorder_level, avg_daily_sales")
        .eq("sku", sku.trim())
        .single();

      if (error || !data) {
        throw new Error(`Product with SKU '${sku}' was not found in FreshMart inventory.`);
      }

      const currentStock = Number(data.stock_qty);
      const avgDailySales = Number(data.avg_daily_sales);

      // Handle zero or invalid average daily sales safely
      if (isNaN(avgDailySales) || avgDailySales <= 0) {
        return {
          sku: data.sku,
          product_name: data.name,
          category: data.category,
          unit: data.unit,
          current_stock: currentStock,
          average_daily_sales: avgDailySales || 0,
          days_remaining: null,
          calculable: false,
          status: "Cannot calculate: average daily sales is zero or unavailable.",
        };
      }

      const daysRemaining = Number((currentStock / avgDailySales).toFixed(1));

      return {
        sku: data.sku,
        product_name: data.name,
        category: data.category,
        unit: data.unit,
        current_stock: currentStock,
        average_daily_sales: avgDailySales,
        days_remaining: daysRemaining,
        calculable: true,
        status: "Calculated successfully",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected database error";
      throw new Error(`Failed to estimate days of stock remaining: ${message}`);
    }
  },
});

/**
 * Tool 4: createPurchaseOrder (WRITE TOOL — H4)
 * Purpose: Generates a draft purchase order and its associated line items in Supabase.
 * Enforces business rules:
 * - 1 PO per supplier.
 * - Quantities must match product reorder_qty (or positive integer specified).
 * - Authoritative pricing directly from database (never hallucinated).
 * - Expected delivery date = current_date + supplier.lead_time_days.
 * - Atomic creation of header and line items with rollback on error.
 */
export const createPurchaseOrder = defineTool({
  name: "createPurchaseOrder",
  description:
    "Use this when the store manager asks to draft, generate, or create a purchase order for restocking depleted inventory.",
  writes: true,
  schema: z.object({
    supplier_id: z
      .string()
      .trim()
      .min(1)
      .describe("Supplier ID for this purchase order (e.g. SUP01)"),
    notes: z
      .string()
      .optional()
      .describe("Optional operational note or remarks for the purchase order"),
    items: z
      .array(
        z.object({
          sku: z.string().trim().min(1).describe("Product SKU to reorder (e.g. SKU001)"),
          quantity: z
            .number()
            .int()
            .positive()
            .describe("Quantity to order (must be positive integer, typically matching reorder_qty)"),
        })
      )
      .min(1)
      .describe("List of line items to order for this supplier"),
  }),
  run: async ({ supplier_id, notes, items }) => {
    const supabase = getSupabase();

    // 1. Verify supplier existence and fetch lead time
    const { data: supplier, error: suppErr } = await supabase
      .from("suppliers")
      .select("id, name, lead_time_days, min_order_value")
      .eq("id", supplier_id.trim())
      .single();

    if (suppErr || !supplier) {
      throw new Error(`Supplier '${supplier_id}' was not found in the database. Cannot create purchase order.`);
    }

    // 2. Fetch authoritative product pricing and verify supplier relationship
    const requestedSkus = items.map((i) => i.sku.trim());
    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("sku, name, supplier_id, unit_cost, reorder_qty, unit")
      .in("sku", requestedSkus);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      throw new Error(`Failed to load product details: ${prodErr?.message || "No products found."}`);
    }

    const productMap = new Map(dbProducts.map((p) => [p.sku, p]));

    // Validate every item belongs strictly to this supplier
    for (const item of items) {
      const prod = productMap.get(item.sku.trim());
      if (!prod) {
        throw new Error(`Product '${item.sku}' not found in database.`);
      }
      if (prod.supplier_id !== supplier.id) {
        throw new Error(
          `Product '${item.sku}' (${prod.name}) belongs to supplier '${prod.supplier_id}', not '${supplier.id}'. Each PO must have items from exactly 1 supplier.`
        );
      }
    }

    // 3. Compute delivery date and line totals
    const leadTime = Number(supplier.lead_time_days) || 1;
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + leadTime);
    const expectedDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(expectedDelivery);

    let calculatedTotal = 0;
    const validatedItems = items.map((item) => {
      const prod = productMap.get(item.sku.trim())!;
      const unitCost = Number(prod.unit_cost);
      const lineCost = Number((item.quantity * unitCost).toFixed(2));
      calculatedTotal += lineCost;

      return {
        sku: prod.sku,
        name: prod.name,
        unit: prod.unit,
        quantity: item.quantity,
        unit_cost: unitCost,
        line_total: lineCost,
      };
    });

    calculatedTotal = Number(calculatedTotal.toFixed(2));

    // 4. Create purchase_orders record with initial status 'draft'
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({
        supplier_id: supplier.id,
        status: "draft",
        total_cost: calculatedTotal,
        expected_date: expectedDateStr,
        notes: notes || `Autonomous replenishment drafted by StockPilot for ${supplier.name}`,
      })
      .select("id, supplier_id, status, total_cost, expected_date, notes, created_at")
      .single();

    if (poErr || !po) {
      throw new Error(`Failed to insert purchase order header: ${poErr?.message}`);
    }

    // 5. Insert line items (with rollback if line insertion fails)
    const itemsPayload = validatedItems.map((item) => ({
      purchase_order_id: po.id,
      sku: item.sku,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
    }));

    const { error: itemsErr } = await supabase.from("purchase_order_items").insert(itemsPayload);

    if (itemsErr) {
      // Rollback header to avoid orphan records
      await supabase.from("purchase_orders").delete().eq("id", po.id);
      throw new Error(`Failed to insert line items: ${itemsErr.message}. Order rolled back.`);
    }

    // Check minimum order value warning (informational)
    const minOrderVal = Number(supplier.min_order_value) || 0;
    let minOrderWarning: string | undefined;
    if (minOrderVal > 0 && calculatedTotal < minOrderVal) {
      minOrderWarning = `Total cost (₹${calculatedTotal}) is below supplier minimum order value of ₹${minOrderVal}.`;
    }

    return {
      success: true,
      purchase_order_id: po.id,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      status: po.status,
      total_cost: calculatedTotal,
      expected_delivery_date: expectedDateStr,
      lead_time_days: leadTime,
      item_count: validatedItems.length,
      items: validatedItems,
      warning: minOrderWarning,
    };
  },
});

/**
 * Tool 5: updateStock (WRITE TOOL — Receiving & Stock Replenishment)
 * Purpose: Replenish inventory stock levels when goods or a purchase order are physically received.
 */
export const updateStock = defineTool({
  name: "updateStock",
  description:
    "Use this when goods or an existing purchase order have arrived at the FreshMart store to replenish inventory and mark the purchase order as received.",
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
          sku: z.string().trim().min(1).describe("Product SKU to adjust"),
          quantity_received: z.number().int().positive().describe("Units received to add to stock"),
        })
      )
      .optional()
      .describe("Manual stock adjustments if not linking a full purchase order"),
  }),
  run: async ({ purchase_order_id, adjustments }) => {
    const supabase = getSupabase();
    const updatedProducts: Array<{ sku: string; previous_stock: number; new_stock: number }> = [];

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

      const { data: items, error: itemsErr } = await supabase
        .from("purchase_order_items")
        .select("sku, quantity")
        .eq("purchase_order_id", purchase_order_id);

      if (itemsErr || !items || items.length === 0) {
        throw new Error(`No items found for purchase order #${purchase_order_id}.`);
      }

      for (const item of items) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock_qty")
          .eq("sku", item.sku)
          .single();

        const current = prod?.stock_qty ?? 0;
        const updated = current + item.quantity;

        await supabase.from("products").update({ stock_qty: updated }).eq("sku", item.sku);
        updatedProducts.push({ sku: item.sku, previous_stock: current, new_stock: updated });
      }

      await supabase.from("purchase_orders").update({ status: "received" }).eq("id", purchase_order_id);

      return {
        success: true,
        purchase_order_id,
        status: "received",
        message: `PO #${purchase_order_id} marked as received. Stock replenished for ${updatedProducts.length} items.`,
        updated_products: updatedProducts,
      };
    }

    if (adjustments && adjustments.length > 0) {
      for (const adj of adjustments) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock_qty")
          .eq("sku", adj.sku)
          .single();

        const current = prod?.stock_qty ?? 0;
        const updated = current + adj.quantity_received;

        await supabase.from("products").update({ stock_qty: updated }).eq("sku", adj.sku);
        updatedProducts.push({ sku: adj.sku, previous_stock: current, new_stock: updated });
      }

      return {
        success: true,
        message: `Stock updated for ${updatedProducts.length} products.`,
        updated_products: updatedProducts,
      };
    }

    throw new Error("Must provide either a purchase_order_id or adjustments array to update stock.");
  },
});

/**
 * All Registered Agent Tools
 */
export const tools: AgentTool[] = [
  getLowStockItems,
  getSupplierDetails,
  estimateDaysOfStockLeft,
  createPurchaseOrder,
  updateStock,
];
