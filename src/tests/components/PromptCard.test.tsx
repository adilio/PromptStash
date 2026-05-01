import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PromptCard } from '@/components/PromptCard';
import type { Prompt } from '@/lib/types';

const mockPrompt: Prompt = {
  id: '1',
  team_id: 'team1',
  folder_id: null,
  owner_id: 'user1',
  title: 'Test Prompt',
  body_md: 'This is test content',
  visibility: 'private',
  public_slug: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

describe('PromptCard', () => {
  const renderPromptCard = (
    props: Partial<React.ComponentProps<typeof PromptCard>> = {}
  ) =>
    render(
      <MemoryRouter>
        <PromptCard
          prompt={mockPrompt}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          {...props}
        />
      </MemoryRouter>
    );

  it('should render prompt title', () => {
    renderPromptCard();

    expect(screen.getByText('Test Prompt')).toBeInTheDocument();
  });

  it('should render prompt content preview', () => {
    renderPromptCard();

    expect(screen.getByText(/This is test content/)).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    renderPromptCard({ onEdit });

    await user.click(screen.getByRole('button', { name: /prompt actions/i }));
    const editButton = screen.getByRole('menuitem', { name: /edit/i });
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockPrompt);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    renderPromptCard({ onDelete });

    await user.click(screen.getByRole('button', { name: /prompt actions/i }));
    const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockPrompt);
  });

  it('should show visibility badge for public prompts', () => {
    const publicPrompt: Prompt = {
      ...mockPrompt,
      visibility: 'public',
      public_slug: 'abc123',
    };

    renderPromptCard({ prompt: publicPrompt });

    expect(screen.getByLabelText(/public prompt/i)).toBeInTheDocument();
  });

  it('should truncate long content', () => {
    const longPrompt: Prompt = {
      ...mockPrompt,
      body_md: 'A'.repeat(500),
    };

    renderPromptCard({ prompt: longPrompt });

    const content = screen.getByText(/A+/);
    // Content should be truncated (not full 500 characters)
    expect(content.textContent?.length).toBeLessThan(500);
  });

  it('should display updated date', () => {
    renderPromptCard();

    // Should show some date information
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });
});
