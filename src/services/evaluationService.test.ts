/**
 * Tests for evaluation service error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runEvaluations } from './evaluationService';
import * as llm from '../lib/llm';
import * as queueService from './queueService';
import * as judgeService from './judgeService';
import * as judgeAssignmentService from './judgeAssignmentService';
import type { StoredSubmission, Judge, JudgeAssignment } from '../types';

// Mock Supabase with chainable methods
vi.mock('../lib/supabase', () => {
  const createMockChain = () => {
    const chain: any = {
      from: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      select: vi.fn(() => chain),
      single: vi.fn(() => ({
        data: { id: 'run-1', verdict: 'pass', reasoning: 'test' },
        error: null,
      })),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
    };
    return chain;
  };

  return {
    supabase: createMockChain(),
  };
});

describe('Evaluation Service - Error Handling', () => {
  const mockSubmission: StoredSubmission = {
    id: 'sub-1',
    queueId: 'queue-1',
    labelingTaskId: 'task-1',
    createdAt: Date.now(),
    uploaded_at: new Date().toISOString(),
    questions: [
      {
        rev: 1,
        data: {
          id: 'q1',
          questionType: 'single_choice',
          questionText: 'Is the sky blue?',
        },
      },
    ],
    answers: {
      q1: { choice: 'yes' },
    },
  };

  const mockJudge: Judge = {
    id: 'judge-1',
    name: 'Test Judge',
    system_prompt: 'You are a judge',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAssignment: JudgeAssignment = {
    id: 'assign-1',
    queue_id: 'queue-1',
    question_id: 'q1',
    judge_id: 'judge-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock service calls
    vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue([
      mockSubmission,
    ]);
    vi.spyOn(
      judgeAssignmentService,
      'listAssignmentsForQueue'
    ).mockResolvedValue([mockAssignment]);
    vi.spyOn(judgeService, 'listJudges').mockResolvedValue([mockJudge]);
  });

  describe('Timeout handling', () => {
    it('should handle LLM timeout errors gracefully', async () => {
      const timeoutError = new llm.LLMError(
        'Request timed out after 30000ms',
        llm.LLMErrorType.TIMEOUT
      );

      vi.spyOn(llm, 'callLLM').mockRejectedValue(timeoutError);

      const result = await runEvaluations('queue-1');

      expect(result.failed).toBe(1);
      expect(result.completed).toBe(0);
      expect(result.total).toBe(1);
    });

    it('should continue processing other evaluations after timeout', async () => {
      // Create multiple submissions
      const submissions = [
        { ...mockSubmission, id: 'sub-1' },
        { ...mockSubmission, id: 'sub-2' },
        { ...mockSubmission, id: 'sub-3' },
      ];

      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue(
        submissions
      );

      // First call times out, rest succeed
      vi.spyOn(llm, 'callLLM')
        .mockRejectedValueOnce(
          new llm.LLMError('Request timed out', llm.LLMErrorType.TIMEOUT)
        )
        .mockResolvedValue({
          content: 'Verdict: pass\nReasoning: Good',
          model: 'gpt-5-mini',
        });

      const result = await runEvaluations('queue-1');

      expect(result.failed).toBe(1);
      expect(result.completed).toBe(2);
      expect(result.total).toBe(3);
    });
  });

  describe('Quota error handling', () => {
    it('should handle quota exceeded errors', async () => {
      const quotaError = new llm.LLMError(
        'You have exceeded your quota',
        llm.LLMErrorType.QUOTA_EXCEEDED,
        429
      );

      vi.spyOn(llm, 'callLLM').mockRejectedValue(quotaError);

      const result = await runEvaluations('queue-1');

      expect(result.failed).toBe(1);
      expect(result.completed).toBe(0);
      expect(result.total).toBe(1);
    });

    it('should stop processing after quota errors', async () => {
      const submissions = [
        { ...mockSubmission, id: 'sub-1' },
        { ...mockSubmission, id: 'sub-2' },
      ];

      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue(
        submissions
      );

      const quotaError = new llm.LLMError(
        'Quota exceeded',
        llm.LLMErrorType.QUOTA_EXCEEDED,
        429
      );

      vi.spyOn(llm, 'callLLM').mockRejectedValue(quotaError);

      const result = await runEvaluations('queue-1');

      // Both should fail with quota error
      expect(result.failed).toBe(2);
      expect(result.completed).toBe(0);
    });
  });

  describe('Rate limit handling', () => {
    it('should handle rate limit errors', async () => {
      const rateLimitError = new llm.LLMError(
        'Rate limit exceeded',
        llm.LLMErrorType.RATE_LIMIT,
        429,
        5 // retry after 5 seconds
      );

      vi.spyOn(llm, 'callLLM').mockRejectedValue(rateLimitError);

      const result = await runEvaluations('queue-1');

      expect(result.failed).toBe(1);
      expect(result.completed).toBe(0);
    });
  });

  describe('Network error handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new llm.LLMError(
        'Network error: Failed to fetch',
        llm.LLMErrorType.NETWORK_ERROR
      );

      vi.spyOn(llm, 'callLLM').mockRejectedValue(networkError);

      const result = await runEvaluations('queue-1');

      expect(result.failed).toBe(1);
      expect(result.completed).toBe(0);
    });
  });

  describe('Invalid API key handling', () => {
    it('should handle invalid API key errors', async () => {
      const apiKeyError = new llm.LLMError(
        'Invalid API key',
        llm.LLMErrorType.INVALID_API_KEY,
        401
      );

      vi.spyOn(llm, 'callLLM').mockRejectedValue(apiKeyError);

      const result = await runEvaluations('queue-1');

      expect(result.failed).toBe(1);
      expect(result.completed).toBe(0);
    });
  });

  describe('Server error handling', () => {
    it('should handle server errors', async () => {
      const serverError = new llm.LLMError(
        'Internal server error',
        llm.LLMErrorType.SERVER_ERROR,
        500
      );

      vi.spyOn(llm, 'callLLM').mockRejectedValue(serverError);

      const result = await runEvaluations('queue-1');

      expect(result.failed).toBe(1);
      expect(result.completed).toBe(0);
    });
  });

  describe('Progress tracking', () => {
    it('should track progress correctly with errors', async () => {
      const submissions = Array.from({ length: 5 }, (_, i) => ({
        ...mockSubmission,
        id: `sub-${i}`,
      }));

      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue(
        submissions
      );

      const progressUpdates: Array<{
        completed: number;
        failed: number;
        total: number;
      }> = [];

      // Fail 2 out of 5
      vi.spyOn(llm, 'callLLM')
        .mockResolvedValueOnce({
          content: 'Verdict: pass\nReasoning: Good',
          model: 'gpt-5-mini',
        })
        .mockRejectedValueOnce(
          new llm.LLMError('Timeout', llm.LLMErrorType.TIMEOUT)
        )
        .mockResolvedValueOnce({
          content: 'Verdict: pass\nReasoning: Good',
          model: 'gpt-5-mini',
        })
        .mockRejectedValueOnce(
          new llm.LLMError('Network error', llm.LLMErrorType.NETWORK_ERROR)
        )
        .mockResolvedValueOnce({
          content: 'Verdict: pass\nReasoning: Good',
          model: 'gpt-5-mini',
        });

      const result = await runEvaluations('queue-1', (progress) => {
        progressUpdates.push({
          completed: progress.completed,
          failed: progress.failed,
          total: progress.total,
        });
      });

      expect(result.completed).toBe(3);
      expect(result.failed).toBe(2);
      expect(result.total).toBe(5);

      // Progress should be updated
      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty submissions', async () => {
      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue([]);

      await expect(runEvaluations('queue-1')).rejects.toThrow(
        'No submissions found in queue'
      );
    });

    it('should handle no judge assignments', async () => {
      vi.spyOn(
        judgeAssignmentService,
        'listAssignmentsForQueue'
      ).mockResolvedValue([]);

      await expect(runEvaluations('queue-1')).rejects.toThrow(
        'No judges assigned to this queue'
      );
    });

    it('should detect when some questions lack judge assignments', async () => {
      // Create submission with 2 questions
      const submissionWith2Questions: StoredSubmission = {
        ...mockSubmission,
        questions: [
          {
            rev: 1,
            data: {
              id: 'q1',
              questionType: 'single_choice',
              questionText: 'Question 1?',
            },
          },
          {
            rev: 1,
            data: {
              id: 'q2',
              questionType: 'single_choice',
              questionText: 'Question 2?',
            },
          },
        ],
      };

      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue([
        submissionWith2Questions,
      ]);

      // Only assign judge to q1, not q2
      const assignmentOnlyForQ1: JudgeAssignment = {
        id: 'assign-1',
        queue_id: 'queue-1',
        question_id: 'q1',
        judge_id: 'judge-1',
      };

      vi.spyOn(
        judgeAssignmentService,
        'listAssignmentsForQueue'
      ).mockResolvedValue([assignmentOnlyForQ1]);

      await expect(runEvaluations('queue-1')).rejects.toThrow(
        /Some questions do not have judges assigned.*q2/
      );
    });

    it('should detect multiple unassigned questions', async () => {
      // Create submission with 3 questions
      const submissionWith3Questions: StoredSubmission = {
        ...mockSubmission,
        questions: [
          {
            rev: 1,
            data: {
              id: 'q1',
              questionType: 'single_choice',
              questionText: 'Q1?',
            },
          },
          {
            rev: 1,
            data: {
              id: 'q2',
              questionType: 'single_choice',
              questionText: 'Q2?',
            },
          },
          {
            rev: 1,
            data: {
              id: 'q3',
              questionType: 'single_choice',
              questionText: 'Q3?',
            },
          },
        ],
      };

      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue([
        submissionWith3Questions,
      ]);

      // Only assign judge to q1
      const assignmentOnlyForQ1: JudgeAssignment = {
        id: 'assign-1',
        queue_id: 'queue-1',
        question_id: 'q1',
        judge_id: 'judge-1',
      };

      vi.spyOn(
        judgeAssignmentService,
        'listAssignmentsForQueue'
      ).mockResolvedValue([assignmentOnlyForQ1]);

      const errorPromise = runEvaluations('queue-1');
      await expect(errorPromise).rejects.toThrow(
        'Some questions do not have judges assigned'
      );
      await expect(errorPromise).rejects.toThrow('q2');
      await expect(errorPromise).rejects.toThrow('q3');
    });

    it('should succeed when all questions have judges assigned', async () => {
      // Create submission with 2 questions
      const submissionWith2Questions: StoredSubmission = {
        ...mockSubmission,
        questions: [
          {
            rev: 1,
            data: {
              id: 'q1',
              questionType: 'single_choice',
              questionText: 'Q1?',
            },
          },
          {
            rev: 1,
            data: {
              id: 'q2',
              questionType: 'single_choice',
              questionText: 'Q2?',
            },
          },
        ],
      };

      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue([
        submissionWith2Questions,
      ]);

      // Assign judges to both questions
      const assignments: JudgeAssignment[] = [
        {
          id: 'assign-1',
          queue_id: 'queue-1',
          question_id: 'q1',
          judge_id: 'judge-1',
        },
        {
          id: 'assign-2',
          queue_id: 'queue-1',
          question_id: 'q2',
          judge_id: 'judge-1',
        },
      ];

      vi.spyOn(
        judgeAssignmentService,
        'listAssignmentsForQueue'
      ).mockResolvedValue(assignments);

      vi.spyOn(llm, 'callLLM').mockResolvedValue({
        content: 'Verdict: pass\nReasoning: Good',
        model: 'gpt-5-mini',
      });

      const result = await runEvaluations('queue-1');

      // Should create 2 evaluations (1 submission × 2 questions × 1 judge each)
      expect(result.completed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
    });

    it('should handle multiple judges assigned to same question', async () => {
      const judge2: Judge = {
        ...mockJudge,
        id: 'judge-2',
        name: 'Judge 2',
      };

      vi.spyOn(judgeService, 'listJudges').mockResolvedValue([
        mockJudge,
        judge2,
      ]);

      // Assign 2 judges to the same question
      const assignments: JudgeAssignment[] = [
        {
          id: 'assign-1',
          queue_id: 'queue-1',
          question_id: 'q1',
          judge_id: 'judge-1',
        },
        {
          id: 'assign-2',
          queue_id: 'queue-1',
          question_id: 'q1',
          judge_id: 'judge-2',
        },
      ];

      vi.spyOn(
        judgeAssignmentService,
        'listAssignmentsForQueue'
      ).mockResolvedValue(assignments);

      vi.spyOn(llm, 'callLLM').mockResolvedValue({
        content: 'Verdict: pass\nReasoning: Good',
        model: 'gpt-5-mini',
      });

      const result = await runEvaluations('queue-1');

      // Should create 2 evaluations (1 submission × 1 question × 2 judges)
      expect(result.completed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
    });

    it('should skip inactive judges', async () => {
      const inactiveJudge = { ...mockJudge, is_active: false };
      vi.spyOn(judgeService, 'listJudges').mockResolvedValue([inactiveJudge]);

      await expect(runEvaluations('queue-1')).rejects.toThrow(
        'No evaluations to run'
      );
    });

    it('should handle missing judge', async () => {
      vi.spyOn(judgeService, 'listJudges').mockResolvedValue([]);

      await expect(runEvaluations('queue-1')).rejects.toThrow(
        'No evaluations to run'
      );
    });
  });

  describe('Response parsing', () => {
    it('should handle malformed verdict in LLM response', async () => {
      vi.spyOn(llm, 'callLLM').mockResolvedValue({
        content: 'Verdict: INVALID\nReasoning: Something',
        model: 'gpt-5-mini',
      });

      const result = await runEvaluations('queue-1');

      // Should default to 'inconclusive' for invalid verdicts
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle LLM response with no verdict marker', async () => {
      vi.spyOn(llm, 'callLLM').mockResolvedValue({
        content: 'This looks good to me. The answer is correct.',
        model: 'gpt-5-mini',
      });

      const result = await runEvaluations('queue-1');

      // Should infer verdict or default to inconclusive
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle empty LLM response', async () => {
      vi.spyOn(llm, 'callLLM').mockResolvedValue({
        content: '',
        model: 'gpt-5-mini',
      });

      const result = await runEvaluations('queue-1');

      // Should handle gracefully
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe('Submission data validation', () => {
    it('should handle submission with missing answer for question', async () => {
      const submissionMissingAnswer: StoredSubmission = {
        ...mockSubmission,
        questions: [
          {
            rev: 1,
            data: {
              id: 'q1',
              questionType: 'single_choice',
              questionText: 'Question 1?',
            },
          },
        ],
        answers: {}, // No answer for q1
      };

      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue([
        submissionMissingAnswer,
      ]);

      vi.spyOn(llm, 'callLLM').mockResolvedValue({
        content: 'Verdict: inconclusive\nReasoning: Missing answer',
        model: 'gpt-5-mini',
      });

      const result = await runEvaluations('queue-1');

      // Should still run but answer will be undefined
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe('Database failures', () => {
    it('should mark evaluation as failed if database save fails', async () => {
      vi.spyOn(llm, 'callLLM').mockResolvedValue({
        content: 'Verdict: pass\nReasoning: Good',
        model: 'gpt-5-mini',
      });

      // Get the mocked supabase and override single() to return an error for evaluations table
      const supabaseModule = await import('../lib/supabase');
      const singleSpy = vi.spyOn(supabaseModule.supabase, 'single' as any);

      // First call is for evaluation_runs (should succeed)
      // Second call is for evaluations (should fail)
      singleSpy
        .mockReturnValueOnce({
          data: { id: 'run-1' },
          error: null,
        })
        .mockReturnValueOnce({
          data: null,
          error: { message: 'Database error' },
        });

      const result = await runEvaluations('queue-1');

      // Should fail when database save fails
      expect(result.failed).toBe(1);
      expect(result.completed).toBe(0);
    });
  });

  describe('Batch processing', () => {
    it('should process in batches correctly', async () => {
      // Create 25 submissions (more than batch size of 10)
      const submissions = Array.from({ length: 25 }, (_, i) => ({
        ...mockSubmission,
        id: `sub-${i}`,
      }));

      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue(
        submissions
      );

      vi.spyOn(llm, 'callLLM').mockResolvedValue({
        content: 'Verdict: pass\nReasoning: Good',
        model: 'gpt-5-mini',
      });

      const result = await runEvaluations('queue-1');

      expect(result.completed).toBe(25);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(25);
    });

    it('should handle errors across multiple batches', async () => {
      const submissions = Array.from({ length: 15 }, (_, i) => ({
        ...mockSubmission,
        id: `sub-${i}`,
      }));

      vi.spyOn(queueService, 'getQueueSubmissions').mockResolvedValue(
        submissions
      );

      // Fail every 3rd call
      let callCount = 0;
      vi.spyOn(llm, 'callLLM').mockImplementation(async () => {
        callCount++;
        if (callCount % 3 === 0) {
          throw new llm.LLMError('Timeout', llm.LLMErrorType.TIMEOUT);
        }
        return {
          content: 'Verdict: pass\nReasoning: Good',
          model: 'gpt-5-mini',
        };
      });

      const result = await runEvaluations('queue-1');

      expect(result.completed).toBe(10); // 15 - 5 failures
      expect(result.failed).toBe(5);
      expect(result.total).toBe(15);
    });
  });
});
