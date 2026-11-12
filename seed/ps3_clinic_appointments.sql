-- =====================================================================
-- PS3 Clinic Appointment Agent (CareSlot)
-- SRM Agentic AI Hackathon | Seed data
-- Run this in Supabase -> SQL Editor. It is safe to run again: it drops
-- and recreates its own tables. All names and records are made up.
-- Dates are relative to today, so the data is always fresh.
-- Logged-in user for the demo: patient P001 (Arjun Mehta). Dummy data only, no real patients.
-- =====================================================================

drop table if exists appointments, patients, slots, doctors, departments cascade;

create table departments (
  id             text primary key,
  name           text not null,
  common_issues  text not null   -- helps the agent pick the right department
);

create table doctors (
  id                text primary key,
  name              text not null,
  department_id     text not null references departments(id),
  qualification     text not null,
  experience_years  int not null,
  consultation_fee  int not null,
  languages         text[] not null,
  room              text not null
);

create table slots (
  id          bigint generated always as identity primary key,
  doctor_id   text not null references doctors(id),
  slot_date   date not null,
  start_time  time not null,
  is_booked   boolean not null default false,
  unique (doctor_id, slot_date, start_time)
);

create table patients (
  id     text primary key,
  name   text not null,
  phone  text not null,
  age    int not null,
  city   text not null
);

create table appointments (
  id          bigint generated always as identity primary key,
  patient_id  text not null references patients(id),
  doctor_id   text not null references doctors(id),
  slot_id     bigint not null references slots(id),
  reason      text,
  status      text not null default 'booked' check (status in ('booked','cancelled','completed')),
  created_at  timestamptz not null default now()
);

-- Booking rule: a slot can be booked only once. Booking sets slots.is_booked = true; cancelling sets it back to false.
-- Safety rule: the agent never diagnoses or suggests medicine. It only books.

insert into departments (id, name, common_issues) values
  ('D01', 'General Medicine', 'fever, cold, cough, body pain, tiredness, general check-up, diabetes and BP follow-up'),
  ('D02', 'Dermatology', 'skin rash, acne, itching, hair fall, allergy on skin, nail problems'),
  ('D03', 'Pediatrics', 'children''s health, vaccination, child fever, growth check-up'),
  ('D04', 'Orthopedics', 'joint pain, back pain, knee pain, fracture, sports injury, neck pain'),
  ('D05', 'Cardiology', 'chest discomfort, heart check-up, high BP, palpitations'),
  ('D06', 'ENT', 'ear pain, sore throat, sinus, blocked nose, hearing problems'),
  ('D07', 'Ophthalmology', 'eye pain, red eye, blurred vision, spectacles check-up'),
  ('D08', 'Dental', 'tooth pain, cavity, gum bleeding, cleaning, braces');

insert into doctors (id, name, department_id, qualification, experience_years, consultation_fee, languages, room) values
  ('DR01', 'Dr. Kavitha Subramanian', 'D01', 'MBBS, MD', 18, 500, array['English', 'Tamil']::text[], 'G-01'),
  ('DR02', 'Dr. Rajesh Kumar', 'D01', 'MBBS', 7, 400, array['English', 'Hindi', 'Tamil']::text[], 'G-02'),
  ('DR03', 'Dr. Nisha Menon', 'D02', 'MBBS, MD (Dermatology)', 12, 700, array['English', 'Malayalam', 'Tamil']::text[], '1-03'),
  ('DR04', 'Dr. Farhan Ali', 'D02', 'MBBS, DDVL', 6, 600, array['English', 'Hindi', 'Urdu']::text[], '1-04'),
  ('DR05', 'Dr. Sowmya Rao', 'D03', 'MBBS, MD (Pediatrics)', 15, 600, array['English', 'Kannada', 'Tamil']::text[], '1-05'),
  ('DR06', 'Dr. Prakash Iyer', 'D04', 'MBBS, MS (Ortho)', 20, 800, array['English', 'Tamil']::text[], '2-01'),
  ('DR07', 'Dr. Anjali Deshmukh', 'D04', 'MBBS, DNB (Ortho)', 9, 700, array['English', 'Hindi', 'Marathi']::text[], '2-02'),
  ('DR08', 'Dr. Venkatesh Reddy', 'D05', 'MBBS, DM (Cardiology)', 22, 1000, array['English', 'Telugu', 'Tamil']::text[], '2-05'),
  ('DR09', 'Dr. Meenakshi Sundaram', 'D06', 'MBBS, MS (ENT)', 14, 600, array['English', 'Tamil']::text[], '1-07'),
  ('DR10', 'Dr. Arvind Joshi', 'D06', 'MBBS, DLO', 5, 500, array['English', 'Hindi']::text[], '1-08'),
  ('DR11', 'Dr. Fathima Begum', 'D07', 'MBBS, MS (Ophthalmology)', 11, 600, array['English', 'Tamil', 'Urdu']::text[], 'G-05'),
  ('DR12', 'Dr. Sanjay Gupta', 'D07', 'MBBS, DO', 8, 500, array['English', 'Hindi']::text[], 'G-06'),
  ('DR13', 'Dr. Divya Krishnan', 'D08', 'BDS, MDS', 10, 400, array['English', 'Tamil', 'Malayalam']::text[], 'G-08'),
  ('DR14', 'Dr. Harish Babu', 'D08', 'BDS', 4, 300, array['English', 'Tamil', 'Telugu']::text[], 'G-09'),
  ('DR15', 'Dr. Lalitha Ramesh', 'D01', 'MBBS, DNB (Family Medicine)', 13, 450, array['English', 'Tamil', 'Kannada']::text[], 'G-03');

-- Slots: next 14 days, Monday to Saturday, 9:00 to 12:30 every 30 minutes (8 slots a day per doctor).
insert into slots (doctor_id, slot_date, start_time)
select d.id, day::date, t::time
from doctors d
cross join generate_series(current_date, current_date + 13, interval '1 day') as day
cross join generate_series(timestamp '2000-01-01 09:00', timestamp '2000-01-01 12:30', interval '30 minutes') as t
where extract(isodow from day) < 7;

-- About 1 in 3 slots are already taken by other patients.
update slots set is_booked = true where (id * 7 + extract(day from slot_date)::int) % 3 = 0;

insert into patients (id, name, phone, age, city) values
  ('P001', 'Arjun Mehta', '98400 12345', 29, 'Chennai'),
  ('P002', 'Revathi Shankar', '98410 23456', 41, 'Chennai'),
  ('P003', 'Imran Khan', '98840 34567', 35, 'Chennai'),
  ('P004', 'Pooja Nair', '99620 45678', 24, 'Chennai'),
  ('P005', 'Suresh Babu', '94450 56789', 58, 'Chengalpattu');

-- P001 already has one upcoming appointment (General Medicine, Dr. Kavitha) for the reschedule demo.
with s as (
  update slots set is_booked = true
  where id = (select id from slots where doctor_id = 'DR01' and slot_date > current_date and not is_booked
              order by slot_date, start_time limit 1)
  returning id, doctor_id
)
insert into appointments (patient_id, doctor_id, slot_id, reason)
select 'P001', doctor_id, id, 'Follow-up for fever' from s;

-- Row Level Security ON with no policies: only your server (secret key) can read/write.
-- The public anon key cannot read these tables.
alter table departments enable row level security;
alter table doctors enable row level security;
alter table slots enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
