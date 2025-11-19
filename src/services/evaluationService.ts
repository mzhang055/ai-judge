/**
 * Service for running AI evaluations
 */

import { supabase } from '../lib/supabase';
import {
  callLLM,
  LLMError,
  LLMErrorType,
  buildMultimodalMessage,
  isImageAttachment,
  type LLMMessage,
} from '../lib/llm';
import { createError } from '../lib/errors';
import type {
  Evaluation,
  EvaluationRun,
  Judge,
  JudgeSummary,
  StoredSubmission,
} from '../types';
import { getQueueSubmissions } from './queueService';
import { listAssignmentsForQueue } from './judgeAssignmentService';
import { listJudges } from './judgeService';
import { getSignedFileUrl } from './fileStorageService';

export interface EvaluationResult {
  verdict: 'pass' | 'fail' | 'inconclusive';
  reasoning: string;
}

export interface EvaluationProgress {
  total: number;
  completed: number;
  failed: number;
  currentSubmission?: string;
  currentQuestion?: string;
}

export type ProgressCallback = (progress: EvaluationProgress) => void;

/**
 * Parse LLM response to extract verdict and reasoning
 */
function parseEvaluationResponse(response: string): EvaluationResult {
  // Look for verdict markers (case-insensitive)
  const verdictMatch = response.match(
    /verdict\s*:\s*(pass|fail|inconclusive)/i
  );

  let verdict: 'pass' | 'fail' | 'inconclusive' = 'inconclusive';

  if (verdictMatch) {
    verdict = verdictMatch[1].toLowerCase() as 'pass' | 'fail' | 'inconclusive';
  } else {
    // Try to infer from response content
    const lower = response.toLowerCase();
    if (lower.includes('pass') && !lower.includes('fail')) {
      verdict = 'pass';
    } else if (lower.includes('fail')) {
      verdict = 'fail';
    }
  }

  // Extract reasoning (everything after "reasoning:" or use full response)
  const reasoningMatch = response.match(/reasoning\s*:\s*(.+)/is);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : response.trim();

  return { verdict, reasoning };
}

/**
 * Create messages for the judge to evaluate a submission
 * Returns system message and user message (potentially multimodal with images)
 */
async function createEvaluationMessages(
  judge: Judge,
  submission: StoredSubmission,
  questionId: string
): Promise<{ systemMessage: LLMMessage; userMessage: LLMMessage }> {
  const question = submission.questions.find((q) => q.data.id === questionId);
  const answer = submission.answers[questionId];

  if (!question) {
    throw new Error(
      `Question ${questionId} not found in submission ${submission.id}`
    );
  }

  const systemMessage: LLMMessage = {
    role: 'system',
    content: judge.system_prompt,
  };

  // Get prompt configuration (default to all true if not specified)
  const config = judge.prompt_config || {
    include_question_text: true,
    include_question_type: true,
    include_answer: true,
    include_submission_metadata: true,
    include_queue_id: true,
    include_labeling_task_id: true,
    include_created_at: true,
  };

  // Build user message based on configuration
  let userTextParts: string[] = ['Please evaluate the following submission:\n'];

  // Question fields
  userTextParts.push(`**Question ID:** ${questionId}`);

  if (config.include_question_type) {
    userTextParts.push(`**Question Type:** ${question.data.questionType}`);
  }

  if (config.include_question_text) {
    userTextParts.push(`**Question Text:** ${question.data.questionText}`);
  }

  // Answer field
  if (config.include_answer) {
    userTextParts.push(`\n**Answer:** ${JSON.stringify(answer, null, 2)}`);
  }

  // Submission metadata
  const includeAnyMetadata =
    config.include_submission_metadata ||
    config.include_queue_id ||
    config.include_labeling_task_id ||
    config.include_created_at;

  if (includeAnyMetadata) {
    const metadataParts: string[] = [];

    // Always include submission ID if we're showing any metadata
    metadataParts.push(`- Submission ID: ${submission.id}`);

    if (config.include_queue_id || config.include_submission_metadata) {
      metadataParts.push(`- Queue ID: ${submission.queueId}`);
    }

    if (config.include_labeling_task_id || config.include_submission_metadata) {
      metadataParts.push(`- Labeling Task ID: ${submission.labelingTaskId}`);
    }

    if (config.include_created_at || config.include_submission_metadata) {
      metadataParts.push(`- Created At: ${submission.createdAt}`);
    }

    if (metadataParts.length > 0) {
      userTextParts.push('\n**Submission Metadata:**');
      userTextParts.push(...metadataParts);
    }
  }

  userTextParts.push(
    '\nPlease provide your evaluation in the following format:\n'
  );
  userTextParts.push('Verdict: [pass/fail/inconclusive]');
  userTextParts.push('Reasoning: [Your detailed reasoning here]');

  const userText = userTextParts.join('\n');

  // Check if submission has image attachments
  const attachments = submission.attachments || [];
  const imageAttachments = attachments.filter((att) =>
    isImageAttachment(att.mime_type)
  );

  // If there are image attachments, create multimodal message
  if (imageAttachments.length > 0) {
    // Get signed URLs for all image attachments
    const imageUrls = await Promise.all(
      imageAttachments.map((att) => getSignedFileUrl(att.file_path))
    );

    const userMessage = buildMultimodalMessage(userText, imageUrls);
    return { systemMessage, userMessage };
  }

  // Otherwise, simple text message
  const userMessage: LLMMessage = {
    role: 'user',
    content: userText,
  };

  return { systemMessage, userMessage };
}

