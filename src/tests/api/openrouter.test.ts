import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runPromptWithOpenRouter } from '@/api/openrouter';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

describe('OpenRouter API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'session-token' } },
    });
  });

  it('posts a spec-shaped non-streaming chat request to the server proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          content: 'Hello from OpenRouter',
          model: 'openai/gpt-4.1',
          id: 'chatcmpl-1',
          finish_reason: 'stop',
          usage: { total_tokens: 12 },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runPromptWithOpenRouter({
      prompt: 'Write a tagline',
      model: 'openai/gpt-4.1',
      temperature: 0.4,
      maxCompletionTokens: 256,
    });

    expect(result.content).toBe('Hello from OpenRouter');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/openrouter/run'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer session-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          prompt: 'Write a tagline',
          model: 'openai/gpt-4.1',
          temperature: 0.4,
          max_completion_tokens: 256,
        }),
      })
    );
  });

  it('surfaces proxy errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'OpenRouter rate limit exceeded. Try again later.' }),
      })
    );

    await expect(
      runPromptWithOpenRouter({
        prompt: 'Write a tagline',
        model: 'openai/gpt-4.1',
        temperature: 0.7,
        maxCompletionTokens: 800,
      })
    ).rejects.toThrow('OpenRouter rate limit exceeded');
  });

  it('requires a signed-in Supabase session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    await expect(
      runPromptWithOpenRouter({
        prompt: 'Write a tagline',
        model: 'openai/gpt-4.1',
        temperature: 0.7,
        maxCompletionTokens: 800,
      })
    ).rejects.toThrow('Sign in before running prompts');
  });
});
