-- SynapTest — Milestone 2b-2 (Row Level Security policies)
--
-- Makes Postgres itself enforce who can read what. These policies apply to the
-- USER-SCOPED client (anon/publishable key + the logged-in user's session);
-- the service/secret key continues to BYPASS RLS for privileged server work
-- (grading with the answer keys, admin user creation).
--
-- Idempotent: re-runnable (drop-if-exists before create).

-- ── SECURITY DEFINER helpers ─────────────────────────────────────────────
-- These read the caller's role/centre/student WITHOUT triggering RLS on
-- `profiles`/`students` (which would recurse inside a profiles policy).

create or replace function auth_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_centre() returns uuid
  language sql stable security definer set search_path = public as $$
  select centre_id from profiles where id = auth.uid()
$$;

create or replace function auth_student_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select id from students where profile_id = auth.uid()
$$;

-- Ensure RLS is on for every table we police (no-op if already enabled).
alter table profiles  enable row level security;
alter table students  enable row level security;
alter table batches   enable row level security;
alter table mocks     enable row level security;
alter table attempts  enable row level security;
alter table answers   enable row level security;
alter table questions enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or (auth_role() in ('admin', 'teacher') and centre_id = auth_centre())
);

-- ── students ─────────────────────────────────────────────────────────────
drop policy if exists students_select on students;
create policy students_select on students for select using (
  profile_id = auth.uid()
  or batch_id in (select id from batches where teacher_id = auth.uid())
  or (
    auth_role() = 'admin'
    and batch_id in (select id from batches where centre_id = auth_centre())
  )
);

-- ── batches ──────────────────────────────────────────────────────────────
drop policy if exists batches_select on batches;
create policy batches_select on batches for select using (
  centre_id = auth_centre()
  or teacher_id = auth.uid()
);

-- ── mocks ────────────────────────────────────────────────────────────────
drop policy if exists mocks_select on mocks;
create policy mocks_select on mocks for select using (
  centre_id = auth_centre()
);

-- ── attempts ─────────────────────────────────────────────────────────────
-- Student: own attempts. Teacher: attempts of students in batches they own.
-- Admin: attempts of students in their centre.
drop policy if exists attempts_select on attempts;
create policy attempts_select on attempts for select using (
  student_id = auth_student_id()
  or student_id in (
    select id from students
    where batch_id in (select id from batches where teacher_id = auth.uid())
  )
  or (
    auth_role() = 'admin'
    and student_id in (
      select id from students
      where batch_id in (select id from batches where centre_id = auth_centre())
    )
  )
);

-- A student may only create their OWN attempts (belt-and-suspenders: app
-- writes via the service key, but this blocks any user-client insert too).
drop policy if exists attempts_insert on attempts;
create policy attempts_insert on attempts for insert with check (
  student_id = auth_student_id()
);

-- ── answers ──────────────────────────────────────────────────────────────
-- Visible/insertable only for answers whose attempt the caller may see/own.
-- The subquery on `attempts` is itself RLS-filtered, so this inherits the
-- attempts rules above.
drop policy if exists answers_select on answers;
create policy answers_select on answers for select using (
  attempt_id in (select id from attempts)
);

drop policy if exists answers_insert on answers;
create policy answers_insert on answers for insert with check (
  attempt_id in (select id from attempts where student_id = auth_student_id())
);

-- ── questions ────────────────────────────────────────────────────────────
-- NO select policy for normal users → the table is unreadable via the
-- user/anon client. This protects the `answer_index` answer keys. Question
-- text/options reach students only via the server (service key), which strips
-- `answer_index` before sending anything to the browser.
-- (RLS is enabled above; absence of a policy = deny-all for the user client.)