/**
 * Get user-friendly error message for LLM errors
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof LLMError) {
    switch (error.type) {
      case LLMErrorType.TIMEOUT:
        return `Request timed out. The LLM took too long to respond.`;
      case LLMErrorType.RATE_LIMIT:
        return `Rate limit exceeded. Too many requests to the LLM API.${error.retryAfter ? ` Retry after ${error.retryAfter}s.` : ''}`;
      case LLMErrorType.QUOTA_EXCEEDED:
        return `Quota exceeded. You have run out of API credits.`;
      case LLMErrorType.INVALID_API_KEY:
        return `Invalid API key. Please check your configuration.`;
      case LLMErrorType.NETWORK_ERROR:
        return `Network error. Unable to connect to the LLM API.`;
      case LLMErrorType.INVALID_REQUEST:
        return `Invalid request. The prompt may be malformed.`;
      case LLMErrorType.SERVER_ERROR:
        return `LLM server error. The API is experiencing issues.`;
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

/**
 * Evaluate a single submission/question/judge combination
 */
async function evaluateSingle(
  submission: StoredSubmission,
  questionId: string,
  judge: Judge,
  runId: string
): Promise<Evaluation> {
  try {
    // Create messages (potentially multimodal with images)
    const { systemMessage, userMessage } = await createEvaluationMessages(
      judge,
      submission,
      questionId
    );

    // Call LLM with timeout and retries
    const response = await callLLM({
      messages: [systemMessage, userMessage],
      temperature: 0.3, // Lower temperature for more consistent evaluations
      maxTokens: 3000,
      timeout: 60000, // 60s timeout per request
      retries: 2, // Retry up to 2 times (3 total attempts)
      retryDelay: 1000, // Start with 1s delay
    });

    // Parse response
    const result = parseEvaluationResponse(response.content);

    // Save to database
    const { data, error } = await supabase
      .from('evaluations')
      .insert({
        submission_id: submission.id,
        question_id: questionId,
        judge_id: judge.id,
        judge_name: judge.name, // Denormalized for history
        verdict: result.verdict,
        reasoning: result.reasoning,
        run_id: runId,
      })
      .select()
      .single();

    if (error) {
      throw createError(`Failed to save evaluation: ${error.message}`, error);
    }

    return data;
  } catch (err) {
    // Get user-friendly error message
    const errorMessage = getErrorMessage(err);

    // Save failed evaluation to database
    await supabase
      .from('evaluations')
      .insert({
        submission_id: submission.id,
        question_id: questionId,
        judge_id: judge.id,
        judge_name: judge.name,
        verdict: 'inconclusive',
        reasoning: `Error during evaluation: ${errorMessage}`,
        run_id: runId,
      })
      .select()
      .single();

    throw err; // Re-throw to mark as failed
  }
}

