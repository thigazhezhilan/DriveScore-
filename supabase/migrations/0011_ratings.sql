-- SynapTest — Skill Rating & Levels
--
-- A fair, persistent, motivating skill measure for every student. Each question
-- is an Elo "opponent" (rated by difficulty); answering it is a match. The
-- engine lives in lib/rating.ts (pure, unit-tested); this migration just stores
-- the per-student state and an explainability ledger.
--
--   student_ratings : current rating + level per subject (and 'Overall').
--   rating_events   : one row per answered question — the "why my rating moved"
--                     ledger; also the idempotency guard against double-applying
--                     a resubmitted attempt.
--
-- Writes happen ONLY through the service client inside the grading path
-- (submitAttempt → applyRatingUpdates). There are deliberately NO user-facing
-- write policies — students can read their ratings but never set them.
--
-- See docs/rating-system-spec.md. Idempotent / re-runnable.

create table if not exists student_ratings (
  student_id      uuid not null references students(id) on delete cascade,
  subject         text not null
                    check (subject in ('Physics','Chemistry','Biology','Overall')),
  rating          numeric not null default 1000,
  level           text not null default 'Aspirant',
  questions_rated int not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (student_id, subject)
);

create table if not exists rating_events (
  id           uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references attempts(id) on delete cascade,
  question_id  uuid not null references questions(id) on delete cascade,
  student_id   uuid not null references students(id) on delete cascade,
  subject      text not null check (subject in ('Physics','Chemistry','Biology')),
  delta        numeric not null,        -- signed change; 0 for a repeat-correct
  rating_after numeric not null,
  created_at   timestamptz not null default now(),
  -- A question appears once per attempt; this makes a resubmit a no-op insert.
  unique (attempt_id, question_id)
);

create index if not exists rating_events_student_idx on rating_events (student_id);
create index if not exists rating_events_attempt_idx on rating_events (attempt_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Same visibility shape as attempts (0003): student sees own; teacher sees
-- students in batches they own; admin sees their centre. No write policy →
-- the user/anon client can never insert or update ratings (service key only).

alter table student_ratings enable row level security;
alter table rating_events   enable row level security;

drop policy if exists student_ratings_select on student_ratings;
create policy student_ratings_select on student_ratings for select using (
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

drop policy if exists rating_events_select on rating_events;
create policy rating_events_select on rating_events for select using (
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
