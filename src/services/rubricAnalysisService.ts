/**
 * Rubric Analysis Service
 *
 * Analyzes human review reasoning to automatically generate suggestions
 * for improving judge rubrics and system prompts.
 */

import { supabase } from '../lib/supabase';
import type { RubricSuggestion } from '../types';
import { callLLM } from '../lib/llm';

/**
 * Common phrase found in human reasoning
 */
interface ReasoningPhrase {
  phrase: string;
  count: number;
  evaluationIds: string[];
}

/**
 * LLM-generated suggestion analysis
 */
interface LLMSuggestionAnalysis {
  suggestion_type: string;
  suggestion_text: string;
  confidence_score: number;
}

/**
 * Analyze human reasoning patterns for a judge
 */
export async function analyzeHumanReasoning(
  judgeId: string
): Promise<ReasoningPhrase[]> {
  try {
    // Fetch all evaluations with human reviews for this judge
    const { data: evaluations, error } = await supabase
      .from('evaluations')
      .select('id, human_reasoning, human_verdict, verdict')
      .eq('judge_id', judgeId)
      .not('human_verdict', 'is', null)
      .neq('human_verdict', 'verdict'); // Only disagreements

    if (error) throw error;

    console.log(
      '[analyzeHumanReasoning] Found evaluations:',
      evaluations?.length || 0
    );

    if (!evaluations || evaluations.length === 0) {
      console.log('[analyzeHumanReasoning] No disagreements found');
      return [];
    }

    console.log(
      '[analyzeHumanReasoning] Sample human reasoning:',
      evaluations[0]?.human_reasoning
    );

    // Extract key phrases from reasoning text
    const phrases = new Map<string, { count: number; evalIds: string[] }>();

    for (const evaluation of evaluations) {
      if (!evaluation.human_reasoning) continue;

      // Extract meaningful phrases (simple NLP)
      const text = evaluation.human_reasoning.toLowerCase();
      const patterns = [
        /\b(partial credit)\b/g,
        /\b(shows? understanding)\b/g,
        /\b(demonstrates? (correct )?reasoning)\b/g,
        /\b(minor (errors?|typos?|mistakes?))\b/g,
        /\b(spelling errors?)\b/g,
        /\b(too (strict|harsh|rigid))\b/g,
        /\b(effort shown?)\b/g,
        /\b(conceptual understanding)\b/g,
        /\b(technically correct)\b/g,
        /\b(good enough)\b/g,
        /\b(acceptable (for|answer))\b/g,
        /\b(reasonable (interpretation|answer))\b/g,
        /\b(context clues?)\b/g,
        /\b(partially correct)\b/g,
        /\b(mostly correct)\b/g,
      ];

      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            const normalized = match.trim();
            const existing = phrases.get(normalized) || {
              count: 0,
              evalIds: [],
            };
            existing.count += 1;
            if (!existing.evalIds.includes(evaluation.id)) {
              existing.evalIds.push(evaluation.id);
            }
            phrases.set(normalized, existing);
          }
        }
      }
    }

    // Convert to array and sort by frequency
    const results: ReasoningPhrase[] = Array.from(phrases.entries())
      .map(([phrase, data]) => ({
        phrase,
        count: data.count,
        evaluationIds: data.evalIds,
      }))
      .sort((a, b) => b.count - a.count);

    return results;
  } catch (error) {
    console.error('Error analyzing human reasoning:', error);
    return [];
  }
}

/**
 * Generate rubric improvement suggestions based on human review patterns
 */
