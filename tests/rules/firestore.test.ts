import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const OWNER = 'uid-owner';
const EDITOR = 'uid-editor';
const VIEWER = 'uid-viewer';
const STRANGER = 'uid-stranger';

const TEAM = 'team-a';
const OTHER = 'team-b';

const PUBLIC_SLUG = 'pub1ic5lug';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'promptstash-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

const iso = (offsetMs = 0) => new Date(1_770_000_000_000 + offsetMs).toISOString();

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await setDoc(doc(db, 'teams', TEAM), {
      name: 'Team A',
      owner_id: OWNER,
      created_at: iso(),
      member_ids: [OWNER, EDITOR, VIEWER],
      roles: { [OWNER]: 'owner', [EDITOR]: 'editor', [VIEWER]: 'viewer' },
    });

    await setDoc(doc(db, 'teams', OTHER), {
      name: 'Team B',
      owner_id: STRANGER,
      created_at: iso(),
      member_ids: [STRANGER],
      roles: { [STRANGER]: 'owner' },
    });

    await setDoc(doc(db, 'prompts', 'p-team'), {
      team_id: TEAM,
      folder_id: null,
      owner_id: OWNER,
      title: 'Team visible',
      body_md: '# hi',
      visibility: 'team',
      public_slug: null,
      updated_at: iso(2),
    });

    await setDoc(doc(db, 'prompts', 'p-public'), {
      team_id: TEAM,
      folder_id: null,
      owner_id: OWNER,
      title: 'World visible',
      body_md: '# hello world',
      visibility: 'public',
      public_slug: PUBLIC_SLUG,
      updated_at: iso(1),
    });

    await setDoc(doc(db, 'prompts', 'b-private'), {
      team_id: OTHER,
      folder_id: null,
      owner_id: STRANGER,
      title: 'Not yours',
      body_md: 'secret',
      visibility: 'private',
      public_slug: null,
      updated_at: iso(),
    });

    await setDoc(doc(db, 'prompts', 'p-team', 'versions', 'v1'), {
      version: 1,
      body_md: '# hi',
      edited_by: OWNER,
      edited_at: iso(),
    });

    await setDoc(doc(db, 'folders', 'f-1'), {
      team_id: TEAM,
      parent_id: null,
      name: 'Inbox',
      created_by: OWNER,
      created_at: iso(),
    });

    await setDoc(doc(db, 'tags', `${TEAM}__urgent`), {
      team_id: TEAM,
      name: 'urgent',
      created_by: OWNER,
      created_at: iso(),
    });

    await setDoc(doc(db, 'bundles', 'bun-1'), {
      team_id: TEAM,
      name: 'Bundle',
      items: [],
      created_by: OWNER,
      created_at: iso(),
      updated_at: iso(),
    });

    await setDoc(doc(db, 'prompt_runs', 'run-1'), {
      team_id: TEAM,
      prompt_id: 'p-team',
      owner_id: OWNER,
      status: 'ok',
      created_at: iso(),
    });

    await setDoc(doc(db, 'workflow_patterns', 'sys-1'), {
      team_id: null,
      name: 'System pattern',
      is_system: true,
      steps: [],
      created_by: null,
    });

    await setDoc(doc(db, 'workflow_patterns', 'wp-a'), {
      team_id: TEAM,
      name: 'Team pattern',
      is_system: false,
      steps: [],
      created_by: OWNER,
    });

    await setDoc(doc(db, 'invites', 'tok-1'), {
      team_id: TEAM,
      email: 'invitee@example.com',
      role: 'editor',
      expires_at: iso(7 * 24 * 3600 * 1000),
      used_at: null,
      created_by: OWNER,
      created_at: iso(),
    });

    await setDoc(doc(db, 'api_keys', 'sha256-of-something'), {
      user_id: OWNER,
      name: 'CLI',
      key_prefix: 'ps_abc',
      created_at: iso(),
    });

    await setDoc(doc(db, 'integrations', OWNER), {
      openrouter: { api_key: 'sk-or-secret', key_prefix: 'sk-or', updated_at: iso() },
    });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('team isolation', () => {
  it('a non-member cannot get another team\'s prompt', async () => {
    await assertFails(getDoc(doc(as(OWNER), 'prompts', 'b-private')));
  });

  it('a non-member cannot list another team\'s prompts', async () => {
    await assertFails(
      getDocs(query(collection(as(OWNER), 'prompts'), where('team_id', '==', OTHER)))
    );
  });

  it('a member can list their own team\'s prompts', async () => {
    await assertSucceeds(
      getDocs(query(collection(as(VIEWER), 'prompts'), where('team_id', '==', TEAM)))
    );
  });

  it('a non-member cannot read a team\'s folders, tags, bundles or runs', async () => {
    const db = as(STRANGER);
    await assertFails(getDocs(query(collection(db, 'folders'), where('team_id', '==', TEAM))));
    await assertFails(getDocs(query(collection(db, 'tags'), where('team_id', '==', TEAM))));
    await assertFails(getDocs(query(collection(db, 'bundles'), where('team_id', '==', TEAM))));
    await assertFails(getDocs(query(collection(db, 'prompt_runs'), where('team_id', '==', TEAM))));
  });
});

