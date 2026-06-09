-- SynapTest — Milestone 2c-1 (Question Bank: admin-only RLS for `questions`)
--
-- Lets an ADMIN manage ONLY their own centre's questions through the
-- user-scoped client (anon key + session), so Postgres itself enforces the
-- centre boundary. Reuses the SECURITY DEFINER helpers from 0003_rls.sql
-- (`auth_role()`, `auth_centre()`).
--
-- Students and teachers still get NO policy on `questions`, so they remain
-- unable to read the table at all via the user/anon client — the `answer_index`
-- answer keys stay protected. The test-taking flow is UNCHANGED: it fetches
-- questions server-side with the SERVICE key (which bypasses RLS) and strips
-- `answer_index` before anything reaches the browser.
--
-- Note: seed/global questions have `centre_id = null`; `centre_id = auth_centre()`
-- is never true for them (NULL comparison), so admins manage only their OWN rows.
--
-- Idempotent: re-runnable (drop-if-exists before create).
-- (RLS is already enabled on `questions` in 0003_rls.sql.)

-- SELECT — an admin sees their centre's questions (incl. answer keys, to edit).
drop policy if exists questions_admin_select on questions;
create policy questions_admin_select on questions for select using (
  auth_role() = 'admin' and centre_id = auth_centre()
);

-- INSERT — only into the admin's own centre.
drop policy if exists questions_admin_insert on questions;
create policy questions_admin_insert on questions for insert with check (
  auth_role() = 'admin' and centre_id = auth_centre()
);

-- UPDATE — only the admin's own centre's rows (and can't move them out).
drop policy if exists questions_admin_update on questions;
create policy questions_admin_update on questions for update
  using (auth_role() = 'admin' and centre_id = auth_centre())
  with check (auth_role() = 'admin' and centre_id = auth_centre());

-- DELETE — only the admin's own centre's rows.
drop policy if exists questions_admin_delete on questions;
create policy questions_admin_delete on questions for delete using (
  auth_role() = 'admin' and centre_id = auth_centre()
);
