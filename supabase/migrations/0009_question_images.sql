-- SynapTest — Image support for questions (diagram/figure questions).
--
-- Adds an optional image to any question (a figure in the stem, or the whole
-- question+options captured as one image for "figure-option" questions). The
-- four options may be blank for image-only questions — the student just picks
-- A/B/C/D, graded against answer_index as usual.
--
-- Images live in a PUBLIC Storage bucket; only the platform admin uploads them
-- (server-side, via the service key, which bypasses Storage RLS). Public read
-- so the test + report can render them with a plain <img>.
--
-- Idempotent / re-runnable.

-- 1. Optional image URL on every question.
alter table questions add column if not exists image_url text;

-- 2. Public Storage bucket to hold question figures.
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;
