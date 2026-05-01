import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '@/routes/app/Dashboard';
import * as promptsApi from '@/api/prompts';

vi.mock('@/api/prompts');

const mockPrompts = [
  {
    id: '1',
    team_id: 'team1',
    folder_id: null,
    owner_id: 'user1',
    title: 'First Prompt',
    body_md: 'Content of first prompt',
    visibility: 'private' as const,
    public_slug: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '2',
    team_id: 'team1',
    folder_id: null,
    owner_id: 'user1',
    title: 'Second Prompt',
    body_md: 'Content of second prompt',
    visibility: 'public' as const,
    public_slug: 'abc123',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
];

// Mock useOutletContext
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({ currentTeamId: 'team1' }),
  };
});

describe('Dashboard', () => {
  const renderDashboard = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard heading', async () => {
    vi.mocked(promptsApi.listPrompts).mockResolvedValue(mockPrompts);

    renderDashboard();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    vi.mocked(promptsApi.listPrompts).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = renderDashboard();

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should load and display prompts', async () => {
    vi.mocked(promptsApi.listPrompts).mockResolvedValue(mockPrompts);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('First Prompt')).toBeInTheDocument();
      expect(screen.getByText('Second Prompt')).toBeInTheDocument();
    });
  });

  it('should show empty state when no prompts', async () => {
    vi.mocked(promptsApi.listPrompts).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No prompts yet')).toBeInTheDocument();
    });
  });

  it('should filter prompts by search query', async () => {
    vi.mocked(promptsApi.listPrompts).mockResolvedValue(mockPrompts);

    const user = userEvent.setup();

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('First Prompt')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search title and content/i);
    await user.type(searchInput, 'First');

    await waitFor(() => {
      expect(promptsApi.listPrompts).toHaveBeenCalledWith('team1', undefined, 'First');
    });
  });

  it('should handle delete prompt', async () => {
    vi.mocked(promptsApi.listPrompts).mockResolvedValue(mockPrompts);
    vi.mocked(promptsApi.deletePrompt).mockResolvedValue();

    const user = userEvent.setup();

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('First Prompt')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: /prompt actions/i })[0]);
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));

    // Confirm deletion
    const confirmButton = await screen.findByRole('button', { name: /delete/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(promptsApi.deletePrompt).toHaveBeenCalledWith('1', expect.anything());
    });
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(promptsApi.listPrompts).mockRejectedValue(
      new Error('Failed to load prompts')
    );

    renderDashboard();

    // Should not crash, error should be handled
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });
});
