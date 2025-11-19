/**
 * Judge Analytics Service
 *
 * Analyzes judge performance by comparing AI verdicts with human reviews.
 * Identifies patterns where humans consistently disagree with AI judges.
 */

import { supabase } from '../lib/supabase';
import type {
  JudgePerformanceMetrics,
  FailurePattern,
  Evaluation,
} from '../types';

/**
 * Disagreement example with full context
 */
export interface DisagreementExample {
  evaluation_id: string;
  question_id: string;
  ai_verdict: string;
  ai_reasoning: string;
  human_verdict: string;
  human_reasoning: string;
  answer: unknown;
  question_text: string;
  reviewed_by: string;
  reviewed_at: string;
}

/**
 * Overall judge statistics
 */
export interface JudgeStats {
  judge_id: string;
  judge_name: string;
  total_evaluations: number;
  human_reviewed_count: number;
  disagreement_count: number;
  disagreement_rate: number;
  ai_pass_rate: number;
  human_pass_rate: number;
  suggestion_count: number;
}

/**
 * Get performance metrics for a specific judge
 */
export async function getJudgePerformanceMetrics(
  judgeId: string,
  timeRange?: { start: Date; end: Date }
): Promise<JudgePerformanceMetrics | null> {
  try {
    // Try to fetch cached metrics first
    const query = supabase
      .from('judge_performance_metrics')
      .select('*')
      .eq('judge_id', judgeId)
      .order('period_end', { ascending: false })
      .limit(1);

    const { data: cached, error: cacheError } = await query;

    if (!cacheError && cached && cached.length > 0) {
      // Check if cache is recent enough (within last hour)
      const cacheAge = Date.now() - new Date(cached[0].computed_at).getTime();
      if (cacheAge < 3600000) {
        // 1 hour
        return cached[0] as JudgePerformanceMetrics;
      }
    }

    // Otherwise, compute fresh metrics
    return await computeJudgeMetrics(judgeId, timeRange);
  } catch (error) {
    console.error('Error fetching judge performance metrics:', error);
    return null;
  }
}

/**
 * Compute judge performance metrics from scratch
 */
export async function computeJudgeMetrics(
  judgeId: string,
  timeRange?: { start: Date; end: Date }
): Promise<JudgePerformanceMetrics | null> {
  try {
    // Fetch all evaluations for this judge
    let query = supabase
      .from('evaluations')
      .select('*')
      .eq('judge_id', judgeId);

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data: evaluations, error } = await query;

    if (error) throw error;
    if (!evaluations || evaluations.length === 0) {
      return null;
    }

    // Compute statistics
    const total = evaluations.length;
    const humanReviewed = evaluations.filter((e) => e.human_verdict).length;
    // Use is_disagreement flag for better performance (only counts pass/fail disagreements, not data quality issues)
    const disagreements = evaluations.filter((e) => e.is_disagreement === true);
    const disagreementCount = disagreements.length;

    // AI pass rate: exclude inconclusives from denominator
    const aiPasses = evaluations.filter((e) => e.verdict === 'pass').length;
    const aiFails = evaluations.filter((e) => e.verdict === 'fail').length;
    const aiDecisive = aiPasses + aiFails; // Only count decisive verdicts (pass/fail)

    // Human pass rate: exclude inconclusives from denominator
    const humanPasses = evaluations.filter(
      (e) => e.human_verdict === 'pass'
    ).length;
    const humanFails = evaluations.filter(
      (e) => e.human_verdict === 'fail'
    ).length;
    const humanDecisive = humanPasses + humanFails;

    const metrics: JudgePerformanceMetrics = {
      id: crypto.randomUUID(),
      judge_id: judgeId,
      period_start: timeRange?.start.toISOString() || new Date(0).toISOString(),
      period_end: timeRange?.end.toISOString() || new Date().toISOString(),
      total_evaluations: total,
      human_reviewed_count: humanReviewed,
      disagreement_count: disagreementCount,
      disagreement_rate:
        humanReviewed > 0 ? disagreementCount / humanReviewed : 0,
      ai_pass_rate: aiDecisive > 0 ? aiPasses / aiDecisive : 0,
      human_pass_rate: humanDecisive > 0 ? humanPasses / humanDecisive : 0,
      failure_patterns: await detectFailurePatterns(disagreements),
      computed_at: new Date().toISOString(),
    };

    // Cache the computed metrics
    await supabase.from('judge_performance_metrics').upsert(
      {
        judge_id: metrics.judge_id,
        period_start: metrics.period_start,
        period_end: metrics.period_end,
        total_evaluations: metrics.total_evaluations,
        human_reviewed_count: metrics.human_reviewed_count,
        disagreement_count: metrics.disagreement_count,
        disagreement_rate: metrics.disagreement_rate,
        ai_pass_rate: metrics.ai_pass_rate,
        human_pass_rate: metrics.human_pass_rate,
        failure_patterns: metrics.failure_patterns,
        computed_at: metrics.computed_at,
      },
      { onConflict: 'judge_id,period_start,period_end' }
    );

    return metrics;
  } catch (error) {
    console.error('Error computing judge metrics:', error);
    return null;
  }
}

