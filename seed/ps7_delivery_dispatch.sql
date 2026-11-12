-- =====================================================================
-- PS7 Delivery Dispatch Agent (RouteWise)
-- SRM Agentic AI Hackathon | Seed data
-- Run this in Supabase -> SQL Editor. It is safe to run again: it drops
-- and recreates its own tables. All names and records are made up.
-- Dates are relative to today, so the data is always fresh.
-- Logged-in user for the demo: dispatcher D01 (Anitha V), Chennai hub
-- =====================================================================

drop table if exists delivery_attempts, deliveries, rider_shifts, riders, zones cascade;

create table zones (
  id        text primary key,
  name      text not null,
  pincodes  text not null
);

create table riders (
  id          text primary key,
  name        text not null,
  phone       text not null,
  home_zone   text not null references zones(id),
  vehicle     text not null check (vehicle in ('bike','scooter','van')),
  capacity    int  not null check (capacity > 0),
  is_active   boolean not null default true
);

create table rider_shifts (
  id          bigint generated always as identity primary key,
  rider_id    text not null references riders(id),
  shift_date  date not null,
  start_time  time not null,
  end_time    time not null,
  unique (rider_id, shift_date)
);

create table deliveries (
  id              bigint generated always as identity primary key,
  order_ref       text not null unique,
  customer_name   text not null,
  address         text not null,
  zone_id         text not null references zones(id),
  parcel_size     text not null check (parcel_size in ('small','medium','large')),
  is_cod          boolean not null default false,
  cod_amount      int not null default 0,
  delivery_date   date not null,
  time_window     text not null check (time_window in ('morning','afternoon','evening')),
  rider_id        text references riders(id),
  status          text not null default 'pending'
                  check (status in ('pending','assigned','out_for_delivery','delivered','failed','returned')),
  attempts        int not null default 0 check (attempts between 0 and 3),
  created_at      timestamptz not null default now()
);

create table delivery_attempts (
  id            bigint generated always as identity primary key,
  delivery_id   bigint not null references deliveries(id),
  rider_id      text not null references riders(id),
  attempted_at  timestamptz not null default now(),
  outcome       text not null check (outcome in ('delivered','customer_not_home','wrong_address','refused','rescheduled')),
  note          text
);

insert into zones (id, name, pincodes) values
  ('Z1', 'Velachery',    '600042, 600088'),
  ('Z2', 'Adyar',        '600020, 600041'),
  ('Z3', 'Anna Nagar',   '600040, 600101'),
  ('Z4', 'T Nagar',      '600017'),
  ('Z5', 'Tambaram',     '600045, 600059');

-- Capacity = most active deliveries (assigned or out_for_delivery) a rider can hold at once.
insert into riders (id, name, phone, home_zone, vehicle, capacity, is_active) values
  ('R01', 'Suresh Kumar',   '+91-90000-10001', 'Z1', 'bike',    6, true),
  ('R02', 'Lakshmi Priya',  '+91-90000-10002', 'Z1', 'scooter', 5, true),
  ('R03', 'Mohammed Irfan', '+91-90000-10003', 'Z2', 'bike',    6, true),
  ('R04', 'Deepa R',        '+91-90000-10004', 'Z3', 'scooter', 5, true),
  ('R05', 'Vignesh M',      '+91-90000-10005', 'Z3', 'van',    12, true),
  ('R06', 'Kavya S',        '+91-90000-10006', 'Z4', 'bike',    6, true),
  ('R07', 'Ramesh B',       '+91-90000-10007', 'Z5', 'van',    12, true),
  ('R08', 'Gokul P',        '+91-90000-10008', 'Z2', 'bike',    6, false);

-- Today's shifts. R02 is off today; R08 is inactive.
insert into rider_shifts (rider_id, shift_date, start_time, end_time) values
  ('R01', current_date, '08:00', '17:00'),
  ('R03', current_date, '09:00', '18:00'),
  ('R04', current_date, '08:00', '14:00'),
  ('R05', current_date, '10:00', '20:00'),
  ('R06', current_date, '12:00', '21:00'),
  ('R07', current_date, '08:00', '17:00'),
  ('R01', current_date + 1, '08:00', '17:00'),
  ('R02', current_date + 1, '09:00', '18:00'),
  ('R03', current_date + 1, '09:00', '18:00'),
  ('R05', current_date + 1, '10:00', '20:00'),
  ('R07', current_date + 1, '08:00', '17:00');