/**
 * Run evaluations for all submissions in a queue
 */
export async function runEvaluations(
  queueId: string,
  onProgress?: ProgressCallback
): Promise<{ completed: number; failed: number; total: number }> {
  console.log('[Evaluations] Starting evaluations for queue:', queueId);

  // Load submissions
  const submissions = await getQueueSubmissions(queueId);
  console.log('[Evaluations] Loaded submissions:', submissions.length);

  if (submissions.length === 0) {
    throw new Error('No submissions found in queue');
  }

  // Load judge assignments
  const assignments = await listAssignmentsForQueue(queueId);
  console.log(
    '[Evaluations] Loaded assignments:',
    assignments.length,
    assignments
  );

  if (assignments.length === 0) {
    throw new Error(
      'No judges assigned to this queue. Please assign judges before running evaluations.'
    );
  }

  // Load judges
  const allJudges = await listJudges();
  console.log('[Evaluations] Loaded judges:', allJudges.length, allJudges);
  const judgeMap = new Map(allJudges.map((j) => [j.id, j]));

  // Calculate total evaluations and track unassigned questions
  let totalEvaluations = 0;
  const evaluationPlan: Array<{
    submission: StoredSubmission;
    questionId: string;
    judge: Judge;
  }> = [];
  const allQuestionIds = new Set<string>();
  const assignedQuestionIds = new Set<string>();

  // First pass: collect all question IDs
  for (const submission of submissions) {
    submission.questions.forEach((q) => allQuestionIds.add(q.data.id));
  }

  // Second pass: build evaluation plan
  for (const submission of submissions) {
    const questionIds = submission.questions.map((q) => q.data.id);

    for (const questionId of questionIds) {
      // Find judges assigned to this question
      const questionAssignments = assignments.filter(
        (a) => a.question_id === questionId
      );

      if (questionAssignments.length > 0) {
        assignedQuestionIds.add(questionId);
      }

      for (const assignment of questionAssignments) {
        const judge = judgeMap.get(assignment.judge_id);

        if (!judge) {
          console.warn(`Judge ${assignment.judge_id} not found, skipping`);
          continue;
        }

        if (!judge.is_active) {
          console.warn(`Judge ${judge.name} is inactive, skipping`);
          continue;
        }

        evaluationPlan.push({ submission, questionId, judge });
        totalEvaluations++;
      }
    }
  }

  // Check for unassigned questions
  const unassignedQuestions = Array.from(allQuestionIds).filter(
    (id) => !assignedQuestionIds.has(id)
  );

  if (unassignedQuestions.length > 0) {
    const questionList = unassignedQuestions.map((id) => `"${id}"`).join(', ');
    throw new Error(
      `Some questions do not have judges assigned: ${questionList}. Please assign judges to all questions before running evaluations.`
    );
  }

  if (totalEvaluations === 0) {
    throw new Error(
      'No evaluations to run. Check that judges are assigned and active.'
    );
  }

  console.log('[Evaluations] Total evaluations planned:', totalEvaluations);
  console.log('[Evaluations] Evaluation plan:', evaluationPlan);

  // Build judges summary for this run
  const judgeQuestionMap = new Map<string, string[]>();
  for (const plan of evaluationPlan) {
    const existing = judgeQuestionMap.get(plan.judge.id) || [];
    if (!existing.includes(plan.questionId)) {
      existing.push(plan.questionId);
      judgeQuestionMap.set(plan.judge.id, existing);
    }
  }

  const judgesSummary: JudgeSummary[] = Array.from(judgeQuestionMap.entries())
    .map(([judgeId, questionIds]) => {
      const judge = judgeMap.get(judgeId);
      if (!judge) return null;
      return {
        id: judge.id,
        name: judge.name,
        model_name: 'gpt-5-mini',
        question_ids: questionIds,
      };
    })
    .filter((j): j is JudgeSummary => j !== null);

  // Create evaluation run record
  const { data: runData, error: runError } = await supabase
    .from('evaluation_runs')
    .insert({
      queue_id: queueId,
      judges_summary: judgesSummary,
      total_evaluations: 0, // Will update at the end
      pass_count: 0,
      fail_count: 0,
      inconclusive_count: 0,
    })
    .select()
    .single();

  if (runError || !runData) {
    throw createError(
      `Failed to create evaluation run: ${runError?.message}`,
      runError
    );
  }

  const runId = runData.id;
  console.log('[Evaluations] Created run:', runId);

  // Note: We do NOT delete old evaluations - they stay linked to their original run_id
  // This preserves full history for each evaluation run

  // Run evaluations in parallel batches for efficiency
  let completed = 0;
  let failed = 0;
  const BATCH_SIZE = 50; // Run 50 evaluations at a time

  for (let i = 0; i < evaluationPlan.length; i += BATCH_SIZE) {
    const batch = evaluationPlan.slice(i, i + BATCH_SIZE);

    console.log(
      `[Evaluations] Running batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(evaluationPlan.length / BATCH_SIZE)}`
    );

    // Run batch in parallel
    const batchPromises = batch.map(async (plan) => {
      console.log('[Evaluations] Evaluating:', {
        submission: plan.submission.id,
        question: plan.questionId,
        judge: plan.judge.name,
      });

      try {
        await evaluateSingle(
          plan.submission,
          plan.questionId,
          plan.judge,
          runId
        );
        console.log(
          '[Evaluations] ✓ Success:',
          plan.submission.id,
          plan.questionId
        );
        return { success: true, plan };
      } catch (err) {
        console.error('[Evaluations] ✗ Failed:', err);
        console.error('[Evaluations] Failed details:', {
          submission: plan.submission.id,
          question: plan.questionId,
          judge: plan.judge.name,
          error: err instanceof Error ? err.message : String(err),
        });
        return { success: false, plan };
      }
    });

    // Wait for batch to complete
    const results = await Promise.all(batchPromises);

    // Update counts
    results.forEach((result) => {
      if (result.success) {
        completed++;
      } else {
        failed++;
      }
    });

    // Update progress after each batch
    onProgress?.({
      total: totalEvaluations,
      completed,
      failed,
      currentSubmission: batch[batch.length - 1]?.submission.id,
      currentQuestion: batch[batch.length - 1]?.questionId,
    });
  }

  // Final progress update
  onProgress?.({
    total: totalEvaluations,
    completed,
    failed,
  });

  // Update run statistics
  const { data: finalEvaluations } = await supabase
    .from('evaluations')
    .select('verdict')
    .eq('run_id', runId);

  if (finalEvaluations) {
    const passCount = finalEvaluations.filter(
      (e) => e.verdict === 'pass'
    ).length;
    const failCount = finalEvaluations.filter(
      (e) => e.verdict === 'fail'
    ).length;
    const inconclusiveCount = finalEvaluations.filter(
      (e) => e.verdict === 'inconclusive'
    ).length;

    await supabase
      .from('evaluation_runs')
      .update({
        total_evaluations: finalEvaluations.length,
        pass_count: passCount,
        fail_count: failCount,
        inconclusive_count: inconclusiveCount,
      })
      .eq('id', runId);
  }

  console.log('[Evaluations] Run complete:', { runId, completed, failed });

  return { completed, failed, total: totalEvaluations };
}

