import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Folder,
  Plus,
  LogOut,
  Settings,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  Clock,
  Moon,
  Sun,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { listTeams } from '@/api/teams';
import { listFolders } from '@/api/folders';
import { useTheme } from '@/hooks/useTheme';
import type { Team, Folder as FolderType } from '@/lib/types';

interface SidebarProps {
  currentTeamId?: string;
  currentFolderId?: string | null;
  onTeamChange?: (teamId: string) => void;
  onFolderChange?: (folderId: string | null) => void;
  onFolderDrop?: (folderId: string | null) => void;
  onNewPrompt?: () => void;
}

function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, color: 'var(--ps-accent)' }}
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 9h16M4 15h16" />
      <path d="M10 6h4M10 12h4M10 18h4" />
    </svg>
  );
}

function NavItem({
  icon,
  label,
  badge,
  active,
  indent,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  active?: boolean;
  indent?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    height: 30,
    padding: indent ? '0 8px 0 28px' : '0 8px',
    borderRadius: 6,
    color: active ? 'var(--ps-fg)' : 'var(--ps-fg-muted)',
    fontSize: 13,
    cursor: 'pointer',
    userSelect: 'none',
    background: active ? 'var(--ps-bg-elev)' : 'transparent',
    fontWeight: active ? 500 : 400,
    boxShadow: active ? 'var(--ps-shadow-sm)' : 'none',
    textDecoration: 'none',
    transition: 'background 100ms, color 100ms',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  };

  const iconStyle: React.CSSProperties = {
    color: active ? 'var(--ps-accent)' : 'var(--ps-fg-faint)',
    flexShrink: 0,
    width: 16,
    height: 16,
  };

  const content = (
    <>
      <span style={iconStyle}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {badge != null && (
        <span style={{ fontSize: 11, color: 'var(--ps-fg-faint)', fontVariantNumeric: 'tabular-nums', marginLeft: 'auto' }}>
          {badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link to={href} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" style={style} onClick={onClick}>
      {content}
    </button>
  );
}

export function Sidebar({
  currentTeamId,
  currentFolderId,
  onTeamChange,
  onFolderChange,
  onFolderDrop,
  onNewPrompt,
}: SidebarProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadTeams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentTeamId) {
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

  const currentTeam = teams.find((t) => t.id === currentTeamId);
  const teamInitial = currentTeam?.name?.charAt(0)?.toUpperCase() ?? '?';
  const isAllActive = location.pathname === '/app' && !currentFolderId;

  const rootFolders = folders.filter((f) => !f.parent_id);

  return (
    <nav
      style={{
        width: 240,
        flexShrink: 0,
        background: 'var(--ps-bg-sunken)',
        borderRight: '1px solid var(--ps-hairline-soft)',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 12px',
        gap: 4,
        overflowY: 'auto',
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 8px 14px',
          borderBottom: '1px solid var(--ps-hairline-soft)',
          marginBottom: 10,
        }}
      >
        <BrandMark size={20} />
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--ps-fg)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
          }}
        >
          PromptStash
        </span>
      </div>

      {/* Workspace switcher */}
      <div
        style={{ position: 'relative', marginBottom: 12 }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setShowTeamPicker(false);
          }
        }}
      >
        <button
          type="button"
          onClick={() => setShowTeamPicker((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            width: '100%',
            border: '1px solid var(--ps-hairline)',
            background: 'var(--ps-bg-elev)',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              background: 'var(--ps-accent)',
              color: 'var(--ps-accent-fg)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {teamInitial}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.2,
                color: 'var(--ps-fg)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentTeam?.name ?? 'Select workspace'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ps-fg-faint)', lineHeight: 1.2 }}>
              Personal
            </div>
          </div>
          <ChevronsUpDown style={{ width: 14, height: 14, color: 'var(--ps-fg-faint)', flexShrink: 0 }} />
        </button>

        {showTeamPicker && teams.length > 1 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              background: 'var(--ps-bg-elev)',
              border: '1px solid var(--ps-hairline)',
              borderRadius: 8,
              boxShadow: 'var(--ps-shadow-md)',
              zIndex: 20,
              overflow: 'hidden',
            }}
          >
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => {
                  onTeamChange?.(team.id);
                  setShowTeamPicker(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  width: '100%',
                  border: 0,
                  background: team.id === currentTeamId ? 'var(--ps-accent-soft)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 13,
                  color: team.id === currentTeamId ? 'var(--ps-accent)' : 'var(--ps-fg)',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: 'var(--ps-accent)',
                    color: 'var(--ps-accent-fg)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {team.name.charAt(0).toUpperCase()}
                </span>
                {team.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Prompt button */}
      <button
        type="button"
        onClick={onNewPrompt}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 10px',
          marginBottom: 8,
          border: 0,
          borderRadius: 6,
          background: 'var(--ps-accent)',
          color: 'var(--ps-accent-fg)',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          width: '100%',
          letterSpacing: '-0.005em',
        }}
      >
        <Plus style={{ width: 14, height: 14 }} />
        New prompt
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
            padding: '1px 5px',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 4,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          ⌘N
        </span>
      </button>

      {/* System folders */}
      <NavItem
        icon={<FileText style={{ width: 16, height: 16 }} />}
        label="All prompts"
        active={isAllActive}
        onClick={() => {
          onFolderChange?.(null);
          navigate('/app');
        }}
      />
      <NavItem
        icon={<Clock style={{ width: 16, height: 16 }} />}
        label="Recent"
        active={false}
        onClick={() => {
          onFolderChange?.(null);
          navigate('/app');
        }}
      />

      {/* Folders section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 8px 6px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--ps-fg-faint)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        <span>Folders</span>
        <button
          type="button"
          style={{
            appearance: 'none',
            background: 'transparent',
            border: 0,
            color: 'var(--ps-fg-faint)',
            cursor: 'pointer',
            padding: 2,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          title="New folder"
        >
          <Plus style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {rootFolders.map((folder) => {
        const active = currentFolderId === folder.id;

        const handleClick = () => {
          onFolderChange?.(folder.id);
          navigate(`/app/f/${folder.id}`);
        };

        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          onFolderDrop?.(folder.id);
          setDropTargetFolder(null);
        };

        return (
          <div
            key={folder.id}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDropTargetFolder(folder.id); }}
            onDragLeave={() => setDropTargetFolder(null)}
            style={{
              borderRadius: 6,
              outline: dropTargetFolder === folder.id ? '2px solid var(--ps-accent)' : 'none',
            }}
          >
            <button
              type="button"
              onClick={handleClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 30,
                padding: '0 8px',
                borderRadius: 6,
                color: active ? 'var(--ps-fg)' : 'var(--ps-fg-muted)',
                fontSize: 13,
                cursor: 'pointer',
                userSelect: 'none',
                background: active ? 'var(--ps-bg-elev)' : 'transparent',
                fontWeight: active ? 500 : 400,
                boxShadow: active ? 'var(--ps-shadow-sm)' : 'none',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                transition: 'background 100ms, color 100ms',
              }}
            >
              <ChevronRight
                style={{
                  width: 12,
                  height: 12,
                  color: 'var(--ps-fg-dim)',
                  flexShrink: 0,
                }}
              />
              <Folder
                style={{
                  width: 14,
                  height: 14,
                  color: dropTargetFolder === folder.id ? 'var(--ps-accent)' : 'var(--ps-fg-dim)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {folder.name}
              </span>
            </button>
          </div>
        );
      })}

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--ps-hairline-soft)',
          paddingTop: 10,
        }}
      >
        <NavItem
          icon={<Settings style={{ width: 16, height: 16 }} />}
          label="Settings"
          href="/app/settings"
        />
        <NavItem
          icon={<LogOut style={{ width: 16, height: 16 }} />}
          label="Sign out"
          onClick={handleSignOut}
        />
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 30,
            padding: '0 8px',
            borderRadius: 6,
            color: 'var(--ps-fg-muted)',
            fontSize: 13,
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            width: '100%',
            textAlign: 'left',
          }}
        >
          {theme === 'dark' ? (
            <Sun style={{ width: 16, height: 16, color: 'var(--ps-fg-faint)' }} />
          ) : (
            <Moon style={{ width: 16, height: 16, color: 'var(--ps-fg-faint)' }} />
          )}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </nav>
  );
}