insert into deliveries (order_ref, customer_name, address, zone_id, parcel_size, is_cod, cod_amount, delivery_date, time_window, rider_id, status, attempts) values
  -- Velachery: R01 already holds 5 of 6, so only 1 more fits
  ('ORD-5001', 'Nisha K',        '12, 2nd Main Rd, Velachery',        'Z1', 'small',  false,    0, current_date, 'morning',   'R01', 'out_for_delivery', 0),
  ('ORD-5002', 'Arun Prakash',   '45, Taramani Link Rd, Velachery',   'Z1', 'medium', true,   899, current_date, 'morning',   'R01', 'assigned',         0),
  ('ORD-5003', 'Fathima Z',      '7, Vijaya Nagar, Velachery',        'Z1', 'small',  false,    0, current_date, 'afternoon', 'R01', 'assigned',         0),
  ('ORD-5004', 'Harish V',       '88, 100 Feet Rd, Velachery',        'Z1', 'large',  false,    0, current_date, 'afternoon', 'R01', 'assigned',         0),
  ('ORD-5005', 'Sangeetha M',    '3, Bharathi Nagar, Velachery',      'Z1', 'small',  true,   349, current_date, 'evening',   'R01', 'assigned',         0),
  ('ORD-5006', 'Balaji T',       '21, Ram Nagar, Velachery',          'Z1', 'medium', false,    0, current_date, 'evening',   null,  'pending',          0),
  ('ORD-5007', 'Keerthana S',    '9, Dhandeeswaram, Velachery',       'Z1', 'small',  true,  1299, current_date, 'evening',   null,  'pending',          0),
  -- Adyar
  ('ORD-5008', 'Rahul Menon',    '14, Gandhi Nagar, Adyar',           'Z2', 'small',  false,    0, current_date, 'morning',   'R03', 'delivered',        1),
  ('ORD-5009', 'Divya Shankar',  '5, Kasturba Nagar, Adyar',          'Z2', 'medium', true,   650, current_date, 'afternoon', null,  'pending',          0),
  ('ORD-5010', 'Joseph A',       '33, LB Road, Adyar',                'Z2', 'small',  false,    0, current_date, 'afternoon', null,  'pending',          0),
  -- Anna Nagar
  ('ORD-5011', 'Preethi R',      '2nd Ave, Anna Nagar',               'Z3', 'large',  false,    0, current_date, 'morning',   'R05', 'out_for_delivery', 0),
  ('ORD-5012', 'Sanjay G',       'AC Block, Anna Nagar',              'Z3', 'medium', true,  2100, current_date, 'afternoon', null,  'pending',          0),
  ('ORD-5013', 'Meena L',        'Shanthi Colony, Anna Nagar',        'Z3', 'small',  false,    0, current_date, 'evening',   null,  'pending',          0),
  -- T Nagar
  ('ORD-5014', 'Ashwin K',       'Usman Rd, T Nagar',                 'Z4', 'small',  false,    0, current_date, 'evening',   null,  'pending',          0),
  ('ORD-5015', 'Revathi N',      'Pondy Bazaar, T Nagar',             'Z4', 'medium', true,   480, current_date, 'evening',   null,  'pending',          0),
  -- Tambaram
  ('ORD-5016', 'Prakash D',      'Camp Rd, Tambaram',                 'Z5', 'large',  false,    0, current_date, 'morning',   'R07', 'assigned',         0),
  ('ORD-5017', 'Uma Devi',       'Selaiyur, Tambaram',                'Z5', 'small',  true,   299, current_date, 'afternoon', null,  'pending',          0),
  -- Failed deliveries to reschedule
  ('ORD-4990', 'Karthik Raja',   '18, Lake View Rd, Velachery',       'Z1', 'medium', true,   799, current_date - 1, 'evening',   'R01', 'failed', 1),
  ('ORD-4991', 'Swathi P',       '6, Indira Nagar, Adyar',            'Z2', 'small',  false,    0, current_date - 1, 'afternoon', 'R03', 'failed', 2),
  ('ORD-4992', 'Naveen J',       '40, 3rd St, Anna Nagar',            'Z3', 'large',  true,  3200, current_date - 2, 'morning',   'R04', 'failed', 3),
  -- Tomorrow
  ('ORD-5020', 'Lavanya B',      '11, Nehru St, Tambaram',            'Z5', 'small',  false,    0, current_date + 1, 'morning',   null,  'pending',          0),
  ('ORD-5021', 'Imran S',        '27, Thiruvalluvar Nagar, Adyar',    'Z2', 'medium', false,    0, current_date + 1, 'afternoon', null,  'pending',          0);

