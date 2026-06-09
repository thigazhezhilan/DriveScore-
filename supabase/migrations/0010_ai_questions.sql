-- SynapTest — AI Practice track + question reporting.
--
-- Splits the global pool into two tracks via `source`:
--   'pyq' = real past-paper questions (default; everything so far)
--   'ai'  = AI-generated questions (auto-verified, clearly labelled)
--
-- Since AI questions are auto-published (no human review), `hidden` + a
-- `question_reports` table give a crowd-QA safety net: a question students flag
-- as wrong is auto-hidden, and the practice/climb queries skip hidden ones.
--
-- Idempotent / re-runnable.

-- 1. Track + visibility flags on every question.
alter table questions add column if not exists source text not null default 'pyq'
  check (source in ('pyq', 'ai'));
alter table questions add column if not exists hidden boolean not null default false;

create index if not exists questions_source_idx
  on questions (subject, chapter, source) where centre_id is null;

-- 2. Per-student "report this question" flags (dedup by primary key).
create table if not exists question_reports (
  question_id uuid not null references questions(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (question_id, student_id)
);
