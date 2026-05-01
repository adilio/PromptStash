import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listTeams, getTeam, createTeam, updateTeam, deleteTeam } from '@/api/teams';
import { supabase } from '@/lib/supabase';
import type { MockSupabaseQuery, MockUser } from '../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('Teams API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listTeams', () => {
    it('should list teams for current user', async () => {
      const mockUser = { id: 'user1' };
      const mockTeams = [
        { id: 'team1', name: 'Team 1' },
        { id: 'team2', name: 'Team 2' },
      ];

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as MockUser },
        error: null,
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await listTeams();

      expect(supabase.from).toHaveBeenCalledWith('memberships');
      expect(mockQuery.select).toHaveBeenCalledWith('team_id, teams(*)');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user1');
      expect(result).toHaveLength(2);
    });

    it('should throw error if not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(listTeams()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getTeam', () => {
    it('should get a team by id', async () => {
      const mockTeam = {
        id: 'team1',
        name: 'Test Team',
        created_at: '2024-01-01',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeam, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await getTeam('team1');

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'team1');
      expect(result).toEqual(mockTeam);
    });
  });

  describe('createTeam', () => {
    it('should create a team and add user as owner', async () => {
      const mockUser = { id: 'user1' };
      const mockTeam = {
        id: 'team1',
        name: 'New Team',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as MockUser },
        error: null,
      });

      // Mock team creation
      const mockTeamQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeam, error: null }),
      };

      // Mock membership creation
      const mockMembershipQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamQuery as MockSupabaseQuery)
        .mockReturnValueOnce(mockMembershipQuery as MockSupabaseQuery);

      const result = await createTeam({ name: 'New Team' });

      expect(mockTeamQuery.insert).toHaveBeenCalledWith({ name: 'New Team' });
      expect(mockMembershipQuery.insert).toHaveBeenCalledWith({
        team_id: 'team1',
        user_id: 'user1',
        role: 'owner',
      });
      expect(result).toEqual(mockTeam);
    });

    it('should throw error if not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(createTeam({ name: 'Test' })).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateTeam', () => {
    it('should update a team', async () => {
      const mockTeam = {
        id: 'team1',
        name: 'Updated Name',
      };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeam, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await updateTeam('team1', { name: 'Updated Name' });

      expect(mockQuery.update).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'team1');
      expect(result).toEqual(mockTeam);
    });
  });

  describe('deleteTeam', () => {
    it('should delete a team', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await deleteTeam('team1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'team1');
    });
  });
});