/**
 * Get all evaluations for a queue
 */
export async function getEvaluationsForQueue(
  queueId: string
): Promise<Evaluation[]> {
  // Get all submissions in queue
  const submissions = await getQueueSubmissions(queueId);
  const submissionIds = submissions.map((s) => s.id);

  if (submissionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .in('submission_id', submissionIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw createError(`Failed to fetch evaluations: ${error.message}`, error);
  }

  return data || [];
}

/**
 * Get evaluation statistics for a queue
 */
export interface EvaluationStats {
  total: number;
  pass: number;
  fail: number;
  inconclusive: number;
  passRate: number;
}

export async function getEvaluationStats(
  queueId: string
): Promise<EvaluationStats> {
  const evaluations = await getEvaluationsForQueue(queueId);

  const pass = evaluations.filter((e) => e.verdict === 'pass').length;
  const fail = evaluations.filter((e) => e.verdict === 'fail').length;
  const inconclusive = evaluations.filter(
    (e) => e.verdict === 'inconclusive'
  ).length;
  const total = evaluations.length;
  const passRate = total > 0 ? (pass / total) * 100 : 0;

  return { total, pass, fail, inconclusive, passRate };
}

/**
 * Get all evaluation runs for a queue
 */
export async function getEvaluationRuns(
  queueId: string
): Promise<EvaluationRun[]> {
  const { data, error } = await supabase
    .from('evaluation_runs')
    .select('*')
    .eq('queue_id', queueId)
    .order('created_at', { ascending: false });

  if (error) {
    throw createError(
      `Failed to fetch evaluation runs: ${error.message}`,
      error
    );
  }

  return data || [];
}

/**
 * Get the latest evaluation run for a queue
 */
export async function getLatestEvaluationRun(
  queueId: string
): Promise<EvaluationRun | null> {
  const { data, error } = await supabase
    .from('evaluation_runs')
    .select('*')
    .eq('queue_id', queueId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw createError(
      `Failed to fetch latest evaluation run: ${error.message}`,
      error
    );
  }

  return data;
}

/**
 * Get evaluations for a specific run
 */
export async function getEvaluationsByRun(
  runId: string
): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: false });

  if (error) {
    throw createError(
      `Failed to fetch evaluations for run: ${error.message}`,
      error
    );
  }

  return data || [];
}

