-- =====================================================================
-- PS6 Job Match Agent (CareerMatch)
-- SRM Agentic AI Hackathon | Seed data
-- Run this in Supabase -> SQL Editor. It is safe to run again: it drops
-- and recreates its own tables. All names and records are made up.
-- Dates are relative to today, so the data is always fresh.
-- Logged-in user for the demo: student S001 (Divya K). All companies are made up.
-- =====================================================================

drop table if exists shortlists, jobs, profiles cascade;

create table profiles (
  id           text primary key,
  name         text not null,
  degree       text not null,
  branch       text not null,
  grad_year    int not null,
  cgpa         numeric(3,1) not null,
  preferred_cities text[] not null,
  skills       text[] not null,          -- lower case, for easy matching
  interests    text
);

create table jobs (
  id              bigint generated always as identity primary key,
  title           text not null,
  company         text not null,
  city            text not null,
  work_mode       text not null check (work_mode in ('Onsite','Hybrid','Remote')),
  job_type        text not null check (job_type in ('Full-time','Internship')),
  min_cgpa        numeric(3,1) not null,
  eligible_branches text[] not null,
  required_skills text[] not null,       -- lower case
  nice_to_have    text[] not null,
  salary_lpa_min  numeric(4,1),
  salary_lpa_max  numeric(4,1),
  apply_by        date not null,
  description     text not null
);

create table shortlists (
  id           bigint generated always as identity primary key,
  profile_id   text not null references profiles(id),
  job_id       bigint not null references jobs(id),
  match_score  int check (match_score between 0 and 100),
  reason       text,
  created_at   timestamptz not null default now(),
  unique (profile_id, job_id)
);

-- Eligibility rule: skip jobs where profiles.cgpa < jobs.min_cgpa, the branch is not eligible, or apply_by < today.
-- Simple match score idea: (required skills the student has / total required skills) * 100.

insert into profiles (id, name, degree, branch, grad_year, cgpa, preferred_cities, skills, interests) values
  ('S001', 'Divya K', 'B.Tech', 'CSE', 2027, 8.1, array['Chennai', 'Bengaluru']::text[], array['python', 'sql', 'excel', 'html', 'css', 'javascript', 'git']::text[], 'Data and web development'),
  ('S002', 'Sharan M', 'B.Tech', 'IT', 2027, 7.2, array['Chennai', 'Hyderabad']::text[], array['java', 'spring boot', 'sql', 'git']::text[], 'Backend development'),
  ('S003', 'Nivetha P', 'B.Tech', 'AI & DS', 2027, 8.8, array['Bengaluru', 'Remote']::text[], array['python', 'pandas', 'numpy', 'machine learning', 'sql']::text[], 'Machine learning'),
  ('S004', 'Rahul J', 'B.Tech', 'ECE', 2027, 6.8, array['Chennai', 'Coimbatore']::text[], array['c', 'embedded c', 'python', 'iot']::text[], 'Embedded systems'),
  ('S005', 'Keerthana S', 'B.Tech', 'CSE', 2027, 9.0, array['Chennai', 'Remote']::text[], array['javascript', 'typescript', 'react', 'node.js', 'sql', 'git']::text[], 'Full-stack development');

