-- SynapTest — Centre-based self-signup
--
-- Retires the batch as the unit of membership. Students (and teachers) now
-- belong directly to a CENTRE, chosen at self-signup. A teacher sees every
-- student in their centre; published mocks are visible to the whole centre.
--
-- The batches table is left in place (existing data + the mock builder's
-- optional batch field still work) but nothing depends on it for visibility.
--
-- Admin is unaffected: it reads via the service key (bypasses RLS).
--
-- Idempotent / re-runnable.

-- ── centres: a join code gates TEACHER self-signup ──────────────────────────
alter table centres add column if not exists join_code text;
-- Backfill existing centres with a code so teacher signup works immediately.
update centres set join_code = upper(substr(md5(random()::text), 1, 6))
  where join_code is null;

-- ── students: direct centre link; batch becomes optional ────────────────────
alter table students add column if not exists centre_id uuid
  references centres(id) on delete cascade;
-- Backfill from the student's batch.
update students s set centre_id = b.centre_id
  from batches b where s.batch_id = b.id and s.centre_id is null;
alter table students alter column batch_id drop not null;
create index if not exists students_centre_idx on students (centre_id);

-- Helper: the centre of the logged-in student (SECURITY DEFINER, no recursion).
create or replace function auth_student_centre() returns uuid
  language sql stable security definer set search_path = public as $$
  select centre_id from students where profile_id = auth.uid()
$$;

-- ── students: teacher visibility/management by CENTRE ───────────────────────
drop policy if exists students_teacher_select on students;
create policy students_teacher_select on students for select using (
  auth_role() = 'teacher' and centre_id = auth_centre()
);
drop policy if exists students_teacher_insert on students;
create policy students_teacher_insert on students for insert with check (
  auth_role() = 'teacher' and centre_id = auth_centre()
);
drop policy if exists students_teacher_update on students;
create policy students_teacher_update on students for update
  using (auth_role() = 'teacher' and centre_id = auth_centre())
  with check (auth_role() = 'teacher' and centre_id = auth_centre());

-- ── attempts: teacher visibility by centre ──────────────────────────────────
drop policy if exists attempts_teacher_select on attempts;
create policy attempts_teacher_select on attempts for select using (
  auth_role() = 'teacher'
  and student_id in (select id from students where centre_id = auth_centre())
);

-- ── answers: teacher visibility by centre ───────────────────────────────────
drop policy if exists answers_teacher_select on answers;
create policy answers_teacher_select on answers for select using (
  auth_role() = 'teacher'
  and attempt_id in (
    select a.id from attempts a
    join students s on s.id = a.student_id
    where s.centre_id = auth_centre()
  )
);

-- ── mocks: students see published mocks for their CENTRE (or own practice) ──
drop policy if exists mocks_student_select on mocks;
create policy mocks_student_select on mocks for select using (
  auth_role() = 'student'
  and (
    (status = 'published' and owner_student_id is null
      and centre_id = auth_student_centre())
    or owner_student_id = auth_student_id()
  )
);

-- ── skill ratings: teacher branch by centre (student own / admin all) ───────
drop policy if exists student_ratings_select on student_ratings;
create policy student_ratings_select on student_ratings for select using (
  student_id = auth_student_id()
  or (auth_role() = 'teacher'
      and student_id in (select id from students where centre_id = auth_centre()))
  or auth_role() = 'admin'
);

drop policy if exists rating_events_select on rating_events;
create policy rating_events_select on rating_events for select using (
  student_id = auth_student_id()
  or (auth_role() = 'teacher'
      and student_id in (select id from students where centre_id = auth_centre()))
  or auth_role() = 'admin'
);

drop policy if exists student_chapter_ratings_select on student_chapter_ratings;
create policy student_chapter_ratings_select on student_chapter_ratings for select using (
  student_id = auth_student_id()
  or (auth_role() = 'teacher'
      and student_id in (select id from students where centre_id = auth_centre()))
  or auth_role() = 'admin'
);
