-- =====================================================================
-- Day 1 lab: EventEase (Campus Event Registration Agent)
-- Run this in Supabase -> SQL Editor AFTER 00_starter_example.sql.
-- Safe to run again: it drops and recreates its own tables.
-- Logged-in student for the lab: S001. All data is made up.
-- =====================================================================

drop view if exists events_with_seats;
drop table if exists registrations, events cascade;

create table events (
  id           bigint generated always as identity primary key,
  title        text not null,
  category     text not null check (category in ('tech', 'cultural', 'sports', 'workshop')),
  venue        text not null,
  event_date   date not null,
  start_time   time not null,
  capacity     int  not null check (capacity > 0),
  description  text not null
);

create table registrations (
  id          bigint generated always as identity primary key,
  event_id    bigint not null references events(id) on delete cascade,
  student_id  text   not null,
  created_at  timestamptz not null default now(),
  unique (event_id, student_id)          -- a student can register only once per event
);

-- Seats left are counted from registrations, so they are always correct.
create view events_with_seats with (security_invoker = true) as
select e.*,
       e.capacity - count(r.id)::int as seats_left
from events e
left join registrations r on r.event_id = e.id
group by e.id;

insert into events (title, category, venue, event_date, start_time, capacity, description) values
  ('Intro to Agentic AI',            'tech',     'Tech Park Hall 401',  current_date + 1,  '10:00', 60,  'Hands-on talk on AI agents and tool calling.'),
  ('Build with Next.js in 2 Hours',  'workshop', 'Lab Block 2, Lab 5',  current_date + 2,  '14:00', 40,  'Beginner workshop. Bring your laptop.'),
  ('Cloud Basics with Free Tiers',   'tech',     'Tech Park Hall 402',  current_date + 3,  '11:00', 80,  'Deploy your first app on free cloud services.'),
  ('Resume and LinkedIn Clinic',     'workshop', 'Career Centre',       current_date + 4,  '15:00', 30,  'Get your resume reviewed by seniors.'),
  ('Inter-department Cricket Final', 'sports',   'University Ground',   current_date + 5,  '08:00', 200, 'Come and support your department.'),
  ('Classical Music Evening',        'cultural', 'Main Auditorium',     current_date + 6,  '18:00', 300, 'Carnatic and Hindustani performances by students.'),
  ('Hack Night: 6-Hour Mini Hackathon','tech',   'Innovation Lab',      current_date + 8,  '17:00', 50,  'Teams of 3. Snacks provided.'),
  ('Photography Walk',               'cultural', 'Main Gate',           current_date + 9,  '06:30', 25,  'Morning walk around campus with the photography club.'),
  ('Git and GitHub for Beginners',   'workshop', 'Lab Block 1, Lab 2',  current_date + 1,  '16:00', 20,  'Learn commits, branches and pull requests.'),
  ('Yoga and Wellness Session',      'sports',   'Indoor Stadium',      current_date + 3,  '07:00', 100, 'Open to all students.');

-- Make "Git and GitHub for Beginners" FULL (20 of 20 seats taken) to test the "event is full" rule.
insert into registrations (event_id, student_id)
select e.id, 'S' || lpad(n::text, 3, '0')
from events e, generate_series(101, 120) as n
where e.title = 'Git and GitHub for Beginners';

-- A few other registrations
insert into registrations (event_id, student_id)
select e.id, 'S' || lpad(n::text, 3, '0')
from events e, generate_series(101, 135) as n
where e.title = 'Intro to Agentic AI';

alter table events enable row level security;
alter table registrations enable row level security;
