/**
 * Service for managing judge assignments to questions
 */

import { supabase } from '../lib/supabase';
import { createError } from '../lib/errors';
import type { JudgeAssignment } from '../types';

/**
 * Input type for creating a judge assignment
 */
export interface CreateAssignmentInput {
  queue_id: string;
  question_id: string;
  judge_id: string;
}

/**
 * Assign a judge to a question in a queue
 * Uses upsert to handle duplicate assignments gracefully
 */
export async function assignJudge(
  input: CreateAssignmentInput
): Promise<JudgeAssignment> {
  const { data, error } = await supabase
    .from('judge_assignments')
    .upsert(
      {
        queue_id: input.queue_id,
        question_id: input.question_id,
        judge_id: input.judge_id,
      },
      {
        onConflict: 'queue_id,question_id,judge_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw createError(`Failed to assign judge: ${error.message}`, error);
  }

  return data;
}

/**
 * Remove a judge assignment
 */
export async function unassignJudge(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('judge_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    throw createError(`Failed to unassign judge: ${error.message}`, error);
  }
}

/**
 * Get all judge assignments for a specific queue and question
 */
export async function getAssignmentsForQuestion(
  queueId: string,
  questionId: string
): Promise<JudgeAssignment[]> {
  const { data, error } = await supabase
    .from('judge_assignments')
    .select('*')
    .eq('queue_id', queueId)
    .eq('question_id', questionId);

  if (error) {
    throw createError(
      `Failed to fetch assignments for question: ${error.message}`,
      error
    );
  }

  return data || [];
}

/**
 * Get all judge assignments for a queue
 */
export async function listAssignmentsForQueue(
  queueId: string
): Promise<JudgeAssignment[]> {
  const { data, error } = await supabase
    .from('judge_assignments')
    .select('*')
    .eq('queue_id', queueId);

  if (error) {
    throw createError(
      `Failed to fetch assignments for queue: ${error.message}`,
      error
    );
  }

  return data || [];
}

/**
 * Remove a judge from a specific question in a queue
 */
export async function unassignJudgeFromQuestion(
  queueId: string,
  questionId: string,
  judgeId: string
): Promise<void> {
  const { error } = await supabase
    .from('judge_assignments')
    .delete()
    .eq('queue_id', queueId)
    .eq('question_id', questionId)
    .eq('judge_id', judgeId);

  if (error) {
    throw createError(
      `Failed to unassign judge from question: ${error.message}`,
      error
    );
  }
}
