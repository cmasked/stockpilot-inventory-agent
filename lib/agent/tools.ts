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
 * Registered Read Tools for H3
 */
export const tools: AgentTool[] = [
  getLowStockItems,
  getSupplierDetails,
  estimateDaysOfStockLeft,
];
