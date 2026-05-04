import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PromptRunner } from '@/components/PromptRunner';
import { runPromptWithOpenRouter } from '@/api/openrouter';

vi.mock('@/api/openrouter', () => ({
  OPENROUTER_MODELS: [
    { id: 'openai/gpt-4.1', label: 'OpenAI GPT-4.1' },
    { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  ],
  runPromptWithOpenRouter: vi.fn(),
}));

describe('PromptRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates empty prompt content before running', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PromptRunner prompt="" />
      </MemoryRouter>
    );

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

    render(
      <MemoryRouter>
        <PromptRunner prompt="Answer this." />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /^run$/i }));

    await waitFor(() => {
      expect(screen.getByText('Here is the answer.')).toBeInTheDocument();
    });
    expect(screen.getByText('42 tokens')).toBeInTheDocument();
    expect(runPromptWithOpenRouter).toHaveBeenCalledWith({
      prompt: 'Answer this.',
      model: 'openai/gpt-4.1',
      temperature: 0.7,
      maxCompletionTokens: 800,
    });
  });

  it('shows OpenRouter errors in the runner', async () => {
    const user = userEvent.setup();
    vi.mocked(runPromptWithOpenRouter).mockRejectedValue(
      new Error('OpenRouter rejected the saved API key.')
    );

    render(
      <MemoryRouter>
        <PromptRunner prompt="Answer this." />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /^run$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'OpenRouter rejected the saved API key.'
      );
    });
  });
});