/**
 * Override an AI evaluation verdict with a human decision
 * Tracks disagreements for judge improvement
 */
export async function overrideEvaluation(
  evaluationId: string,
  humanVerdict:
    | 'pass'
    | 'fail'
    | 'bad_data'
    | 'ambiguous_question'
    | 'insufficient_context',
  humanReasoning: string,
  reviewedBy: string
): Promise<void> {
  // First, get the evaluation to check for disagreement
  const { data: evaluation, error: fetchError } = await supabase
    .from('evaluations')
    .select('verdict')
    .eq('id', evaluationId)
    .single();

  if (fetchError || !evaluation) {
    throw createError(
      `Failed to fetch evaluation: ${fetchError?.message}`,
      fetchError
    );
  }

  // Determine if this is a disagreement
  // Disagreement = human verdict differs from AI verdict AND is a pass/fail decision
  // (not a data quality issue like bad_data, ambiguous_question, insufficient_context)
  const isDisagreement =
    humanVerdict !== evaluation.verdict &&
    (humanVerdict === 'pass' || humanVerdict === 'fail');

  // Update the evaluation with human override
  const { error: updateError } = await supabase
    .from('evaluations')
    .update({
      human_verdict: humanVerdict,
      human_reasoning: humanReasoning,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_status: 'completed',
      requires_human_review: false, // Clear the flag since it's now reviewed
      is_disagreement: isDisagreement, // New field to track disagreements
    })
    .eq('id', evaluationId);

  if (updateError) {
    throw createError(
      `Failed to override evaluation: ${updateError.message}`,
      updateError
    );
  }
}
