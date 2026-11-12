# GitHub Copilot Instructions — StockPilot

## Project Scope
StockPilot: AI-powered inventory restocking agent for FreshMart (Velachery branch) — SRM Hackathon PS2.

## Conventions & Rules
- **Stack**: Next.js App Router, TypeScript, Tailwind CSS, Supabase, Google Gemini API, Zod.
- **Database Source of Truth**: `seed/ps2_inventory_restock.sql`. Do not invent columns or user ownership fields.
- **Key Tables**: `suppliers`, `products`, `purchase_orders`, `purchase_order_items`.
- **Security**: Never expose `SUPABASE_SECRET_KEY` or `GEMINI_API_KEY` to client components. Never commit `.env.local`.

## Domain & Restocking Rules
- Low stock: `stock_qty <= reorder_level`. Order quantity must equal `reorder_qty`.
- PO Grouping: 1 PO per supplier. Total cost = `sum(quantity * unit_cost)`.
- Expected delivery date: `current_date + supplier.lead_time_days`.
- Stock exhaustion: `stock_qty / avg_daily_sales` (guard against division by zero).
- Valid PO statuses: `'draft'`, `'sent'`, `'received'`, `'cancelled'`.
- `min_order_value` is an informational constraint/warning, not a blocking error.
- Never mutate `products.stock_qty` during purchase order creation.

## Agent Tool Guidelines (`lib/agent/tools.ts`)
- Build tools using `defineTool()` with explicit Zod argument schemas.
- Every tool description MUST start with `"Use this when..."`.
- Read tools (`getLowStockItems`, `getSupplierDetails`, `estimateDaysOfStockLeft`) fetch real DB data.
- Write tools (`createPurchaseOrder`) insert POs and line items atomically.
- Do not add `user_id` parameters — schema does not have user tenancy.
- Keep tool responses concise for Gemini context efficiency.

