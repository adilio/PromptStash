import { createTeam, listTeams } from '@/api/teams';
import type { Team } from '@/lib/types';

export const CURRENT_TEAM_STORAGE_KEY = 'promptstash.currentTeamId';
export const DEFAULT_WORKSPACE_NAME = 'Personal Workspace';

interface WorkspaceDeps {
  listTeams: () => Promise<Team[]>;
  createTeam: (name: string) => Promise<Team>;
}

const defaultDeps: WorkspaceDeps = { listTeams, createTeam };

/**
 * Resolve the workspace (team) the session should operate in.
 *
 * - A stored team id is kept only if the user can still see that team.
 * - Otherwise the OLDEST existing team wins — stable across logins and
 *   devices, unlike picking whatever order the list happens to arrive in.
 * - A new default workspace is created only after a SUCCESSFUL, genuinely
 *   empty team list. A failed list throws instead, so a transient error can
 *   never fork the user's data into a fresh duplicate workspace.
 */
export async function resolveWorkspaceId(
  storedTeamId: string | undefined,
  deps: WorkspaceDeps = defaultDeps
): Promise<string> {
  const teams = await deps.listTeams();

  if (storedTeamId && teams.some((team) => team.id === storedTeamId)) {
    return storedTeamId;
  }

  if (teams.length > 0) {
    const oldestFirst = [...teams].sort((a, b) =>
      (a.created_at ?? '').localeCompare(b.created_at ?? '')
    );
    return oldestFirst[0].id;
  }

  const team = await deps.createTeam(DEFAULT_WORKSPACE_NAME);
  return team.id;
}
