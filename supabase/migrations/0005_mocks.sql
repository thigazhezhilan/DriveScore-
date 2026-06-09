-- SynapTest — Milestone 2c-2 (Mock builder + batch assignment)
--
-- Adds a draft/published lifecycle to mocks, scopes who can see which mocks
-- (staff see all of their centre incl. drafts; students see only PUBLISHED
-- mocks for their OWN batch), and lets admins build/manage mocks + their
-- question links through the user-scoped client (RLS-enforced).
--
-- `mock_questions` stores only question ids + order (no answer keys), and the
-- test flow still fetches question CONTENT server-side with the service key and
-- strips `answer_index` before the browser — unchanged.
--
-- Reuses the SECURITY DEFINER helpers from 0003 (`auth_role()`, `auth_centre()`)
-- and adds `auth_student_batch()`. Idempotent / re-runnable.

-- 1. Draft/published status. A mock must have a batch before it's published
--    (enforced in the app on publish; the column default keeps existing rows).
alter table mocks
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'published'));

-- 2. Helper: the caller's batch (student). SECURITY DEFINER so it can read
--    `students` without recursing through that table's RLS policy.
create or replace function auth_student_batch() returns uuid
  language sql stable security definer set search_path = public as $$
  select batch_id from students where profile_id = auth.uid()
$$;

-- 3. mock_questions wasn't under RLS before — enable it (no answer keys here,
--    but we still scope visibility to the parent mock).
alter table mock_questions enable row level security;

-- ── mocks SELECT (replaces the centre-wide policy from 0003) ──────────────
drop policy if exists mocks_select on mocks;
create policy mocks_select on mocks for select using (
  -- staff: every mock in their centre, including drafts
  (auth_role() in ('admin', 'teacher') and centre_id = auth_centre())
  -- student: only published mocks assigned to their own batch
  or (
    auth_role() = 'student'
    and status = 'published'
    and batch_id = auth_student_batch()
  )
);

-- ── mocks write (admin, own centre only) ─────────────────────────────────
drop policy if exists mocks_insert on mocks;
create policy mocks_insert on mocks for insert with check (
  auth_role() = 'admin' and centre_id = auth_centre()
);

drop policy if exists mocks_update on mocks;
create policy mocks_update on mocks for update
  using (auth_role() = 'admin' and centre_id = auth_centre())
  with check (auth_role() = 'admin' and centre_id = auth_centre());

drop policy if exists mocks_delete on mocks;
create policy mocks_delete on mocks for delete using (
  auth_role() = 'admin' and centre_id = auth_centre()
);

-- ── mock_questions SELECT (visible when the parent mock is visible) ───────
-- The subquery on `mocks` is itself RLS-filtered, so this inherits the mocks
-- rules above: students see links only for their published batch mocks.
drop policy if exists mock_questions_select on mock_questions;
create policy mock_questions_select on mock_questions for select using (
  mock_id in (select id from mocks)
);

-- ── mock_questions write (admin, parent mock in their own centre) ────────
drop policy if exists mock_questions_insert on mock_questions;
create policy mock_questions_insert on mock_questions for insert with check (
  auth_role() = 'admin'
  and mock_id in (select id from mocks where centre_id = auth_centre())
);

drop policy if exists mock_questions_update on mock_questions;
create policy mock_questions_update on mock_questions for update
  using (
    auth_role() = 'admin'
    and mock_id in (select id from mocks where centre_id = auth_centre())
  )
  with check (
    auth_role() = 'admin'
    and mock_id in (select id from mocks where centre_id = auth_centre())
  );

drop policy if exists mock_questions_delete on mock_questions;
create policy mock_questions_delete on mock_questions for delete using (
  auth_role() = 'admin'
  and mock_id in (select id from mocks where centre_id = auth_centre())
);
