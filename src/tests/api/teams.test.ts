import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listTeams, getTeam, createTeam, updateTeam, deleteTeam } from '@/api/teams';
import { supabase } from '@/lib/supabase';
import type { MockSupabaseQuery } from '../mocks/supabase';

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
    // Mock supabase.auth.getUser to return a user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null,
    });
  });

  describe('listTeams', () => {
    it('should list teams for current user', async () => {
      const mockTeams = [
        { id: 'team1', name: 'Team 1' },
        { id: 'team2', name: 'Team 2' },
      ];

      const mockTeamsQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      };

      const mockMembershipsQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsQuery as MockSupabaseQuery)
        .mockReturnValueOnce(mockMembershipsQuery as MockSupabaseQuery);

      const result = await listTeams();

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(supabase.from).toHaveBeenCalledWith('memberships');
      expect(mockTeamsQuery.select).toHaveBeenCalledWith('*');
      expect(mockTeamsQuery.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(mockMembershipsQuery.select).toHaveBeenCalledWith('teams(*)');
      expect(result).toHaveLength(2);
    });

    it('should include teams available through memberships', async () => {
      const mockTeamsQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const mockMembershipsQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { teams: { id: 'team1', name: 'Adilio', created_at: '2024-01-01' } },
          ],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsQuery as MockSupabaseQuery)
        .mockReturnValueOnce(mockMembershipsQuery as MockSupabaseQuery);

      const result = await listTeams();

      expect(result).toEqual([
        { id: 'team1', name: 'Adilio', created_at: '2024-01-01' },
      ]);
    });

    it('should use membership teams if direct team listing fails', async () => {
      const mockTeamsQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Direct list failed' } }),
      };

      const mockMembershipsQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { teams: { id: 'team1', name: 'Adilio', created_at: '2024-01-01' } },
          ],
          error: null,
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsQuery as MockSupabaseQuery)
        .mockReturnValueOnce(mockMembershipsQuery as MockSupabaseQuery);

      const result = await listTeams();

      expect(result).toEqual([
        { id: 'team1', name: 'Adilio', created_at: '2024-01-01' },
      ]);
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
      const mockTeam = {
        id: 'team1',
        name: 'New Team',
      };

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

      const result = await createTeam('New Team');

      expect(mockTeamQuery.insert).toHaveBeenCalledWith({
        name: 'New Team',
        owner_id: 'user1',
      });
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

      await expect(createTeam('Test')).rejects.toThrow('Not authenticated');
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

      const result = await updateTeam('team1', 'Updated Name');

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
