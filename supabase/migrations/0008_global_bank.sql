-- SynapTest — Global question bank + student self-practice pathways
--
-- Adds the SynapTest-OWNED practice flows on top of the existing institute flow:
--   1. Lesson practice  — a student takes a focused test on one subject+chapter.
--   2. Full NEET mock   — a shuffled 180-question paper from the global pool
--                          (45 Physics + 45 Chemistry + 90 Biology).
--
-- Both REUSE the existing test → attempt → report → diagnosis pipeline by
-- GENERATING a personal mock on the fly:
--   kind = 'lesson' | 'bank', centre_id = NULL, owner_student_id = the student.
-- Each "start" makes a fresh mock row, so self-practice is naturally unlimited.
--
-- Global questions are simply questions with centre_id = NULL (supported since
-- 0001). Admin (platform super-admin, centre_id NULL) already has full CRUD on
-- them via the admin question policies in 0006 — no question-policy change here.
--
-- Teacher visibility of practice results needs NO change: the attempts/answers
-- teacher policies (0006) already grant access to ANY attempt by a student in
-- the teacher's centre, regardless of which mock it belongs to.
--
-- Idempotent / re-runnable.

-- 1. mocks: allow platform-generated personal mocks (no centre, owned by a
--    student) alongside the existing institute mocks.
alter table mocks alter column centre_id drop not null;

alter table mocks add column if not exists kind text not null default 'institute'
  check (kind in ('institute', 'lesson', 'bank'));

alter table mocks add column if not exists owner_student_id uuid
  references students(id) on delete cascade;

-- 2. Indexes for the new read paths.
create index if not exists mocks_owner_student_idx on mocks (owner_student_id);
-- Fast chapter listing + random sampling of the global pool.
create index if not exists questions_global_idx
  on questions (subject, chapter) where centre_id is null;

-- 3. Students may read their OWN generated mocks (in addition to published
--    batch mocks). This is what lets getVisibleMock() return a lesson/bank
--    session for its owner so the test + report flow can run.
drop policy if exists mocks_student_select on mocks;
create policy mocks_student_select on mocks for select using (
  auth_role() = 'student'
  and (
    (status = 'published' and batch_id = auth_student_batch())
    or owner_student_id = auth_student_id()
  )
);
