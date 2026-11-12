-- =====================================================================
-- PS2 Inventory Restock Agent (StockPilot)
-- SRM Agentic AI Hackathon | Seed data
-- Run this in Supabase -> SQL Editor. It is safe to run again: it drops
-- and recreates its own tables. All names and records are made up.
-- Dates are relative to today, so the data is always fresh.
-- Business user: store manager of FreshMart, Velachery branch
-- =====================================================================

drop table if exists purchase_order_items, purchase_orders, products, suppliers cascade;

create table suppliers (
  id              text primary key,
  name            text not null,
  city            text not null,
  contact_email   text not null,
  lead_time_days  int not null,
  rating          numeric(2,1) not null,
  min_order_value numeric(10,2) not null default 0
);

create table products (
  sku              text primary key,
  name             text not null,
  category         text not null,
  supplier_id      text not null references suppliers(id),
  unit             text not null,
  stock_qty        int not null,
  reorder_level    int not null,
  reorder_qty      int not null,
  avg_daily_sales  numeric(6,1) not null,
  unit_cost        numeric(10,2) not null,
  selling_price    numeric(10,2) not null
);

create table purchase_orders (
  id             bigint generated always as identity primary key,
  supplier_id    text not null references suppliers(id),
  status         text not null default 'draft' check (status in ('draft','sent','received','cancelled')),
  total_cost     numeric(12,2) not null default 0,
  expected_date  date,
  notes          text,
  created_at     timestamptz not null default now()
);

create table purchase_order_items (
  id                 bigint generated always as identity primary key,
  purchase_order_id  bigint not null references purchase_orders(id) on delete cascade,
  sku                text not null references products(sku),
  quantity           int not null,
  unit_cost          numeric(10,2) not null
);

-- Low stock rule: stock_qty <= reorder_level. Order reorder_qty units. One purchase order per supplier.
-- Days of stock left = stock_qty / avg_daily_sales.

insert into suppliers (id, name, city, contact_email, lead_time_days, rating, min_order_value) values
  ('SUP01', 'Aavin Dairy Distributors', 'Chennai', 'orders@aavin-dist.example.com', 1, 4.6, 2000),
  ('SUP02', 'Golden Crust Bakers', 'Chennai', 'supply@goldencrust.example.com', 1, 4.2, 1000),
  ('SUP03', 'Southern Beverages Pvt Ltd', 'Chennai', 'sales@southbev.example.com', 3, 4.4, 5000),
  ('SUP04', 'CrunchTime Snacks', 'Coimbatore', 'orders@crunchtime.example.com', 4, 4.0, 3000),
  ('SUP05', 'Kaveri Grains & Staples', 'Trichy', 'trade@kaverigrains.example.com', 3, 4.7, 8000),
  ('SUP06', 'PureCare Personal Products', 'Bengaluru', 'b2b@purecare.example.com', 5, 4.1, 4000),
  ('SUP07', 'Sparkle Home Essentials', 'Chennai', 'orders@sparklehome.example.com', 2, 3.9, 2500),
  ('SUP08', 'GreenLeaf Farms', 'Hosur', 'fresh@greenleaf.example.com', 1, 4.5, 1500),
  ('SUP09', 'Spice Route Traders', 'Madurai', 'sales@spiceroute.example.com', 4, 4.3, 3000),
  ('SUP10', 'Frozen Fresh Foods', 'Chennai', 'orders@frozenfresh.example.com', 2, 4.0, 3000);

