/**
 * Service for managing human review queue
 */

import { supabase } from '../lib/supabase';
import { createError } from '../lib/errors';
import type {
  HumanReviewQueueItem,
  HumanReviewQueueItemWithContext,
  HumanVerdict,
  QueueStatus,
  ReviewPriority,
} from '../types';

/**
 * Get all items in the human review queue
 */
export async function getReviewQueue(filters?: {
  queueId?: string;
  status?: QueueStatus;
  priority?: ReviewPriority;
}): Promise<HumanReviewQueueItemWithContext[]> {
  let query = supabase
    .from('human_review_queue_with_context')
    .select('*')
    .order('priority', { ascending: true }) // high -> medium -> low
    .order('created_at', { ascending: true }); // oldest first

  if (filters?.queueId) {
    query = query.eq('queue_id', filters.queueId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  const { data, error } = await query;

  if (error) {
    throw createError(`Failed to fetch review queue: ${error.message}`, error);
  }

  return data || [];
}

/**
 * Get review queue statistics
 */
export interface ReviewQueueStats {
  pending: number;
  in_progress: number;
  completed: number;
  total: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
}

export async function getReviewQueueStats(
  queueId?: string
): Promise<ReviewQueueStats> {
  let query = supabase.from('human_review_queue').select('status, priority');

  if (queueId) {
    query = query.eq('queue_id', queueId);
  }

  const { data, error } = await query;

  if (error) {
    throw createError(
      `Failed to fetch review queue stats: ${error.message}`,
      error
    );
  }

  const items = data || [];

  return {
    pending: items.filter((i) => i.status === 'pending').length,
    in_progress: items.filter((i) => i.status === 'in_progress').length,
    completed: items.filter((i) => i.status === 'completed').length,
    total: items.length,
    highPriority: items.filter(
      (i) => i.priority === 'high' && i.status !== 'completed'
    ).length,
    mediumPriority: items.filter(
      (i) => i.priority === 'medium' && i.status !== 'completed'
    ).length,
    lowPriority: items.filter(
      (i) => i.priority === 'low' && i.status !== 'completed'
    ).length,
  };
}

/**
 * Mark a review item as in progress
 */
export async function markReviewInProgress(
  reviewItemId: string,
  assignedTo?: string
): Promise<HumanReviewQueueItem> {
  const updates: Partial<HumanReviewQueueItem> = {
    status: 'in_progress',
  };

  if (assignedTo) {
    updates.assigned_to = assignedTo;
  }

  const { data, error } = await supabase
    .from('human_review_queue')
    .update(updates)
    .eq('id', reviewItemId)
    .select()
    .single();

  if (error) {
    throw createError(
      `Failed to mark review as in progress: ${error.message}`,
      error
    );
  }

  return data;
}

/**
 * Complete a human review with verdict
 */
export async function completeHumanReview(
  evaluationId: string,
  humanVerdict: HumanVerdict,
  humanReasoning: string,
  reviewedBy: string
): Promise<void> {
  // Call the database function that updates both tables
  const { error } = await supabase.rpc('complete_human_review', {
    p_evaluation_id: evaluationId,
    p_human_verdict: humanVerdict,
    p_human_reasoning: humanReasoning,
    p_reviewed_by: reviewedBy,
  });

  if (error) {
    throw createError(
      `Failed to complete human review: ${error.message}`,
      error
    );
  }
}

/**
 * Manually flag an evaluation for human review
 * (For cases where we want to manually add items to the review queue)
 */
export async function flagForHumanReview(
  evaluationId: string,
  priority: ReviewPriority = 'medium',
  reason: string = 'manual_flag'
): Promise<void> {
  // First, update the evaluation to require human review
  const { error: evalError } = await supabase
    .from('evaluations')
    .update({
      requires_human_review: true,
      review_status: 'pending',
    })
    .eq('id', evaluationId);

  if (evalError) {
    throw createError(
      `Failed to flag evaluation for review: ${evalError.message}`,
      evalError
    );
  }

  // Get evaluation details to populate review queue
  const { data: evaluation, error: fetchError } = await supabase
    .from('evaluations')
    .select('*, submissions!inner(queue_id)')
    .eq('id', evaluationId)
    .single();

  if (fetchError || !evaluation) {
    throw createError(
      `Failed to fetch evaluation details: ${fetchError?.message}`,
      fetchError
    );
  }

  // Insert into human_review_queue
  const { error: queueError } = await supabase
    .from('human_review_queue')
    .insert({
      evaluation_id: evaluationId,
      queue_id: (evaluation.submissions as any).queue_id,
      submission_id: evaluation.submission_id,
      question_id: evaluation.question_id,
      judge_name: evaluation.judge_name,
      ai_verdict: evaluation.verdict,
      ai_reasoning: evaluation.reasoning,
      priority,
      flagged_reason: reason,
    });

  if (queueError) {
    // Ignore duplicate key errors (item already in queue)
    if (queueError.code !== '23505') {
      throw createError(
        `Failed to add to review queue: ${queueError.message}`,
        queueError
      );
    }
  }
}

/**
 * Get a specific review item with full context
 */
export async function getReviewItem(
  reviewItemId: string
): Promise<HumanReviewQueueItemWithContext | null> {
  const { data, error } = await supabase
    .from('human_review_queue_with_context')
    .select('*')
    .eq('id', reviewItemId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw createError(`Failed to fetch review item: ${error.message}`, error);
  }

  return data;
}

/**
 * Get unique queue IDs from review queue (for filtering)
 */
export async function getReviewQueueIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('human_review_queue')
    .select('queue_id')
    .neq('status', 'completed');

  if (error) {
    throw createError(`Failed to fetch queue IDs: ${error.message}`, error);
  }

  const uniqueQueueIds = [...new Set(data?.map((item) => item.queue_id) || [])];
  return uniqueQueueIds;
}

/**
 * Skip/unassign a review item (set back to pending)
 */
export async function skipReviewItem(
  reviewItemId: string
): Promise<HumanReviewQueueItem> {
  const { data, error } = await supabase
    .from('human_review_queue')
    .update({
      status: 'pending',
      assigned_to: null,
    })
    .eq('id', reviewItemId)
    .select()
    .single();

  if (error) {
    throw createError(`Failed to skip review item: ${error.message}`, error);
  }

  return data;
}
