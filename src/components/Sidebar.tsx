import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Folder,
  Plus,
  LogOut,
  Home,
  Settings,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ThemeToggle } from './ThemeToggle';
import { supabase } from '@/lib/supabase';
import { listTeams } from '@/api/teams';
import { listFolders } from '@/api/folders';
import type { Team, Folder as FolderType } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface SidebarProps {
  currentTeamId?: string;
  onTeamChange?: (teamId: string) => void;
  onFolderDrop?: (folderId: string | null) => void;
}

export function Sidebar({ currentTeamId, onTeamChange, onFolderDrop }: SidebarProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTeams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentTeamId) {
      if (teams.length === 0) {
        loadTeams();
      }
      loadFolders(currentTeamId);
    }
  }, [currentTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTeams = async () => {
    try {
      const data = await listTeams();
      setTeams(data);
      if (data.length > 0 && !currentTeamId) {
        onTeamChange?.(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadFolders = async (teamId: string) => {
    try {
      const data = await listFolders(teamId);
      setFolders(data);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const rootFolders = folders.filter((f) => !f.parent_id);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/40">
      <div className="border-b p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">PromptStash</h1>
        <ThemeToggle />
      </div>

      <div className="border-b p-4">
        {teams.length > 0 && (
          <Select value={currentTeamId} onValueChange={onTeamChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          <Link to="/app">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          <div className="pt-4">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-muted-foreground">Folders</span>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {rootFolders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  expanded={expandedFolders.has(folder.id)}
                  onToggle={() => toggleFolder(folder.id)}
                  isDropTarget={dropTargetFolder === folder.id}
                  onDrop={onFolderDrop}
                  onDragOver={() => setDropTargetFolder(folder.id)}
                  onDragLeave={() => setDropTargetFolder(null)}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t p-2 space-y-1">
        <Link to="/app/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

function FolderItem({
  folder,
  expanded,
  onToggle,
  isDropTarget = false,
  onDrop,
  onDragOver,
  onDragLeave,
}: {
  folder: FolderType;
  expanded: boolean;
  onToggle: () => void;
  isDropTarget?: boolean;
  onDrop?: (folderId: string | null) => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    onToggle();
    navigate(`/app/f/${folder.id}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(folder.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver?.();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave?.();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`rounded-md transition-colors ${
        isDropTarget ? 'bg-primary/10 ring-2 ring-primary' : ''
      }`}
    >
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={handleClick}
      >
        {expanded ? (
          <ChevronDown className="mr-1 h-3 w-3" />
        ) : (
          <ChevronRight className="mr-1 h-3 w-3" />
        )}
        <Folder className={`mr-2 h-4 w-4 ${isDropTarget ? 'text-primary' : ''}`} />
        {folder.name}
      </Button>
    </div>
  );
}