insert into products (sku, name, category, supplier_id, unit, stock_qty, reorder_level, reorder_qty, avg_daily_sales, unit_cost, selling_price) values
  ('SKU001', 'Toned Milk 500ml', 'Dairy', 'SUP01', 'pack', 20, 93, 362, 25.9, 28.0, 34.0),
  ('SKU002', 'Full Cream Milk 1L', 'Dairy', 'SUP01', 'pack', 106, 42, 122, 17.5, 21.0, 28.0),
  ('SKU003', 'Curd 400g', 'Dairy', 'SUP01', 'pack', 100, 30, 79, 7.9, 297.0, 383.0),
  ('SKU004', 'Paneer 200g', 'Dairy', 'SUP01', 'pack', 205, 59, 203, 20.3, 196.0, 231.0),
  ('SKU005', 'Butter 100g', 'Dairy', 'SUP01', 'pack', 108, 86, 173, 24.8, 98.0, 118.0),
  ('SKU006', 'Ghee 500ml', 'Dairy', 'SUP01', 'pack', 141, 68, 249, 17.8, 359.0, 472.0),
  ('SKU007', 'Cheese Slices 200g', 'Dairy', 'SUP01', 'pack', 31, 42, 186, 13.3, 138.0, 183.0),
  ('SKU008', 'Buttermilk 200ml', 'Dairy', 'SUP01', 'pack', 24, 54, 285, 20.4, 209.0, 259.0),
  ('SKU009', 'Flavoured Milk 180ml', 'Dairy', 'SUP01', 'pack', 85, 31, 128, 9.2, 155.0, 185.0),
  ('SKU010', 'Fresh Cream 250ml', 'Dairy', 'SUP01', 'pack', 41, 12, 51, 3.7, 352.0, 432.0),
  ('SKU011', 'Sandwich Bread 400g', 'Bakery', 'SUP02', 'pack', 154, 131, 332, 33.2, 304.0, 357.0),
  ('SKU012', 'Brown Bread 400g', 'Bakery', 'SUP02', 'pack', 62, 32, 146, 14.6, 435.0, 546.0),
  ('SKU013', 'Burger Buns (4)', 'Bakery', 'SUP02', 'pack', 167, 83, 413, 29.5, 214.0, 249.0),
  ('SKU014', 'Rusk 300g', 'Bakery', 'SUP02', 'pack', 127, 39, 121, 12.1, 355.0, 414.0),
  ('SKU015', 'Fruit Cake 250g', 'Bakery', 'SUP02', 'pack', 338, 84, 276, 27.6, 158.0, 209.0),
  ('SKU016', 'Pav (6)', 'Bakery', 'SUP02', 'pack', 34, 15, 46, 4.6, 31.0, 40.0),
  ('SKU017', 'Cream Biscuits 150g', 'Bakery', 'SUP02', 'pack', 14, 18, 39, 5.7, 204.0, 241.0),
  ('SKU018', 'Cola 750ml', 'Beverages', 'SUP03', 'unit', 22, 8, 21, 3.1, 145.0, 177.0),
  ('SKU019', 'Lemon Soda 600ml', 'Beverages', 'SUP03', 'unit', 82, 31, 158, 11.3, 202.0, 239.0),
  ('SKU020', 'Mango Drink 1.2L', 'Beverages', 'SUP03', 'unit', 245, 113, 245, 35.1, 49.0, 65.0),
  ('SKU021', 'Packaged Water 1L', 'Beverages', 'SUP03', 'unit', 223, 48, 195, 19.5, 77.0, 89.0),
  ('SKU022', 'Energy Drink 250ml', 'Beverages', 'SUP03', 'unit', 144, 121, 253, 36.2, 365.0, 452.0),
  ('SKU023', 'Green Tea 25 bags', 'Beverages', 'SUP03', 'unit', 260, 79, 243, 24.3, 165.0, 198.0),
  ('SKU024', 'Filter Coffee Powder 500g', 'Beverages', 'SUP03', 'unit', 44, 26, 96, 9.6, 383.0, 459.0),
  ('SKU025', 'Tea Powder 500g', 'Beverages', 'SUP03', 'unit', 2, 94, 238, 23.8, 264.0, 355.0),
  ('SKU026', 'Orange Juice 1L', 'Beverages', 'SUP03', 'unit', 55, 38, 173, 12.4, 301.0, 401.0),
  ('SKU027', 'Potato Chips 52g', 'Snacks', 'SUP04', 'pack', 90, 127, 235, 33.6, 339.0, 405.0),
  ('SKU028', 'Banana Chips 200g', 'Snacks', 'SUP04', 'pack', 80, 40, 161, 11.5, 98.0, 125.0),
  ('SKU029', 'Murukku 200g', 'Snacks', 'SUP04', 'pack', 91, 69, 266, 26.6, 408.0, 516.0),
  ('SKU030', 'Mixture 400g', 'Snacks', 'SUP04', 'pack', 71, 13, 75, 5.4, 334.0, 396.0),
  ('SKU031', 'Peanut Chikki 100g', 'Snacks', 'SUP04', 'pack', 349, 88, 315, 22.5, 72.0, 96.0),
  ('SKU032', 'Nachos 150g', 'Snacks', 'SUP04', 'pack', 151, 43, 118, 11.8, 376.0, 455.0),
  ('SKU033', 'Popcorn 70g', 'Snacks', 'SUP04', 'pack', 136, 95, 228, 32.6, 394.0, 513.0),
  ('SKU034', 'Roasted Chana 250g', 'Snacks', 'SUP04', 'pack', 284, 92, 277, 27.7, 113.0, 132.0),
  ('SKU035', 'Instant Noodles 70g', 'Snacks', 'SUP04', 'pack', 21, 26, 120, 12.0, 187.0, 243.0),
  ('SKU036', 'Chocolate Bar 40g', 'Snacks', 'SUP04', 'pack', 86, 54, 165, 16.5, 129.0, 166.0),
  ('SKU037', 'Sona Masoori Rice 5kg', 'Staples', 'SUP05', 'pack', 78, 99, 255, 25.5, 220.0, 263.0),
  ('SKU038', 'Basmati Rice 1kg', 'Staples', 'SUP05', 'pack', 341, 127, 333, 33.3, 42.0, 49.0),
  ('SKU039', 'Toor Dal 1kg', 'Staples', 'SUP05', 'pack', 21, 13, 23, 3.4, 35.0, 42.0),
  ('SKU040', 'Moong Dal 500g', 'Staples', 'SUP05', 'pack', 229, 46, 235, 16.8, 249.0, 333.0),
  ('SKU041', 'Wheat Atta 5kg', 'Staples', 'SUP05', 'pack', 124, 69, 302, 30.2, 197.0, 259.0),
  ('SKU042', 'Sugar 1kg', 'Staples', 'SUP05', 'pack', 480, 96, 527, 37.7, 283.0, 338.0),
  ('SKU043', 'Iodised Salt 1kg', 'Staples', 'SUP05', 'pack', 128, 29, 154, 11.0, 208.0, 262.0),
  ('SKU044', 'Sunflower Oil 1L', 'Staples', 'SUP05', 'pack', 63, 43, 109, 15.6, 440.0, 590.0),
  ('SKU045', 'Groundnut Oil 1L', 'Staples', 'SUP05', 'pack', 20, 13, 77, 5.5, 374.0, 434.0),
  ('SKU046', 'Rava 500g', 'Staples', 'SUP05', 'pack', 181, 141, 277, 39.6, 160.0, 211.0),
  ('SKU047', 'Poha 500g', 'Staples', 'SUP05', 'pack', 42, 88, 170, 24.3, 256.0, 334.0),
  ('SKU048', 'Bath Soap 125g', 'Personal Care', 'SUP06', 'unit', 100, 62, 172, 24.6, 358.0, 450.0),
  ('SKU049', 'Shampoo 180ml', 'Personal Care', 'SUP06', 'unit', 28, 23, 43, 6.2, 362.0, 442.0),
  ('SKU050', 'Toothpaste 150g', 'Personal Care', 'SUP06', 'unit', 67, 49, 244, 24.4, 358.0, 421.0),
  ('SKU051', 'Toothbrush Medium', 'Personal Care', 'SUP06', 'unit', 67, 13, 63, 6.3, 198.0, 242.0),
  ('SKU052', 'Hand Wash 200ml', 'Personal Care', 'SUP06', 'unit', 73, 46, 268, 19.2, 273.0, 354.0),
  ('SKU053', 'Coconut Hair Oil 300ml', 'Personal Care', 'SUP06', 'unit', 3, 70, 378, 27.0, 410.0, 476.0),
  ('SKU054', 'Talcum Powder 100g', 'Personal Care', 'SUP06', 'unit', 176, 58, 173, 17.3, 223.0, 260.0),
  ('SKU055', 'Shaving Gel 100g', 'Personal Care', 'SUP06', 'unit', 217, 53, 251, 25.1, 50.0, 64.0),
  ('SKU056', 'Dishwash Liquid 500ml', 'Household', 'SUP07', 'unit', 137, 57, 201, 14.4, 254.0, 315.0),
  ('SKU057', 'Detergent Powder 1kg', 'Household', 'SUP07', 'unit', 17, 19, 81, 5.8, 278.0, 360.0),
  ('SKU058', 'Floor Cleaner 1L', 'Household', 'SUP07', 'unit', 168, 47, 192, 19.2, 109.0, 134.0),
  ('SKU059', 'Toilet Cleaner 500ml', 'Household', 'SUP07', 'unit', 136, 36, 139, 13.9, 332.0, 445.0),
  ('SKU060', 'Garbage Bags (30)', 'Household', 'SUP07', 'unit', 5, 43, 140, 20.0, 314.0, 388.0),
  ('SKU061', 'Kitchen Towels (2 rolls)', 'Household', 'SUP07', 'unit', 116, 36, 113, 16.2, 339.0, 455.0),
  ('SKU062', 'Mosquito Repellent Refill', 'Household', 'SUP07', 'unit', 298, 77, 385, 27.5, 259.0, 343.0),
  ('SKU063', 'Aluminium Foil 9m', 'Household', 'SUP07', 'unit', 13, 124, 388, 38.8, 329.0, 416.0),
  ('SKU064', 'Tomato 1kg', 'Fruits & Vegetables', 'SUP08', 'kg', 44, 66, 189, 27.0, 108.0, 142.0),
  ('SKU065', 'Onion 1kg', 'Fruits & Vegetables', 'SUP08', 'kg', 389, 97, 310, 31.0, 175.0, 235.0),
  ('SKU066', 'Potato 1kg', 'Fruits & Vegetables', 'SUP08', 'kg', 243, 83, 177, 25.3, 371.0, 496.0),
  ('SKU067', 'Banana (dozen)', 'Fruits & Vegetables', 'SUP08', 'kg', 24, 28, 170, 12.2, 376.0, 456.0),
  ('SKU068', 'Apple 1kg', 'Fruits & Vegetables', 'SUP08', 'kg', 34, 8, 30, 2.2, 163.0, 201.0),
  ('SKU069', 'Carrot 500g', 'Fruits & Vegetables', 'SUP08', 'kg', 329, 53, 365, 26.1, 77.0, 92.0),
  ('SKU070', 'Green Chilli 100g', 'Fruits & Vegetables', 'SUP08', 'kg', 20, 41, 210, 15.0, 198.0, 258.0),
  ('SKU071', 'Coriander Bunch', 'Fruits & Vegetables', 'SUP08', 'kg', 9, 10, 36, 5.2, 262.0, 304.0),
  ('SKU072', 'Turmeric Powder 100g', 'Spices', 'SUP09', 'pack', 284, 53, 263, 18.8, 50.0, 62.0),
  ('SKU073', 'Chilli Powder 200g', 'Spices', 'SUP09', 'pack', 134, 57, 150, 21.5, 109.0, 140.0),
  ('SKU074', 'Sambar Powder 200g', 'Spices', 'SUP09', 'pack', 163, 57, 154, 22.0, 273.0, 368.0),
  ('SKU075', 'Garam Masala 100g', 'Spices', 'SUP09', 'pack', 75, 38, 68, 9.8, 39.0, 47.0),
  ('SKU076', 'Mustard Seeds 100g', 'Spices', 'SUP09', 'pack', 24, 59, 146, 20.9, 67.0, 84.0),
  ('SKU077', 'Cumin Seeds 100g', 'Spices', 'SUP09', 'pack', 100, 77, 232, 23.2, 115.0, 141.0),
  ('SKU078', 'Frozen Green Peas 500g', 'Frozen', 'SUP10', 'pack', 169, 54, 130, 18.6, 338.0, 410.0),
  ('SKU079', 'Frozen Parotta (5)', 'Frozen', 'SUP10', 'pack', 91, 57, 174, 17.4, 202.0, 249.0),
  ('SKU080', 'Ice Cream Tub 1L', 'Frozen', 'SUP10', 'pack', 84, 33, 85, 8.5, 435.0, 508.0);

-- One old purchase order, already received
insert into purchase_orders (supplier_id, status, total_cost, expected_date, notes, created_at)
values ('SUP05', 'received', 18450, current_date - 10, 'Monthly staples order', now() - interval '13 days');
insert into purchase_order_items (purchase_order_id, sku, quantity, unit_cost) values
  (1, 'SKU037', 255, 220.0),
  (1, 'SKU038', 333, 42.0),
  (1, 'SKU039', 23, 35.0);

-- Row Level Security ON with no policies: only your server (secret key) can read/write.
-- The public anon key cannot read these tables.
alter table suppliers enable row level security;
alter table products enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
