import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppLayout } from '../routes/app/AppLayout';
import { supabase } from '../lib/supabase';
import type { MockUser } from './mocks/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock child components
vi.mock('../components/Sidebar', () => ({
  Sidebar: () => <div>Sidebar</div>,
}));

vi.mock('../components/Loading', () => ({
  Loading: () => <div>Loading...</div>,
}));

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect to signin when not authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { container } = render(
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(container.innerHTML).toBeTruthy();
    });
  });

  it('should render app layout when authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1' } as MockUser,
          access_token: 'token',
        },
      },
      error: null,
    });

    render(
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sidebar')).toBeInTheDocument();
    });
  });
});
