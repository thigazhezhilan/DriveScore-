-- SynapTest — Milestone: Role Restructure
--
-- Admin  = platform super-admin (SynapTest company). centre_id IS NULL.
--          Sees everything cross-centre. No centre filter on any policy.
-- Teacher = coaching-centre manager. centre_id IS NOT NULL.
--           Full CRUD on their own centre's data (previously admin's powers).
-- Student = unchanged.
--
-- Key rules:
--   • auth_role() = 'admin'  → no centre check (admin has no centre)
--   • auth_role() = 'teacher' → centre_id = auth_centre() (scoped to their centre)
--   • auth_centre() returns NULL for admin; admin policies must NOT use it
--
-- Idempotent / re-runnable.

-- ── centres ─────────────────────────────────────────────────────────────────
drop policy if exists centres_select on centres;
create policy centres_admin_select on centres for select using (
  auth_role() = 'admin'
);
create policy centres_teacher_select on centres for select using (
  auth_role() = 'teacher' and id = auth_centre()
);

-- ── profiles ────────────────────────────────────────────────────────────────
drop policy if exists profiles_select on profiles;
create policy profiles_admin_select on profiles for select using (
  auth_role() = 'admin'
);
create policy profiles_teacher_select on profiles for select using (
  auth_role() = 'teacher' and centre_id = auth_centre()
);
create policy profiles_student_select on profiles for select using (
  auth_role() = 'student' and id = auth.uid()
);

-- ── batches ─────────────────────────────────────────────────────────────────
drop policy if exists batches_select on batches;
drop policy if exists batches_insert on batches;
drop policy if exists batches_update on batches;
drop policy if exists batches_delete on batches;

create policy batches_admin_select on batches for select using (
  auth_role() = 'admin'
);
create policy batches_teacher_select on batches for select using (
  auth_role() = 'teacher' and centre_id = auth_centre()
);
-- Students need to read their own batch (for auth_student_batch() helper).
create policy batches_student_select on batches for select using (
  auth_role() = 'student' and id = auth_student_batch()
);

create policy batches_admin_insert on batches for insert with check (
  auth_role() = 'admin'
);
create policy batches_teacher_insert on batches for insert with check (
  auth_role() = 'teacher' and centre_id = auth_centre()
);
create policy batches_admin_update on batches for update
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');
create policy batches_teacher_update on batches for update
  using (auth_role() = 'teacher' and centre_id = auth_centre())
  with check (auth_role() = 'teacher' and centre_id = auth_centre());

-- ── students ─────────────────────────────────────────────────────────────────
drop policy if exists students_select on students;
drop policy if exists students_insert on students;
drop policy if exists students_update on students;

create policy students_admin_select on students for select using (
  auth_role() = 'admin'
);
create policy students_teacher_select on students for select using (
  auth_role() = 'teacher'
  and batch_id in (select id from batches where centre_id = auth_centre())
);
create policy students_student_select on students for select using (
  auth_role() = 'student' and profile_id = auth.uid()
);

create policy students_admin_insert on students for insert with check (
  auth_role() = 'admin'
);
create policy students_teacher_insert on students for insert with check (
  auth_role() = 'teacher'
  and batch_id in (select id from batches where centre_id = auth_centre())
);
create policy students_admin_update on students for update
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy students_teacher_update on students for update
  using (
    auth_role() = 'teacher'
    and batch_id in (select id from batches where centre_id = auth_centre())
  )
  with check (
    auth_role() = 'teacher'
    and batch_id in (select id from batches where centre_id = auth_centre())
  );

-- ── questions ────────────────────────────────────────────────────────────────
-- Drop all existing question policies and rebuild.
drop policy if exists questions_admin_select on questions;
drop policy if exists questions_admin_insert on questions;
drop policy if exists questions_admin_update on questions;
drop policy if exists questions_admin_delete on questions;

create policy questions_admin_select on questions for select using (
  auth_role() = 'admin'
);
create policy questions_teacher_select on questions for select using (
  auth_role() = 'teacher' and centre_id = auth_centre()
);
-- Students: NO select policy — answer keys stay protected.

create policy questions_admin_insert on questions for insert with check (
  auth_role() = 'admin'
);
create policy questions_teacher_insert on questions for insert with check (
  auth_role() = 'teacher' and centre_id = auth_centre()
);
create policy questions_admin_update on questions for update
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy questions_teacher_update on questions for update
  using (auth_role() = 'teacher' and centre_id = auth_centre())
  with check (auth_role() = 'teacher' and centre_id = auth_centre());
