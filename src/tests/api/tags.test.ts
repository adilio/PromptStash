import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listTags, createTag, deleteTag, addTagToPrompt, removeTagFromPrompt } from '@/api/tags';
import { supabase } from '@/lib/supabase';
import type { MockSupabaseQuery } from '../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Tags API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listTags', () => {
    it('should list all tags for a team', async () => {
      const mockTags = [
        { id: '1', name: 'javascript', team_id: 'team1' },
        { id: '2', name: 'python', team_id: 'team1' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTags, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await listTags('team1');

      expect(supabase.from).toHaveBeenCalledWith('tags');
      expect(mockQuery.eq).toHaveBeenCalledWith('team_id', 'team1');
      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(result).toEqual(mockTags);
    });
  });

  describe('createTag', () => {
    it('should create a new tag', async () => {
      const mockTag = {
        id: '1',
        name: 'react',
        team_id: 'team1',
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTag, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await createTag({
        team_id: 'team1',
        name: 'react',
      });

      expect(mockQuery.insert).toHaveBeenCalledWith({
        team_id: 'team1',
        name: 'react',
      });
      expect(result).toEqual(mockTag);
    });

    it('should handle duplicate tag names', async () => {
      const mockError = new Error('duplicate key value');

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await expect(
        createTag({
          team_id: 'team1',
          name: 'react',
        })
      ).rejects.toThrow('duplicate key value');
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await deleteTag('1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('addTagToPrompt', () => {
    it('should add a tag to a prompt', async () => {
      const mockPromptTag = {
        prompt_id: 'prompt1',
        tag_id: 'tag1',
      };

      const mockQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await addTagToPrompt('prompt1', 'tag1');

      expect(supabase.from).toHaveBeenCalledWith('prompt_tags');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        prompt_id: 'prompt1',
        tag_id: 'tag1',
      });
    });

    it('should handle duplicate tag assignments', async () => {
      const mockError = new Error('duplicate key value');

      const mockQuery = {
        insert: vi.fn().mockResolvedValue({ error: mockError }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await expect(addTagToPrompt('prompt1', 'tag1')).rejects.toThrow('duplicate key value');
    });
  });

  describe('removeTagFromPrompt', () => {
    it('should remove a tag from a prompt', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ error: null }),
      };

      // Need to chain the eq calls
      mockQuery.eq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await removeTagFromPrompt('prompt1', 'tag1');

      expect(supabase.from).toHaveBeenCalledWith('prompt_tags');
      expect(mockQuery.delete).toHaveBeenCalled();
    });
  });
});
