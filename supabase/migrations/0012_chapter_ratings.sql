-- SynapTest — Per-chapter (lesson-by-lesson) skill ratings
--
-- Extends the rating system (0011) with a finer grain: a rating + level for
-- each (student, subject, chapter), driven by the SAME Elo engine
-- (lib/rating.ts → applyByBucket). This is what lets the practice page show a
-- student exactly which lessons they're strong vs weak in, right next to each
-- chapter — the lesson-by-lesson view on top of the subject + Overall ratings.
--
-- Same write/read rules as 0011: service-only writes (the grading path), RLS
-- read visibility mirroring attempts. Idempotent / re-runnable.

create table if not exists student_chapter_ratings (
  student_id      uuid not null references students(id) on delete cascade,
  subject         text not null check (subject in ('Physics','Chemistry','Biology')),
  chapter         text not null,
  rating          numeric not null default 1000,
  level           text not null default 'Aspirant',
  questions_rated int not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (student_id, subject, chapter)
);

create index if not exists student_chapter_ratings_student_idx
  on student_chapter_ratings (student_id);

alter table student_chapter_ratings enable row level security;

drop policy if exists student_chapter_ratings_select on student_chapter_ratings;
create policy student_chapter_ratings_select on student_chapter_ratings for select using (
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
