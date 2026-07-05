import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PromptRunner } from '@/components/PromptRunner';
import { runPromptWithOpenRouter } from '@/api/openrouter';
import { recordRun } from '@/api/runs';

vi.mock('@/api/openrouter', () => ({
  OPENROUTER_MODELS: [
    { id: 'openai/gpt-4.1', label: 'OpenAI GPT-4.1' },
    { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  ],
  runPromptWithOpenRouter: vi.fn(),
}));

vi.mock('@/api/runs', () => ({
  recordRun: vi.fn(),
  listRunsForPrompt: vi.fn().mockResolvedValue([]),
}));

function renderRunner(props: Partial<React.ComponentProps<typeof PromptRunner>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PromptRunner prompt="Answer this." {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PromptRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates empty prompt content before running', async () => {
    const user = userEvent.setup();

    renderRunner({ prompt: '' });

    await user.click(screen.getByRole('button', { name: /^run$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Add prompt content before running.');
    expect(runPromptWithOpenRouter).not.toHaveBeenCalled();
  });

  it('shows a successful OpenRouter response with usage metadata', async () => {
    const user = userEvent.setup();
    vi.mocked(runPromptWithOpenRouter).mockResolvedValue({
      content: 'Here is the answer.',
      model: 'openai/gpt-4.1',
      id: 'chatcmpl-1',
      finish_reason: 'stop',
      usage: { total_tokens: 42 },
    });

    renderRunner();

    await user.click(screen.getByRole('button', { name: /^run$/i }));

    await waitFor(() => {
      expect(screen.getByText('Here is the answer.')).toBeInTheDocument();
    });
    expect(screen.getByText('42 tokens (est.)')).toBeInTheDocument();
    expect(runPromptWithOpenRouter).toHaveBeenCalledWith(
      {
        prompt: 'Answer this.',
        model: 'openai/gpt-4.1',
        temperature: 0.7,
        maxCompletionTokens: 800,
      },
      expect.any(AbortSignal)
    );
  });

  it('shows OpenRouter errors inside the model result card', async () => {
    const user = userEvent.setup();
    vi.mocked(runPromptWithOpenRouter).mockRejectedValue(
      new Error('OpenRouter rejected the saved API key.')
    );

    renderRunner();

    await user.click(screen.getByRole('button', { name: /^run$/i }));

    await waitFor(() => {
      expect(screen.getByText('OpenRouter rejected the saved API key.')).toBeInTheDocument();
    });
  });

  it('runs the prompt against every selected model side by side', async () => {
    const user = userEvent.setup();
    vi.mocked(runPromptWithOpenRouter).mockImplementation(async (input) => ({
      content: `Output from ${input.model}`,
      model: input.model,
      id: null,
      finish_reason: 'stop',
      usage: { total_tokens: 10 },
    }));

    renderRunner();

    await user.click(screen.getByRole('button', { name: 'Claude Sonnet 4' }));
    await user.click(screen.getByRole('button', { name: /run 2 models/i }));

    await waitFor(() => {
      expect(screen.getByText('Output from openai/gpt-4.1')).toBeInTheDocument();
      expect(screen.getByText('Output from anthropic/claude-sonnet-4')).toBeInTheDocument();
    });
    expect(runPromptWithOpenRouter).toHaveBeenCalledTimes(2);
  });

  it('records each run to history when a team is known', async () => {
    const user = userEvent.setup();
    vi.mocked(runPromptWithOpenRouter).mockResolvedValue({
      content: 'ok',
      model: 'openai/gpt-4.1',
      id: null,
      finish_reason: 'stop',
      usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12, cost: 0.0001 },
    });

    renderRunner({ teamId: 'team-1', promptId: 'prompt-1' });

    await user.click(screen.getByRole('button', { name: /^run$/i }));

    await waitFor(() => {
      expect(recordRun).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: 'team-1',
          prompt_id: 'prompt-1',
          model: 'openai/gpt-4.1',
          status: 'success',
          total_tokens: 12,
          cost_estimate: 0.0001,
        })
      );
    });
  });

  it('does not attempt to record runs without a team', async () => {
    const user = userEvent.setup();
    vi.mocked(runPromptWithOpenRouter).mockResolvedValue({
      content: 'ok',
      model: 'openai/gpt-4.1',
      id: null,
      finish_reason: 'stop',
      usage: null,
    });

    renderRunner();

    await user.click(screen.getByRole('button', { name: /^run$/i }));

    await waitFor(() => {
      expect(screen.getByText('ok')).toBeInTheDocument();
    });
    expect(recordRun).not.toHaveBeenCalled();
  });
});
