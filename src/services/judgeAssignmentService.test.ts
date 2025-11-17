/**
 * Tests for judgeAssignmentService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import {
  assignJudge,
  unassignJudge,
  getAssignmentsForQuestion,
  listAssignmentsForQueue,
  unassignJudgeFromQuestion,
  type CreateAssignmentInput,
} from './judgeAssignmentService';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('judgeAssignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignJudge', () => {
    it('should assign a judge to a question', async () => {
      const mockInput: CreateAssignmentInput = {
        queue_id: 'queue_1',
        question_id: 'q_1',
        judge_id: 'judge_1',
      };

      const mockResponse = {
        id: 'assignment_1',
        ...mockInput,
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      const result = await assignJudge(mockInput);

      expect(result).toEqual(mockResponse);
      expect(supabase.from).toHaveBeenCalledWith('judge_assignments');
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          queue_id: mockInput.queue_id,
          question_id: mockInput.question_id,
          judge_id: mockInput.judge_id,
        },
        {
          onConflict: 'queue_id,question_id,judge_id',
        }
      );
    });

    it('should throw an error when assignment fails', async () => {
      const mockInput: CreateAssignmentInput = {
        queue_id: 'queue_1',
        question_id: 'q_1',
        judge_id: 'judge_1',
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      await expect(assignJudge(mockInput)).rejects.toThrow(
        'Failed to assign judge: Database error'
      );
    });
  });

  describe('unassignJudge', () => {
    it('should remove a judge assignment by ID', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      await unassignJudge('assignment_1');

      expect(supabase.from).toHaveBeenCalledWith('judge_assignments');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'assignment_1');
    });

    it('should throw an error when deletion fails', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Cannot delete' },
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      await expect(unassignJudge('assignment_1')).rejects.toThrow(
        'Failed to unassign judge: Cannot delete'
      );
    });
  });

  describe('getAssignmentsForQuestion', () => {
    it('should fetch assignments for a specific question', async () => {
      const mockAssignments = [
        {
          id: 'assignment_1',
          queue_id: 'queue_1',
          question_id: 'q_1',
          judge_id: 'judge_1',
        },
        {
          id: 'assignment_2',
          queue_id: 'queue_1',
          question_id: 'q_1',
          judge_id: 'judge_2',
        },
      ];

      const mockEq2 = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq1,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getAssignmentsForQuestion('queue_1', 'q_1');

      expect(result).toEqual(mockAssignments);
      expect(mockEq1).toHaveBeenCalledWith('queue_id', 'queue_1');
      expect(mockEq2).toHaveBeenCalledWith('question_id', 'q_1');
    });
  });

  describe('listAssignmentsForQueue', () => {
    it('should fetch all assignments for a queue', async () => {
      const mockAssignments = [
        {
          id: 'assignment_1',
          queue_id: 'queue_1',
          question_id: 'q_1',
          judge_id: 'judge_1',
        },
        {
          id: 'assignment_2',
          queue_id: 'queue_1',
          question_id: 'q_2',
          judge_id: 'judge_1',
        },
      ];

      const mockEq = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await listAssignmentsForQueue('queue_1');

      expect(result).toEqual(mockAssignments);
      expect(mockEq).toHaveBeenCalledWith('queue_id', 'queue_1');
    });
  });

  describe('unassignJudgeFromQuestion', () => {
    it('should remove a specific judge from a question', async () => {
      const mockEq3 = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockEq2 = vi.fn().mockReturnValue({
        eq: mockEq3,
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq1,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      await unassignJudgeFromQuestion('queue_1', 'q_1', 'judge_1');

      expect(mockEq1).toHaveBeenCalledWith('queue_id', 'queue_1');
      expect(mockEq2).toHaveBeenCalledWith('question_id', 'q_1');
      expect(mockEq3).toHaveBeenCalledWith('judge_id', 'judge_1');
    });
  });
});
