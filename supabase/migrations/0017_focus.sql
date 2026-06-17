-- DriveScore — Focus Feature v1
--
-- Two new tables:
--   student_focus        — derived snapshot of the student's current focus state.
--                          Fully recomputable from raw attempts. Cached here so
--                          the focus screen loads fast without re-running the full
--                          mastery computation on every page visit.
--   chapter_textbook_map — static NCERT lookup for textbook pointers.
--
-- HARD PRIVACY RULE:
--   student_focus has SELECT only when auth.uid() = student_id (via auth_student_id()).
--   Teachers and admins get ZERO SELECT access — not even the existence of the row.
--
-- Focus-practice mocks use kind = 'focus', which extends the existing kind check.
-- Since focus mocks have centre_id = NULL and owner_student_id = student, the
-- existing teacher mocks_select RLS (requires centre_id = auth_centre()) already
-- prevents teachers from seeing focus mocks. This cascades to the teacher
-- diagnosis rollup — attempts for invisible mocks are excluded automatically.
--
-- Idempotent / re-runnable.

-- ── Extend mock kind to include 'focus' ──────────────────────────────────────
-- The constraint was added inline in migration 0008. Drop and recreate with the
-- extended set. The column default ('institute') and NOT NULL stay unchanged.
alter table mocks
  drop constraint if exists mocks_kind_check;
alter table mocks
  add constraint mocks_kind_check
    check (kind in ('institute', 'lesson', 'bank', 'focus'));