insert into delivery_attempts (delivery_id, rider_id, attempted_at, outcome, note)
select d.id, d.rider_id, a.at, a.outcome, a.note
from (values
  ('ORD-5008', current_date + time '10:15', 'delivered',          'Handed to customer'),
  ('ORD-4990', (current_date - 1) + time '19:30', 'customer_not_home', 'Phone switched off'),
  ('ORD-4991', (current_date - 2) + time '15:10', 'customer_not_home', 'No answer at door'),
  ('ORD-4991', (current_date - 1) + time '14:40', 'wrong_address',     'Flat number missing'),
  ('ORD-4992', (current_date - 4) + time '11:00', 'customer_not_home', null),
  ('ORD-4992', (current_date - 3) + time '11:20', 'customer_not_home', null),
  ('ORD-4992', (current_date - 2) + time '10:50', 'refused',           'Customer refused COD amount')
) as a(ref, at, outcome, note)
join deliveries d on d.order_ref = a.ref;

-- ---------------------------------------------------------------------
-- assign_delivery: all checks in one place, so the AI cannot break them.
-- Rules: delivery must be pending; rider active and on shift
-- that day; same zone as the delivery; rider below capacity; under 3 attempts.
-- ---------------------------------------------------------------------
create or replace function assign_delivery(p_delivery_id bigint, p_rider_id text)
returns json language plpgsql as $$
declare
  d deliveries%rowtype;
  r riders%rowtype;
  active_count int;
begin
  select * into d from deliveries where id = p_delivery_id for update;
  if not found then raise exception 'Delivery % not found', p_delivery_id; end if;
  if d.status <> 'pending' then
    raise exception 'Delivery % is %. Only pending deliveries can be assigned (reschedule failed ones first)', d.order_ref, d.status;
  end if;
  if d.attempts >= 3 then
    raise exception 'Delivery % already has 3 attempts. Mark it returned instead', d.order_ref;
  end if;

  select * into r from riders where id = p_rider_id;
  if not found then raise exception 'Rider % not found', p_rider_id; end if;
  if not r.is_active then raise exception 'Rider % is not active', r.name; end if;
  if r.home_zone <> d.zone_id then
    raise exception 'Rider % works in zone %, but the delivery is in zone %', r.name, r.home_zone, d.zone_id;
  end if;
  if not exists (select 1 from rider_shifts where rider_id = r.id and shift_date = d.delivery_date) then
    raise exception 'Rider % has no shift on %', r.name, d.delivery_date;
  end if;

  select count(*) into active_count from deliveries
   where rider_id = r.id and status in ('assigned','out_for_delivery');
  if active_count >= r.capacity then
    raise exception 'Rider % is full (% of % deliveries)', r.name, active_count, r.capacity;
  end if;

  update deliveries set rider_id = r.id, status = 'assigned' where id = d.id;
  return json_build_object('delivery_id', d.id, 'order_ref', d.order_ref, 'rider', r.name,
                           'rider_load', active_count + 1, 'capacity', r.capacity);
end $$;

-- ---------------------------------------------------------------------
-- reschedule_delivery: only failed deliveries, max 3 attempts in total,
-- new date must be today or later. Clears the rider so it can be assigned again.
-- ---------------------------------------------------------------------
create or replace function reschedule_delivery(p_delivery_id bigint, p_new_date date, p_time_window text)
returns json language plpgsql as $$
declare
  d deliveries%rowtype;
begin
  select * into d from deliveries where id = p_delivery_id for update;
  if not found then raise exception 'Delivery % not found', p_delivery_id; end if;
  if d.status <> 'failed' then
    raise exception 'Only failed deliveries can be rescheduled. % is %', d.order_ref, d.status;
  end if;
  if d.attempts >= 3 then
    raise exception 'Delivery % already has 3 attempts. Mark it returned instead', d.order_ref;
  end if;
  if p_new_date < current_date then
    raise exception 'The new date must be today or later';
  end if;
  if p_time_window not in ('morning','afternoon','evening') then
    raise exception 'Time window must be morning, afternoon or evening';
  end if;

  update deliveries
     set delivery_date = p_new_date, time_window = p_time_window, status = 'pending', rider_id = null
   where id = d.id;
  insert into delivery_attempts (delivery_id, rider_id, outcome, note)
  values (d.id, d.rider_id, 'rescheduled', 'Rescheduled to ' || p_new_date || ' ' || p_time_window);
  return json_build_object('delivery_id', d.id, 'order_ref', d.order_ref,
                           'new_date', p_new_date, 'time_window', p_time_window, 'attempts_used', d.attempts);
end $$;

-- Row Level Security ON with no policies: only your server (secret key) can read/write.
alter table zones enable row level security;
alter table riders enable row level security;
alter table rider_shifts enable row level security;
alter table deliveries enable row level security;
alter table delivery_attempts enable row level security;

-- Give the server key (service_role) access, then tell the Supabase API to see the new tables.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function assign_delivery(bigint, text) to service_role;
grant execute on function reschedule_delivery(bigint, date, text) to service_role;
notify pgrst, 'reload schema';