describe('roles', () => {
  it('a viewer cannot write, an editor can', async () => {
    await assertFails(updateDoc(doc(as(VIEWER), 'prompts', 'p-team'), { title: 'nope' }));
    await assertSucceeds(updateDoc(doc(as(EDITOR), 'prompts', 'p-team'), { title: 'yes' }));
  });

  it('a viewer cannot delete a prompt, an editor can', async () => {
    await assertFails(deleteDoc(doc(as(VIEWER), 'prompts', 'p-team')));
    await assertSucceeds(deleteDoc(doc(as(EDITOR), 'prompts', 'p-team')));
  });

  it('only the owner manages membership', async () => {
    const asEditor = doc(as(EDITOR), 'teams', TEAM);
    await assertFails(updateDoc(asEditor, { member_ids: [OWNER, EDITOR, VIEWER, STRANGER] }));

    const asOwner = doc(as(OWNER), 'teams', TEAM);
    await assertSucceeds(updateDoc(asOwner, { member_ids: [OWNER, EDITOR, VIEWER, STRANGER] }));
  });

  it('an owner cannot hand ownership to someone else by update', async () => {
    await assertFails(updateDoc(doc(as(OWNER), 'teams', TEAM), { owner_id: STRANGER }));
  });

  it('a team must be created with its creator as owner and member', async () => {
    const db = as(EDITOR);
    await assertFails(
      setDoc(doc(db, 'teams', 'forged'), {
        name: 'Forged',
        owner_id: OWNER,
        member_ids: [OWNER],
        roles: { [OWNER]: 'owner' },
        created_at: iso(),
      })
    );
    await assertSucceeds(
      setDoc(doc(db, 'teams', 'mine'), {
        name: 'Mine',
        owner_id: EDITOR,
        member_ids: [EDITOR],
        roles: { [EDITOR]: 'owner' },
        created_at: iso(),
      })
    );
  });
});

describe('public prompts', () => {
  it('an unauthenticated visitor can read a public prompt by slug', async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(anon(), 'prompts'),
          where('public_slug', '==', PUBLIC_SLUG),
          where('visibility', '==', 'public')
        )
      )
    );
  });

  it('dropping the visibility constraint fails, which is why getPromptBySlug keeps both', async () => {
    await assertFails(
      getDocs(query(collection(anon(), 'prompts'), where('public_slug', '==', PUBLIC_SLUG)))
    );
  });

  it('an unauthenticated visitor cannot list a team\'s prompts', async () => {
    await assertFails(
      getDocs(query(collection(anon(), 'prompts'), where('team_id', '==', TEAM)))
    );
  });

  it('an unauthenticated visitor cannot read a non-public prompt directly', async () => {
    await assertFails(getDoc(doc(anon(), 'prompts', 'p-team')));
  });
});