/**
 * Detect common failure patterns where humans disagree with AI
 */
async function detectFailurePatterns(
  disagreements: Evaluation[]
): Promise<FailurePattern[]> {
  const patterns: FailurePattern[] = [];

  // Fetch submission data for disagreements
  const submissionIds = [...new Set(disagreements.map((d) => d.submission_id))];

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .in('id', submissionIds);

  if (error || !submissions) {
    console.error('Error fetching submissions:', error);
    return patterns;
  }

  // Build a map for quick lookup
  const submissionMap = new Map(submissions.map((s) => [s.id, s]));

  // Analyze patterns
  const shortAnswers: Evaluation[] = [];
  const spellingErrors: Evaluation[] = [];
  const incompleteResponses: Evaluation[] = [];

  for (const evaluation of disagreements) {
    const submission = submissionMap.get(evaluation.submission_id);
    if (!submission) continue;

    const answer = submission.answers[evaluation.question_id];
    const answerText =
      typeof answer === 'string'
        ? answer
        : answer?.text || answer?.reasoning || '';

    // Pattern 1: Short answers
    if (answerText.length < 50) {
      shortAnswers.push(evaluation);
    }

    // Pattern 2: Spelling/typo errors (basic heuristic)
    if (/\b\w*[a-z]{2,}\w*\b/i.test(answerText) && answerText.length > 0) {
      // This is a simple check - could be enhanced
      if (
        evaluation.reasoning?.toLowerCase().includes('spelling') ||
        evaluation.reasoning?.toLowerCase().includes('typo') ||
        evaluation.reasoning?.toLowerCase().includes('error')
      ) {
        spellingErrors.push(evaluation);
      }
    }

    // Pattern 3: Incomplete responses (AI says incomplete, human passes)
    if (
      evaluation.verdict === 'fail' &&
      evaluation.human_verdict === 'pass' &&
      evaluation.reasoning?.toLowerCase().includes('incomplete')
    ) {
      incompleteResponses.push(evaluation);
    }
  }

  // Add patterns with significant occurrences
  if (shortAnswers.length >= 1) {
    const aiPasses = shortAnswers.filter((e) => e.verdict === 'pass').length;
    const humanPasses = shortAnswers.filter(
      (e) => e.human_verdict === 'pass'
    ).length;

    patterns.push({
      pattern_type: 'short_answers',
      description: 'Short answers (less than 50 characters)',
      count: shortAnswers.length,
      examples: shortAnswers.slice(0, 5).map((e) => e.id),
      ai_pass_rate: aiPasses / shortAnswers.length,
      human_pass_rate: humanPasses / shortAnswers.length,
    });
  }

  if (spellingErrors.length >= 1) {
    const aiPasses = spellingErrors.filter((e) => e.verdict === 'pass').length;
    const humanPasses = spellingErrors.filter(
      (e) => e.human_verdict === 'pass'
    ).length;

    patterns.push({
      pattern_type: 'spelling_errors',
      description: 'Answers with spelling or typo errors',
      count: spellingErrors.length,
      examples: spellingErrors.slice(0, 5).map((e) => e.id),
      ai_pass_rate: aiPasses / spellingErrors.length,
      human_pass_rate: humanPasses / spellingErrors.length,
    });
  }

  if (incompleteResponses.length >= 1) {
    const aiPasses = incompleteResponses.filter(
      (e) => e.verdict === 'pass'
    ).length;
    const humanPasses = incompleteResponses.filter(
      (e) => e.human_verdict === 'pass'
    ).length;

    patterns.push({
      pattern_type: 'incomplete_responses',
      description: 'AI marked as incomplete but humans accepted',
      count: incompleteResponses.length,
      examples: incompleteResponses.slice(0, 5).map((e) => e.id),
      ai_pass_rate: aiPasses / incompleteResponses.length,
      human_pass_rate: humanPasses / incompleteResponses.length,
    });
  }

  return patterns;
}

