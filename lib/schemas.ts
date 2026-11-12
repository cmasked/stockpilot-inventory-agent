import { z } from "zod";

/** Shared Zod schemas and TypeScript types for StockPilot (PS2) */

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .describe("Date in YYYY-MM-DD format");

export const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(4000),
});

export const agentRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(30),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Supplier Schema & Type
export const supplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  contact_email: z.string().email(),
  lead_time_days: z.number().int().nonnegative(),
  rating: z.number(),
  min_order_value: z.number().nonnegative(),
});
export type Supplier = z.infer<typeof supplierSchema>;

// Product Schema & Type
export const productSchema = z.object({
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  supplier_id: z.string(),
  unit: z.string(),
  stock_qty: z.number().int().nonnegative(),
  reorder_level: z.number().int().nonnegative(),
  reorder_qty: z.number().int().positive(),
  avg_daily_sales: z.number().nonnegative(),
  unit_cost: z.number().nonnegative(),
  selling_price: z.number().nonnegative(),
});
export type Product = z.infer<typeof productSchema>;

export type ProductWithSupplier = Product & {
  suppliers?: Pick<Supplier, "name" | "lead_time_days" | "contact_email"> | null;
  days_left?: number | null;
  is_low_stock?: boolean;
};

// Purchase Order Schema & Type
export const purchaseOrderStatusSchema = z.enum(["draft", "sent", "received", "cancelled"]);
export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;

export const purchaseOrderSchema = z.object({
  id: z.number(),
  supplier_id: z.string(),
  status: purchaseOrderStatusSchema,
  total_cost: z.number().nonnegative(),
  expected_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

// Purchase Order Item Schema & Type
export const purchaseOrderItemSchema = z.object({
  id: z.number(),
  purchase_order_id: z.number(),
  sku: z.string(),
  quantity: z.number().int().positive(),
  unit_cost: z.number().nonnegative(),
});
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;

export type PurchaseOrderItemWithProduct = PurchaseOrderItem & {
  products?: Pick<Product, "name" | "category" | "unit"> | null;
};

export type PurchaseOrderWithDetails = PurchaseOrder & {
  suppliers?: Supplier | null;
  items?: PurchaseOrderItemWithProduct[];
};

// Purchase Order Creation Schema (for Agent Tool and API)
export const createPurchaseOrderItemInputSchema = z.object({
  sku: z.string().trim().min(1).describe("Product SKU to reorder"),
  quantity: z.number().int().positive().describe("Quantity to order (typically matches reorder_qty)"),
});

export const createPurchaseOrderInputSchema = z.object({
  supplier_id: z.string().trim().min(1).describe("Supplier ID for this purchase order (e.g. SUP01)"),
  notes: z.string().optional().describe("Optional notes for this purchase order"),
  items: z.array(createPurchaseOrderItemInputSchema).min(1).describe("Items to order"),
});

// Update Stock Schema (when stock is received)
export const updateStockInputSchema = z.object({
  purchase_order_id: z.number().int().positive().optional().describe("ID of the purchase order to mark received and replenish inventory"),
  adjustments: z.array(z.object({
    sku: z.string().trim().min(1).describe("Product SKU"),
    quantity_received: z.number().int().positive().describe("Units received to add to current stock"),
  })).optional().describe("Direct manual stock adjustments if not linking a PO"),
});

// Backward compatibility for starter if needed
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  due_date: isoDate.optional(),
});
