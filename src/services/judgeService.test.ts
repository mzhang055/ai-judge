/**
 * Tests for judgeService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import {
  createJudge,
  getJudge,
  listJudges,
  updateJudge,
  deleteJudge,
  type CreateJudgeInput,
} from './judgeService';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('judgeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createJudge', () => {
    it('should create a new judge successfully', async () => {
      const mockInput: CreateJudgeInput = {
        name: 'Test Judge',
        system_prompt: 'You are a test judge.',
        is_active: true,
      };

      const mockResponse = {
        id: '123',
        ...mockInput,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockResponse,
          error: null,
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await createJudge(mockInput);

      expect(result).toEqual(mockResponse);
      expect(supabase.from).toHaveBeenCalledWith('judges');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockInput.name,
          system_prompt: mockInput.system_prompt,
          is_active: mockInput.is_active,
        })
      );
    });

    it('should throw an error when creation fails', async () => {
      const mockInput: CreateJudgeInput = {
        name: 'Test Judge',
        system_prompt: 'Test prompt',
      };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      await expect(createJudge(mockInput)).rejects.toThrow(
        'Failed to create judge: Database error'
      );
    });
  });

  describe('getJudge', () => {
    it('should fetch a judge by ID', async () => {
      const mockJudge = {
        id: '123',
        name: 'Test Judge',
        system_prompt: 'Test prompt',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockJudge,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getJudge('123');

      expect(result).toEqual(mockJudge);
      expect(mockEq).toHaveBeenCalledWith('id', '123');
    });

    it('should return null when judge not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getJudge('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listJudges', () => {
    it('should list all judges', async () => {
      const mockJudges = [
        {
          id: '1',
          name: 'Judge 1',
          system_prompt: 'Prompt 1',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Judge 2',
          system_prompt: 'Prompt 2',
          is_active: false,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockJudges,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await listJudges();

      expect(result).toEqual(mockJudges);
      expect(mockOrder).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should filter by active status', async () => {
      const mockActiveJudges = [
        {
          id: '1',
          name: 'Active Judge',
          system_prompt: 'Prompt',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Mock the promise-like object that is awaited
      const mockAwaitableQuery = Promise.resolve({
        data: mockActiveJudges,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue(mockAwaitableQuery);

      const mockOrderedQuery = {
        eq: mockEq,
        then: mockAwaitableQuery.then.bind(mockAwaitableQuery),
      };

      const mockOrder = vi.fn().mockReturnValue(mockOrderedQuery);

      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await listJudges(true);

      expect(result).toEqual(mockActiveJudges);
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });
  });

  describe('updateJudge', () => {
    it('should update a judge', async () => {
      const mockUpdatedJudge = {
        id: '123',
        name: 'Updated Judge',
        system_prompt: 'Updated prompt',
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockUpdatedJudge,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await updateJudge('123', {
        name: 'Updated Judge',
        is_active: false,
      });

      expect(result).toEqual(mockUpdatedJudge);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Judge',
          is_active: false,
        })
      );
    });
  });

  describe('deleteJudge', () => {
    it('should delete a judge', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      await deleteJudge('123');

      expect(supabase.from).toHaveBeenCalledWith('judges');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', '123');
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

      await expect(deleteJudge('123')).rejects.toThrow(
        'Failed to delete judge: Cannot delete'
      );
    });
  });
});
