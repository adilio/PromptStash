import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listFolders, getFolder, createFolder, updateFolder, deleteFolder } from '@/api/folders';
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

describe('Folders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock supabase.auth.getUser to return a user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null,
    });
  });

  describe('listFolders', () => {
    it('should list all folders for a team', async () => {
      const mockFolders = [
        { id: '1', name: 'Folder 1', team_id: 'team1', parent_id: null },
        { id: '2', name: 'Folder 2', team_id: 'team1', parent_id: '1' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockFolders, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await listFolders('team1');

      expect(supabase.from).toHaveBeenCalledWith('folders');
      expect(mockQuery.eq).toHaveBeenCalledWith('team_id', 'team1');
      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(result).toEqual(mockFolders);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Database error');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await expect(listFolders('team1')).rejects.toThrow('Database error');
    });
  });

  describe('getFolder', () => {
    it('should get a folder by id', async () => {
      const mockFolder = {
        id: '1',
        name: 'Test Folder',
        team_id: 'team1',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockFolder, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await getFolder('1');

      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual(mockFolder);
    });
  });

  describe('createFolder', () => {
    it('should create a new folder', async () => {
      const mockFolder = {
        id: '1',
        name: 'New Folder',
        team_id: 'team1',
        parent_id: null,
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockFolder, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await createFolder('team1', 'New Folder');

      expect(mockQuery.insert).toHaveBeenCalledWith({
        team_id: 'team1',
        name: 'New Folder',
        parent_id: null,
        created_by: 'user1',
      });
      expect(result).toEqual(mockFolder);
    });

    it('should create a nested folder', async () => {
      const mockFolder = {
        id: '2',
        name: 'Nested Folder',
        team_id: 'team1',
        parent_id: '1',
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockFolder, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await createFolder('team1', 'Nested Folder', '1');

      expect(mockQuery.insert).toHaveBeenCalledWith({
        team_id: 'team1',
        name: 'Nested Folder',
        parent_id: '1',
        created_by: 'user1',
      });
      expect(result.parent_id).toBe('1');
    });
  });

  describe('updateFolder', () => {
    it('should update a folder name', async () => {
      const mockFolder = {
        id: '1',
        name: 'Updated Name',
      };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockFolder, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      const result = await updateFolder('1', 'Updated Name');

      expect(mockQuery.update).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual(mockFolder);
    });
  });

  describe('deleteFolder', () => {
    it('should delete a folder', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await deleteFolder('1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Cannot delete folder with children');

      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as MockSupabaseQuery);

      await expect(deleteFolder('1')).rejects.toThrow('Cannot delete folder with children');
    });
  });
});