-- ── chapter_textbook_map ──────────────────────────────────────────────────────
-- Static NCERT lookup. One row per chapter.
-- Teachers and students can both read this (it's public reference data).
create table if not exists chapter_textbook_map (
  subject       text not null,
  chapter       text not null,
  book          text not null,     -- e.g. "NCERT Biology Class 11"
  chapter_ref   text,              -- e.g. "Chapter 5"
  page_range    text,              -- e.g. "pp. 68–84"
  primary key (subject, chapter)
);

alter table chapter_textbook_map enable row level security;

drop policy if exists textbook_map_select on chapter_textbook_map;
create policy textbook_map_select on chapter_textbook_map
  for select using (true);

-- Seed a sample of NCERT Biology chapters so focus screen shows textbook refs.
-- Full seeding can be done via the admin panel or a later data migration.
insert into chapter_textbook_map (subject, chapter, book, chapter_ref, page_range) values
  ('Biology', 'The Living World',               'NCERT Biology Class 11', 'Chapter 1',  'pp. 1–16'),
  ('Biology', 'Biological Classification',      'NCERT Biology Class 11', 'Chapter 2',  'pp. 17–32'),
  ('Biology', 'Plant Kingdom',                  'NCERT Biology Class 11', 'Chapter 3',  'pp. 33–52'),
  ('Biology', 'Animal Kingdom',                 'NCERT Biology Class 11', 'Chapter 4',  'pp. 53–80'),
  ('Biology', 'Morphology of Flowering Plants', 'NCERT Biology Class 11', 'Chapter 5',  'pp. 81–104'),
  ('Biology', 'Anatomy of Flowering Plants',    'NCERT Biology Class 11', 'Chapter 6',  'pp. 105–120'),
  ('Biology', 'Structural Organisation in Animals','NCERT Biology Class 11','Chapter 7','pp. 121–136'),
  ('Biology', 'Cell: The Unit of Life',         'NCERT Biology Class 11', 'Chapter 8',  'pp. 137–158'),
  ('Biology', 'Biomolecules',                   'NCERT Biology Class 11', 'Chapter 9',  'pp. 159–180'),
  ('Biology', 'Cell Cycle and Cell Division',   'NCERT Biology Class 11', 'Chapter 10', 'pp. 181–196'),
  ('Biology', 'Transport in Plants',            'NCERT Biology Class 11', 'Chapter 11', 'pp. 197–214'),
  ('Biology', 'Mineral Nutrition',              'NCERT Biology Class 11', 'Chapter 12', 'pp. 215–228'),
  ('Biology', 'Photosynthesis in Higher Plants','NCERT Biology Class 11', 'Chapter 13', 'pp. 229–246'),
  ('Biology', 'Respiration in Plants',          'NCERT Biology Class 11', 'Chapter 14', 'pp. 247–260'),
  ('Biology', 'Plant Growth and Development',   'NCERT Biology Class 11', 'Chapter 15', 'pp. 261–276'),
  ('Biology', 'Digestion and Absorption',       'NCERT Biology Class 12', 'Chapter 16', 'pp. 1–22'),
  ('Biology', 'Breathing and Exchange of Gases','NCERT Biology Class 12', 'Chapter 17', 'pp. 23–36'),
  ('Biology', 'Body Fluids and Circulation',    'NCERT Biology Class 12', 'Chapter 18', 'pp. 37–54'),
  ('Biology', 'Excretory Products and Their Elimination','NCERT Biology Class 12','Chapter 19','pp. 55–70'),
  ('Biology', 'Locomotion and Movement',        'NCERT Biology Class 12', 'Chapter 20', 'pp. 71–86'),
  ('Biology', 'Neural Control and Coordination','NCERT Biology Class 12', 'Chapter 21', 'pp. 87–108'),
  ('Biology', 'Chemical Coordination and Integration','NCERT Biology Class 12','Chapter 22','pp. 109–128'),
  ('Biology', 'Reproduction in Organisms',      'NCERT Biology Class 12', 'Chapter 1',  'pp. 1–14'),
  ('Biology', 'Sexual Reproduction in Flowering Plants','NCERT Biology Class 12','Chapter 2','pp. 15–40'),
  ('Biology', 'Human Reproduction',             'NCERT Biology Class 12', 'Chapter 3',  'pp. 41–64'),
  ('Biology', 'Reproductive Health',            'NCERT Biology Class 12', 'Chapter 4',  'pp. 65–80'),
  ('Biology', 'Principles of Inheritance and Variation','NCERT Biology Class 12','Chapter 5','pp. 81–112'),
  ('Biology', 'Molecular Basis of Inheritance', 'NCERT Biology Class 12', 'Chapter 6',  'pp. 113–144'),
  ('Biology', 'Evolution',                      'NCERT Biology Class 12', 'Chapter 7',  'pp. 145–170'),
  ('Biology', 'Human Health and Disease',        'NCERT Biology Class 12', 'Chapter 8',  'pp. 171–194'),
  ('Biology', 'Strategies for Enhancement in Food Production','NCERT Biology Class 12','Chapter 9','pp. 195–210'),
  ('Biology', 'Microbes in Human Welfare',      'NCERT Biology Class 12', 'Chapter 10', 'pp. 211–226'),
  ('Biology', 'Biotechnology — Principles and Processes','NCERT Biology Class 12','Chapter 11','pp. 227–246'),
  ('Biology', 'Biotechnology and Its Applications','NCERT Biology Class 12','Chapter 12','pp. 247–266'),
  ('Biology', 'Organisms and Populations',      'NCERT Biology Class 12', 'Chapter 13', 'pp. 267–290'),
  ('Biology', 'Ecosystem',                      'NCERT Biology Class 12', 'Chapter 14', 'pp. 291–310'),
  ('Biology', 'Biodiversity and Conservation',  'NCERT Biology Class 12', 'Chapter 15', 'pp. 311–328'),
  ('Biology', 'Environmental Issues',           'NCERT Biology Class 12', 'Chapter 16', 'pp. 329–348')
on conflict (subject, chapter) do nothing;

-- ── student_focus ─────────────────────────────────────────────────────────────
-- Derived snapshot — one row per student (upserted by the server on recompute).
-- Service key writes; user client reads with strict RLS.
create table if not exists student_focus (
  student_id              uuid        primary key references students(id) on delete cascade,
  computed_at             timestamptz not null default now(),

  -- Today's prescription (= this week's frontier actionable form)
  frontier_subject        text,
  frontier_chapter        text,
  frontier_gate           text,
  frontier_gate_label     text,
  frontier_difficulties   text[],
  frontier_strong         int,
  frontier_required       int,
  frontier_recommended    int,
  frontier_reason         text,

  -- Revisit: top-priority cleared-but-decayed gate (null when none)
  revisit_subject         text,
  revisit_chapter         text,
  revisit_gate            text,
  revisit_gate_label      text
);

-- ── Hard privacy: only the owning student may SELECT ─────────────────────────
alter table student_focus enable row level security;

-- No SELECT policy for teacher/admin = deny-all from user client for those roles.
drop policy if exists focus_student_select on student_focus;
create policy focus_student_select on student_focus
  for select
  using (student_id = auth_student_id());

-- Belt-and-suspenders: block any user-client insert/update too.
-- (App always writes via service key which bypasses RLS.)
drop policy if exists focus_student_write on student_focus;
create policy focus_student_write on student_focus
  for all
  using  (student_id = auth_student_id())
  with check (student_id = auth_student_id());
