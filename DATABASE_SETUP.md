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
  run_id UUID REFERENCES evaluation_runs(id) ON DELETE CASCADE,

  -- Human review fields
  requires_human_review BOOLEAN DEFAULT false,
  human_verdict TEXT,
  human_reasoning TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_status TEXT DEFAULT 'pending'
);

-- Add check constraints
ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS evaluations_human_verdict_check;

ALTER TABLE evaluations
ADD CONSTRAINT evaluations_human_verdict_check
CHECK (human_verdict IS NULL OR human_verdict IN ('pass', 'fail', 'bad_data', 'ambiguous_question', 'insufficient_context'));

ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS evaluations_review_status_check;

ALTER TABLE evaluations
ADD CONSTRAINT evaluations_review_status_check
CHECK (review_status IN ('pending', 'completed'));

CREATE INDEX IF NOT EXISTS idx_evaluations_submission ON evaluations(submission_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_question ON evaluations(question_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_judge ON evaluations(judge_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_verdict ON evaluations(verdict);
CREATE INDEX IF NOT EXISTS idx_evaluations_run_id ON evaluations(run_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluations_requires_review ON evaluations(requires_human_review) WHERE requires_human_review = true;

COMMENT ON TABLE evaluations IS 'Stores individual evaluation results from AI judges';
COMMENT ON COLUMN evaluations.run_id IS 'Links evaluation to specific run session for history tracking';
COMMENT ON COLUMN evaluations.requires_human_review IS 'Flag indicating if this evaluation needs human review';
COMMENT ON COLUMN evaluations.human_verdict IS 'Human reviewer override verdict';
COMMENT ON COLUMN evaluations.review_status IS 'Status of human review process';


-- -----------------------------------------------------------------------------
-- 6. HUMAN_REVIEW_QUEUE TABLE
-- Queue for evaluations requiring human review (inconclusive AI verdicts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS human_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  queue_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  judge_name TEXT NOT NULL,
  ai_verdict TEXT NOT NULL,
  ai_reasoning TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  flagged_reason TEXT DEFAULT 'ai_inconclusive',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(evaluation_id)
);

CREATE INDEX IF NOT EXISTS idx_human_review_queue_status ON human_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_human_review_queue_queue_id ON human_review_queue(queue_id);
CREATE INDEX IF NOT EXISTS idx_human_review_queue_priority ON human_review_queue(priority, status);

COMMENT ON TABLE human_review_queue IS 'Queue of evaluations that require human review';


-- -----------------------------------------------------------------------------
-- 7. HUMAN REVIEW AUTO-FLAGGING TRIGGERS
-- Automatically flag inconclusive verdicts for human review
-- -----------------------------------------------------------------------------

-- Function to set requires_human_review flag (BEFORE trigger)
CREATE OR REPLACE FUNCTION set_requires_human_review_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- If verdict is inconclusive, set the flag
  IF NEW.verdict = 'inconclusive' THEN
    NEW.requires_human_review := true;
    NEW.review_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- BEFORE trigger to set flag
DROP TRIGGER IF EXISTS trigger_set_requires_review ON evaluations;
CREATE TRIGGER trigger_set_requires_review
  BEFORE INSERT OR UPDATE OF verdict ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION set_requires_human_review_flag();

-- Function to insert into review queue (AFTER trigger)
CREATE OR REPLACE FUNCTION insert_into_review_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- If flagged for review, insert into queue
  -- Runs AFTER the evaluation is committed, so FK constraint is satisfied
  IF NEW.requires_human_review = true AND NEW.verdict = 'inconclusive' THEN
    INSERT INTO human_review_queue (
      evaluation_id,
      queue_id,
      submission_id,
      question_id,
      judge_name,
      ai_verdict,
      ai_reasoning,
      priority,
      flagged_reason
    )
    SELECT
      NEW.id,
      s.queue_id,
      NEW.submission_id,
      NEW.question_id,
      NEW.judge_name,
      NEW.verdict,
      NEW.reasoning,
      'medium',
      'ai_inconclusive'
    FROM submissions s
    WHERE s.id = NEW.submission_id
    ON CONFLICT (evaluation_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER trigger to insert into queue
DROP TRIGGER IF EXISTS trigger_insert_review_queue ON evaluations;
CREATE TRIGGER trigger_insert_review_queue
  AFTER INSERT OR UPDATE OF verdict ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION insert_into_review_queue();


-- -----------------------------------------------------------------------------
-- 8. HUMAN REVIEW COMPLETION FUNCTION
-- Atomically completes a human review
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_human_review(
  p_evaluation_id UUID,
  p_human_verdict TEXT,
  p_human_reasoning TEXT,
  p_reviewed_by TEXT
)
RETURNS void AS $$
BEGIN
  -- Update evaluation record
  UPDATE evaluations
  SET
    human_verdict = p_human_verdict,
    human_reasoning = p_human_reasoning,
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    review_status = 'completed'
  WHERE id = p_evaluation_id;

  -- Update human_review_queue
  UPDATE human_review_queue
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE evaluation_id = p_evaluation_id;
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------------------------------
-- 9. HUMAN REVIEW QUEUE VIEW
-- View with full submission context for easy querying
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW human_review_queue_with_context AS
SELECT
  hrq.*,
  s.answers,
  s.questions,
  e.created_at as evaluation_created_at
FROM human_review_queue hrq
JOIN evaluations e ON hrq.evaluation_id = e.id
JOIN submissions s ON hrq.submission_id = s.id
ORDER BY
  CASE hrq.priority
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  hrq.created_at ASC;


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
  AND table_name IN ('submissions', 'judges', 'judge_assignments', 'evaluation_runs', 'evaluations', 'human_review_queue')
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

-- Check human review triggers are installed
SELECT tgname, tgtype::text, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'evaluations'::regclass
  AND tgname IN ('trigger_set_requires_review', 'trigger_insert_review_queue');

-- Expected output:
-- trigger_insert_review_queue | AFTER  | insert_into_review_queue
-- trigger_set_requires_review  | BEFORE | set_requires_human_review_flag
```

## Schema Diagram

```
┌──────────────┐
│ submissions  │
└──────┬───────┘
       │
       │ (1:N)
       │
┌──────▼───────────┐        ┌─────────────────┐        ┌──────────────────────┐
│  evaluations     │◄───────┤ evaluation_runs │        │ human_review_queue   │
│  (with human     │  N:1   └─────────────────┘        │  (inconclusive only) │
│   review fields) │◄──────────────────────────────────┤                      │
└──────┬───────────┘              1:1                  └──────────────────────┘
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
- **Human review fields**: Support for human override of AI verdicts
- Auto-flagging of inconclusive results via triggers

### 6. **Human Review Queue**
- Auto-populated when AI judge returns inconclusive verdict
- Priority-based review (high/medium/low)
- Assignment tracking for team workflows
- Status management (pending/in_progress/completed)
- Full context view with submission data
- Atomic review completion via `complete_human_review()` function

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


## Human Review Queue

### What It Does

When an AI judge returns a verdict of "inconclusive", the evaluation is **automatically flagged** for human review. A database trigger adds it to the `human_review_queue` table, where humans can:

1. Review the submission with full context
2. Make a final decision: Pass, Fail, or Mark as Bad Data
3. Provide reasoning and categorization
4. Track reviewer name and timestamp

### How Auto-Flagging Works

**Two-trigger system** (to avoid foreign key violations):

1. **BEFORE INSERT Trigger** (`trigger_set_requires_review`)
   - Sets `requires_human_review = true` on the evaluation
   - Sets `review_status = 'pending'`

2. **AFTER INSERT Trigger** (`trigger_insert_review_queue`)
   - Inserts into `human_review_queue` (after evaluation exists in DB)
   - Joins with `submissions` to get queue_id
   - Sets default priority: 'medium'

### Human Verdict Types

```sql
human_verdict CHECK (human_verdict IN (
  'pass',                    -- Human overrides to passing
  'fail',                    -- Human overrides to failing
  'bad_data',                -- General data quality issue
  'ambiguous_question',      -- Question is unclear/poorly written
  'insufficient_context'     -- Answer lacks necessary information
))
```

### Completing a Review

Use the `complete_human_review()` function for atomic updates:

```sql
SELECT complete_human_review(
  '<evaluation_id>'::uuid,
  'pass',  -- or fail, bad_data, etc.
  'The answer is acceptable for basic labeling tasks. Judge is too strict.',
  'reviewer@example.com'
);
```

This function:
- Updates `evaluations` table with human verdict/reasoning
- Updates `human_review_queue` status to 'completed'
- Sets timestamps
- All in one transaction

### Priority Levels

- **High**: Critical reviews (can be set manually)
- **Medium**: Standard inconclusive verdicts (default)
- **Low**: Optional quality sampling reviews

### Review Status Flow

```
pending → in_progress → completed
   ↑           ↓
   └───────────┘ (can skip back to pending)
```

### View with Context

The `human_review_queue_with_context` view joins:
- Review queue item
- Full evaluation record
- Complete submission (questions + answers)

Auto-sorted by priority (high → medium → low) then creation time.

### Common Queries

**Get pending reviews for a queue:**
```sql
SELECT * FROM human_review_queue_with_context
WHERE queue_id = 'queue_1' AND status = 'pending';
```

**Get review stats:**
```sql
SELECT
  status,
  priority,
  COUNT(*) as count
FROM human_review_queue
GROUP BY status, priority;
```

**Find evaluations with human overrides:**
```sql
SELECT
  e.id,
  e.verdict as ai_verdict,
  e.human_verdict,
  e.reviewed_by,
  e.reviewed_at
FROM evaluations e
WHERE e.human_verdict IS NOT NULL;
```

### Troubleshooting

**Issue: Foreign key violation when creating evaluations**

Error: `violates foreign key constraint "human_review_queue_evaluation_id_fkey"`

**Cause**: Old BEFORE-only trigger trying to insert before evaluation exists.

**Fix**: Verify two separate triggers exist:
```sql
SELECT tgname, tgtype::text
FROM pg_trigger
WHERE tgrelid = 'evaluations'::regclass
  AND tgname LIKE 'trigger_%review%';
```

Should see:
- `trigger_set_requires_review` → BEFORE
- `trigger_insert_review_queue` → AFTER

If you only see one trigger or the wrong type, re-run the trigger creation section of this schema.

## Next Steps

1. Copy the complete SQL schema from the top of this file (includes all tables, indexes, human review queue, and file attachment support)
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run the SQL to create all tables, triggers, views, storage bucket, and policies
4. Run the verification queries to confirm setup
5. Verify triggers are correctly installed (see verification section above)
6. Start using the application!

### Testing Human Review

1. Run evaluations that produce inconclusive verdicts
2. Check `human_review_queue` - should auto-populate
3. Visit `/human-review` in the app
4. Review an item and submit
5. Check `evaluations` table - should have human_verdict populated
