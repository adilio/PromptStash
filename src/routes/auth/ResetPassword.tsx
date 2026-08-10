import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  completePasswordReset,
  describeAuthError,
  verifyPasswordResetToken,
} from '@/firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/Loading';
import { useToast } from '@/components/ui/use-toast';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingCode, setCheckingCode] = useState(true);
  const [resetEmail, setResetEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Firebase puts the one-time code in the URL as `oobCode`. Supabase instead
  // opened a short-lived recovery *session*, which is why this page used to ask
  // getSession() whether the link was still good; now the link itself is the
  // credential and nobody is signed in while resetting.
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!oobCode) {
      setCheckingCode(false);
      return;
    }

    let active = true;

    verifyPasswordResetToken(oobCode)
      .then((email) => {
        if (active) setResetEmail(email);
      })
      .catch(() => {
        // Expired, already used, or tampered with — all indistinguishable to
        // the user, and all mean "ask for a new link".
      })
      .finally(() => {
        if (active) setCheckingCode(false);
      });

    return () => {
      active = false;
    };
  }, [oobCode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!oobCode) return;

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Use at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Confirm your new password and try again.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await completePasswordReset(oobCode, password);

      toast({
        title: 'Password updated',
        description: 'Sign in with your new password.',
      });
      // Straight to /signin rather than /app: consuming the code does not sign
      // anyone in, so /app would only bounce back here via the route guard.
      navigate('/signin', { replace: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: describeAuthError(error) ?? 'Could not update password',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (checkingCode) {
    return <Loading />;
  }

  if (!resetEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset link expired</CardTitle>
            <CardDescription>
              Request a new password reset link from the sign-in page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/signin')}>
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Choose a new password for {resetEmail}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
