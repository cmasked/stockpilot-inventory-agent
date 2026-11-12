-- =====================================================================
-- PS5 Expense Claim Assistant (ClaimEase)
-- SRM Agentic AI Hackathon | Seed data
-- Run this in Supabase -> SQL Editor. It is safe to run again: it drops
-- and recreates its own tables. All names and records are made up.
-- Dates are relative to today, so the data is always fresh.
-- Logged-in user for the demo: employee E001 (Meera Nair, grade L2) at Orbitline Consulting
-- =====================================================================

drop table if exists claims, policy_rules, employees cascade;

create table employees (
  id            text primary key,
  name          text not null,
  email         text not null,
  grade         text not null check (grade in ('L1','L2','L3')),   -- L1 = junior, L3 = senior
  department    text not null,
  manager_name  text not null,
  base_city     text not null
);

create table policy_rules (
  id                      bigint generated always as identity primary key,
  category                text not null,
  grade                   text not null check (grade in ('L1','L2','L3')),
  max_amount              int not null,          -- in rupees, per claim (per night for hotels, per month for internet/mobile)
  receipt_required_above  int not null,          -- a bill is needed above this amount
  notes                   text not null,
  unique (category, grade)
);

create table claims (
  id            bigint generated always as identity primary key,
  employee_id   text not null references employees(id),
  category      text not null,
  amount        numeric(10,2) not null check (amount > 0),
  expense_date  date not null,
  description   text not null,
  has_receipt   boolean not null default false,
  status        text not null default 'submitted' check (status in ('submitted','flagged','approved','rejected','paid')),
  policy_check  text,                              -- why it was flagged, or 'Within policy'
  created_at    timestamptz not null default now()
);

-- Policy rules:
-- 1. If amount > max_amount for the employee's grade and category -> save with status 'flagged' and the reason.
-- 2. Claims for expenses older than 60 days are not allowed.
-- 3. Expense date cannot be in the future.

insert into employees (id, name, email, grade, department, manager_name, base_city) values
  ('E001', 'Meera Nair', 'meera.nair@orbitline.example.com', 'L2', 'Consulting', 'Ravi Shankar', 'Chennai'),
  ('E002', 'Aditya Rao', 'aditya.rao@orbitline.example.com', 'L1', 'Consulting', 'Ravi Shankar', 'Chennai'),
  ('E003', 'Kiran Kumar', 'kiran.kumar@orbitline.example.com', 'L1', 'Sales', 'Shalini Menon', 'Bengaluru'),
  ('E004', 'Shalini Menon', 'shalini.menon@orbitline.example.com', 'L3', 'Sales', 'Anand Krishnan', 'Bengaluru'),
  ('E005', 'Ravi Shankar', 'ravi.shankar@orbitline.example.com', 'L3', 'Consulting', 'Anand Krishnan', 'Chennai'),
  ('E006', 'Fatima Sheikh', 'fatima.sheikh@orbitline.example.com', 'L2', 'Finance', 'Gopal Iyer', 'Mumbai'),
  ('E007', 'Gopal Iyer', 'gopal.iyer@orbitline.example.com', 'L3', 'Finance', 'Anand Krishnan', 'Mumbai'),
  ('E008', 'Sandeep Yadav', 'sandeep.yadav@orbitline.example.com', 'L1', 'Operations', 'Lavanya R', 'Hyderabad'),
  ('E009', 'Lavanya R', 'lavanya.r@orbitline.example.com', 'L2', 'Operations', 'Anand Krishnan', 'Hyderabad'),
  ('E010', 'Joseph Thomas', 'joseph.thomas@orbitline.example.com', 'L1', 'Consulting', 'Ravi Shankar', 'Kochi'),
  ('E011', 'Priyanka Sen', 'priyanka.sen@orbitline.example.com', 'L2', 'Sales', 'Shalini Menon', 'Kolkata'),
  ('E012', 'Manoj Pillai', 'manoj.pillai@orbitline.example.com', 'L1', 'Sales', 'Shalini Menon', 'Chennai'),
  ('E013', 'Swathi Reddy', 'swathi.reddy@orbitline.example.com', 'L2', 'Consulting', 'Ravi Shankar', 'Hyderabad'),
  ('E014', 'Naveen Chandra', 'naveen.chandra@orbitline.example.com', 'L1', 'Finance', 'Gopal Iyer', 'Pune'),
  ('E015', 'Anand Krishnan', 'anand.krishnan@orbitline.example.com', 'L3', 'Leadership', 'CEO Office', 'Chennai');