insert into jobs (title, company, city, work_mode, job_type, min_cgpa, eligible_branches, required_skills, nice_to_have, salary_lpa_min, salary_lpa_max, apply_by, description) values
  ('Data Analyst', 'Nimbus Analytics', 'Chennai', 'Hybrid', 'Full-time', 7.0, array['CSE', 'IT', 'AI & DS', 'ECE']::text[], array['sql', 'excel', 'python']::text[], array['power bi', 'tableau']::text[], 4.0, 6.5, current_date + 14, 'Nimbus Analytics is hiring a Data Analyst for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Junior Data Analyst', 'Kaveri Digital', 'Chennai', 'Onsite', 'Full-time', 6.5, array['CSE', 'IT', 'AI & DS', 'ECE', 'EEE']::text[], array['sql', 'excel']::text[], array['python', 'power bi']::text[], 3.2, 4.5, current_date + 10, 'Kaveri Digital is hiring a Junior Data Analyst for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Business Intelligence Intern', 'Greenfield Retail Tech', 'Bengaluru', 'Hybrid', 'Internship', 7.0, array['CSE', 'IT', 'AI & DS']::text[], array['sql', 'power bi']::text[], array['excel', 'python']::text[], 1.8, 2.4, current_date + 10, 'Greenfield Retail Tech is hiring a Business Intelligence Intern (Internship) for its Bengaluru team. Freshers from the 2027 batch can apply.'),
  ('Frontend Developer', 'Coralbyte Systems', 'Hyderabad', 'Onsite', 'Full-time', 6.0, array['CSE', 'IT']::text[], array['html', 'css', 'javascript', 'react']::text[], array['typescript', 'tailwind css']::text[], 4.0, 7.0, current_date + 19, 'Coralbyte Systems is hiring a Frontend Developer (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Full Stack Developer', 'Vertex Mobility', 'Chennai', 'Hybrid', 'Full-time', 7.5, array['CSE', 'IT', 'AI & DS']::text[], array['javascript', 'react', 'node.js', 'sql']::text[], array['typescript', 'docker', 'git']::text[], 5.0, 9.0, current_date + 9, 'Vertex Mobility is hiring a Full Stack Developer (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Backend Developer (Java)', 'Kaveri Digital', 'Hyderabad', 'Onsite', 'Full-time', 8.0, array['CSE', 'IT']::text[], array['java', 'spring boot', 'sql']::text[], array['docker', 'microservices']::text[], 4.5, 8.0, current_date + 29, 'Kaveri Digital is hiring a Backend Developer (Java) (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Python Developer', 'Orbit Commerce', 'Chennai', 'Onsite', 'Full-time', 6.0, array['CSE', 'IT', 'AI & DS']::text[], array['python', 'sql', 'git']::text[], array['django', 'fastapi', 'docker']::text[], 4.0, 7.5, current_date + 7, 'Orbit Commerce is hiring a Python Developer (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('ML Engineer Intern', 'Trident Softworks', 'Bengaluru', 'Onsite', 'Internship', 6.5, array['CSE', 'AI & DS']::text[], array['python', 'machine learning', 'pandas']::text[], array['deep learning', 'sql']::text[], 2.0, 3.0, current_date + 22, 'Trident Softworks is hiring a ML Engineer Intern (Internship) for its Bengaluru team. Freshers from the 2027 batch can apply.'),
  ('GenAI Application Intern', 'Saffron Cloud', 'Chennai', 'Hybrid', 'Internship', 6.0, array['CSE', 'IT', 'AI & DS']::text[], array['python', 'llm apis', 'prompting']::text[], array['javascript', 'langchain', 'sql']::text[], 2.0, 3.5, current_date + 8, 'Saffron Cloud is hiring a GenAI Application Intern (Internship) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('DevOps Engineer Trainee', 'Monsoon Games', 'Coimbatore', 'Onsite', 'Full-time', 8.5, array['CSE', 'IT', 'ECE']::text[], array['linux', 'git', 'docker']::text[], array['kubernetes', 'aws', 'ci/cd']::text[], 4.0, 6.5, current_date + 23, 'Monsoon Games is hiring a DevOps Engineer Trainee (Full-time) for its Coimbatore team. Freshers from the 2027 batch can apply.'),
  ('QA Automation Engineer', 'Aster Fintech', 'Hyderabad', 'Hybrid', 'Full-time', 7.0, array['CSE', 'IT', 'ECE', 'EEE']::text[], array['selenium', 'java', 'sql']::text[], array['python', 'api testing']::text[], 3.5, 6.0, current_date + 7, 'Aster Fintech is hiring a QA Automation Engineer (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Cloud Support Associate', 'Quasar AI', 'Coimbatore', 'Onsite', 'Full-time', 7.0, array['CSE', 'IT', 'ECE', 'EEE']::text[], array['linux', 'networking', 'aws']::text[], array['python', 'docker']::text[], 3.5, 5.5, current_date + 17, 'Quasar AI is hiring a Cloud Support Associate (Full-time) for its Coimbatore team. Freshers from the 2027 batch can apply.'),
  ('Embedded Software Engineer', 'Lumen Labs', 'Bengaluru', 'Onsite', 'Full-time', 7.5, array['ECE', 'EEE']::text[], array['c', 'embedded c', 'microcontrollers']::text[], array['python', 'iot']::text[], 4.0, 7.0, current_date + 4, 'Lumen Labs is hiring a Embedded Software Engineer (Full-time) for its Bengaluru team. Freshers from the 2027 batch can apply.'),
  ('Mobile App Developer', 'Pinnacle QA Services', 'Hyderabad', 'Hybrid', 'Full-time', 6.0, array['CSE', 'IT']::text[], array['javascript', 'react native', 'git']::text[], array['typescript', 'firebase']::text[], 4.0, 7.0, current_date + 12, 'Pinnacle QA Services is hiring a Mobile App Developer (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Data Engineer Trainee', 'Bluepeak Technologies', 'Coimbatore', 'Onsite', 'Full-time', 6.0, array['CSE', 'IT', 'AI & DS']::text[], array['python', 'sql', 'etl']::text[], array['spark', 'airflow', 'aws']::text[], 4.5, 7.5, current_date + 4, 'Bluepeak Technologies is hiring a Data Engineer Trainee (Full-time) for its Coimbatore team. Freshers from the 2027 batch can apply.'),
  ('Software Engineer', 'Indigo Health Tech', 'Hyderabad', 'Onsite', 'Full-time', 6.0, array['CSE', 'IT', 'AI & DS', 'ECE']::text[], array['data structures', 'java', 'sql', 'git']::text[], array['python', 'docker']::text[], 5.0, 10.0, current_date + 23, 'Indigo Health Tech is hiring a Software Engineer (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Data Analyst', 'Nimbus Analytics', 'Chennai', 'Hybrid', 'Full-time', 7.5, array['CSE', 'IT', 'AI & DS', 'ECE']::text[], array['sql', 'excel', 'python']::text[], array['power bi', 'tableau', 'statistics']::text[], 3.5, 6.0, current_date + 19, 'Nimbus Analytics is hiring a Data Analyst (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Junior Data Analyst', 'Northwind Data', 'Pune', 'Onsite', 'Full-time', 7.5, array['CSE', 'IT', 'AI & DS', 'ECE', 'EEE']::text[], array['sql', 'excel']::text[], array['python', 'power bi']::text[], 3.0, 4.5, current_date + 20, 'Northwind Data is hiring a Junior Data Analyst (Full-time) for its Pune team. Freshers from the 2027 batch can apply.'),
  ('Business Intelligence Intern', 'Greenfield Retail Tech', 'Chennai', 'Onsite', 'Internship', 8.5, array['CSE', 'IT', 'AI & DS']::text[], array['sql', 'power bi']::text[], array['excel', 'python']::text[], 1.8, 2.4, current_date + 7, 'Greenfield Retail Tech is hiring a Business Intelligence Intern (Internship) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Frontend Developer', 'Coralbyte Systems', 'Hyderabad', 'Hybrid', 'Full-time', 7.0, array['CSE', 'IT']::text[], array['html', 'css', 'javascript', 'react']::text[], array['typescript', 'tailwind css']::text[], 4.0, 7.0, current_date + 19, 'Coralbyte Systems is hiring a Frontend Developer (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Full Stack Developer', 'Vertex Mobility', 'Chennai', 'Onsite', 'Full-time', 7.0, array['CSE', 'IT', 'AI & DS']::text[], array['javascript', 'react', 'node.js', 'sql']::text[], array['typescript', 'docker', 'git']::text[], 5.0, 9.0, current_date + 6, 'Vertex Mobility is hiring a Full Stack Developer (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Backend Developer (Java)', 'Kaveri Digital', 'Hyderabad', 'Hybrid', 'Full-time', 6.0, array['CSE', 'IT']::text[], array['java', 'spring boot', 'sql']::text[], array['docker', 'microservices']::text[], 4.5, 8.0, current_date + 19, 'Kaveri Digital is hiring a Backend Developer (Java) (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Python Developer', 'Orbit Commerce', 'Chennai', 'Onsite', 'Full-time', 6.5, array['CSE', 'IT', 'AI & DS']::text[], array['python', 'sql', 'git']::text[], array['django', 'fastapi', 'docker']::text[], 4.0, 7.5, current_date + 25, 'Orbit Commerce is hiring a Python Developer (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('ML Engineer Intern', 'Trident Softworks', 'Coimbatore', 'Onsite', 'Internship', 7.5, array['CSE', 'AI & DS']::text[], array['python', 'machine learning', 'pandas']::text[], array['deep learning', 'sql']::text[], 2.0, 3.0, current_date + 19, 'Trident Softworks is hiring a ML Engineer Intern (Internship) for its Coimbatore team. Freshers from the 2027 batch can apply.'),
  ('GenAI Application Intern', 'Saffron Cloud', 'Chennai', 'Onsite', 'Internship', 7.0, array['CSE', 'IT', 'AI & DS']::text[], array['python', 'llm apis', 'prompting']::text[], array['javascript', 'langchain', 'sql']::text[], 2.0, 3.5, current_date + 12, 'Saffron Cloud is hiring a GenAI Application Intern (Internship) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('DevOps Engineer Trainee', 'Monsoon Games', 'Pune', 'Onsite', 'Full-time', 8.5, array['CSE', 'IT', 'ECE']::text[], array['linux', 'git', 'docker']::text[], array['kubernetes', 'aws', 'ci/cd']::text[], 4.0, 6.5, current_date + 13, 'Monsoon Games is hiring a DevOps Engineer Trainee (Full-time) for its Pune team. Freshers from the 2027 batch can apply.'),
  ('QA Automation Engineer', 'Aster Fintech', 'Chennai', 'Hybrid', 'Full-time', 8.0, array['CSE', 'IT', 'ECE', 'EEE']::text[], array['selenium', 'java', 'sql']::text[], array['python', 'api testing']::text[], 3.5, 6.0, current_date + 13, 'Aster Fintech is hiring a QA Automation Engineer (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Cloud Support Associate', 'Quasar AI', 'Chennai', 'Onsite', 'Full-time', 6.0, array['CSE', 'IT', 'ECE', 'EEE']::text[], array['linux', 'networking', 'aws']::text[], array['python', 'docker']::text[], 3.5, 5.5, current_date + 30, 'Quasar AI is hiring a Cloud Support Associate (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Embedded Software Engineer', 'Lumen Labs', 'Pune', 'Onsite', 'Full-time', 7.0, array['ECE', 'EEE']::text[], array['c', 'embedded c', 'microcontrollers']::text[], array['python', 'iot']::text[], 4.0, 7.0, current_date + 26, 'Lumen Labs is hiring a Embedded Software Engineer (Full-time) for its Pune team. Freshers from the 2027 batch can apply.'),
  ('Mobile App Developer', 'Pinnacle QA Services', 'Chennai', 'Onsite', 'Full-time', 6.0, array['CSE', 'IT']::text[], array['javascript', 'react native', 'git']::text[], array['typescript', 'firebase']::text[], 4.0, 7.0, current_date + 21, 'Pinnacle QA Services is hiring a Mobile App Developer (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Data Engineer Trainee', 'Bluepeak Technologies', 'Chennai', 'Onsite', 'Full-time', 7.0, array['CSE', 'IT', 'AI & DS']::text[], array['python', 'sql', 'etl']::text[], array['spark', 'airflow', 'aws']::text[], 4.5, 7.5, current_date + 23, 'Bluepeak Technologies is hiring a Data Engineer Trainee (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Software Engineer', 'Indigo Health Tech', 'Pune', 'Onsite', 'Full-time', 7.5, array['CSE', 'IT', 'AI & DS', 'ECE']::text[], array['data structures', 'java', 'sql', 'git']::text[], array['python', 'docker']::text[], 5.0, 10.0, current_date + 25, 'Indigo Health Tech is hiring a Software Engineer (Full-time) for its Pune team. Freshers from the 2027 batch can apply.'),
  ('Data Analyst', 'Nimbus Analytics', 'Chennai', 'Onsite', 'Full-time', 7.5, array['CSE', 'IT', 'AI & DS', 'ECE']::text[], array['sql', 'excel', 'python']::text[], array['power bi', 'tableau', 'statistics']::text[], 3.5, 6.0, current_date + 15, 'Nimbus Analytics is hiring a Data Analyst (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Junior Data Analyst', 'Northwind Data', 'Hyderabad', 'Onsite', 'Full-time', 8.0, array['CSE', 'IT', 'AI & DS', 'ECE', 'EEE']::text[], array['sql', 'excel']::text[], array['python', 'power bi']::text[], 3.0, 4.5, current_date + 25, 'Northwind Data is hiring a Junior Data Analyst (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Business Intelligence Intern', 'Greenfield Retail Tech', 'Remote', 'Remote', 'Internship', 6.0, array['CSE', 'IT', 'AI & DS']::text[], array['sql', 'power bi']::text[], array['excel', 'python']::text[], 1.8, 2.4, current_date + 23, 'Greenfield Retail Tech is hiring a Business Intelligence Intern (Internship) for its remote team. Freshers from the 2027 batch can apply.'),
  ('Frontend Developer', 'Coralbyte Systems', 'Pune', 'Hybrid', 'Full-time', 7.0, array['CSE', 'IT']::text[], array['html', 'css', 'javascript', 'react']::text[], array['typescript', 'tailwind css']::text[], 4.0, 7.0, current_date + 3, 'Coralbyte Systems is hiring a Frontend Developer (Full-time) for its Pune team. Freshers from the 2027 batch can apply.'),
  ('Full Stack Developer', 'Vertex Mobility', 'Hyderabad', 'Onsite', 'Full-time', 6.5, array['CSE', 'IT', 'AI & DS']::text[], array['javascript', 'react', 'node.js', 'sql']::text[], array['typescript', 'docker', 'git']::text[], 5.0, 9.0, current_date + 8, 'Vertex Mobility is hiring a Full Stack Developer (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Backend Developer (Java)', 'Kaveri Digital', 'Hyderabad', 'Onsite', 'Full-time', 6.5, array['CSE', 'IT']::text[], array['java', 'spring boot', 'sql']::text[], array['docker', 'microservices']::text[], 4.5, 8.0, current_date + 10, 'Kaveri Digital is hiring a Backend Developer (Java) (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Python Developer', 'Orbit Commerce', 'Chennai', 'Onsite', 'Full-time', 6.0, array['CSE', 'IT', 'AI & DS']::text[], array['python', 'sql', 'git']::text[], array['django', 'fastapi', 'docker']::text[], 4.0, 7.5, current_date + 12, 'Orbit Commerce is hiring a Python Developer (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('ML Engineer Intern', 'Trident Softworks', 'Chennai', 'Hybrid', 'Internship', 8.5, array['CSE', 'AI & DS']::text[], array['python', 'machine learning', 'pandas']::text[], array['deep learning', 'sql']::text[], 2.0, 3.0, current_date + 20, 'Trident Softworks is hiring a ML Engineer Intern (Internship) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('GenAI Application Intern', 'Saffron Cloud', 'Remote', 'Remote', 'Internship', 6.0, array['CSE', 'IT', 'AI & DS']::text[], array['python', 'llm apis', 'prompting']::text[], array['javascript', 'langchain', 'sql']::text[], 2.0, 3.5, current_date + 24, 'Saffron Cloud is hiring a GenAI Application Intern (Internship) for its remote team. Freshers from the 2027 batch can apply.'),
  ('DevOps Engineer Trainee', 'Monsoon Games', 'Hyderabad', 'Hybrid', 'Full-time', 6.5, array['CSE', 'IT', 'ECE']::text[], array['linux', 'git', 'docker']::text[], array['kubernetes', 'aws', 'ci/cd']::text[], 4.0, 6.5, current_date + 22, 'Monsoon Games is hiring a DevOps Engineer Trainee (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('QA Automation Engineer', 'Aster Fintech', 'Pune', 'Onsite', 'Full-time', 6.5, array['CSE', 'IT', 'ECE', 'EEE']::text[], array['selenium', 'java', 'sql']::text[], array['python', 'api testing']::text[], 3.5, 6.0, current_date + 8, 'Aster Fintech is hiring a QA Automation Engineer (Full-time) for its Pune team. Freshers from the 2027 batch can apply.'),
  ('Cloud Support Associate', 'Quasar AI', 'Chennai', 'Hybrid', 'Full-time', 7.0, array['CSE', 'IT', 'ECE', 'EEE']::text[], array['linux', 'networking', 'aws']::text[], array['python', 'docker']::text[], 3.5, 5.5, current_date + 4, 'Quasar AI is hiring a Cloud Support Associate (Full-time) for its Chennai team. Freshers from the 2027 batch can apply.'),
  ('Embedded Software Engineer', 'Lumen Labs', 'Pune', 'Onsite', 'Full-time', 8.0, array['ECE', 'EEE']::text[], array['c', 'embedded c', 'microcontrollers']::text[], array['python', 'iot']::text[], 4.0, 7.0, current_date + 26, 'Lumen Labs is hiring a Embedded Software Engineer (Full-time) for its Pune team. Freshers from the 2027 batch can apply.'),
  ('Mobile App Developer', 'Pinnacle QA Services', 'Bengaluru', 'Onsite', 'Full-time', 7.5, array['CSE', 'IT']::text[], array['javascript', 'react native', 'git']::text[], array['typescript', 'firebase']::text[], 4.0, 7.0, current_date + 13, 'Pinnacle QA Services is hiring a Mobile App Developer (Full-time) for its Bengaluru team. Freshers from the 2027 batch can apply.'),
  ('Data Engineer Trainee', 'Bluepeak Technologies', 'Coimbatore', 'Onsite', 'Full-time', 7.5, array['CSE', 'IT', 'AI & DS']::text[], array['python', 'sql', 'etl']::text[], array['spark', 'airflow', 'aws']::text[], 4.5, 7.5, current_date + 10, 'Bluepeak Technologies is hiring a Data Engineer Trainee (Full-time) for its Coimbatore team. Freshers from the 2027 batch can apply.'),
  ('Software Engineer', 'Indigo Health Tech', 'Bengaluru', 'Onsite', 'Full-time', 8.5, array['CSE', 'IT', 'AI & DS', 'ECE']::text[], array['data structures', 'java', 'sql', 'git']::text[], array['python', 'docker']::text[], 5.0, 10.0, current_date + 9, 'Indigo Health Tech is hiring a Software Engineer (Full-time) for its Bengaluru team. Freshers from the 2027 batch can apply.'),
  ('Data Analyst', 'Nimbus Analytics', 'Hyderabad', 'Hybrid', 'Full-time', 7.5, array['CSE', 'IT', 'AI & DS', 'ECE']::text[], array['sql', 'excel', 'python']::text[], array['power bi', 'tableau', 'statistics']::text[], 3.5, 6.0, current_date + 17, 'Nimbus Analytics is hiring a Data Analyst (Full-time) for its Hyderabad team. Freshers from the 2027 batch can apply.'),
  ('Junior Data Analyst', 'Northwind Data', 'Coimbatore', 'Onsite', 'Full-time', 8.5, array['CSE', 'IT', 'AI & DS', 'ECE', 'EEE']::text[], array['sql', 'excel']::text[], array['python', 'power bi']::text[], 3.0, 4.5, current_date + 15, 'Northwind Data is hiring a Junior Data Analyst (Full-time) for its Coimbatore team. Freshers from the 2027 batch can apply.');

-- Row Level Security ON with no policies: only your server (secret key) can read/write.
-- The public anon key cannot read these tables.
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table shortlists enable row level security;