/**
 * Get disagreement examples with full context
 */
export async function getDisagreementExamples(
  judgeId: string,
  limit: number = 10
): Promise<DisagreementExample[]> {
  try {
    // Fetch evaluations where human verdict differs from AI
    const { data: evaluations, error: evalError } = await supabase
      .from('evaluations')
      .select('*')
      .eq('judge_id', judgeId)
      .not('human_verdict', 'is', null)
      .neq('human_verdict', 'verdict')
      .order('reviewed_at', { ascending: false })
      .limit(limit);

    if (evalError) throw evalError;
    if (!evaluations || evaluations.length === 0) return [];

    // Fetch related submissions
    const submissionIds = [...new Set(evaluations.map((e) => e.submission_id))];
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('*')
      .in('id', submissionIds);

    if (subError) throw subError;
    if (!submissions) return [];

    const submissionMap = new Map(submissions.map((s) => [s.id, s]));

    // Build examples
    const examples: DisagreementExample[] = evaluations.map((evaluation) => {
      const submission = submissionMap.get(evaluation.submission_id);
      const question = submission?.questions.find(
        (q: any) => q.data.id === evaluation.question_id
      );

      return {
        evaluation_id: evaluation.id,
        question_id: evaluation.question_id,
        ai_verdict: evaluation.verdict,
        ai_reasoning: evaluation.reasoning,
        human_verdict: evaluation.human_verdict || '',
        human_reasoning: evaluation.human_reasoning || '',
        answer: submission?.answers[evaluation.question_id],
        question_text: question?.data?.questionText || '',
        reviewed_by: evaluation.reviewed_by || '',
        reviewed_at: evaluation.reviewed_at || '',
      };
    });

    return examples;
  } catch (error) {
    console.error('Error fetching disagreement examples:', error);
    return [];
  }
}

/**
 * Get statistics for all judges
 */
export async function getAllJudgesStats(): Promise<JudgeStats[]> {
  try {
    // Fetch all judges
    const { data: judges, error: judgeError } = await supabase
      .from('judges')
      .select('*')
      .eq('is_active', true);

    if (judgeError) throw judgeError;
    if (!judges) return [];

    // Fetch all evaluations
    const { data: evaluations, error: evalError } = await supabase
      .from('evaluations')
      .select('*');

    if (evalError) throw evalError;
    if (!evaluations) return [];

    // Fetch suggestion counts
    const { data: suggestions } = await supabase
      .from('rubric_suggestions')
      .select('judge_id, status')
      .eq('status', 'pending');

    const suggestionCounts = new Map<string, number>();
    if (suggestions) {
      for (const s of suggestions) {
        suggestionCounts.set(
          s.judge_id,
          (suggestionCounts.get(s.judge_id) || 0) + 1
        );
      }
    }

    // Compute stats for each judge
    const stats: JudgeStats[] = judges.map((judge) => {
      const judgeEvals = evaluations.filter((e) => e.judge_id === judge.id);
      const total = judgeEvals.length;
      const humanReviewed = judgeEvals.filter((e) => e.human_verdict).length;
      const disagreements = judgeEvals.filter(
        (e) => e.human_verdict && e.human_verdict !== e.verdict
      ).length;

      // AI pass rate: exclude inconclusives from denominator
      const aiPasses = judgeEvals.filter((e) => e.verdict === 'pass').length;
      const aiFails = judgeEvals.filter((e) => e.verdict === 'fail').length;
      const aiDecisive = aiPasses + aiFails;

      // Human pass rate: exclude inconclusives from denominator
      const humanPasses = judgeEvals.filter(
        (e) => e.human_verdict === 'pass'
      ).length;
      const humanFails = judgeEvals.filter(
        (e) => e.human_verdict === 'fail'
      ).length;
      const humanDecisive = humanPasses + humanFails;

      return {
        judge_id: judge.id,
        judge_name: judge.name,
        total_evaluations: total,
        human_reviewed_count: humanReviewed,
        disagreement_count: disagreements,
        disagreement_rate:
          humanReviewed > 0 ? disagreements / humanReviewed : 0,
        ai_pass_rate: aiDecisive > 0 ? aiPasses / aiDecisive : 0,
        human_pass_rate: humanDecisive > 0 ? humanPasses / humanDecisive : 0,
        suggestion_count: suggestionCounts.get(judge.id) || 0,
      };
    });

    // Sort by disagreement rate (highest first)
    return stats.sort((a, b) => b.disagreement_rate - a.disagreement_rate);
  } catch (error) {
    console.error('Error fetching all judges stats:', error);
    return [];
  }
}

