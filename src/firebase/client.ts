import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;

const PRODUCTION_HOST = 'promptstash.4dl.ca';

/**
 * Use the branded production host for OAuth so Google shows "Continue to
 * promptstash.4dl.ca" rather than the Firebase project hostname. This only
 * works because netlify.toml transparently proxies the reserved /__/auth helper
 * routes to the Firebase host; local development and deploy previews have no
 * such proxy, so they keep using the configured Firebase domain.
 */
const authDomain =
  typeof window !== 'undefined' && window.location.hostname === PRODUCTION_HOST
    ? window.location.hostname
    : configuredAuthDomain;

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/**
 * Fail loudly and immediately, exactly as src/lib/supabase.ts does.
 *
 * qwizzle's equivalent client deliberately does the opposite — it exports a
 * `firebaseEnabled` flag and degrades to a null client — because that app is
 * fully playable with no account. PromptStash is not: every route behind
 * /app needs a backend, so a missing config is a broken deployment and should
 * look like one at startup rather than as a wall of failed queries later.
 *
 * Only these three are checked because they are what initializeApp genuinely
 * needs to reach a project; storageBucket and messagingSenderId matter only for
 * Storage and FCM, neither of which this app uses.
 */
if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
  throw new Error('Missing Firebase environment variables');
}

export const app: FirebaseApp = initializeApp(config as Required<typeof config>);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

/**
 * Mirrors the Supabase client's `persistSession: true`. Firebase already
 * defaults to local persistence in a browser; setting it explicitly means the
 * behaviour survives an SDK default change, and is a promise rather than a
 * throw so a private-mode browser with no writable storage still loads the app.
 */
if (typeof window !== 'undefined') {
  void setPersistence(auth, browserLocalPersistence).catch(() => {
    // Storage unavailable (private mode, blocked cookies). The session then
    // lasts as long as the tab, which beats refusing to start.
  });
}

/**
 * Point at the local emulator suite when VITE_FIREBASE_USE_EMULATOR is set, so
 * `npm run emulators` gives a full local backend with no cloud project. The
 * ports match firebase.json.
 */
if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Always land on the account chooser. Without this, a browser holding one
  // Google session signs that account straight back in after a sign-out, which
  // reads as "sign out is broken" on shared machines.
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/**
 * Firestore layout. The mapping from the 16 Postgres tables is in
 * docs/FIREBASE-MIGRATION-PLAN.md; the field naming is explained in
 * src/firebase/README.md.
 *
 *   users/{uid}
 *   teams/{teamId}                     member_ids[] + roles{} replace memberships
 *   folders/{folderId}
 *   prompts/{promptId}                 tag_ids[] replaces prompt_tags
 *   prompts/{promptId}/versions/{id}
 *   tags/{teamId}__{name}              doc id enforces unique(team_id, name)
 *   bundles/{bundleId}                 items[] replaces bundle_items
 *   workflow_patterns/{patternId}      steps[] replaces workflow_pattern_steps
 *   prompt_runs/{runId}
 *   invites/{token}                    doc id is the token
 *   api_keys/{sha256}                  server only
 *   integrations/{uid}                 server only
 */
export const COLLECTIONS = {
  users: 'users',
  teams: 'teams',
  folders: 'folders',
  prompts: 'prompts',
  versions: 'versions',
  tags: 'tags',
  bundles: 'bundles',
  workflowPatterns: 'workflow_patterns',
  promptRuns: 'prompt_runs',
  invites: 'invites',
} as const;

/**
 * Document id for a tag. Postgres enforced `unique (team_id, name)`; Firestore
 * has no unique indexes, so that guarantee has to live in the key itself —
 * same team and name, same document, and setDoc overwrites rather than piling
 * up duplicates.
 *
 * The separator is a double underscore because a team id is a UUID and a tag
 * name is free text: a single underscore appears in neither position often, but
 * a doubled one cannot be produced by the UUID half at all, so the id never
 * becomes ambiguous about where the team ends.
 */
export function tagId(teamId: string, name: string): string {
  return `${teamId}__${name.trim().toLowerCase()}`;
}