export async function generateSuggestions(
  judgeId: string
): Promise<RubricSuggestion[]> {
  try {
    console.log('[generateSuggestions] Starting for judge:', judgeId);

    // Analyze human reasoning patterns
    const phrases = await analyzeHumanReasoning(judgeId);
    console.log('[generateSuggestions] Found phrases:', phrases.length);

    // Fetch current judge prompt to avoid duplicate suggestions
    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select('system_prompt')
      .eq('id', judgeId)
      .single();

    if (judgeError) throw judgeError;
    const currentPrompt = judge?.system_prompt?.toLowerCase() || '';
    console.log(
      '[generateSuggestions] Judge prompt length:',
      currentPrompt.length
    );

    const suggestions: Omit<
      RubricSuggestion,
      'id' | 'created_at' | 'applied_at' | 'dismissed_at'
    >[] = [];

    // Rule 1: Partial credit / shows understanding
    const partialCreditPhrases = phrases.filter(
      (p) =>
        p.phrase.includes('partial') ||
        p.phrase.includes('understanding') ||
        p.phrase.includes('reasoning')
    );
    const partialCreditCount = partialCreditPhrases.reduce(
      (sum, p) => sum + p.count,
      0
    );

    if (
      partialCreditCount >= 1 &&
      !currentPrompt.includes('partial') &&
      !currentPrompt.includes('understanding')
    ) {
      const allExamples = partialCreditPhrases.flatMap((p) => p.evaluationIds);
      suggestions.push({
        judge_id: judgeId,
        suggestion_type: 'partial_credit',
        suggestion_text: `Award PASS when the answer demonstrates correct reasoning or shows clear understanding, even if the execution is imperfect. Humans frequently cite "shows understanding" and "correct reasoning" when overturning your FAIL verdicts.\n\nConsider adding to your rubric:\n"Award PASS when the answer demonstrates conceptual understanding, even with minor errors, typos, or brevity. Focus on the correctness of the reasoning rather than perfect execution."`,
        evidence_examples: allExamples.slice(0, 10),
        evidence_count: partialCreditCount,
        confidence_score: Math.min(partialCreditCount / 20, 1.0),
        status: 'pending',
      });
    }

    // Rule 2: Minor errors / spelling / typos
    const errorTolerancePhrases = phrases.filter(
      (p) =>
        p.phrase.includes('minor') ||
        p.phrase.includes('spelling') ||
        p.phrase.includes('typo')
    );
    const errorToleranceCount = errorTolerancePhrases.reduce(
      (sum, p) => sum + p.count,
      0
    );

    if (
      errorToleranceCount >= 1 &&
      !currentPrompt.includes('minor error') &&
      !currentPrompt.includes('spelling')
    ) {
      const allExamples = errorTolerancePhrases.flatMap((p) => p.evaluationIds);
      suggestions.push({
        judge_id: judgeId,
        suggestion_type: 'error_tolerance',
        suggestion_text: `Be more lenient with minor errors, spelling mistakes, and typos. Humans frequently override your FAIL verdicts citing "minor errors" or "spelling mistakes" that don't affect the correctness of the answer.\n\nConsider adding to your rubric:\n"Ignore minor spelling errors, typos, and grammatical mistakes when the intended meaning is clear and the answer is substantively correct."`,
        evidence_examples: allExamples.slice(0, 10),
        evidence_count: errorToleranceCount,
        confidence_score: Math.min(errorToleranceCount / 15, 1.0),
        status: 'pending',
      });
    }

    // Rule 3: Too strict / harsh
    const strictnessPhrases = phrases.filter(
      (p) =>
        p.phrase.includes('strict') ||
        p.phrase.includes('harsh') ||
        p.phrase.includes('rigid')
    );
    const strictnessCount = strictnessPhrases.reduce(
      (sum, p) => sum + p.count,
      0
    );

    if (strictnessCount >= 1) {
      const allExamples = strictnessPhrases.flatMap((p) => p.evaluationIds);
      suggestions.push({
        judge_id: judgeId,
        suggestion_type: 'strictness',
        suggestion_text: `Your evaluation criteria may be too strict. Humans frequently cite "too strict" or "too harsh" when overturning your verdicts.\n\nConsider adding to your rubric:\n"Apply a reasonable standard. Award PASS when the answer would be acceptable in a real-world annotation task, even if not perfect."`,
        evidence_examples: allExamples.slice(0, 10),
        evidence_count: strictnessCount,
        confidence_score: Math.min(strictnessCount / 10, 1.0),
        status: 'pending',
      });
    }

    // Rule 4: Short but correct answers
    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('id, submission_id, question_id, verdict, human_verdict')
      .eq('judge_id', judgeId)
      .eq('verdict', 'fail')
      .eq('human_verdict', 'pass');

    if (evaluations && evaluations.length >= 5) {
      // Check if short answers are a pattern
      const submissionIds = [
        ...new Set(evaluations.map((e) => e.submission_id)),
      ];
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, answers')
        .in('id', submissionIds);

      if (submissions) {
        const shortAnswerEvals = evaluations.filter((evaluation) => {
          const submission = submissions.find(
            (s) => s.id === evaluation.submission_id
          );
          if (!submission) return false;

          const answer = submission.answers[evaluation.question_id];
          const answerText =
            typeof answer === 'string'
              ? answer
              : answer?.text || answer?.reasoning || '';

          return answerText.length < 50;
        });

        if (shortAnswerEvals.length >= 1) {
          suggestions.push({
            judge_id: judgeId,
            suggestion_type: 'answer_length',
            suggestion_text: `You may be penalizing short but correct answers. Humans pass many brief answers that you fail.\n\nConsider adding to your rubric:\n"Do not penalize brevity. Award PASS for concise answers that correctly address the question, even if short."`,
            evidence_examples: shortAnswerEvals.slice(0, 10).map((e) => e.id),
            evidence_count: shortAnswerEvals.length,
            confidence_score: Math.min(shortAnswerEvals.length / 20, 1.0),
            status: 'pending',
          });
        }
      }
    }

    // If no specific patterns found, use LLM to analyze disagreements
    if (suggestions.length === 0) {
      console.log(
        '[generateSuggestions] No pattern-based suggestions, using LLM to analyze disagreements...'
      );

      const llmSuggestion = await analyzeDisagreementsWithLLM(
        judgeId,
        judge.system_prompt
      );

      if (llmSuggestion) {
        console.log('[generateSuggestions] LLM generated suggestion');
        suggestions.push({
          judge_id: judgeId,
          suggestion_type: llmSuggestion.suggestion_type,
          suggestion_text: llmSuggestion.suggestion_text,
          evidence_examples: [], // LLM provides general analysis, not specific examples
          evidence_count: 1,
          confidence_score: llmSuggestion.confidence_score,
          status: 'pending',
        });
      }
    }

    // Insert suggestions into database
    console.log(
      '[generateSuggestions] Generated suggestions:',
      suggestions.length
    );

    if (suggestions.length === 0) {
      console.log('[generateSuggestions] No suggestions to insert');
      return [];
    }

    // Delete old pending suggestions for this judge before inserting new ones
    console.log('[generateSuggestions] Deleting old pending suggestions...');
    const { error: deleteError } = await supabase
      .from('rubric_suggestions')
      .delete()
      .eq('judge_id', judgeId)
      .eq('status', 'pending');

    if (deleteError) {
      console.error('[generateSuggestions] Delete error:', deleteError);
      throw deleteError;
    }

    console.log(
      '[generateSuggestions] Inserting new suggestions into database...'
    );
    const { data: inserted, error: insertError } = await supabase
      .from('rubric_suggestions')
      .insert(suggestions)
      .select();

    if (insertError) {
      console.error('[generateSuggestions] Insert error:', insertError);
      throw insertError;
    }

    console.log(
      '[generateSuggestions] Successfully inserted:',
      inserted?.length || 0
    );
    return (inserted || []) as RubricSuggestion[];
  } catch (error) {
    console.error('[generateSuggestions] Error:', error);
    throw error;
  }
}

