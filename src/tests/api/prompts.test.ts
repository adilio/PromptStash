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
import type { MockSupabaseQuery } from '../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

function createQuery(result: { data?: unknown; error: Error | null }): MockSupabaseQuery {
  const query: MockSupabaseQuery = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    ilike: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

describe('Prompts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      const query = createQuery({ data: mockPrompts, error: null });

      vi.mocked(supabase.from).mockReturnValue(query);

      const result = await listPrompts('team1');

      expect(supabase.from).toHaveBeenCalledWith('prompts');
      expect(query.select).toHaveBeenCalledWith('*');
      expect(query.eq).toHaveBeenCalledWith('team_id', 'team1');
      expect(query.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(result).toEqual(mockPrompts);
    });

    it('should filter by folder', async () => {
      const query = createQuery({ data: [], error: null });
      vi.mocked(supabase.from).mockReturnValue(query);

      await listPrompts('team1', 'folder1');

      expect(query.eq).toHaveBeenCalledWith('team_id', 'team1');
      expect(query.eq).toHaveBeenCalledWith('folder_id', 'folder1');
    });

    it('should filter by search query', async () => {
      const query = createQuery({ data: [], error: null });
      vi.mocked(supabase.from).mockReturnValue(query);

      await listPrompts('team1', undefined, 'search');

      expect(query.ilike).toHaveBeenCalledWith('title', '%search%');
    });

    it('should throw error on failure', async () => {
      const query = createQuery({ data: null, error: new Error('Database error') });
      vi.mocked(supabase.from).mockReturnValue(query);

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
      const promptQuery = createQuery({ data: mockPrompt, error: null });
      const tagsQuery = createQuery({ data: mockTags, error: null });

      vi.mocked(supabase.from).mockReturnValueOnce(promptQuery).mockReturnValueOnce(tagsQuery);

      const result = await getPrompt('1');

      expect(promptQuery.eq).toHaveBeenCalledWith('id', '1');
      expect(tagsQuery.eq).toHaveBeenCalledWith('prompt_id', '1');
      expect(result).toEqual({
        ...mockPrompt,
        tags: [
          { id: 't1', name: 'tag1' },
          { id: 't2', name: 'tag2' },
        ],
      });
    });

    it('should handle prompts without tags', async () => {
      vi.mocked(supabase.from)
        .mockReturnValueOnce(createQuery({ data: { id: '1', title: 'Test' }, error: null }))
        .mockReturnValueOnce(createQuery({ data: [], error: null }));

      const result = await getPrompt('1');

      expect(result.tags).toEqual([]);
    });
  });

  describe('getPromptBySlug', () => {
    it('should get a public prompt by slug', async () => {
      const promptQuery = createQuery({
        data: { id: '1', public_slug: 'abc123', visibility: 'public' },
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(promptQuery)
        .mockReturnValueOnce(createQuery({ data: [], error: null }));

      const result = await getPromptBySlug('abc123');

      expect(promptQuery.eq).toHaveBeenCalledWith('public_slug', 'abc123');
      expect(promptQuery.eq).toHaveBeenCalledWith('visibility', 'public');
      expect(result.id).toBe('1');
    });
  });

  describe('createPrompt', () => {
    it('should create a new prompt', async () => {
      const mockPrompt = {
        id: '1',
        title: 'New Prompt',
        body_md: 'Content',
      };
      const query = createQuery({ data: mockPrompt, error: null });

      vi.mocked(supabase.from).mockReturnValue(query);

      const result = await createPrompt({
        team_id: 'team1',
        title: 'New Prompt',
        body_md: 'Content',
      });

      expect(query.insert).toHaveBeenCalledWith({
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
      const query = createQuery({ data: mockUpdated, error: null });

      vi.mocked(supabase.from).mockReturnValue(query);

      const result = await updatePrompt('1', {
        title: 'Updated Title',
        body_md: 'Updated content',
      });

      expect(query.update).toHaveBeenCalledWith({
        title: 'Updated Title',
        body_md: 'Updated content',
      });
      expect(query.eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deletePrompt', () => {
    it('should delete a prompt', async () => {
      const query = createQuery({ error: null });
      vi.mocked(supabase.from).mockReturnValue(query);

      await deletePrompt('1');

      expect(query.delete).toHaveBeenCalled();
      expect(query.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('makePromptPublic', () => {
    it('should make a prompt public with a slug', async () => {
      const mockPrompt = {
        id: '1',
        visibility: 'public',
        public_slug: 'generated-slug',
      };
      const query = createQuery({ data: mockPrompt, error: null });

      vi.mocked(supabase.from).mockReturnValue(query);

      const result = await makePromptPublic('1');

      expect(query.update).toHaveBeenCalledWith({
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
      const query = createQuery({ data: mockPrompt, error: null });

      vi.mocked(supabase.from).mockReturnValue(query);

      const result = await makePromptPrivate('1');

      expect(query.update).toHaveBeenCalledWith({
        visibility: 'private',
        public_slug: null,
      });
      expect(result.visibility).toBe('private');
      expect(result.public_slug).toBeNull();
    });
  });
});
