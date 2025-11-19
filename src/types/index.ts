/**
 * TypeScript interfaces for the AI Judge application
 */

/**
 * Question data structure embedded in a submission
 */
export interface Question {
  rev: number;
  data: {
    id: string;
    questionType:
      | 'single_choice'
      | 'multiple_choice'
      | 'free_form'
      | 'single_choice_with_reasoning';
    questionText: string;
    [key: string]: unknown; // Allow additional fields
  };
}

/**
 * Answer data structure - can be various shapes depending on question type
 */
export interface Answer {
  choice?: string | string[];
  reasoning?: string;
  text?: string;
  [key: string]: unknown; // Allow additional fields
}

/**
 * File attachment metadata
 */
export interface FileAttachment {
  file_name: string;
  file_path: string; // Path in Supabase Storage
  mime_type: string;
  size_bytes: number;
  uploaded_at: string; // ISO timestamp
}

/**
 * Submission from the uploaded JSON file
 */
export interface Submission {
  id: string;
  queueId: string;
  labelingTaskId: string;
  createdAt: number; // Unix timestamp in milliseconds
  questions: Question[];
  answers: Record<string, Answer>;
  attachments?: FileAttachment[]; // Optional file attachments (images, PDFs)
}

/**
 * Submission as stored in Supabase (with additional metadata)
 */
export interface StoredSubmission extends Submission {
  uploaded_at: string; // ISO timestamp
}

/**
 * Configuration for which fields to include in the evaluation prompt
 */
export interface PromptConfiguration {
  include_question_text: boolean;
  include_question_type: boolean;
  include_answer: boolean;
  include_submission_metadata: boolean;
  include_queue_id: boolean;
  include_labeling_task_id: boolean;
  include_created_at: boolean;
}

/**
 * AI Judge configuration
 * Note: Always uses GPT-5-mini model
 */
export interface Judge {
  id: string;
  name: string;
  system_prompt: string;
  is_active: boolean;
  prompt_config?: PromptConfiguration; // Optional: defaults to all true if not provided
  created_at: string;
  updated_at: string;
}

/**
 * Assignment of a judge to a specific question in a queue
 */
export interface JudgeAssignment {
  id: string;
  queue_id: string;
  question_id: string;
  judge_id: string;
}

/**
 * Evaluation verdict types
 */
export type Verdict = 'pass' | 'fail' | 'inconclusive';

/**
 * Human verdict types
 */
export type HumanVerdict =
  | 'pass'
  | 'fail'
  | 'bad_data' // Data quality issue - not counted as disagreement
  | 'ambiguous_question' // Question is unclear or poorly worded
  | 'insufficient_context'; // Not enough context to make a judgment

/**
 * Review status for evaluations requiring human review
 */
export type ReviewStatus = 'pending' | 'completed';

/**
 * Result of an AI evaluation
 */
export interface Evaluation {
  id: string;
  submission_id: string;
  question_id: string;
  judge_id: string;
  judge_name: string; // Denormalized for history
  verdict: Verdict;
  reasoning: string;
  created_at: string;
  run_id?: string; // Links to evaluation run session

  // Human review fields
  requires_human_review?: boolean;
  human_verdict?: HumanVerdict;
  human_reasoning?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_status?: ReviewStatus;
  is_disagreement?: boolean; // True when human verdict differs from AI (for pass/fail)
}

/**
 * Judge summary for evaluation run
 */
export interface JudgeSummary {
  id: string;
  name: string;
  model_name: string;
  question_ids: string[];
}

/**
 * Evaluation run session tracking
 */
export interface EvaluationRun {
  id: string;
  queue_id: string;
  created_at: string;
  judges_summary: JudgeSummary[];
  total_evaluations: number;
  pass_count: number;
  fail_count: number;
  inconclusive_count: number;
  pass_rate?: number; // Computed field
}

/**
 * Priority levels for human review queue items
 */
export type ReviewPriority = 'low' | 'medium' | 'high';

/**
 * Status of a human review queue item
 */
export type QueueStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Human review queue item
 */
export interface HumanReviewQueueItem {
  id: string;
  evaluation_id: string;
  queue_id: string;
  submission_id: string;
  question_id: string;
  judge_name: string;
  ai_verdict: Verdict;
  ai_reasoning?: string;
  priority: ReviewPriority;
  assigned_to?: string;
  status: QueueStatus;
  flagged_reason: string;
  created_at: string;
  completed_at?: string;
}

/**
 * Human review queue item with full submission context
 */
export interface HumanReviewQueueItemWithContext extends HumanReviewQueueItem {
  answers: Record<string, Answer>;
  questions: Question[];
  evaluation_created_at: string;
}

/**
 * Validation result for uploaded submissions
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Upload status tracking
 */
export interface UploadStatus {
  status: 'idle' | 'validating' | 'uploading' | 'success' | 'error';
  message?: string;
  progress?: number;
  totalSubmissions?: number;
  uploadedSubmissions?: number;
}

/**
 * Failure pattern detected in judge performance analysis
 */
export interface FailurePattern {
  pattern_type: string; // e.g., 'short_answer', 'spelling_errors', 'incomplete_response'
  description: string;
  count: number;
  examples: string[]; // Array of evaluation IDs
  ai_pass_rate?: number;
  human_pass_rate?: number;
}

/**
 * Judge performance metrics (cached analytics)
 */
export interface JudgePerformanceMetrics {
  id: string;
  judge_id: string;
  period_start: string;
  period_end: string;
  total_evaluations: number;
  human_reviewed_count: number;
  disagreement_count: number;
  disagreement_rate: number;
  ai_pass_rate: number;
  human_pass_rate: number;
  failure_patterns?: FailurePattern[];
  computed_at: string;
}

/**
 * Status of a rubric suggestion
 */
export type SuggestionStatus = 'pending' | 'applied' | 'dismissed';

/**
 * Auto-generated suggestion for improving judge rubric
 */
export interface RubricSuggestion {
  id: string;
  judge_id: string;
  suggestion_type: string; // e.g., 'partial_credit', 'error_tolerance', 'answer_length'
  suggestion_text: string;
  evidence_examples?: string[]; // Array of evaluation IDs
  evidence_count: number;
  confidence_score: number; // 0-1
  status: SuggestionStatus;
  created_at: string;
  applied_at?: string;
  dismissed_at?: string;
}
