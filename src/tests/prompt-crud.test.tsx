import { describe, it, expect, vi } from 'vitest';
import { createPrompt, updatePrompt, deletePrompt, listPrompts } from '../api/prompts';
import { supabase } from '../lib/supabase';
import type { MockSupabaseQuery, MockUser } from './mocks/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Prompt CRUD Operations', () => {
  it('should create a prompt', async () => {
    const mockPrompt = {
      id: 'prompt-1',
      team_id: 'team-1',
      title: 'Test Prompt',
      body_md: '# Test Content',
      owner_id: 'user-1',
      visibility: 'private' as const,
      folder_id: null,
      public_slug: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } as MockUser },
      error: null,
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockPrompt,
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as MockSupabaseQuery);

    const result = await createPrompt({
      team_id: 'team-1',
      title: 'Test Prompt',
      body_md: '# Test Content',
    });

    expect(result).toEqual(mockPrompt);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('should update a prompt', async () => {
    const mockUpdatedPrompt = {
      id: 'prompt-1',
      title: 'Updated Prompt',
      body_md: '# Updated Content',
    };

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUpdatedPrompt,
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as MockSupabaseQuery);

    const result = await updatePrompt('prompt-1', {
      title: 'Updated Prompt',
      body_md: '# Updated Content',
    });

    expect(result.title).toBe('Updated Prompt');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should delete a prompt', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
    } as MockSupabaseQuery);

    await deletePrompt('prompt-1');

    expect(mockDelete).toHaveBeenCalled();
  });

  it('should list prompts', async () => {
    const mockPrompts = [
      {
        id: 'prompt-1',
        title: 'Prompt 1',
        body_md: '# Content 1',
      },
      {
        id: 'prompt-2',
        title: 'Prompt 2',
        body_md: '# Content 2',
      },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockPrompts,
          error: null,
        }),
      }),
    });

    const mockTagSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    vi.mocked(supabase.from)
      .mockReturnValueOnce({
        select: mockSelect,
      } as MockSupabaseQuery)
      .mockReturnValueOnce({
        select: mockTagSelect,
      } as MockSupabaseQuery);

    const result = await listPrompts('team-1');

    expect(result).toHaveLength(2);
    expect(mockSelect).toHaveBeenCalled();
  });
});