describe('team_id smuggling', () => {
  it('a create cannot name a team the caller cannot edit', async () => {
    await assertFails(
      setDoc(doc(as(OWNER), 'prompts', 'smuggled'), {
        team_id: OTHER,
        folder_id: null,
        owner_id: OWNER,
        title: 'Into your team',
        body_md: 'x',
        visibility: 'team',
        public_slug: null,
        updated_at: iso(),
      })
    );
  });

  it('an update cannot move a prompt into another team', async () => {
    await assertFails(updateDoc(doc(as(EDITOR), 'prompts', 'p-team'), { team_id: OTHER }));
  });

  it('a viewer cannot create a folder, tag, bundle or run', async () => {
    const db = as(VIEWER);
    const payload = { team_id: TEAM, created_by: VIEWER, created_at: iso() };
    await assertFails(setDoc(doc(db, 'folders', 'f-new'), { ...payload, name: 'x', parent_id: null }));
    await assertFails(setDoc(doc(db, 'tags', `${TEAM}__new`), { ...payload, name: 'new' }));
    await assertFails(setDoc(doc(db, 'bundles', 'b-new'), { ...payload, name: 'x', items: [] }));
    await assertFails(setDoc(doc(db, 'prompt_runs', 'r-new'), { ...payload, prompt_id: 'p-team' }));
  });
});

describe('versions', () => {
  it('a member can read version history, a non-member cannot', async () => {
    await assertSucceeds(getDocs(collection(as(VIEWER), 'prompts', 'p-team', 'versions')));
    await assertFails(getDocs(collection(as(STRANGER), 'prompts', 'p-team', 'versions')));
  });

  it('an editor can append a version', async () => {
    await assertSucceeds(
      setDoc(doc(as(EDITOR), 'prompts', 'p-team', 'versions', 'v2'), {
        version: 2,
        body_md: '# edited',
        edited_by: EDITOR,
        edited_at: iso(),
      })
    );
  });

  it('versions are immutable once written, even for the owner', async () => {
    await assertFails(
      updateDoc(doc(as(OWNER), 'prompts', 'p-team', 'versions', 'v1'), { body_md: 'rewritten' })
    );
    await assertFails(deleteDoc(doc(as(OWNER), 'prompts', 'p-team', 'versions', 'v1')));
  });
});

describe('invites', () => {
  it('a non-owner cannot list invites, which would enumerate tokens', async () => {
    await assertFails(getDocs(query(collection(as(EDITOR), 'invites'), where('team_id', '==', TEAM))));
    await assertFails(getDocs(collection(anon(), 'invites')));
  });

  it('a non-owner cannot read an invite even knowing its token', async () => {
    await assertFails(getDoc(doc(as(EDITOR), 'invites', 'tok-1')));
    await assertFails(getDoc(doc(anon(), 'invites', 'tok-1')));
  });

  it('the team owner can list and create invites', async () => {
    await assertSucceeds(
      getDocs(query(collection(as(OWNER), 'invites'), where('team_id', '==', TEAM)))
    );
    await assertSucceeds(
      setDoc(doc(as(OWNER), 'invites', 'tok-2'), {
        team_id: TEAM,
        email: 'other@example.com',
        role: 'viewer',
        expires_at: iso(),
        used_at: null,
        created_by: OWNER,
        created_at: iso(),
      })
    );
  });

  it('an editor cannot create an invite to their own team', async () => {
    await assertFails(
      setDoc(doc(as(EDITOR), 'invites', 'tok-3'), {
        team_id: TEAM,
        email: 'x@example.com',
        role: 'editor',
        expires_at: iso(),
        used_at: null,
        created_by: EDITOR,
        created_at: iso(),
      })
    );
  });
});

describe('workflow patterns', () => {
  it('any signed-in user can read system patterns', async () => {
    await assertSucceeds(
      getDocs(query(collection(as(STRANGER), 'workflow_patterns'), where('is_system', '==', true)))
    );
  });

  it('an unauthenticated visitor cannot read system patterns', async () => {
    await assertFails(
      getDocs(query(collection(anon(), 'workflow_patterns'), where('is_system', '==', true)))
    );
  });

  it('nobody can edit or delete a system pattern', async () => {
    await assertFails(updateDoc(doc(as(OWNER), 'workflow_patterns', 'sys-1'), { name: 'mine now' }));
    await assertFails(deleteDoc(doc(as(OWNER), 'workflow_patterns', 'sys-1')));
  });

  it('a team pattern cannot be promoted to a system pattern', async () => {
    await assertFails(updateDoc(doc(as(OWNER), 'workflow_patterns', 'wp-a'), { is_system: true }));
  });

  it('a create cannot claim is_system', async () => {
    await assertFails(
      setDoc(doc(as(OWNER), 'workflow_patterns', 'wp-new'), {
        team_id: TEAM,
        name: 'Sneaky',
        is_system: true,
        steps: [],
        created_by: OWNER,
      })
    );
  });
});

