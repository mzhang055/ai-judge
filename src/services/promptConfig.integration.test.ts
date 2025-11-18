/**
 * Integration tests for prompt configuration feature
 * Tests the full flow: Judge creation -> Evaluation message building
 */

import { describe, it, expect } from 'vitest';
import type { Judge, StoredSubmission } from '../types';

// Mock function to simulate createEvaluationMessages logic
function buildUserMessageFromConfig(
  judge: Judge,
  submission: StoredSubmission,
  questionId: string
): string {
  const question = submission.questions.find((q) => q.data.id === questionId);
  const answer = submission.answers[questionId];

  if (!question) {
    throw new Error(`Question ${questionId} not found`);
  }

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

  return userTextParts.join('\n');
}

describe('Prompt Configuration Integration', () => {
  const mockSubmission: StoredSubmission = {
    id: 'sub-1',
    queueId: 'queue-1',
    labelingTaskId: 'task-1',
    createdAt: 1690000000000,
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
      q1: {
        choice: 'yes',
        reasoning: 'Observed on a clear day',
      },
    },
    uploaded_at: '2023-07-22T00:00:00.000Z',
  };

  it('includes all fields when config is all true', () => {
    const judge: Judge = {
      id: '1',
      name: 'Test Judge',
      system_prompt: 'You are a judge',
      is_active: true,
      prompt_config: {
        include_question_text: true,
        include_question_type: true,
        include_answer: true,
        include_submission_metadata: true,
        include_queue_id: true,
        include_labeling_task_id: true,
        include_created_at: true,
      },
      created_at: '2023-07-22T00:00:00.000Z',
      updated_at: '2023-07-22T00:00:00.000Z',
    };

    const message = buildUserMessageFromConfig(judge, mockSubmission, 'q1');

    expect(message).toContain('**Question Type:** single_choice');
    expect(message).toContain('**Question Text:** Is the sky blue?');
    expect(message).toContain('**Answer:**');
    expect(message).toContain('- Queue ID: queue-1');
    expect(message).toContain('- Labeling Task ID: task-1');
    expect(message).toContain('- Created At: 1690000000000');
  });

  it('excludes question text when config is false', () => {
    const judge: Judge = {
      id: '1',
      name: 'Test Judge',
      system_prompt: 'You are a judge',
      is_active: true,
      prompt_config: {
        include_question_text: false, // DISABLED
        include_question_type: true,
        include_answer: true,
        include_submission_metadata: true,
        include_queue_id: true,
        include_labeling_task_id: true,
        include_created_at: true,
      },
      created_at: '2023-07-22T00:00:00.000Z',
      updated_at: '2023-07-22T00:00:00.000Z',
    };

    const message = buildUserMessageFromConfig(judge, mockSubmission, 'q1');

    expect(message).not.toContain('**Question Text:**');
    expect(message).not.toContain('Is the sky blue?');
    expect(message).toContain('**Question Type:** single_choice'); // Still included
  });

  it('excludes answer when config is false', () => {
    const judge: Judge = {
      id: '1',
      name: 'Test Judge',
      system_prompt: 'You are a judge',
      is_active: true,
      prompt_config: {
        include_question_text: true,
        include_question_type: true,
        include_answer: false, // DISABLED
        include_submission_metadata: true,
        include_queue_id: true,
        include_labeling_task_id: true,
        include_created_at: true,
      },
      created_at: '2023-07-22T00:00:00.000Z',
      updated_at: '2023-07-22T00:00:00.000Z',
    };

    const message = buildUserMessageFromConfig(judge, mockSubmission, 'q1');

    expect(message).not.toContain('**Answer:**');
    expect(message).not.toContain('"choice"');
    expect(message).toContain('**Question Text:** Is the sky blue?'); // Still included
  });

  it('excludes metadata when all metadata flags are false', () => {
    const judge: Judge = {
      id: '1',
      name: 'Test Judge',
      system_prompt: 'You are a judge',
      is_active: true,
      prompt_config: {
        include_question_text: true,
        include_question_type: true,
        include_answer: true,
        include_submission_metadata: false,
        include_queue_id: false,
        include_labeling_task_id: false,
        include_created_at: false,
      },
      created_at: '2023-07-22T00:00:00.000Z',
      updated_at: '2023-07-22T00:00:00.000Z',
    };

    const message = buildUserMessageFromConfig(judge, mockSubmission, 'q1');

    expect(message).not.toContain('- Queue ID:');
    expect(message).not.toContain('- Labeling Task ID:');
    expect(message).not.toContain('- Created At:');
    // Metadata section should not appear at all
    expect(message).not.toContain('**Submission Metadata:**');
  });

  it('includes only specific metadata fields when individually enabled', () => {
    const judge: Judge = {
      id: '1',
      name: 'Test Judge',
      system_prompt: 'You are a judge',
      is_active: true,
      prompt_config: {
        include_question_text: true,
        include_question_type: true,
        include_answer: true,
        include_submission_metadata: false,
        include_queue_id: true, // Only this one enabled
        include_labeling_task_id: false,
        include_created_at: false,
      },
      created_at: '2023-07-22T00:00:00.000Z',
      updated_at: '2023-07-22T00:00:00.000Z',
    };

    const message = buildUserMessageFromConfig(judge, mockSubmission, 'q1');

    expect(message).toContain('Queue ID: queue-1');
    expect(message).not.toContain('Labeling Task ID:');
    expect(message).not.toContain('Created At: 1690000000000');
  });

  it('uses default config when prompt_config is undefined', () => {
    const judge: Judge = {
      id: '1',
      name: 'Test Judge',
      system_prompt: 'You are a judge',
      is_active: true,
      // No prompt_config specified
      created_at: '2023-07-22T00:00:00.000Z',
      updated_at: '2023-07-22T00:00:00.000Z',
    };

    const message = buildUserMessageFromConfig(judge, mockSubmission, 'q1');

    // Should include everything by default
    expect(message).toContain('Question Type:');
    expect(message).toContain('Question Text:');
    expect(message).toContain('Answer:');
    expect(message).toContain('Queue ID:');
    expect(message).toContain('Labeling Task ID:');
    expect(message).toContain('Created At:');
  });

  it('always includes question ID and verdict instructions', () => {
    const judge: Judge = {
      id: '1',
      name: 'Test Judge',
      system_prompt: 'You are a judge',
      is_active: true,
      prompt_config: {
        include_question_text: false,
        include_question_type: false,
        include_answer: false,
        include_submission_metadata: false,
        include_queue_id: false,
        include_labeling_task_id: false,
        include_created_at: false,
      },
      created_at: '2023-07-22T00:00:00.000Z',
      updated_at: '2023-07-22T00:00:00.000Z',
    };

    const message = buildUserMessageFromConfig(judge, mockSubmission, 'q1');

    // These should always be present
    expect(message).toContain('**Question ID:** q1');
    expect(message).toContain('Verdict: [pass/fail/inconclusive]');
    expect(message).toContain('Reasoning:');
  });

  it('submission_metadata flag includes all metadata fields', () => {
    const judge: Judge = {
      id: '1',
      name: 'Test Judge',
      system_prompt: 'You are a judge',
      is_active: true,
      prompt_config: {
        include_question_text: true,
        include_question_type: true,
        include_answer: true,
        include_submission_metadata: true, // This should enable all metadata
        include_queue_id: false,
        include_labeling_task_id: false,
        include_created_at: false,
      },
      created_at: '2023-07-22T00:00:00.000Z',
      updated_at: '2023-07-22T00:00:00.000Z',
    };

    const message = buildUserMessageFromConfig(judge, mockSubmission, 'q1');

    // All metadata should be included due to include_submission_metadata
    expect(message).toContain('Queue ID: queue-1');
    expect(message).toContain('Labeling Task ID: task-1');
    expect(message).toContain('Created At: 1690000000000');
  });
});
