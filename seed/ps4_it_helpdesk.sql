-- =====================================================================
-- PS4 IT Helpdesk Ticket Agent (DeskBot)
-- SRM Agentic AI Hackathon | Seed data
-- Run this in Supabase -> SQL Editor. It is safe to run again: it drops
-- and recreates its own tables. All names and records are made up.
-- Dates are relative to today, so the data is always fresh.
-- Logged-in user for the demo: employee E101 (Karthik S) at Zentrix Software
-- =====================================================================

drop table if exists tickets, kb_articles, sla_rules, support_teams, employees cascade;

create table support_teams (
  id       text primary key,
  name     text not null,
  handles  text not null
);

create table employees (
  id            text primary key,
  name          text not null,
  email         text not null,
  department    text not null,
  location      text not null,
  laptop_model  text
);

create table sla_rules (
  priority        text primary key check (priority in ('P1','P2','P3','P4')),
  meaning         text not null,
  response_hours  int not null,
  resolve_hours   int not null
);

create table kb_articles (
  id             bigint generated always as identity primary key,
  title          text not null,
  category       text not null,
  keywords       text not null,
  solution_steps text not null,
  team_id        text not null references support_teams(id)
);

create table tickets (
  id           bigint generated always as identity primary key,
  employee_id  text not null references employees(id),
  title        text not null,
  description  text not null,
  category     text not null,
  priority     text not null references sla_rules(priority),
  team_id      text not null references support_teams(id),
  status       text not null default 'open' check (status in ('open','in_progress','waiting_for_user','resolved','closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

insert into support_teams (id, name, handles) values
  ('T1', 'Network & VPN', 'VPN, Wi-Fi, internet, network drives, remote access'),
  ('T2', 'Accounts & Access', 'passwords, account lock, MFA, email access, software access requests'),
  ('T3', 'Hardware', 'laptops, monitors, keyboards, printers, chargers, docking stations'),
  ('T4', 'Software & Apps', 'Office apps, Teams, Outlook, IDEs, software install and errors'),
  ('T5', 'Security', 'phishing, suspicious links, virus alerts, lost devices, data leaks');

insert into sla_rules (priority, meaning, response_hours, resolve_hours) values
  ('P1', 'Many users blocked, or a security issue', 1, 4),
  ('P2', 'One user fully blocked from work', 4, 8),
  ('P3', 'Work is slowed but the user can continue', 8, 24),
  ('P4', 'A request or question, not a fault', 24, 72);

insert into employees (id, name, email, department, location, laptop_model) values
  ('E101', 'Karthik S', 'karthik.s@zentrix.example.com', 'Engineering', 'Chennai', 'ThinkBook 14 G5'),
  ('E102', 'Nandhini R', 'nandhini.r@zentrix.example.com', 'Engineering', 'Chennai', 'ThinkBook 14 G5'),
  ('E103', 'Rohit Sharma', 'rohit.sharma@zentrix.example.com', 'Engineering', 'Bengaluru', 'Latitude 5440'),
  ('E104', 'Aisha Khan', 'aisha.khan@zentrix.example.com', 'Design', 'Bengaluru', 'MacBook Air M2'),
  ('E105', 'Sanjay Murthy', 'sanjay.murthy@zentrix.example.com', 'Finance', 'Chennai', 'Latitude 5440'),
  ('E106', 'Deepa Pillai', 'deepa.pillai@zentrix.example.com', 'HR', 'Kochi', 'ThinkPad E14'),
  ('E107', 'Vignesh Kumar', 'vignesh.kumar@zentrix.example.com', 'Engineering', 'Chennai', 'ThinkBook 14 G5'),
  ('E108', 'Harini Venkat', 'harini.venkat@zentrix.example.com', 'Sales', 'Hyderabad', 'ThinkPad E14'),
  ('E109', 'Abdul Rahman', 'abdul.rahman@zentrix.example.com', 'Support', 'Chennai', 'Latitude 3440'),
  ('E110', 'Neha Gupta', 'neha.gupta@zentrix.example.com', 'Marketing', 'Pune', 'MacBook Air M2'),
  ('E111', 'Praveen Raj', 'praveen.raj@zentrix.example.com', 'Engineering', 'Coimbatore', 'ThinkBook 14 G5'),
  ('E112', 'Shalini Das', 'shalini.das@zentrix.example.com', 'Finance', 'Kolkata', 'Latitude 5440'),
  ('E113', 'Gokul Krishnan', 'gokul.krishnan@zentrix.example.com', 'Engineering', 'Chennai', 'Latitude 5440'),
  ('E114', 'Mythili S', 'mythili.s@zentrix.example.com', 'Support', 'Chennai', 'Latitude 3440'),
  ('E115', 'Tarun Mehta', 'tarun.mehta@zentrix.example.com', 'Sales', 'Mumbai', 'ThinkPad E14');

insert into kb_articles (title, category, keywords, solution_steps, team_id) values
  ('VPN keeps disconnecting', 'VPN', 'vpn disconnect drop unstable', '1. Close the VPN app fully and open it again.
2. Switch to a stable Wi-Fi or mobile hotspot.
3. In the VPN app, choose the nearest server (Chennai or Bengaluru).
4. Update the VPN client from the Company Portal.
5. Restart the laptop if it still drops.', 'T1'),
  ('VPN login fails with authentication error', 'VPN', 'vpn login authentication error password', '1. Check that your laptop password has not expired.
2. Approve the MFA prompt on your phone within 60 seconds.
3. Make sure the date and time on your laptop are correct.
4. Try again after 5 minutes.', 'T1'),
  ('Office Wi-Fi not connecting', 'Network', 'wifi wireless not connecting office', '1. Forget the ZENTRIX-CORP network and connect again.
2. Log in with your company email and password.
3. Turn Wi-Fi off and on.
4. If other people near you also cannot connect, report it as a P1.', 'T1'),
  ('Slow internet in office', 'Network', 'slow internet speed lag', '1. Run a speed test at speedtest.example.com.
2. Close large downloads and video streams.
3. Move closer to the access point or use a LAN cable.
4. Share the speed test result in your ticket.', 'T1'),
  ('Cannot open shared network drive', 'Network', 'shared drive network folder mapped drive', '1. Connect to VPN if you are outside the office.
2. Open File Explorer and type \\fileserver\shared.
3. If access is denied, request access from your manager.', 'T1'),
  ('Reset forgotten password', 'Account', 'password forgot reset', '1. Go to passwordreset.zentrix.example.com.
2. Enter your company email.
3. Approve the MFA prompt.
4. Set a new password with 12 or more characters.', 'T2'),
  ('Account locked after wrong passwords', 'Account', 'locked account lockout', '1. Wait 15 minutes. The lock clears by itself.
2. Then reset your password at passwordreset.zentrix.example.com.
3. If it locks again, raise a ticket. Something may be using your old password.', 'T2'),
  ('MFA not working on new phone', 'Account', 'mfa authenticator new phone otp', '1. Log in at mfa.zentrix.example.com from your laptop.
2. Remove the old phone and add the new one.
3. If you cannot log in at all, raise a P2 ticket for Accounts & Access.', 'T2'),
  ('Request access to a software tool', 'Access', 'access request software license jira github', '1. Raise a P4 ticket with the tool name and the reason.
2. Your manager will get an approval email.
3. Access is given within 1 working day after approval.', 'T2'),
  ('Outlook not receiving emails', 'Email', 'outlook email not receiving inbox', '1. Check your internet and VPN connection.
2. Check the Junk and Other folders.
3. Restart Outlook.
4. Check if your mailbox is full (File > Info).', 'T4'),
  ('Outlook keeps asking for password', 'Email', 'outlook password prompt repeatedly', '1. Close Outlook.
2. Open Credential Manager and remove saved Office entries.
3. Open Outlook and sign in again.', 'T4'),
  ('Teams audio or video not working', 'Apps', 'teams microphone camera audio video call', '1. In Teams, open Settings > Devices and pick the right microphone and camera.
2. Close other apps that use the camera.
3. Check Windows privacy settings for camera and microphone.
4. Restart Teams.', 'T4'),
  ('Install approved software', 'Apps', 'install software company portal', '1. Open Company Portal.
2. Search for the software.
3. Click Install.
4. If it is not listed, raise a P4 access request.', 'T4'),
  ('Excel crashes when opening large files', 'Apps', 'excel crash freeze large file', '1. Open Excel in safe mode (hold Ctrl while opening).
2. Turn off add-ins under File > Options > Add-ins.
3. Run Office Repair from Settings > Apps.', 'T4'),
  ('VS Code extensions not installing', 'Apps', 'vscode extension install proxy', '1. Connect to VPN.
2. Set the company proxy in VS Code settings (http.proxy).
3. Restart VS Code and try again.', 'T4'),
  ('Laptop running very slow', 'Hardware', 'laptop slow hang performance', '1. Restart the laptop (do this at least once a week).
2. Close unused browser tabs and apps.
3. Check free disk space; keep at least 20 GB free.
4. Run pending Windows updates.', 'T3'),
  ('Laptop not charging', 'Hardware', 'laptop battery charging charger', '1. Try another power socket.
2. Check the charger cable for damage.
3. Remove the battery saver setting.
4. If it still does not charge, raise a P2 ticket for a charger or battery check.', 'T3'),
  ('External monitor not detected', 'Hardware', 'monitor display screen hdmi docking', '1. Check both ends of the cable.
2. Press Windows + P and choose Extend.
3. Try another port or cable.
4. Update the display driver from Company Portal.', 'T3'),
  ('Printer not printing', 'Hardware', 'printer print queue stuck', '1. Check the printer has paper and no error light.
2. Clear the print queue.
3. Remove and add the printer again from Settings.', 'T3'),
  ('Keyboard or mouse not working', 'Hardware', 'keyboard mouse wireless usb', '1. Change the batteries for wireless devices.
2. Plug the USB receiver into another port.
3. Try the device on another laptop.
4. Raise a P3 ticket for a replacement.', 'T3'),
  ('Blue screen error', 'Hardware', 'blue screen bsod crash restart', '1. Note the error code on the screen.
2. Restart the laptop.
3. If it happens again, raise a P2 ticket with the error code.', 'T3'),
  ('Clicked a suspicious link', 'Security', 'phishing suspicious link clicked email scam', '1. Disconnect from the internet right away.
2. Do not enter any passwords.
3. Raise a P1 ticket for the Security team immediately.
4. Change your password from another device.', 'T5'),
  ('Received a phishing email', 'Security', 'phishing email report spam', '1. Do not click links or open attachments.
2. Use the Report Phishing button in Outlook.
3. Delete the email.', 'T5'),
  ('Antivirus shows a threat alert', 'Security', 'virus malware antivirus alert threat', '1. Do not ignore or close the alert.
2. Let the antivirus quarantine the file.
3. Raise a P1 ticket for the Security team with a screenshot.', 'T5'),
  ('Lost or stolen laptop', 'Security', 'lost stolen laptop phone device', '1. Raise a P1 ticket for the Security team at once.
2. Change your password from another device.
3. File a police report for stolen devices and attach it to the ticket.', 'T5'),
  ('USB storage blocked', 'Security', 'usb pendrive blocked storage', '1. USB storage is blocked by company policy.
2. Use OneDrive or the shared drive to move files.
3. For a business need, raise a P4 request with your manager''s approval.', 'T5'),
  ('Request a new laptop or upgrade', 'Hardware', 'new laptop upgrade replacement ram', '1. Raise a P4 ticket with the reason.
2. Laptops older than 4 years are replaced first.
3. Your manager approves the request.', 'T3'),
  ('Cannot connect to Git or GitHub', 'Network', 'git github clone push ssh proxy', '1. Connect to VPN.
2. Use HTTPS instead of SSH.
3. Set git proxy: git config --global http.proxy http://proxy.zentrix.example.com:8080', 'T1'),
  ('Disk space full', 'Hardware', 'disk space storage full c drive', '1. Empty the Recycle Bin.
2. Run Disk Cleanup.
3. Move old files to OneDrive.
4. Uninstall unused apps from Company Portal.', 'T3'),
  ('Calendar invites not showing', 'Email', 'calendar meeting invite outlook teams', '1. Check that you are looking at the right calendar.
2. Restart Outlook.
3. Check the Deleted Items folder.', 'T4');

insert into tickets (employee_id, title, description, category, priority, team_id, status, created_at, updated_at) values
  ('E101', 'Laptop battery drains fast', 'Battery lasts only 1 hour after full charge.', 'Hardware', 'P3', 'T3', 'in_progress', (current_date - 3) + time '10:00', (current_date - 1) + time '10:00'),
  ('E101', 'Need access to Jira project ZEN-PAY', 'Joining the payments team.', 'Access', 'P4', 'T2', 'resolved', (current_date - 12) + time '10:00', (current_date - 11) + time '10:00'),
  ('E103', 'VPN drops every 10 minutes', 'Working from home, VPN keeps dropping.', 'VPN', 'P3', 'T1', 'open', (current_date - 1) + time '10:00', (current_date - 1) + time '10:00'),
  ('E104', 'Monitor flickering', 'Second monitor flickers on the dock.', 'Hardware', 'P3', 'T3', 'waiting_for_user', (current_date - 4) + time '10:00', (current_date - 2) + time '10:00'),
  ('E105', 'Excel crashes on month-end file', 'Excel freezes when opening the 80 MB report.', 'Apps', 'P2', 'T4', 'in_progress', (current_date - 2) + time '10:00', (current_date - 1) + time '10:00'),
  ('E108', 'Account locked', 'Locked after password change.', 'Account', 'P2', 'T2', 'resolved', (current_date - 6) + time '10:00', (current_date - 6) + time '10:00'),
  ('E110', 'Teams camera not working', 'Camera shows black screen in calls.', 'Apps', 'P3', 'T4', 'open', (current_date - 1) + time '10:00', (current_date - 1) + time '10:00'),
  ('E112', 'Phishing email received', 'Email asking to update bank details.', 'Security', 'P3', 'T5', 'closed', (current_date - 9) + time '10:00', (current_date - 8) + time '10:00'),
  ('E113', 'Need Docker Desktop installed', 'Required for new microservices work.', 'Apps', 'P4', 'T4', 'open', (current_date + 0) + time '10:00', (current_date + 0) + time '10:00'),
  ('E115', 'Printer in Mumbai office not working', 'Whole sales floor cannot print.', 'Hardware', 'P2', 'T3', 'in_progress', (current_date - 1) + time '10:00', (current_date + 0) + time '10:00');

-- Row Level Security ON with no policies: only your server (secret key) can read/write.
-- The public anon key cannot read these tables.
alter table employees enable row level security;
alter table support_teams enable row level security;
alter table sla_rules enable row level security;
alter table kb_articles enable row level security;
alter table tickets enable row level security;
