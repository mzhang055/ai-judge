/**
 * Service for handling submission data operations
 * Validates and persists submissions to Supabase
 */
import { supabase } from '../lib/supabase';
import type { Submission, ValidationResult, StoredSubmission } from '../types';

/**
 * Validates a single submission object
 */
function validateSubmission(submission: unknown): ValidationResult {
  const errors: string[] = [];

  if (!submission || typeof submission !== 'object') {
    return { valid: false, errors: ['Submission must be an object'] };
  }

  const sub = submission as Record<string, unknown>;

  // Required fields
  if (!sub.id || typeof sub.id !== 'string') {
    errors.push('Missing or invalid "id" field');
  }
  if (!sub.queueId || typeof sub.queueId !== 'string') {
    errors.push('Missing or invalid "queueId" field');
  }
  if (!sub.labelingTaskId || typeof sub.labelingTaskId !== 'string') {
    errors.push('Missing or invalid "labelingTaskId" field');
  }
  if (typeof sub.createdAt !== 'number') {
    errors.push('Missing or invalid "createdAt" field (must be a number)');
  }
  if (!Array.isArray(sub.questions)) {
    errors.push('Missing or invalid "questions" field (must be an array)');
  }
  if (!sub.answers || typeof sub.answers !== 'object') {
    errors.push('Missing or invalid "answers" field (must be an object)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an array of submissions
 */
export function validateSubmissions(data: unknown): ValidationResult {
  if (!Array.isArray(data)) {
    return {
      valid: false,
      errors: ['Data must be an array of submissions'],
    };
  }

  if (data.length === 0) {
    return {
      valid: false,
      errors: ['Array cannot be empty'],
    };
  }

  const allErrors: string[] = [];

  data.forEach((submission, index) => {
    const result = validateSubmission(submission);
    if (!result.valid) {
      allErrors.push(`Submission ${index + 1}: ${result.errors.join(', ')}`);
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Parses JSON file content
 */
export async function parseJSONFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Saves submissions to Supabase
 * @param submissions Array of validated submissions to persist
 * @returns Array of saved submission IDs
 */
export async function saveSubmissions(
  submissions: Submission[]
): Promise<string[]> {
  const records = submissions.map((sub) => ({
    id: sub.id,
    queue_id: sub.queueId,
    labeling_task_id: sub.labelingTaskId,
    created_at: sub.createdAt,
    questions: sub.questions,
    answers: sub.answers,
    uploaded_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('submissions')
    .upsert(records, { onConflict: 'id' })
    .select('id');

  if (error) {
    throw new Error(`Failed to save submissions: ${error.message}`);
  }

  return data?.map((r) => r.id) || [];
}

/**
 * Fetches all submissions for a specific queue
 */
export async function getSubmissionsByQueue(
  queueId: string
): Promise<StoredSubmission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('queue_id', queueId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return (data || []).map((record) => ({
    id: record.id,
    queueId: record.queue_id,
    labelingTaskId: record.labeling_task_id,
    createdAt: record.created_at,
    questions: record.questions,
    answers: record.answers,
    uploaded_at: record.uploaded_at,
  }));
}

/**
 * Gets count of submissions by queue ID
 */
export async function getSubmissionCount(queueId: string): Promise<number> {
  const { count, error } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('queue_id', queueId);

  if (error) {
    throw new Error(`Failed to count submissions: ${error.message}`);
  }

  return count || 0;
}
