import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listPrompts,
  getPrompt,
  getPromptBySlug,
  createPrompt,
  updatePrompt,
  deletePrompt,
  makePromptPublic,
  makePromptPrivate,
} from '@/api/prompts';
import { supabase } from '@/lib/supabase';
import type { MockSupabaseQuery, MockUser } from '../mocks/supabase';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('Prompts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock supabase.auth.getUser to return a user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null,
    });
  });

  describe('listPrompts', () => {
    it('should list prompts for a team', async () => {
      const mockPrompts = [
        { id: '1', title: 'Test Prompt', team_id: 'team1' },
        { id: '2', title: 'Another Prompt', team_id: 'team1' },
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: mockPrompts, error: null }),
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as MockSupabaseQuery);

      const result = await listPrompts('team1');

      expect(supabase.from).toHaveBeenCalledWith('prompts');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('team_id', 'team1');
      expect(mockQuery.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(result).toEqual(mockPrompts);
    });

    it('should filter by folder', async () => {
      const mockPrompts = [{ id: '1', title: 'Test', folder_id: 'folder1' }];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPrompts, error: null }),
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as MockSupabaseQuery);

      await listPrompts('team1', 'folder1');

      expect(mockQuery.eq).toHaveBeenCalledWith('team_id', 'team1');
      expect(mockQuery.eq).toHaveBeenCalledWith('folder_id', 'folder1');
    });

    it('should filter by search query', async () => {
      const mockPrompts = [{ id: '1', title: 'Searchable Prompt' }];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: mockPrompts, error: null }),
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as MockSupabaseQuery);

      await listPrompts('team1', undefined, 'search');

      expect(mockQuery.ilike).toHaveBeenCalledWith('title', '%search%');
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Database error');

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as MockSupabaseQuery);

      await expect(listPrompts('team1')).rejects.toThrow('Database error');
    });
  });

  describe('getPrompt', () => {
    it('should get a prompt with tags', async () => {
      const mockPrompt = {
        id: '1',
        title: 'Test Prompt',
        body_md: 'Content',
      };

      const mockTags = [
        { tag_id: 't1', tags: { id: 't1', name: 'tag1' } },
        { tag_id: 't2', tags: { id: 't2', name: 'tag2' } },
      ];

      const mockPromptQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrompt, error: null }),
      };

      const mockTagsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockTags, error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce({ select: mockPromptQuery.select } as MockSupabaseQuery)
        .mockReturnValueOnce({ select: mockTagsQuery.select } as MockSupabaseQuery);

      const result = await getPrompt('1');

      expect(result).toEqual({
        ...mockPrompt,
        tags: [
          { id: 't1', name: 'tag1' },
          { id: 't2', name: 'tag2' },
        ],
      });
    });

    it('should handle prompts without tags', async () => {
      const mockPrompt = { id: '1', title: 'Test' };

      const mockPromptQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrompt, error: null }),
      };

      const mockTagsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce({ select: mockPromptQuery.select } as MockSupabaseQuery)
        .mockReturnValueOnce({ select: mockTagsQuery.select } as MockSupabaseQuery);

      const result = await getPrompt('1');

      expect(result.tags).toEqual([]);
    });
  });

  describe('getPromptBySlug', () => {
    it('should get a public prompt by slug', async () => {
      const mockPrompt = {
        id: '1',
        public_slug: 'abc123',
        visibility: 'public',
      };

      const mockPromptQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrompt, error: null }),
      };

      const mockTagsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce({ select: mockPromptQuery.select } as MockSupabaseQuery)
        .mockReturnValueOnce({ select: mockTagsQuery.select } as MockSupabaseQuery);

      const result = await getPromptBySlug('abc123');

      expect(mockPromptQuery.eq).toHaveBeenCalledWith('public_slug', 'abc123');
      expect(mockPromptQuery.eq).toHaveBeenCalledWith('visibility', 'public');
      expect(result.id).toBe('1');
    });
  });

  describe('createPrompt', () => {
    it('should create a new prompt', async () => {
      const mockUser = { id: 'user1' };
      const mockPrompt = {
        id: '1',
        title: 'New Prompt',
        body_md: 'Content',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as MockUser },
        error: null,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrompt, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await createPrompt({
        team_id: 'team1',
        title: 'New Prompt',
        body_md: 'Content',
      });

      expect(mockQuery.insert).toHaveBeenCalledWith({
        team_id: 'team1',
        folder_id: null,
        owner_id: 'user1',
        title: 'New Prompt',
        body_md: 'Content',
        visibility: 'private',
      });
      expect(result).toEqual(mockPrompt);
    });

    it('should throw error if not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        createPrompt({
          team_id: 'team1',
          title: 'Test',
          body_md: 'Content',
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('updatePrompt', () => {
    it('should update a prompt', async () => {
      const mockUpdated = {
        id: '1',
        title: 'Updated Title',
        body_md: 'Updated content',
      };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await updatePrompt('1', {
        title: 'Updated Title',
        body_md: 'Updated content',
      });

      expect(mockQuery.update).toHaveBeenCalledWith({
        title: 'Updated Title',
        body_md: 'Updated content',
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deletePrompt', () => {
    it('should delete a prompt', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await deletePrompt('1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('makePromptPublic', () => {
    it('should make a prompt public with a slug', async () => {
      const mockPrompt = {
        id: '1',
        visibility: 'public',
        public_slug: expect.any(String),
      };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrompt, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await makePromptPublic('1');

      expect(mockQuery.update).toHaveBeenCalledWith({
        visibility: 'public',
        public_slug: expect.any(String),
      });
      expect(result.visibility).toBe('public');
      expect(result.public_slug).toBeTruthy();
    });
  });

  describe('makePromptPrivate', () => {
    it('should make a prompt private and remove slug', async () => {
      const mockPrompt = {
        id: '1',
        visibility: 'private',
        public_slug: null,
      };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrompt, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await makePromptPrivate('1');

      expect(mockQuery.update).toHaveBeenCalledWith({
        visibility: 'private',
        public_slug: null,
      });
      expect(result.visibility).toBe('private');
      expect(result.public_slug).toBeNull();
    });
  });
});
