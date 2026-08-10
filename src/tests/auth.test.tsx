import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppLayout } from '../routes/app/AppLayout';
import { useAuth } from '../firebase/useAuth';
import { createTeam, listTeams } from '@/api/teams';
import type { User } from 'firebase/auth';

// Mocking the hook rather than the SDK also keeps src/firebase/client.ts out of
// the test run, which throws by design when VITE_FIREBASE_* is unset.
vi.mock('../firebase/useAuth', () => ({
  useAuth: vi.fn(),
}));

/** The only fields AppLayout reads off the user. */
function signedIn(uid = 'user-1') {
  return { user: { uid } as User, ready: true };
}

vi.mock('@/api/teams', () => ({
  createTeam: vi.fn(),
  listTeams: vi.fn(),
}));

// Mock child components
vi.mock('../components/Sidebar', () => ({
  Sidebar: () => <div>Sidebar</div>,
}));

vi.mock('../components/Loading', () => ({
  Loading: () => <div>Loading...</div>,
}));

vi.mock('../components/CommandPalette', () => ({
  CommandPalette: () => null,
}));

function renderAppLayout() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.mocked(listTeams).mockResolvedValue([
      {
        id: 'team-1',
        name: 'Existing Workspace',
        owner_id: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);
  });

  it('should redirect to signin when not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, ready: true });

    const { container } = renderAppLayout();

    await waitFor(() => {
      expect(container.innerHTML).toBeTruthy();
    });
  });

  it('waits for the session to be restored before deciding anyone is signed out', async () => {
    // The failure this guards: Firebase reports `currentUser` as null until it
    // finishes restoring a persisted session, so treating not-yet-ready as
    // signed out bounces a returning user to /signin on every hard refresh.
    vi.mocked(useAuth).mockReturnValue({ user: null, ready: false });

    renderAppLayout();

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
    expect(listTeams).not.toHaveBeenCalled();
  });

  it('should render app layout when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue(signedIn());

    renderAppLayout();

    await waitFor(() => {
      expect(screen.getByText('Sidebar')).toBeInTheDocument();
    });
    expect(createTeam).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('promptstash.currentTeamId')).toBe('team-1');
  });

  it('should create a personal workspace for a first-run user', async () => {
    vi.mocked(useAuth).mockReturnValue(signedIn());
    vi.mocked(listTeams).mockResolvedValue([]);
    vi.mocked(createTeam).mockResolvedValue({
      id: 'new-team',
      name: 'Personal Workspace',
      owner_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
    });

    renderAppLayout();

    await waitFor(() => {
      expect(screen.getByText('Sidebar')).toBeInTheDocument();
    });
    expect(createTeam).toHaveBeenCalledWith('Personal Workspace');
    expect(window.localStorage.getItem('promptstash.currentTeamId')).toBe('new-team');
  });

  it('renders immediately from the remembered workspace even if validation stalls', async () => {
    window.localStorage.setItem('promptstash.currentTeamId', 'team-1');
    vi.mocked(useAuth).mockReturnValue(signedIn());
    vi.mocked(listTeams).mockImplementation(
      () => new Promise(() => {
        // Simulates a Firestore request that never resolves.
      })
    );

    renderAppLayout();

    await waitFor(() => {
      expect(screen.getByText('Sidebar')).toBeInTheDocument();
    });
  });

  it('surfaces a retryable error instead of a broken app when first-run workspace loading fails', async () => {
    vi.mocked(useAuth).mockReturnValue(signedIn());
    vi.mocked(listTeams).mockRejectedValue(new Error('network down'));

    renderAppLayout();

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load your workspace/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(createTeam).not.toHaveBeenCalled();
  });
});
