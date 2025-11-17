/**
 * Service for running AI evaluations
 */

import { supabase } from '../lib/supabase';
import { callLLM } from '../lib/llm';
import { createError } from '../lib/errors';
import type { Evaluation, Judge, StoredSubmission } from '../types';
import { getQueueSubmissions } from './queueService';
import { listAssignmentsForQueue } from './judgeAssignmentService';
import { listJudges } from './judgeService';

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
 * Create a prompt for the judge to evaluate a submission
 */
function createEvaluationPrompt(
  judge: Judge,
  submission: StoredSubmission,
  questionId: string
): { system: string; user: string } {
  const question = submission.questions.find((q) => q.data.id === questionId);
  const answer = submission.answers[questionId];

  if (!question) {
    throw new Error(
      `Question ${questionId} not found in submission ${submission.id}`
    );
  }

  const system = judge.system_prompt;

  const user = `Please evaluate the following submission:

**Question ID:** ${questionId}
**Question Type:** ${question.data.questionType}
**Question Text:** ${question.data.questionText}

**Answer:** ${JSON.stringify(answer, null, 2)}

**Submission Metadata:**
- Submission ID: ${submission.id}
- Queue ID: ${submission.queueId}
- Labeling Task ID: ${submission.labelingTaskId}
- Created At: ${submission.createdAt}

Please provide your evaluation in the following format:

Verdict: [pass/fail/inconclusive]
Reasoning: [Your detailed reasoning here]`;

  return { system, user };
}

/**
 * Evaluate a single submission/question/judge combination
 */
async function evaluateSingle(
  submission: StoredSubmission,
  questionId: string,
  judge: Judge
): Promise<Evaluation> {
  try {
    // Create prompt
    const { system, user } = createEvaluationPrompt(
      judge,
      submission,
      questionId
    );

    // Call LLM (always uses GPT-5-mini)
    const response = await callLLM({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3, // Lower temperature for more consistent evaluations
      maxTokens: 2000,
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
      })
      .select()
      .single();

    if (error) {
      throw createError(`Failed to save evaluation: ${error.message}`, error);
    }

    return data;
  } catch (err) {
    // Save failed evaluation to database
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await supabase
      .from('evaluations')
      .insert({
        submission_id: submission.id,
        question_id: questionId,
        judge_id: judge.id,
        judge_name: judge.name,
        verdict: 'inconclusive',
        reasoning: `Error during evaluation: ${errorMessage}`,
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

  // Calculate total evaluations
  let totalEvaluations = 0;
  const evaluationPlan: Array<{
    submission: StoredSubmission;
    questionId: string;
    judge: Judge;
  }> = [];

  for (const submission of submissions) {
    const questionIds = submission.questions.map((q) => q.data.id);

    for (const questionId of questionIds) {
      // Find judges assigned to this question
      const questionAssignments = assignments.filter(
        (a) => a.question_id === questionId
      );

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

  if (totalEvaluations === 0) {
    throw new Error(
      'No evaluations to run. Check that judges are assigned and active.'
    );
  }

  console.log('[Evaluations] Total evaluations planned:', totalEvaluations);
  console.log('[Evaluations] Evaluation plan:', evaluationPlan);

  // Run evaluations
  let completed = 0;
  let failed = 0;

  for (const plan of evaluationPlan) {
    console.log('[Evaluations] Evaluating:', {
      submission: plan.submission.id,
      question: plan.questionId,
      judge: plan.judge.name,
    });

    onProgress?.({
      total: totalEvaluations,
      completed,
      failed,
      currentSubmission: plan.submission.id,
      currentQuestion: plan.questionId,
    });

    try {
      await evaluateSingle(plan.submission, plan.questionId, plan.judge);
      completed++;
      console.log(
        '[Evaluations] ✓ Success:',
        plan.submission.id,
        plan.questionId
      );
    } catch (err) {
      failed++;
      console.error('[Evaluations] ✗ Failed:', err);
      console.error('[Evaluations] Failed details:', {
        submission: plan.submission.id,
        question: plan.questionId,
        judge: plan.judge.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Final progress update
  onProgress?.({
    total: totalEvaluations,
    completed,
    failed,
  });

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
