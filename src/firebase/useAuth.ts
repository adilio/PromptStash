import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './client';

export interface AuthState {
  user: User | null;
  /**
   * False until Firebase has restored (or ruled out) a persisted session.
   *
   * Route guards must wait for this. Treating a not-yet-restored session as
   * signed out bounces a returning user to /signin on every hard refresh,
   * which is the failure the Supabase code avoided by awaiting getSession()
   * before rendering.
   */
  ready: boolean;
}

/**
 * Replaces the inline `supabase.auth.onAuthStateChange` + `getSession()` pair
 * used in AppLayout, AuthCallback and ResetPassword.
 *
 * onAuthStateChanged fires once with the restored user (or null) before any
 * user interaction, so it covers what getSession() did separately — which is
 * why `ready` is set from inside the listener rather than alongside it.
 *
 * Callers should note that `user.id` becomes `user.uid`.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, ready: false });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setState({ user, ready: true });
    });
  }, []);

  return state;
}