create policy questions_admin_delete on questions for delete using (
  auth_role() = 'admin'
);
create policy questions_teacher_delete on questions for delete using (
  auth_role() = 'teacher' and centre_id = auth_centre()
);

-- ── mocks ────────────────────────────────────────────────────────────────────
-- Replace the combined policy from 0005 with per-role policies.
drop policy if exists mocks_select on mocks;
drop policy if exists mocks_insert on mocks;
drop policy if exists mocks_update on mocks;
drop policy if exists mocks_delete on mocks;

create policy mocks_admin_select on mocks for select using (
  auth_role() = 'admin'
);
create policy mocks_teacher_select on mocks for select using (
  auth_role() = 'teacher' and centre_id = auth_centre()
);
create policy mocks_student_select on mocks for select using (
  auth_role() = 'student'
  and status = 'published'
  and batch_id = auth_student_batch()
);

create policy mocks_admin_insert on mocks for insert with check (
  auth_role() = 'admin'
);
create policy mocks_teacher_insert on mocks for insert with check (
  auth_role() = 'teacher' and centre_id = auth_centre()
);
create policy mocks_admin_update on mocks for update
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy mocks_teacher_update on mocks for update
  using (auth_role() = 'teacher' and centre_id = auth_centre())
  with check (auth_role() = 'teacher' and centre_id = auth_centre());
create policy mocks_admin_delete on mocks for delete using (
  auth_role() = 'admin'
);
create policy mocks_teacher_delete on mocks for delete using (
  auth_role() = 'teacher' and centre_id = auth_centre()
);

-- ── mock_questions ────────────────────────────────────────────────────────────
drop policy if exists mock_questions_select on mock_questions;
drop policy if exists mock_questions_insert on mock_questions;
drop policy if exists mock_questions_update on mock_questions;
drop policy if exists mock_questions_delete on mock_questions;

create policy mock_questions_admin_select on mock_questions for select using (
  auth_role() = 'admin'
);
create policy mock_questions_teacher_select on mock_questions for select using (
  auth_role() = 'teacher'
  and mock_id in (select id from mocks where centre_id = auth_centre())
);
create policy mock_questions_student_select on mock_questions for select using (
  mock_id in (select id from mocks)
);

create policy mock_questions_admin_insert on mock_questions for insert with check (
  auth_role() = 'admin'
);
create policy mock_questions_teacher_insert on mock_questions for insert with check (
  auth_role() = 'teacher'
  and mock_id in (select id from mocks where centre_id = auth_centre())
);
create policy mock_questions_admin_update on mock_questions for update
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy mock_questions_teacher_update on mock_questions for update
  using (
    auth_role() = 'teacher'
    and mock_id in (select id from mocks where centre_id = auth_centre())
  )
  with check (
    auth_role() = 'teacher'
    and mock_id in (select id from mocks where centre_id = auth_centre())
  );
create policy mock_questions_admin_delete on mock_questions for delete using (
  auth_role() = 'admin'
);
create policy mock_questions_teacher_delete on mock_questions for delete using (
  auth_role() = 'teacher'
  and mock_id in (select id from mocks where centre_id = auth_centre())
);

-- ── attempts ─────────────────────────────────────────────────────────────────
drop policy if exists attempts_select on attempts;

create policy attempts_admin_select on attempts for select using (
  auth_role() = 'admin'
);
create policy attempts_teacher_select on attempts for select using (
  auth_role() = 'teacher'
  and student_id in (
    select s.id from students s
    join batches b on b.id = s.batch_id
    where b.centre_id = auth_centre()
  )
);
create policy attempts_student_select on attempts for select using (
  auth_role() = 'student'
  and student_id = auth_student_id()
);

-- ── answers ──────────────────────────────────────────────────────────────────
drop policy if exists answers_select on answers;

create policy answers_admin_select on answers for select using (
  auth_role() = 'admin'
);
create policy answers_teacher_select on answers for select using (
  auth_role() = 'teacher'
  and attempt_id in (
    select a.id from attempts a
    join students s on s.id = a.student_id
    join batches b on b.id = s.batch_id
    where b.centre_id = auth_centre()
  )
);
create policy answers_student_select on answers for select using (
  auth_role() = 'student'
  and attempt_id in (
    select id from attempts where student_id = auth_student_id()
  )
);