insert into policy_rules (category, grade, max_amount, receipt_required_above, notes) values
  ('local_travel', 'L1', 800, 200, 'Cab or auto within the base city for work'),
  ('local_travel', 'L2', 1200, 200, 'Cab or auto within the base city for work'),
  ('local_travel', 'L3', 2000, 200, 'Cab or auto within the base city for work'),
  ('outstation_travel', 'L1', 6000, 0, 'Train or flight to another city. L1: train or economy. L3: any economy fare.'),
  ('outstation_travel', 'L2', 9000, 0, 'Train or flight to another city. L1: train or economy. L3: any economy fare.'),
  ('outstation_travel', 'L3', 15000, 0, 'Train or flight to another city. L1: train or economy. L3: any economy fare.'),
  ('hotel_metro', 'L1', 3500, 0, 'Per night. Metro cities: Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, Kolkata, Pune'),
  ('hotel_metro', 'L2', 5000, 0, 'Per night. Metro cities: Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, Kolkata, Pune'),
  ('hotel_metro', 'L3', 8000, 0, 'Per night. Metro cities: Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, Kolkata, Pune'),
  ('hotel_non_metro', 'L1', 2500, 0, 'Per night. All other cities'),
  ('hotel_non_metro', 'L2', 3500, 0, 'Per night. All other cities'),
  ('hotel_non_metro', 'L3', 5500, 0, 'Per night. All other cities'),
  ('meals', 'L1', 500, 300, 'Per day while travelling'),
  ('meals', 'L2', 800, 300, 'Per day while travelling'),
  ('meals', 'L3', 1200, 300, 'Per day while travelling'),
  ('client_entertainment', 'L1', 1500, 0, 'Client meals. Write the client name in the description'),
  ('client_entertainment', 'L2', 3000, 0, 'Client meals. Write the client name in the description'),
  ('client_entertainment', 'L3', 6000, 0, 'Client meals. Write the client name in the description'),
  ('internet', 'L1', 800, 0, 'Per month, home broadband for work'),
  ('internet', 'L2', 1000, 0, 'Per month, home broadband for work'),
  ('internet', 'L3', 1500, 0, 'Per month, home broadband for work'),
  ('mobile', 'L1', 500, 0, 'Per month, mobile bill'),
  ('mobile', 'L2', 750, 0, 'Per month, mobile bill'),
  ('mobile', 'L3', 1000, 0, 'Per month, mobile bill'),
  ('training', 'L1', 5000, 0, 'Courses and certifications. Needs manager approval'),
  ('training', 'L2', 10000, 0, 'Courses and certifications. Needs manager approval'),
  ('training', 'L3', 20000, 0, 'Courses and certifications. Needs manager approval');

insert into claims (employee_id, category, amount, expense_date, description, has_receipt, status, policy_check, created_at) values
  ('E001', 'local_travel', 640, current_date - 21, 'Cab to client office, Guindy', true, 'paid', 'Within policy', (current_date - 20) + time '10:00'),
  ('E001', 'meals', 720, current_date - 14, 'Lunch during Bengaluru client visit', true, 'approved', 'Within policy', (current_date - 13) + time '10:00'),
  ('E001', 'hotel_metro', 4800, current_date - 14, 'Hotel in Bengaluru, 1 night', true, 'approved', 'Within policy', (current_date - 13) + time '10:00'),
  ('E001', 'internet', 999, current_date - 8, 'Home broadband for last month', true, 'submitted', 'Within policy', (current_date - 7) + time '10:00'),
  ('E001', 'client_entertainment', 3600, current_date - 5, 'Dinner with Nexora Retail team', true, 'flagged', 'Above L2 limit of 3000 for client_entertainment', (current_date - 5) + time '10:00'),
  ('E002', 'local_travel', 450, current_date - 3, 'Auto to client site', false, 'submitted', 'Within policy', (current_date - 2) + time '10:00'),
  ('E003', 'outstation_travel', 5400, current_date - 10, 'Train Bengaluru to Mysuru and back', true, 'approved', 'Within policy', (current_date - 9) + time '10:00'),
  ('E003', 'meals', 650, current_date - 10, 'Meals during Mysuru trip', true, 'flagged', 'Above L1 limit of 500 for meals', (current_date - 9) + time '10:00'),
  ('E004', 'client_entertainment', 5200, current_date - 6, 'Lunch with Cobalt Logistics', true, 'approved', 'Within policy', (current_date - 5) + time '10:00'),
  ('E006', 'training', 8500, current_date - 25, 'Cloud practitioner certification exam', true, 'paid', 'Within policy', (current_date - 24) + time '10:00'),
  ('E008', 'hotel_non_metro', 2800, current_date - 4, 'Hotel in Warangal, 1 night', true, 'flagged', 'Above L1 limit of 2500 for hotel_non_metro', (current_date - 3) + time '10:00'),
  ('E009', 'mobile', 699, current_date - 9, 'Mobile bill', true, 'approved', 'Within policy', (current_date - 8) + time '10:00'),
  ('E010', 'local_travel', 380, current_date - 2, 'Cab to Infopark', false, 'submitted', 'Within policy', (current_date - 1) + time '10:00'),
  ('E011', 'outstation_travel', 7800, current_date - 12, 'Flight Kolkata to Delhi', true, 'approved', 'Within policy', (current_date - 11) + time '10:00'),
  ('E013', 'hotel_metro', 4200, current_date - 7, 'Hotel in Pune, 1 night', true, 'submitted', 'Within policy', (current_date - 6) + time '10:00');

-- Row Level Security ON with no policies: only your server (secret key) can read/write.
-- The public anon key cannot read these tables.
alter table employees enable row level security;
alter table policy_rules enable row level security;
alter table claims enable row level security;
