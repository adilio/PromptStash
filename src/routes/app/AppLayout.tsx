import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Shell } from '@/components/Shell';
import { Sidebar } from '@/components/Sidebar';
import { Loading } from '@/components/Loading';
import { CommandPalette } from '@/components/CommandPalette';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
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

export function AppLayout() {
  const [loading, setLoading] = useState(true);
  const [currentTeamId, setCurrentTeamId] = useState<string>();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [folderDropHandler, setFolderDropHandler] = useState<((folderId: string | null) => void) | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigateToNewPrompt = () => {
    const search = currentFolderId ? `?folder=${encodeURIComponent(currentFolderId)}` : '';
    navigate(`/app/prompts/new${search}`);
  };

  useEffect(() => {
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'n' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      navigateToNewPrompt();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentFolderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate('/signin');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/signin');
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Shell>
      <Sidebar
        currentTeamId={currentTeamId}
        currentFolderId={currentFolderId}
        onTeamChange={setCurrentTeamId}
        onFolderChange={setCurrentFolderId}
        onFolderDrop={folderDropHandler}
        onNewPrompt={navigateToNewPrompt}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 overflow-auto" style={{ position: 'relative', minWidth: 0 }}>
        <style>{`
          @media (min-width: 768px) {
            .mobile-top-bar { display: none !important; }
          }
        `}</style>
        <div className="mobile-top-bar" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--ps-hairline-soft)',
          background: 'var(--ps-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              style={{
                appearance: 'none',
                border: 0,
                background: 'transparent',
                color: 'var(--ps-fg)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Menu style={{ width: 20, height: 20 }} />
            </button>
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
        </div>
        <Outlet
          context={{
            currentTeamId,
            setCurrentTeamId,
            currentFolderId,
            setCurrentFolderId,
            setFolderDropHandler,
          }}
        />
      </main>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        currentTeamId={currentTeamId}
        currentFolderId={currentFolderId}
        onFolderChange={setCurrentFolderId}
        onNewPrompt={navigateToNewPrompt}
      />
    </Shell>
  );
}
