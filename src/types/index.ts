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
 * AI Judge configuration
 * Note: Always uses GPT-5-mini model
 */
export interface Judge {
  id: string;
  name: string;
  system_prompt: string;
  is_active: boolean;
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
