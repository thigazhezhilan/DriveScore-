-- SynapTest — Milestone 2a schema
--
-- Core data model for centres → batches → students, a question bank,
-- mocks (an ordered set of questions), and persisted attempts + answers.
--
-- NOTE: Row Level Security (RLS) is intentionally NOT enabled here. All
-- access in this milestone is server-side via the service_role key. RLS
-- hardening lands in Milestone 2b alongside auth.

create table centres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table batches (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references centres(id) on delete cascade,
  name text not null,
  exam_year int,
  created_at timestamptz default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid references centres(id) on delete cascade,   -- null = global/seed question
  subject text not null check (subject in ('Physics','Chemistry','Biology')),
  chapter text not null,
  concept text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  par_time_sec int not null,
  text text not null,
  options jsonb not null,                                    -- array of 4 strings
  answer_index int not null check (answer_index between 0 and 3),
  created_at timestamptz default now()
);

create table mocks (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references centres(id) on delete cascade,
  batch_id uuid references batches(id) on delete set null,
  title text not null,
  created_at timestamptz default now()
);

create table mock_questions (
  mock_id uuid not null references mocks(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  position int not null,
  primary key (mock_id, question_id)
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  mock_id uuid not null references mocks(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  total_marks int,
  max_marks int,
  accuracy numeric
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  question_id uuid not null references questions(id),
  picked_index int,                                          -- null = unattempted
  time_sec int not null default 0
);

-- Helpful indexes for the read paths the app uses.
create index on mock_questions (mock_id, position);
create index on answers (attempt_id);
create index on attempts (mock_id);
create index on attempts (student_id);
