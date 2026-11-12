# StockPilot — Autonomous Inventory Restock Agent (PS2)

**SRM Agentic AI Hackathon 2026** · Problem Statement 2 · Retail & Supply Chain

StockPilot is an intelligent inventory monitoring and restocking copilot built for the store manager of **FreshMart (Velachery branch, Chennai)**. It detects stock depletions in real time, forecasts runway, groups replenishments by supplier, and drafts official Purchase Orders directly in Supabase using Google Gemini function calling.

---

## 🚀 Live Demo & Repository
- **Live URL:** Deploying on Vercel
- **GitHub:** Team Repository
- **Passcode:** Protected via `APP_PASSCODE`

---

## 🛠️ Tech Stack
- **Frontend:** Next.js (App Router), React 19, Tailwind CSS v4, Lucide Icons
- **Backend:** Next.js API Routes (Node.js runtime)
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **AI Agent:** Google Gemini (`gemini-2.5-flash` / `gemini-3.8-flash`) via `@google/genai`
- **Validation:** Zod v4 schemas checking all tool inputs and API payloads
- **Hosting:** Vercel

---

## 🤖 The Agentic Workflow (30 Marks Compliance)
StockPilot implements a multi-turn autonomous agent loop (`lib/agent/runAgent.ts`, max 8 rounds) that executes real database tools:

| Tool Name | Type | Purpose | Tables Accessed |
|---|---|---|---|
| `getLowStockItems` | **Read** | Finds products where `stock_qty <= reorder_level`. Can filter by category or supplier. | `products`, `suppliers` |
| `getSupplierDetails` | **Read** | Retrieves lead times, contact emails, cities, ratings, and min order values. | `suppliers` |
| `estimateDaysOfStockLeft` | **Read** | Calculates stock runway (`stock_qty / avg_daily_sales`) and urgency categories. | `products` |
| `createPurchaseOrder` | **Write** | Atomically drafts a PO + line items in Supabase, calculating costs and delivery dates. | `purchase_orders`, `purchase_order_items`, `products`, `suppliers` |
| `updateStock` | **Write** | Replenishes inventory stock quantities when goods/orders are physically received. | `products`, `purchase_orders`, `purchase_order_items` |

### Core Business Rules Enforced
1. **Low Stock Condition:** An item requires reordering when `stock_qty <= reorder_level`.
2. **Order Quantity:** Replenishment quantity is strictly set to the product's defined `reorder_qty`.
3. **Supplier Grouping:** Exactly **one** Purchase Order per supplier.
4. **Authoritative Pricing:** Unit costs are fetched from the database — never hallucinated.
5. **Expected Delivery Date:** `today + supplier.lead_time_days` (IST).
6. **Stock Safety:** Creating a draft PO never changes inventory stock. Stock only updates when goods are received.

---

## 💬 3 Working Demo Prompts
1. **Stock Analysis:**
   > *"Which products are critically low on stock right now?"*
2. **Stockout Runway Forecasting:**
   > *"Which items will run out in the next 3 days? Estimate days of stock remaining for Dairy."*
3. **Autonomous Restocking:**
   > *"Draft purchase orders for all low-stock dairy and bakery items grouped by supplier."*

---

## 🗄️ Database Schema (`seed/ps2_inventory_restock.sql`)
- `suppliers` (id, name, city, contact_email, lead_time_days, rating, min_order_value) — 10 records
- `products` (sku, name, category, supplier_id, unit, stock_qty, reorder_level, reorder_qty, avg_daily_sales, unit_cost, selling_price) — 80 records
- `purchase_orders` (id, supplier_id, status, total_cost, expected_date, notes, created_at)
- `purchase_order_items` (id, purchase_order_id, sku, quantity, unit_cost)

---

## 👥 Team Roles
- **Team Lead / Architecture:** Overall plan, repo management, deployment, demo presentation
- **Frontend Engineer:** Dashboard views, product catalog, purchase orders management, responsive design
- **Backend / Database Engineer:** Supabase queries, schema enforcement, API route handlers
- **AI / Agent Engineer:** Gemini function calling loop, system prompt, Zod tool schemas