describe('server-only collections', () => {
  it('api_keys are unreachable from any client', async () => {
    for (const db of [as(OWNER), anon()]) {
      await assertFails(getDoc(doc(db, 'api_keys', 'sha256-of-something')));
      await assertFails(getDocs(collection(db, 'api_keys')));
      await assertFails(setDoc(doc(db, 'api_keys', 'forged'), { user_id: OWNER }));
    }
  });

  it('integrations are unreachable from any client, including their own owner', async () => {
    for (const db of [as(OWNER), anon()]) {
      await assertFails(getDoc(doc(db, 'integrations', OWNER)));
      await assertFails(getDocs(collection(db, 'integrations')));
      await assertFails(setDoc(doc(db, 'integrations', OWNER), { openrouter: { api_key: 'x' } }));
    }
  });

  it('an unlisted collection is closed by default', async () => {
    await assertFails(setDoc(doc(as(OWNER), 'something_new', 'x'), { hello: 'world' }));
    await assertFails(getDoc(doc(as(OWNER), 'something_new', 'x')));
  });
});

// ---------------------------------------------------------------------------
// The gate. See "The assumption that must be verified before any porting" in
// docs/FIREBASE-MIGRATION-PLAN.md.
//
// Every isMember() is a get() on the same team document. Rules allow only a
// handful of document access calls per request, so a 50-prompt list read is
// affordable only if Firestore caches repeated get()s to the same path within
// one evaluation. If it does not, list views break and member_ids has to be
// denormalized onto every document — a decision that must land before Phase 4.
// ---------------------------------------------------------------------------
describe('rules get() budget', () => {
  const LIST_SIZE = 60;

  it(`a member can list ${LIST_SIZE} prompts — repeated get()s to one team doc must collapse`, async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await Promise.all(
        Array.from({ length: LIST_SIZE }, (_, i) =>
          setDoc(doc(db, 'prompts', `bulk-${i}`), {
            team_id: TEAM,
            folder_id: null,
            owner_id: OWNER,
            title: `Prompt ${i}`,
            body_md: 'x',
            visibility: 'team',
            public_slug: null,
            updated_at: iso(i * 1000),
          })
        )
      );
    });

    const results = await assertSucceeds(
      getDocs(
        query(
          collection(as(EDITOR), 'prompts'),
          where('team_id', '==', TEAM),
          orderBy('updated_at', 'desc')
        )
      )
    );
    expect(results.size).toBeGreaterThanOrEqual(LIST_SIZE);
  });

  // Control. The test above only means something if the emulator enforces the
  // access-call budget at all. This query needs one get() per document against
  // DISTINCT team documents, so no cache can collapse it — it must fail. If it
  // passes, the emulator is not counting access calls and the gate above proves
  // nothing; confirm against the real project before trusting it.
  it('distinct-path get()s DO exhaust the budget (proves the budget is enforced)', async () => {
    const MULTI = 'uid-multi';
    const TEAM_COUNT = 30;

    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await Promise.all(
        Array.from({ length: TEAM_COUNT }, (_, i) => [
          setDoc(doc(db, 'teams', `multi-${i}`), {
            name: `Multi ${i}`,
            owner_id: MULTI,
            created_at: iso(),
            member_ids: [MULTI],
            roles: { [MULTI]: 'owner' },
          }),
          setDoc(doc(db, 'prompts', `multi-p-${i}`), {
            team_id: `multi-${i}`,
            folder_id: 'f-multi',
            owner_id: MULTI,
            title: `Multi prompt ${i}`,
            body_md: 'x',
            visibility: 'team',
            public_slug: null,
            updated_at: iso(i * 1000),
          }),
        ]).flat()
      );
    });

    await assertFails(
      getDocs(query(collection(as(MULTI), 'prompts'), where('folder_id', '==', 'f-multi')))
    );
  });
});
