import { describe, it, expect, vi } from 'vitest';
import { resolveWorkspaceId, DEFAULT_WORKSPACE_NAME } from '@/lib/workspace';
import type { Team } from '@/lib/types';

function team(id: string, createdAt: string, name = `Team ${id}`): Team {
  return { id, name, owner_id: 'user-1', created_at: createdAt } as Team;
}

describe('resolveWorkspaceId', () => {
  it('keeps a stored team id that is still accessible', async () => {
    const listTeams = vi.fn().mockResolvedValue([
      team('a', '2024-01-01T00:00:00Z'),
      team('b', '2024-02-01T00:00:00Z'),
    ]);
    const createTeam = vi.fn();

    const id = await resolveWorkspaceId('b', { listTeams, createTeam });

    expect(id).toBe('b');
    expect(createTeam).not.toHaveBeenCalled();
  });

  it('falls back to the OLDEST team when the stored id is gone (stable across logins)', async () => {
    const listTeams = vi.fn().mockResolvedValue([
      team('newer', '2025-06-01T00:00:00Z'),
      team('oldest', '2024-01-01T00:00:00Z'),
      team('mid', '2024-06-01T00:00:00Z'),
    ]);
    const createTeam = vi.fn();

    const id = await resolveWorkspaceId('deleted-team', { listTeams, createTeam });

    expect(id).toBe('oldest');
    expect(createTeam).not.toHaveBeenCalled();
  });

  it('picks the oldest team when nothing is stored (new device, existing account)', async () => {
    const listTeams = vi.fn().mockResolvedValue([
      team('second', '2024-05-01T00:00:00Z'),
      team('first', '2024-01-01T00:00:00Z'),
    ]);
    const createTeam = vi.fn();

    const id = await resolveWorkspaceId(undefined, { listTeams, createTeam });

    expect(id).toBe('first');
    expect(createTeam).not.toHaveBeenCalled();
  });

  it('creates a default workspace only when the team list is genuinely empty', async () => {
    const listTeams = vi.fn().mockResolvedValue([]);
    const createTeam = vi.fn().mockResolvedValue(team('fresh', '2026-01-01T00:00:00Z'));

    const id = await resolveWorkspaceId(undefined, { listTeams, createTeam });

    expect(id).toBe('fresh');
    expect(createTeam).toHaveBeenCalledWith(DEFAULT_WORKSPACE_NAME);
  });

  it('propagates a failed team list instead of forking a duplicate workspace', async () => {
    const listTeams = vi.fn().mockRejectedValue(new Error('network down'));
    const createTeam = vi.fn();

    await expect(resolveWorkspaceId(undefined, { listTeams, createTeam })).rejects.toThrow(
      'network down'
    );
    expect(createTeam).not.toHaveBeenCalled();
  });
});
