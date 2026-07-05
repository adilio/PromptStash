import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { resolveWorkspaceId, CURRENT_TEAM_STORAGE_KEY } from '@/lib/workspace';
import { Shell } from '@/components/Shell';
import { Sidebar } from '@/components/Sidebar';
import { Loading } from '@/components/Loading';
import { CommandPalette } from '@/components/CommandPalette';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { TemplateGallery } from '@/components/TemplateGallery';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import type { Stage } from '@/lib/types';

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
  const [workspaceError, setWorkspaceError] = useState('');
  const [currentTeamId, setCurrentTeamIdState] = useState<string | undefined>(() => {
    return window.localStorage.getItem(CURRENT_TEAM_STORAGE_KEY) ?? undefined;
  });
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [folderDropHandler, setFolderDropHandler] = useState<((folderId: string | null) => void) | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const setCurrentTeamId = (teamId: string) => {
    window.localStorage.setItem(CURRENT_TEAM_STORAGE_KEY, teamId);
    setCurrentTeamIdState(teamId);
  };

  const ensureWorkspace = async (timeoutMs?: number) => {
    const storedTeamId = window.localStorage.getItem(CURRENT_TEAM_STORAGE_KEY) ?? undefined;

    const resolution = resolveWorkspaceId(storedTeamId);
    const teamId = timeoutMs
      ? await Promise.race([
          resolution,
          new Promise<never>((_resolve, reject) => {
            window.setTimeout(
              () => reject(new Error('Loading your workspace timed out. Check your connection and try again.')),
              timeoutMs
            );
          }),
        ])
      : await resolution;

    if (teamId !== storedTeamId) {
      setCurrentTeamId(teamId);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useKeyboardShortcut({
    key: '\\',
    ctrlKey: true,
    callback: () => setSidebarOpen((v) => !v),
  });

  useKeyboardShortcut({
    key: '?',
    callback: () => setShortcutsHelpOpen(true),
  });

  const navigateToNewPrompt = () => {
    const search = currentFolderId ? `?folder=${encodeURIComponent(currentFolderId)}` : '';
    navigate(`/app/prompts/new${search}`);
  };

  const handleStageFilter = (stage: Stage) => {
    const stages = searchParams.get('stages');
    const currentStages = stages ? stages.split(',') as Stage[] : [];
    const newStages = currentStages.includes(stage)
      ? currentStages.filter(s => s !== stage)
      : [...currentStages, stage];

    if (newStages.length > 0) {
      searchParams.set('stages', newStages.join(','));
    } else {
      searchParams.delete('stages');
    }
    setSearchParams(searchParams);
    navigate('/app');
  };

  useEffect(() => {
    checkAuth();

    // Keep the app in sync with the auth session: a sign-out (or a failed
    // token refresh) must not leave the user on a silently broken app where
    // every write is rejected by RLS.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/signin');
      }
    });

    return () => subscription.unsubscribe();
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

      const storedTeamId = window.localStorage.getItem(CURRENT_TEAM_STORAGE_KEY);

      if (storedTeamId) {
        // Fast path: render immediately with the remembered workspace and
        // re-validate it in the background (it may have been deleted or the
        // user removed from it).
        setLoading(false);
        void ensureWorkspace().catch((error) => {
          console.error('Workspace validation failed:', error);
        });
        return;
      }

      // No remembered workspace (first run or a new device): the app must
      // not render writable UI until the workspace association is settled —
      // this was the root of data appearing to vanish between sessions.
      try {
        await ensureWorkspace(10_000);
      } catch (error) {
        console.error('Workspace setup failed:', error);
        setWorkspaceError(
          error instanceof Error ? error.message : 'Could not load your workspace.'
        );
      }
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
    }
  };

  const retryWorkspace = async () => {
    setWorkspaceError('');
    setLoading(true);
    try {
      await ensureWorkspace(10_000);
    } catch (error) {
      setWorkspaceError(
        error instanceof Error ? error.message : 'Could not load your workspace.'
      );
    }
    setLoading(false);
  };

  if (loading) {
    return <Loading />;
  }

  if (workspaceError && !currentTeamId) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ps-bg)',
          color: 'var(--ps-fg)',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            border: '1px solid var(--ps-hairline)',
            background: 'var(--ps-bg-elev)',
            borderRadius: 12,
            padding: '28px 24px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Couldn&apos;t load your workspace</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--ps-fg-faint)' }}>
            {workspaceError}
          </p>
          <button
            type="button"
            onClick={() => void retryWorkspace()}
            style={{
              appearance: 'none',
              border: '1px solid var(--ps-hairline)',
              background: 'var(--ps-accent)',
              color: 'var(--ps-bg)',
              borderRadius: 8,
              padding: '10px 18px',
              fontFamily: 'inherit',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
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
            templateGalleryOpen,
            setTemplateGalleryOpen,
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
        onStageFilter={handleStageFilter}
        onBrowseTemplates={() => setTemplateGalleryOpen(true)}
      />
      <ShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
      <TemplateGallery open={templateGalleryOpen} onClose={() => setTemplateGalleryOpen(false)} currentTeamId={currentTeamId} />
    </Shell>
  );
}
