import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/Loading';

function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/app';
  }

  return value;
}

async function waitForStoredSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return session;
  }

  return new Promise((resolve) => {
    let unsubscribe = () => {};

    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, 3000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession) {
        return;
      }

      window.clearTimeout(timeout);
      subscription.unsubscribe();
      resolve(authSession);
    });

    unsubscribe = () => subscription.unsubscribe();
  });
}

export function AuthCallback() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const completeAuth = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const nextPath = getSafeNextPath(searchParams.get('next'));
      const authError = searchParams.get('error_description') ?? searchParams.get('error');

      if (authError) {
        throw new Error(authError);
      }

      const code = searchParams.get('code');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else {
        const session = await waitForStoredSession();
        if (!session) {
          throw new Error('Could not complete sign-in. Please try again.');
        }
      }

      navigate(nextPath, { replace: true });
    };

    completeAuth().catch((callbackError) => {
      setError(callbackError instanceof Error ? callbackError.message : 'Authentication failed');
    });
  }, [navigate]);

  if (!error) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign-in failed</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate('/signin', { replace: true })}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
