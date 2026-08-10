import {
  confirmPasswordReset as firebaseConfirmPasswordReset,
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
  updateProfile,
  verifyPasswordResetCode,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth, googleProvider } from './client';

export type OAuthProvider = 'google' | 'github';

/**
 * Resolves once Firebase has restored a persisted session, then on every later
 * call returns immediately.
 *
 * This exists because `auth.currentUser` is **null until the SDK finishes
 * restoring**, which it does asynchronously after page load. Every ported
 * src/api module needs the acting user, and the Supabase call it replaces —
 * `supabase.auth.getUser()` — was a promise that already accounted for this. A
 * bare `auth.currentUser` would return null for the first few hundred
 * milliseconds of every hard refresh, so any query firing in that window would
 * throw "Not authenticated" against a perfectly valid session.
 */
let restored: Promise<User | null> | null = null;

export function currentUser(): Promise<User | null> {
  restored ??= new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
  // After the first restore, prefer the live value: `restored` holds whoever
  // was signed in at startup, which goes stale the moment anyone signs in or
  // out. The promise is only there to cover the initial gap.
  return restored.then((initial) => auth.currentUser ?? initial);
}

/**
 * The acting user, or a throw. Mirrors the
 * `if (!user) throw new Error('Not authenticated')` that opens nine of the
 * twelve src/api modules, so their call sites keep working unchanged.
 */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

/** For the Netlify Functions, which authenticate with a Firebase ID token. */
export async function getIdToken(): Promise<string> {
  return (await requireUser()).getIdToken();
}

export async function signUpWithPassword(
  email: string,
  password: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // Supabase's signUp sent a confirmation mail and refused sign-in until it was
  // clicked. Firebase signs the user in immediately and treats verification as
  // advisory, so the mail is sent here to keep the flow recognisable — but the
  // app no longer blocks on it. Enforcing it would be a product change, not a
  // migration one, so it is deliberately left alone.
  await sendEmailVerification(credential.user).catch(() => {
    // A failed verification mail must not fail the signup — the account exists
    // and works. Resending is available from Settings.
  });
  return credential;
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * OAuth by popup rather than redirect.
 *
 * Supabase used a full redirect to /auth/callback, where the app then had to
 * exchange a PKCE `?code=` for a session. Firebase's popup returns the
 * credential straight to the caller, which removes that round trip and the
 * route that existed to service it. It is also what qwizzle uses in production,
 * so the failure modes below are known rather than guessed at.
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<UserCredential> {
  return signInWithPopup(auth, provider === 'google' ? googleProvider() : githubProvider());
}

function githubProvider(): GithubAuthProvider {
  const p = new GithubAuthProvider();
  // Only the default scopes. The app reads the profile and nothing else, and a
  // consent screen asking for repository access would be alarming and wrong.
  p.addScope('read:user');
  return p;
}

/**
 * Turns an auth error into something worth showing a user, or null when the
 * "failure" is just someone closing a popup.
 *
 * Firebase reports a dismissed popup as an error. Surfacing that as a red toast
 * tells people something broke when they simply changed their mind, so those
 * two codes map to null and callers skip the toast.
 */
export function describeAuthError(error: unknown): string | null {
  const code = (error as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup — allow popups for this site and try again.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      // Deliberately does not distinguish the three: saying "no such user"
      // confirms which addresses have accounts to anyone who asks.
      return 'That email and password combination is not right.';
    case 'auth/email-already-in-use':
      return 'That email already has an account. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password must be at least six characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      // A reset link that was already used, or has aged out. Reset codes are
      // single-use, so "I clicked it twice" lands here too.
      return 'That reset link has expired or was already used. Request a new one.';
    case 'auth/account-exists-with-different-credential':
      // Real risk here: three of five accounts have more than one provider
      // linked. Firebase blocks the second provider until the identities are
      // linked, and the raw message does not say which one to use.
      return 'This email is already registered with a different sign-in method. Use the one you signed up with.';
    default:
      return (error as { message?: string }).message ?? 'Authentication failed.';
  }
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/signin`,
  });
}

/**
 * Checks a reset link's `oobCode` and returns the address it belongs to.
 *
 * Supabase's reset link created a short-lived recovery *session*, so
 * ResetPassword asked `getSession()` whether the link was still good. Firebase
 * issues a one-time code in the URL instead and grants no session at all, so
 * "is this link still valid" becomes this call, and the reset itself is
 * `completePasswordReset` below — neither requires anyone to be signed in.
 */
export async function verifyPasswordResetToken(oobCode: string): Promise<string> {
  return verifyPasswordResetCode(auth, oobCode);
}

/** Consumes the `oobCode` from a reset link and sets the new password. */
export async function completePasswordReset(
  oobCode: string,
  newPassword: string
): Promise<void> {
  await firebaseConfirmPasswordReset(auth, oobCode, newPassword);
}

export async function updatePassword(password: string): Promise<void> {
  await firebaseUpdatePassword(await requireUser(), password);
}

export async function updateDisplayName(displayName: string): Promise<void> {
  await updateProfile(await requireUser(), { displayName });
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
