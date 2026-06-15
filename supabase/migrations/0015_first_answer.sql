-- DriveScore — Self-Doubt capture (Diagnosis Engine v2)
--
-- Records the FIRST option a student touched on each question, separately from
-- the final submitted `picked_index`. This powers the SELF_DOUBT diagnosis
-- (had it right first, then changed it to a wrong answer).
--
-- Additive + nullable: grading still uses `picked_index` only, and older
-- answers (null here) fall back to the classic diagnosis categories. No data
-- migration needed; safe to re-run.

alter table answers
  add column if not exists first_answer_index int
  check (first_answer_index is null or first_answer_index between 0 and 3);
