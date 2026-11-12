-- =====================================================================
-- PS8 Smart Banking Assistant (PayWise)
-- SRM Agentic AI Hackathon | Seed data
-- Run this in Supabase -> SQL Editor. It is safe to run again: it drops
-- and recreates its own tables. All names and records are made up.
-- Dates are relative to today, so the data is always fresh.
-- Logged-in user for the demo: customer B001 (Rohan Iyer)
-- =====================================================================

drop table if exists budgets, transactions, transfer_limits, accounts, customers cascade;

create table customers (
  id        text primary key,
  name      text not null,
  email     text not null,
  city      text not null,
  kyc_level text not null check (kyc_level in ('basic','full'))
);

create table accounts (
  id            text primary key,
  customer_id   text not null references customers(id),
  account_type  text not null check (account_type in ('savings','salary','current')),
  nickname      text not null,
  masked_number text not null,
  balance       numeric(12,2) not null check (balance >= 0),
  is_frozen     boolean not null default false
);

-- Daily limit for transfers between a customer's own accounts, by KYC level.
create table transfer_limits (
  kyc_level      text primary key check (kyc_level in ('basic','full')),
  daily_limit    numeric(12,2) not null,
  per_txn_limit  numeric(12,2) not null
);

create table transactions (
  id           bigint generated always as identity primary key,
  account_id   text not null references accounts(id),
  txn_date     timestamptz not null default now(),
  description  text not null,
  category     text not null check (category in
               ('food','groceries','shopping','travel','bills','rent','entertainment','health','education','salary','transfer','other')),
  direction    text not null check (direction in ('debit','credit')),
  amount       numeric(12,2) not null check (amount > 0)
);

create table budgets (
  id             bigint generated always as identity primary key,
  customer_id    text not null references customers(id),
  category       text not null,
  monthly_limit  numeric(12,2) not null check (monthly_limit > 0),
  alert_at_pct   int not null default 80 check (alert_at_pct between 10 and 100),
  created_at     timestamptz not null default now(),
  unique (customer_id, category)
);

insert into customers (id, name, email, city, kyc_level) values
  ('B001', 'Rohan Iyer',    'rohan.iyer@paywise.example.com',   'Chennai',   'full'),
  ('B002', 'Sneha Pillai',  'sneha.pillai@paywise.example.com', 'Bengaluru', 'basic');

insert into transfer_limits (kyc_level, daily_limit, per_txn_limit) values
  ('basic',  25000, 10000),
  ('full',  100000, 50000);

insert into accounts (id, customer_id, account_type, nickname, masked_number, balance, is_frozen) values
  ('A100', 'B001', 'salary',  'Salary account',  'XXXX 4821', 48250.00, false),
  ('A101', 'B001', 'savings', 'Savings',         'XXXX 7730', 120500.00, false),
  ('A102', 'B001', 'savings', 'Old savings',     'XXXX 1194',   2300.00, true),
  ('A200', 'B002', 'savings', 'Savings',         'XXXX 5502',  15400.00, false);

-- This month's spends for B001 (dates relative to today).
insert into transactions (account_id, txn_date, description, category, direction, amount) values
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '0 day 09:00'), 'Salary credit - Zentrix Software', 'salary',   'credit', 85000),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '1 day 10:00'), 'House rent - Anna Nagar',          'rent',     'debit',  22000),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '1 day 19:30'), 'Swiggy order',                     'food',     'debit',    540),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '2 day 13:10'), 'Zomato order',                     'food',     'debit',    820),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '2 day 18:00'), 'BigBasket groceries',              'groceries','debit',   2650),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '3 day 08:45'), 'Metro card recharge',              'travel',   'debit',    500),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '3 day 21:00'), 'Movie tickets',                    'entertainment','debit', 760),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '4 day 12:30'), 'Electricity bill',                 'bills',    'debit',   1840),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '4 day 20:15'), 'Restaurant dinner',                'food',     'debit',   2350),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '5 day 11:00'), 'Amazon - headphones',              'shopping', 'debit',   3499),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '5 day 19:40'), 'Swiggy order',                     'food',     'debit',    610),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '6 day 09:20'), 'Mobile recharge',                  'bills',    'debit',    299),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '6 day 13:00'), 'Cafe coffee',                      'food',     'debit',    380),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '7 day 17:30'), 'Pharmacy',                         'health',   'debit',    920),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '7 day 20:00'), 'Uber ride',                        'travel',   'debit',    430),
  ('A100', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '8 day 21:10'), 'Zomato order',                     'food',     'debit',    690),
  ('A101', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '1 day 10:30'), 'Interest credit',                  'other',    'credit',   410),
  -- Last month, for comparisons
  ('A100', date_trunc('month', current_date) - interval '25 day', 'Swiggy order',       'food',     'debit',   720),
  ('A100', date_trunc('month', current_date) - interval '20 day', 'Restaurant dinner',  'food',     'debit',  1900),
  ('A100', date_trunc('month', current_date) - interval '15 day', 'BigBasket groceries','groceries','debit',  3100),
  ('A100', date_trunc('month', current_date) - interval '10 day', 'Flipkart - shoes',   'shopping', 'debit',  2799),
  ('A200', least(now() - interval '1 hour', date_trunc('month', current_date) + interval '2 day'), 'Grocery store',       'groceries','debit',  1200);

