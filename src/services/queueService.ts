/**
 * Service for fetching queue and submission data
 */

import { supabase } from '../lib/supabase';
import type { StoredSubmission } from '../types';

/**
 * Queue summary information
 */
export interface QueueSummary {
  queue_id: string;
  submission_count: number;
  latest_upload: string;
}

/**
 * Get all unique queues with submission counts
 */
export async function listQueues(): Promise<QueueSummary[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('queue_id, uploaded_at');

  if (error) {
    throw new Error(`Failed to fetch queues: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Group by queue_id and count submissions
  const queueMap = new Map<string, { count: number; latestUpload: string }>();

  data.forEach((row: { queue_id: string; uploaded_at: string }) => {
    const existing = queueMap.get(row.queue_id);
    if (existing) {
      existing.count++;
      if (row.uploaded_at > existing.latestUpload) {
        existing.latestUpload = row.uploaded_at;
      }
    } else {
      queueMap.set(row.queue_id, {
        count: 1,
        latestUpload: row.uploaded_at,
      });
    }
  });

  // Convert to array
  return Array.from(queueMap.entries()).map(([queue_id, info]) => ({
    queue_id,
    submission_count: info.count,
    latest_upload: info.latestUpload,
  }));
}

/**
 * Get all submissions for a specific queue
 */
export async function getQueueSubmissions(
  queueId: string
): Promise<StoredSubmission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('queue_id', queueId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch queue submissions: ${error.message}`);
  }

  return (data as StoredSubmission[]) || [];
}

/**
 * Get unique questions from a queue's submissions
 */
export interface QuestionInfo {
  id: string;
  text: string;
  type: string;
}

export async function getQueueQuestions(
  queueId: string
): Promise<QuestionInfo[]> {
  const submissions = await getQueueSubmissions(queueId);

  const questionMap = new Map<string, QuestionInfo>();

  submissions.forEach((submission) => {
    submission.questions.forEach((q) => {
      if (!questionMap.has(q.data.id)) {
        questionMap.set(q.data.id, {
          id: q.data.id,
          text: q.data.questionText,
          type: q.data.questionType,
        });
      }
    });
  });

  return Array.from(questionMap.values());
}
