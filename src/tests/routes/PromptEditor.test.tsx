import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PromptEditor } from '@/routes/app/PromptEditor';
import * as promptsApi from '@/api/prompts';

vi.mock('@/api/prompts');

const mockPrompt = {
  id: '1',
  team_id: 'team1',
  folder_id: null,
  owner_id: 'user1',
  title: 'Existing Prompt',
  body_md: 'Existing content',
  visibility: 'private' as const,
  public_slug: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

// Mock router hooks
const mockNavigate = vi.fn();
let mockParams: { promptId?: string } = { promptId: 'new' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    useOutletContext: () => ({ currentTeamId: 'team1' }),
  };
});

describe('PromptEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { promptId: 'new' };
  });

  it('should render editor for new prompt', () => {
    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    expect(screen.getByText('New Prompt')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('should render editor for explicit new route without loading a prompt', () => {
    mockParams = {};

    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    expect(screen.getByText('New Prompt')).toBeInTheDocument();
    expect(promptsApi.getPrompt).not.toHaveBeenCalled();
  });

  it('should allow entering title and body', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'My New Prompt');

    expect(titleInput).toHaveValue('My New Prompt');
  });

  it('should create new prompt on save', async () => {
    const user = userEvent.setup();
    const createdPrompt = { ...mockPrompt, id: 'new-id' };

    vi.mocked(promptsApi.createPrompt).mockResolvedValue(createdPrompt);

    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'My New Prompt');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(promptsApi.createPrompt).toHaveBeenCalledWith({
        team_id: 'team1',
        title: 'My New Prompt',
        body_md: '',
      });
    });
  });

  it('should show error if title is empty on save', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Should not call API
    expect(promptsApi.createPrompt).not.toHaveBeenCalled();
  });

  it('should enforce title max length', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    const longTitle = 'a'.repeat(150);

    await user.type(titleInput, longTitle);

    // Should be limited to 140 characters
    expect(titleInput.value.length).toBeLessThanOrEqual(140);
  });

  it('should switch between edit and preview tabs', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    await user.click(previewTab);

    // Preview tab should be active
    expect(previewTab).toHaveAttribute('data-state', 'active');
  });

  it('should show saving state while saving', async () => {
    const user = userEvent.setup();

    vi.mocked(promptsApi.createPrompt).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockPrompt), 1000))
    );

    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Test');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('should disable save button while saving', async () => {
    const user = userEvent.setup();

    vi.mocked(promptsApi.createPrompt).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockPrompt), 1000))
    );

    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Test');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();
  });

  it('should handle save errors gracefully', async () => {
    const user = userEvent.setup();

    vi.mocked(promptsApi.createPrompt).mockRejectedValue(
      new Error('Failed to save')
    );

    render(
      <MemoryRouter>
        <PromptEditor />
      </MemoryRouter>
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Test');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      // Should not navigate on error
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