-- B001 already has a food budget, and has used most of it this month.
insert into budgets (customer_id, category, monthly_limit, alert_at_pct) values
  ('B001', 'food', 6000, 80);

-- ---------------------------------------------------------------------
-- transfer_funds: all checks in one place, so the AI cannot break them.
-- Rules: both accounts belong to the customer, different accounts, neither
-- frozen, amount > 0, no overdraft, per-transaction and daily limits by KYC.
-- ---------------------------------------------------------------------
create or replace function transfer_funds(p_customer_id text, p_from_account text, p_to_account text, p_amount numeric, p_note text default null)
returns json language plpgsql as $$
declare
  c customers%rowtype;
  a_from accounts%rowtype;
  a_to accounts%rowtype;
  lim transfer_limits%rowtype;
  sent_today numeric;
begin
  select * into c from customers where id = p_customer_id;
  if not found then raise exception 'Customer % not found', p_customer_id; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be more than 0'; end if;
  if p_from_account = p_to_account then raise exception 'From and to accounts must be different'; end if;

  select * into a_from from accounts where id = p_from_account and customer_id = p_customer_id for update;
  if not found then raise exception 'Account % is not one of your accounts', p_from_account; end if;
  select * into a_to from accounts where id = p_to_account and customer_id = p_customer_id for update;
  if not found then raise exception 'Account % is not one of your accounts. Transfers only go between your own accounts', p_to_account; end if;
  if a_from.is_frozen or a_to.is_frozen then
    raise exception 'A frozen account cannot send or receive money. Please visit the branch';
  end if;
  if a_from.balance < p_amount then
    raise exception 'Not enough balance. % has Rs %, transfer is Rs %', a_from.nickname, a_from.balance, p_amount;
  end if;

  select * into lim from transfer_limits where kyc_level = c.kyc_level;
  if p_amount > lim.per_txn_limit then
    raise exception 'Rs % is above your per-transfer limit of Rs %', p_amount, lim.per_txn_limit;
  end if;
  select coalesce(sum(t.amount), 0) into sent_today
    from transactions t join accounts a on a.id = t.account_id
   where a.customer_id = p_customer_id and t.category = 'transfer' and t.direction = 'debit'
     and t.txn_date::date = current_date;
  if sent_today + p_amount > lim.daily_limit then
    raise exception 'Daily transfer limit is Rs %. You have Rs % left today', lim.daily_limit, lim.daily_limit - sent_today;
  end if;

  update accounts set balance = balance - p_amount where id = a_from.id;
  update accounts set balance = balance + p_amount where id = a_to.id;
  insert into transactions (account_id, description, category, direction, amount) values
    (a_from.id, coalesce(p_note, 'Transfer to ' || a_to.nickname), 'transfer', 'debit',  p_amount),
    (a_to.id,   coalesce(p_note, 'Transfer from ' || a_from.nickname), 'transfer', 'credit', p_amount);

  return json_build_object('from', a_from.nickname, 'to', a_to.nickname, 'amount', p_amount,
                           'from_balance', a_from.balance - p_amount, 'to_balance', a_to.balance + p_amount,
                           'daily_limit_left', lim.daily_limit - sent_today - p_amount);
end $$;

-- Row Level Security ON with no policies: only your server (secret key) can read/write.
alter table customers enable row level security;
alter table accounts enable row level security;
alter table transfer_limits enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

-- Give the server key (service_role) access, then tell the Supabase API to see the new tables.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function transfer_funds(text, text, text, numeric, text) to service_role;
notify pgrst, 'reload schema';
