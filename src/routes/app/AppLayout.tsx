import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Shell } from '@/components/Shell';
import { Sidebar } from '@/components/Sidebar';
import { Loading } from '@/components/Loading';

export function AppLayout() {
  const [loading, setLoading] = useState(true);
  const [currentTeamId, setCurrentTeamId] = useState<string>();
  const [folderDropHandler, setFolderDropHandler] = useState<((folderId: string | null) => void) | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        onTeamChange={setCurrentTeamId}
        onFolderDrop={folderDropHandler}
      />
      <main className="flex-1 overflow-auto">
        <Outlet context={{ currentTeamId, setCurrentTeamId, setFolderDropHandler }} />
      </main>
    </Shell>
  );
}
