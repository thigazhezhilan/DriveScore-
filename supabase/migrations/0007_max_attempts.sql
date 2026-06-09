-- Allow teachers to configure how many times a student may attempt a mock.
-- Default is 1 (one attempt only). Set to 2 to allow one retake, etc.
ALTER TABLE mocks ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 1;