/**
 * Get all suggestions for a judge
 */
export async function getSuggestions(
  judgeId: string,
  status?: 'pending' | 'applied' | 'dismissed'
): Promise<RubricSuggestion[]> {
  try {
    let query = supabase
      .from('rubric_suggestions')
      .select('*')
      .eq('judge_id', judgeId)
      .order('confidence_score', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as RubricSuggestion[];
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

/**
 * Mark a suggestion as applied
 */
export async function applySuggestion(
  suggestionId: string
): Promise<RubricSuggestion | null> {
  try {
    const { data, error } = await supabase
      .from('rubric_suggestions')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) throw error;
    return data as RubricSuggestion;
  } catch (error) {
    console.error('Error applying suggestion:', error);
    return null;
  }
}

/**
 * Dismiss a suggestion
 */
export async function dismissSuggestion(
  suggestionId: string
): Promise<RubricSuggestion | null> {
  try {
    const { data, error } = await supabase
      .from('rubric_suggestions')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) throw error;
    return data as RubricSuggestion;
  } catch (error) {
    console.error('Error dismissing suggestion:', error);
    return null;
  }
}

/**
 * Get example evaluations for a suggestion
 */
export async function getSuggestionExamples(
  suggestionId: string,
  limit: number = 5
): Promise<any[]> {
  try {
    // Fetch the suggestion
    const { data: suggestion, error: suggError } = await supabase
      .from('rubric_suggestions')
      .select('evidence_examples')
      .eq('id', suggestionId)
      .single();

    if (suggError) throw suggError;
    if (!suggestion?.evidence_examples) return [];

    const exampleIds = (suggestion.evidence_examples as string[]).slice(
      0,
      limit
    );

    // Fetch evaluations
    const { data: evaluations, error: evalError } = await supabase
      .from('evaluations')
      .select('*')
      .in('id', exampleIds);

    if (evalError) throw evalError;
    if (!evaluations) return [];

    // Fetch submissions for context
    const submissionIds = [...new Set(evaluations.map((e) => e.submission_id))];
    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('*')
      .in('id', submissionIds);

    if (subError) throw subError;
    if (!submissions) return evaluations;

    const submissionMap = new Map(submissions.map((s) => [s.id, s]));

    // Enrich evaluations with submission context
    return evaluations.map((evaluation) => {
      const submission = submissionMap.get(evaluation.submission_id);
      const question = submission?.questions.find(
        (q: any) => q.data.id === evaluation.question_id
      );

      return {
        ...evaluation,
        answer: submission?.answers[evaluation.question_id],
        question_text: question?.data?.questionText || '',
      };
    });
  } catch (error) {
    console.error('Error fetching suggestion examples:', error);
    return [];
  }
}

/**
 * Use LLM to analyze disagreements and generate custom suggestions
 */
async function analyzeDisagreementsWithLLM(
  judgeId: string,
  currentPrompt: string
): Promise<LLMSuggestionAnalysis | null> {
  try {
    console.log('[LLM] Analyzing disagreements for judge:', judgeId);

    // Fetch disagreement examples with full context
    const { data: evaluations } = await supabase
      .from('evaluations')
      .select(
        'id, verdict, reasoning, human_verdict, human_reasoning, question_id, submission_id'
      )
      .eq('judge_id', judgeId)
      .not('human_verdict', 'is', null)
      .neq('human_verdict', 'verdict')
      .limit(10);

    if (!evaluations || evaluations.length === 0) {
      console.log('[LLM] No disagreements found');
      return null;
    }

    console.log('[LLM] Found', evaluations.length, 'disagreements');

    // Fetch submissions for context
    const submissionIds = [...new Set(evaluations.map((e) => e.submission_id))];
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, questions, answers')
      .in('id', submissionIds);

    if (!submissions) return null;

    const submissionMap = new Map(submissions.map((s) => [s.id, s]));

    // Build disagreement examples for LLM (use 3 examples to save tokens)
    const disagreementExamples = evaluations
      .slice(0, 3)
      .map((ev, index) => {
        const submission = submissionMap.get(ev.submission_id);
        const question = submission?.questions.find(
          (q: any) => q.data.id === ev.question_id
        );
        const answer = submission?.answers[ev.question_id];

        return `
Example ${index + 1}:
Question: ${question?.data?.questionText || 'N/A'}
Human Answer: ${JSON.stringify(answer)}

AI Judge Verdict: ${ev.verdict.toUpperCase()}
AI Judge Reasoning: ${ev.reasoning}

Human Reviewer Verdict: ${ev.human_verdict?.toUpperCase()}
Human Reviewer Reasoning: ${ev.human_reasoning || 'N/A'}
---`;
      })
      .join('\n');

    console.log(
      '[LLM] Calling LLM with',
      evaluations.slice(0, 3).length,
      'examples'
    );

    // Call LLM to analyze
    const response = await callLLM({
      messages: [
        {
          role: 'system',
          content:
            "You are an expert at analyzing AI judge performance and suggesting prompt improvements. Analyze disagreements between AI verdicts and human reviews to suggest specific, actionable improvements to the AI judge's system prompt.",
        },
        {
          role: 'user',
          content: `I have an AI judge with the following system prompt:

---
${currentPrompt}
---

This judge is making evaluations, but humans are disagreeing with the AI's verdicts in several cases. Here are the disagreement examples:

${disagreementExamples}

Based on these disagreements, analyze the pattern and suggest a SPECIFIC improvement to the judge's system prompt. The human reviewer's verdict and reasoning should be considered correct - prioritize what humans say.

Respond in valid JSON format:
{
  "suggestion_type": "a short label like 'strictness_adjustment' or 'criteria_clarification'",
  "suggestion_text": "A detailed, specific suggestion for improving the prompt. Include the exact text to add to the rubric in quotes.",
  "confidence_score": 0.7
}

Only output valid JSON, nothing else.`,
        },
      ],
      temperature: 0.3,
      maxTokens: 2000,
      timeout: 120000, // 2 minutes timeout for complex analysis
    });

    console.log('[LLM] Raw response:', response.content);

    // Check if response is empty
    if (!response.content || response.content.trim().length === 0) {
      console.error('[LLM] Empty response from LLM');
      return null;
    }

    // Try to parse JSON response
    let parsed;
    try {
      // Sometimes LLM wraps JSON in markdown code blocks
      let jsonText = response.content.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[LLM] Failed to parse JSON:', parseError);
      console.error('[LLM] Response was:', response.content);

      // Fallback: create a generic suggestion from the text response
      return {
        suggestion_type: 'llm_analysis',
        suggestion_text: response.content || 'Failed to generate suggestion',
        confidence_score: 0.5,
      };
    }

    return {
      suggestion_type: parsed.suggestion_type || 'llm_analysis',
      suggestion_text:
        parsed.suggestion_text || parsed.suggestion || 'No suggestion provided',
      confidence_score: parsed.confidence_score || 0.7,
    };
  } catch (error) {
    console.error('[analyzeDisagreementsWithLLM] Error:', error);
    return null;
  }
}
