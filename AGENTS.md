# AGENTS.md — StockPilot (PS2: Inventory Restock Agent)

## Context & Objectives
Autonomous restocking agent for store manager of FreshMart, Velachery branch.
Identifies low stock, estimates depletion, groups by supplier, and drafts Purchase Orders (POs) in Supabase.

## Tech Stack & Architecture
- **Framework**: Next.js (App Router), React 19, TypeScript, Tailwind CSS
- **Database**: Supabase PostgreSQL (server-side only via `SUPABASE_SECRET_KEY`)
- **AI/LLM**: Google Gemini API (`@google/genai`) via `lib/agent/runAgent.ts`
- **Validation**: Zod schema validation for all tool inputs

## Schema & Core Entities (`seed/ps2_inventory_restock.sql`)
- `suppliers` (id, name, city, contact_email, lead_time_days, rating, min_order_value)
- `products` (sku, name, category, supplier_id, unit, stock_qty, reorder_level, reorder_qty, avg_daily_sales, unit_cost, selling_price)
- `purchase_orders` (id, supplier_id, status: draft|sent|received|cancelled, total_cost, expected_date, notes, created_at)
- `purchase_order_items` (id, purchase_order_id, sku, quantity, unit_cost)

## Business Logic & Rules
1. **Low Stock**: `stock_qty <= reorder_level`. Quantity to order is `reorder_qty`.
2. **PO Generation**: 1 PO per supplier. Total cost = `sum(quantity * unit_cost)`.
3. **Delivery Date**: `today + lead_time_days`.
4. **Days Left**: `stock_qty / avg_daily_sales` (handle 0/null daily sales safely).
5. **Constraints**: `min_order_value` is informational/warning; never alter inventory stock on PO creation.

## Agent Tooling Guidelines (`lib/agent/tools.ts`)
- Use `defineTool()` pattern with strict Zod schemas.
- Tool descriptions must start with `"Use this when..."`.
- Core tools: `getLowStockItems`, `getSupplierDetails`, `estimateDaysOfStockLeft`, `createPurchaseOrder`.
- Read tools query Supabase directly; write tools enforce validation before mutating tables.
- Return compact JSON objects; throw descriptive Errors on failure.

