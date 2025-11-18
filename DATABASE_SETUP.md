# Database Setup

This document contains all the SQL schema definitions needed to set up the AI Judge database in Supabase.

## Complete Database Schema

Run this SQL in your Supabase SQL Editor to create all necessary tables:

```sql
-- =============================================================================
-- AI JUDGE DATABASE SCHEMA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SUBMISSIONS TABLE
-- Stores uploaded submission data from JSON files
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  labeling_task_id TEXT,
  created_at BIGINT,
  questions JSONB NOT NULL,
  answers JSONB NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_queue_id ON submissions(queue_id);
CREATE INDEX IF NOT EXISTS idx_submissions_uploaded_at ON submissions(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_has_attachments ON submissions ((jsonb_array_length(attachments) > 0));

COMMENT ON TABLE submissions IS 'Stores submission data uploaded from JSON files';
COMMENT ON COLUMN submissions.attachments IS 'Array of file attachments: [{file_name, file_path, mime_type, size_bytes, uploaded_at}]';


-- -----------------------------------------------------------------------------
-- 2. JUDGES TABLE
-- Stores AI judge configurations with system prompts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS judges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model_name TEXT DEFAULT 'gpt-5-mini',
  is_active BOOLEAN DEFAULT true,
  prompt_config JSONB DEFAULT '{
    "include_question_text": true,
    "include_question_type": true,
    "include_answer": true,
    "include_submission_metadata": true,
    "include_queue_id": true,
    "include_labeling_task_id": true,
    "include_created_at": true
  }'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judges_is_active ON judges(is_active);
CREATE INDEX IF NOT EXISTS idx_judges_prompt_config ON judges USING GIN (prompt_config);

COMMENT ON TABLE judges IS 'Stores AI judge definitions with system prompts and configuration';
COMMENT ON COLUMN judges.prompt_config IS 'Configuration for which fields to include in the evaluation prompt sent to the LLM';


-- -----------------------------------------------------------------------------
-- 3. JUDGE_ASSIGNMENTS TABLE
-- Maps judges to specific questions within queues
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(queue_id, question_id, judge_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_assignments_queue ON judge_assignments(queue_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_question ON judge_assignments(question_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge ON judge_assignments(judge_id);

COMMENT ON TABLE judge_assignments IS 'Maps judges to questions within queues';


-- -----------------------------------------------------------------------------
-- 4. EVALUATION_RUNS TABLE
-- Tracks each evaluation run session with summary statistics
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  judges_summary JSONB NOT NULL, -- Array of {id, name, model_name, question_ids}
  total_evaluations INT DEFAULT 0,
  pass_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  inconclusive_count INT DEFAULT 0,
  pass_rate FLOAT GENERATED ALWAYS AS (
    CASE
      WHEN total_evaluations > 0 THEN (pass_count::FLOAT / total_evaluations::FLOAT) * 100
      ELSE 0
    END
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_queue_id ON evaluation_runs(queue_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_created_at ON evaluation_runs(created_at DESC);

COMMENT ON TABLE evaluation_runs IS 'Tracks each evaluation run session with summary stats and history';


-- -----------------------------------------------------------------------------
-- 5. EVALUATIONS TABLE
-- Stores individual evaluation results from AI judges
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  judge_name TEXT NOT NULL, -- Denormalized for history
  verdict TEXT NOT NULL CHECK (verdict IN ('pass', 'fail', 'inconclusive')),
  reasoning TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  run_id UUID REFERENCES evaluation_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evaluations_submission ON evaluations(submission_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_question ON evaluations(question_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_judge ON evaluations(judge_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_verdict ON evaluations(verdict);
CREATE INDEX IF NOT EXISTS idx_evaluations_run_id ON evaluations(run_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at DESC);

COMMENT ON TABLE evaluations IS 'Stores individual evaluation results from AI judges';
COMMENT ON COLUMN evaluations.run_id IS 'Links evaluation to specific run session for history tracking';


-- =============================================================================
-- STORAGE BUCKET FOR FILE ATTACHMENTS (Optional)
-- =============================================================================

-- Create storage bucket for file attachments (images, PDFs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-attachments',
  'submission-attachments',
  false,
  52428800, -- 50 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for anonymous access (works with SUPABASE_ANON_KEY)
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon deletes" ON storage.objects;

CREATE POLICY "Allow anon uploads"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'submission-attachments');

CREATE POLICY "Allow anon reads"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'submission-attachments');

CREATE POLICY "Allow anon deletes"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'submission-attachments');


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Run these queries to verify your setup:

-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('submissions', 'judges', 'judge_assignments', 'evaluation_runs', 'evaluations')
ORDER BY table_name;

-- Check evaluation_runs structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'evaluation_runs'
ORDER BY ordinal_position;

-- Check evaluations.run_id column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'evaluations' AND column_name = 'run_id';
```

## Schema Diagram

```
┌──────────────┐
│ submissions  │
└──────┬───────┘
       │
       │ (1:N)
       │
┌──────▼───────────┐        ┌─────────────────┐
│  evaluations     │◄───────┤ evaluation_runs │
└──────┬───────────┘  N:1   └─────────────────┘
       │
       │ (N:1)
       │
┌──────▼───────┐      ┌────────────────────┐
│   judges     │◄─────┤ judge_assignments  │
└──────────────┘ N:1  └────────────────────┘
```

## Key Features

### 1. **Submissions**
- Stores uploaded JSON data
- Indexed by queue_id for fast retrieval
- Supports JSONB for flexible question/answer schemas

### 2. **Judges**
- Configurable AI judges with system prompts
- Active/inactive status for easy management
- Timestamps for audit trail

### 3. **Judge Assignments**
- Maps judges to specific questions
- Unique constraint prevents duplicate assignments
- Cascade delete maintains referential integrity

### 4. **Evaluation Runs**
- Tracks each evaluation session
- Auto-calculated pass_rate (computed column)
- JSONB judges_summary for flexible metadata
- Enables full history tracking

### 5. **Evaluations**
- Individual evaluation results
- Links to evaluation_runs for history
- Verdict constraint ensures data quality
- Multiple indexes for fast filtering

## Migration Notes

- **Idempotent**: All statements use `IF NOT EXISTS` - safe to run multiple times
- **Backward Compatible**: Existing data is preserved
- **Cascade Deletes**: Foreign keys maintain referential integrity
- **History Preservation**: Evaluations are never deleted, only linked to runs

## File Attachments Support

The main schema above includes support for file attachments (images, PDFs) for multimodal AI evaluation.

**What's included:**
- `attachments` column on `submissions` table (JSONB array)
- Supabase Storage bucket: `submission-attachments`
- Storage policies for anonymous access (works with SUPABASE_ANON_KEY)
- Support for images (PNG, JPG, GIF, WEBP) and PDFs up to 50MB

**Use case:** When submissions include screenshots or documents, the AI judge can analyze them visually during evaluation (e.g., verifying if a human correctly labeled an image).

**Verification queries:**
```sql
-- Check attachments column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'submissions' AND column_name = 'attachments';

-- Check storage bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'submission-attachments';

-- Check storage policies exist
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE 'Allow anon%';
```


## Next Steps

1. Copy the complete SQL schema from the top of this file (includes all tables, indexes, and file attachment support)
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run the SQL to create all tables, storage bucket, and policies
4. Run the verification queries to confirm setup
5. Start using the application!
