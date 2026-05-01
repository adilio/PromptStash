import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Settings } from '@/routes/app/Settings';
import * as teamsApi from '@/api/teams';

vi.mock('@/api/teams');

const mockTeams = [
  {
    id: 'team1',
    name: 'Test Team',
    owner_id: 'user1',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'team2',
    name: 'Another Team',
    owner_id: 'user1',
    created_at: '2024-01-02T00:00:00Z',
  },
];

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({ currentTeamId: 'team1' }),
  };
});

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings page', async () => {
    vi.mocked(teamsApi.listTeams).mockResolvedValue(mockTeams);

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    });
  });

  it('should load and display teams', async () => {
    vi.mocked(teamsApi.listTeams).mockResolvedValue(mockTeams);

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
      expect(screen.getByText('Another Team')).toBeInTheDocument();
    });
  });

  it('should handle empty teams list', async () => {
    vi.mocked(teamsApi.listTeams).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(teamsApi.listTeams).mockRejectedValue(
      new Error('Failed to load teams')
    );

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    });
  });
});
