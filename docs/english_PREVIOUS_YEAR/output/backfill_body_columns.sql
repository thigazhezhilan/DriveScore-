-- Backfill body + options for old bilingual rows (2015/2016 and any others)
-- that were created before migration 0020 added the neutral body/options columns.
-- These rows store content in body_en / options_en; copy to the neutral columns
-- so all code paths that read `body` and `options` get the right content.
--
-- Safe to re-run (WHERE body IS NULL guard prevents double-writes).

UPDATE questions
SET
  body    = body_en,
  options = options_en
WHERE
  body    IS NULL
  AND body_en IS NOT NULL
  AND centre_id IS NULL;

-- Verify: should be 0 rows left with body=NULL and body_en IS NOT NULL
SELECT COUNT(*) AS remaining_unfilled
FROM questions
WHERE body IS NULL AND body_en IS NOT NULL AND centre_id IS NULL;
