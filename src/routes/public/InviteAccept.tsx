import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { acceptInvite } from '@/api/invites';
import { currentUser } from '@/firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/Loading';
import { useToast } from '@/components/ui/use-toast';

export function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleInvite = async () => {
      if (!token) {
        setError('Invite link is missing a token.');
        return;
      }

      // currentUser() waits for the SDK to restore a persisted session, so
      // arriving on an invite link in a fresh tab does not bounce a signed-in
      // user to /signin before Firebase has caught up.
      const user = await currentUser();

      if (!user) {
        navigate(`/signin?redirect=/invite/${token}`, { replace: true });
        return;
      }

      try {
        await acceptInvite(token);
        toast({
          title: 'Invite accepted',
          description: 'You have joined the team.',
        });
        navigate('/app', { replace: true });
      } catch (inviteError) {
        setError(inviteError instanceof Error ? inviteError.message : 'Invite is invalid or expired.');
      }
    };

    void handleInvite();
  }, [navigate, toast, token]);

  if (!error) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invite unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate('/app')}>
            Go to app
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