/**
 * Refresh metrics for a judge (force recomputation)
 */
export async function refreshJudgeMetrics(
  judgeId: string
): Promise<JudgePerformanceMetrics | null> {
  return await computeJudgeMetrics(judgeId);
}

/**
 * Pass rate data point for charting
 */
export interface PassRateDataPoint {
  date: string; // ISO date string (YYYY-MM-DD) or formatted timestamp
  queue_id: string; // Queue identifier
  timestamp: number; // Unix timestamp for sorting
  ai_pass_rate: number; // 0-1
  human_pass_rate: number; // 0-1
  total_evaluations: number;
  human_reviewed_count: number;
}

/**
 * Get pass rate data grouped by evaluation run for a specific judge
 * Each point represents a separate evaluation run, allowing tracking of changes over time
 */
export async function getJudgePassRateByDate(
  judgeId: string
): Promise<PassRateDataPoint[]> {
  try {
    // Fetch all evaluations for this judge with submission data to get queue_id
    const { data: evaluations, error } = await supabase
      .from('evaluations')
      .select(
        `
        *,
        submissions!inner(queue_id)
      `
      )
      .eq('judge_id', judgeId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!evaluations || evaluations.length === 0) return [];

    // Group by run_id (or created_at if no run_id) to track each evaluation session
    const runMap = new Map<
      string,
      { evals: any[]; timestamp: number; queueId: string }
    >();

    for (const evaluation of evaluations as any[]) {
      const queueId = evaluation.submissions?.queue_id;
      const evalCreatedAt = evaluation.created_at;
      const runId = evaluation.run_id || evalCreatedAt; // Fallback to created_at if no run_id

      if (!runId) continue;

      if (!runMap.has(runId)) {
        // Append 'Z' to treat as UTC (Supabase doesn't include it)
        const utcString = evalCreatedAt.endsWith('Z')
          ? evalCreatedAt
          : `${evalCreatedAt}Z`;
        runMap.set(runId, {
          evals: [],
          timestamp: new Date(utcString).getTime(),
          queueId: queueId || 'unknown',
        });
      }

      const runData = runMap.get(runId)!;
      runData.evals.push(evaluation);

      // Track earliest timestamp for this run
      const utcString = evalCreatedAt.endsWith('Z')
        ? evalCreatedAt
        : `${evalCreatedAt}Z`;
      const timestamp = new Date(utcString).getTime();
      runData.timestamp = Math.min(runData.timestamp, timestamp);
    }

    // Calculate pass rates for each evaluation run
    const dataPoints: PassRateDataPoint[] = [];

    for (const [, { evals, timestamp, queueId }] of runMap.entries()) {
      const total = evals.length;

      // AI pass rate: exclude inconclusives from denominator
      const aiPasses = evals.filter((e) => e.verdict === 'pass').length;
      const aiFails = evals.filter((e) => e.verdict === 'fail').length;
      const aiDecisive = aiPasses + aiFails;

      // Human pass rate: exclude inconclusives from denominator
      const humanReviewed = evals.filter((e) => e.human_verdict).length;
      const humanPasses = evals.filter(
        (e) => e.human_verdict === 'pass'
      ).length;
      const humanFails = evals.filter((e) => e.human_verdict === 'fail').length;
      const humanDecisive = humanPasses + humanFails;

      // Format date as readable string (e.g., "Jan 15, 3:30 PM")
      const dateObj = new Date(timestamp);
      const formattedDate = dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      dataPoints.push({
        date: formattedDate,
        queue_id: queueId, // Track which queue was evaluated
        timestamp,
        ai_pass_rate: aiDecisive > 0 ? aiPasses / aiDecisive : 0,
        human_pass_rate: humanDecisive > 0 ? humanPasses / humanDecisive : 0,
        total_evaluations: total,
        human_reviewed_count: humanReviewed,
      });
    }

    return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error fetching pass rate by date:', error);
    return [];
  }
}
