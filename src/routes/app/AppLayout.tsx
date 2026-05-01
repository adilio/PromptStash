import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Shell } from '@/components/Shell';
import { Sidebar } from '@/components/Sidebar';
import { Loading } from '@/components/Loading';

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

export function AppLayout() {
  const [loading, setLoading] = useState(true);
  const [currentTeamId, setCurrentTeamId] = useState<string>();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderDropHandler, setFolderDropHandler] = useState<((folderId: string | null) => void) | undefined>();
  const navigate = useNavigate();

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
      />
      <main className="flex-1 overflow-auto">
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
    </Shell>
  );
}
