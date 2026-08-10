# PromptStash → Firebase: complete migration plan

_Written 2026-08-09. Decision is made. This document is the work._
_Last executed 2026-08-09: **Phases 0–3 are done. Phase 4 is in progress.**_

---

## Status — read this before anything else

Work happens on branch **`firebase-migration`** (12 commits, all pushed). `main`
is untouched and still deploys the working Supabase app.

| Phase | State |
|---|---|
| 0 · Snapshot | ✅ done — `.snapshot/` holds all 16 tables + `auth.users` |
| 1 · Firebase project | ✅ done — project live, rules deployed, all providers on |
| 2 · Rules + gate | ✅ done — **the gate passed**, 33 tests green |
| 3 · `src/firebase/*` | ✅ done — client, auth adapter, useAuth |
| 4 · Port `src/api/*` | 🔧 **in progress** — auth adapter written, UI + 12 modules remain |
| 5 · Netlify Functions | ⬜ not started |
| 6 · Data import | ⬜ not started |
| 7 · Cutover | ⬜ not started |
| 8 · Decommission | ⬜ not started |

**The app currently still runs entirely on Supabase.** Everything added so far
is additive: `src/firebase/*` exists but nothing imports it. Reverting the
branch is a complete rollback.

### Two corrections that outrank everything else in this file

1. **"Nobody uses this app" is FALSE.** There are **five accounts, four of them
   other people**, with real content. The original plan leaned on this to
   justify snapshot-and-move, no rollback window and no API shim. See the
   assumption log. Adil's decision: migrate everyone, still delete Supabase at
   Phase 8 — which means Phase 7's per-account checklist is the last point at
   which a stranded user is recoverable.
2. **GitHub sign-in is in use** (3 of 5 accounts, including both users holding
   content) and the original plan never mentioned it. It is now enabled.
   Phase 6 must carry `providerUserInfo`, not just password hashes.

### Resuming in a fresh session

```
Read docs/FIREBASE-MIGRATION-PLAN.md in /Users/adil/Code/PromptStash and
continue executing it from Phase 4. Work on the firebase-migration branch,
commit atomically with /cp as you go, and append any judgement calls to the
assumption log. Run `npm run verify` before each push.
```

### What this is

PromptStash is a React + Vite prompt-library app on Supabase, deployed to
Netlify. It is being moved to Firebase because the Supabase free tier pauses
projects after 7 days of inactivity and the keep-alive built to prevent that
**ran green daily for over a week while provably not working** — a Supabase
pause warning arrived 2026-08-07 regardless. The full reasoning, including why
Firebase was chosen over Neon, is in
[`BACKEND-MIGRATION.md`](./BACKEND-MIGRATION.md). Do not re-litigate it.

### Facts you will need

| Thing | Value |
|---|---|
| Repo path | `/Users/adil/Code/PromptStash` (note: `/Users/adil/Code` is **not** a git repo) |
| GitHub | `adilio/PromptStash` |
| Live URL | `promptstash.4dl.ca` |
| Netlify site id | `ac51512c-0330-4378-8746-77f738b77321` |
| Supabase project ref | `ecpmipfpknoxeohbafxs` (org `Adilio`) |
| Netlify site **name** | `promptstsh` — note the missing `a`. Previews are `*--promptstsh.netlify.app` |
| Keep-alive cron | `adilio/4dl.ca` → `.github/workflows/supabase-keepalive.yml` |
| Stack | React 18, Vite, TypeScript, TanStack Query v5, Radix UI, Tailwind, react-router 7, vitest |
| **Firebase project** | `promptstash-4dl` (number `769531546660`) — *not* `promptstash`, which is taken |
| Firebase web app id | `1:769531546660:web:92f59024f6f0bdb12a9cb1` |
| Firestore | native mode, `nam5`, standard edition |
| Providers enabled | Email/Password, Google, **GitHub** |
| Secrets | **`.env.local`**, not `.env` — there is no `.env`. Gitignored. Holds both Supabase and `VITE_FIREBASE_*` |

**The original "nobody uses this app" claim is false — see Status above.** The
snapshot found five accounts:

| Account | Provider | Content |
|---|---|---|
| `ad***@gmail.com` (Adil) | email + google + github | 2 prompts, 6 runs, 1 API key |
| `jo***@pm.me` | github | **9 prompts, 1 bundle** |
| `me***@gilbertsanchez.com` | github | 1 prompt, **their own OpenRouter key** |
| `he***@gmail.com` | google | account only |
| `an***@andrewpla.tech` | email | account only |

No prompt is public, so no shared `/p/{slug}` link is at risk.

### Reference implementations already on this machine

Both are working Firebase apps on the free Spark plan, deployed to Netlify.
**Read them before writing new code** — they solve problems this plan assumes solved.

| Path | What to take from it |
|---|---|
| `qwizzle/src/firebase/client.ts` (160 LOC) | Client init, `VITE_FIREBASE_*` env names, and the branded-OAuth-domain trick |
| `qwizzle/src/firebase/useAuth.ts` (82 LOC) | Auth state hook |
| `qwizzle/netlify/functions/palette.ts` | Netlify Function pattern, CORS, token verification |
| `qwizzle/firestore.rules` | Rules layout |
| `Rhabbit/firestore.rules` | The better rules reference — helper-function structure, `get()`/`exists()` usage |
| `Rhabbit/firebase.json` | Minimal config |

Neither repo commits `.firebaserc` or `firestore.indexes.json`. Both are now
committed here.

### Tooling — all installed and authenticated

```sh
firebase --version          # 15.26.0, logged in as adilio@gmail.com
netlify                     # installed, authenticated as adilio@gmail.com
# gcloud is installed but NOT authenticated — and is not needed, see the log
# `supabase` CLI is absent — Phase 0 used REST, no CLI needed
# node 25 strips TypeScript natively: `node scripts/foo.ts` just works
```

### Commands

```sh
npm run verify        # lint + build + unit tests + rules tests. Use before every push.
npm run test:rules    # 33 rules tests against a throwaway emulator project
npm run emulators     # auth :9099 + firestore :8080
node scripts/export-supabase.ts   # re-take the Phase 0 snapshot
```

---

## Working agreement — non-negotiable

- **No AI attribution in any git or GitHub artifact.** No `Co-Authored-By:`, no
  `Claude-Session:`, no "Generated with" line, no branch name containing
  "claude". Branch this work `firebase-migration`. Commits author as the repo's
  configured user.

  This is permanent and strict: `Co-Authored-By:` writes into a GitHub per-repo
  contributor cache that **never recomputes**, and the only remedy is deleting
  and recreating the repository. It cost `adilio/pwsh.ca` a full delete/recreate
  in July 2026.
- **Never use `--no-verify`**, never disable `core.hooksPath`. The global
  `commit-msg`/`pre-push` hooks in `~/.git-hooks` enforce the above.
- **Commit per module**, detailed messages, push as you go.
- Where a question arises mid-execution, take the safest defensible default,
  **append it to the [Assumption log](#assumption-log)**, and keep going.
- Run **`npm run verify`** before every push — lint + build + unit tests + rules
  tests. (Do not use `npm test`: it is `vitest` in watch mode and will hang.)
  Lint is `--max-warnings 0`; it will fail on unused Supabase imports as you
  remove them.

---

## What PromptStash is, architecturally

So you don't have to rediscover it.

| Metric | Value |
|---|---|
| App source (excl. tests) | 15,396 LOC |
| Data layer `src/api/` | 1,327 LOC / 12 modules |
| Supabase call sites (non-test) | 50 across 23 files |
| Supabase refs in tests | 92 across 2,935 LOC |
| Postgres tables | 16 |
| RLS policies | 25+ |
| Security-definer RPCs | 6 |
| Edge function | `supabase/functions/api/index.ts`, 490 LOC |

**Routes:** `app/{Dashboard,PromptEditor,PromptView,BundleList,BundleEditor,Settings,Learn,LearnConcept,AppLayout}`,
`auth/{SignIn,AuthCallback,ResetPassword}`, `public/{PublicPrompt,InviteAccept}`.

**Auth surface in use:** `signUp`, `signInWithPassword`, `signInWithOAuth`
(**Google _and_ GitHub** — `SignIn.tsx` already renders both buttons),
`resetPasswordForEmail`, `updateUser`, `signOut`, `getUser`, `getSession`,
`onAuthStateChange`. PKCE flow. All have direct Firebase Auth equivalents, and
all are wrapped in `src/firebase/auth.ts`.

**~32 `supabase.auth.*` references across 20 files**, 9 of them outside
`src/api/`. The "six auth call sites" figure below is wrong; see the log.

**The edge function does two unrelated jobs:** a public API-key-authenticated
`/v1/*` REST API, and an OpenRouter proxy at `/v1/openrouter/run`.

---

## The three decisions that shape everything

### 1. `src/api/*` is the seam

All twelve modules export domain functions returning domain types:

```ts
export async function listPrompts(
  teamId: string, folderId?: string, searchQuery?: string
): Promise<PromptWithTags[]>
```

No caller sees Supabase. **Keep every exported signature identical** and the
port becomes module-by-module and independently testable, while ~15,000 LOC of
components never change. The only non-`src/api` files needing real work are the
six auth call sites plus two stray queries (both handled in Phase 4).

### 2. Keep `snake_case` field names in Firestore

Domain types (`team_id`, `body_md`, `public_slug`, `updated_at`) are generated
from the Postgres schema and flow straight into components. Firestore documents
keep those exact names, so ported functions return **byte-identical shapes**.

Un-idiomatic for Firestore, deliberately. The alternative renames every field
across every component, test and type for zero functional gain and real
regression risk. Adil has no deadline, but "no deadline" is not a reason to take
on a large mechanical diff with no benefit. **Document this in
`src/firebase/README.md`** so nobody later "fixes" it.

### 3. Server code goes to Netlify Functions, not Cloud Functions

Cloud Functions [require the Blaze plan][blaze]. Netlify Functions are free and
already the established pattern here (`qwizzle/netlify/functions/palette.ts`).

[blaze]: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans

**Important divergence from qwizzle:** that function deliberately avoids a
service-account key by verifying tokens through Identity Toolkit
`accounts:lookup`, using only the public web API key. Reuse that for *token
verification*. But PromptStash's functions must also **read and write Firestore
while bypassing rules** — `api_keys` lookup by hash, `integrations` read,
`accept_invite` transaction. That genuinely requires `firebase-admin` with a
service account. So: one service-account JSON in Netlify env, and it is the only
new secret this migration introduces. Never commit it.

---

## Firestore data model

16 tables → 11 collections. Three collapse into parents, one is deleted.

```
users/{uid}
    display_name, created_at

teams/{teamId}
    name, owner_id, created_at
    member_ids: [uid]                    ← denormalized from memberships
    roles: { uid: 'owner'|'editor'|'viewer' }

folders/{folderId}
    team_id, parent_id, name, created_by, created_at

prompts/{promptId}
    team_id, folder_id, owner_id, title, body_md, agent_format, stage,
    espanso_trigger, visibility, public_slug, workflow_pattern_id,
    workflow_step_id, workflow_label, created_at, updated_at
    tag_ids: [tagId]                     ← replaces prompt_tags
  └ versions/{versionId}                 (subcollection)
        version, body_md, edited_by, edited_at

tags/{teamId}__{name}                    ← doc ID enforces unique(team_id,name)
    team_id, name, created_by, created_at

bundles/{bundleId}
    team_id, name, description, target_format, created_by, created_at, updated_at
    items: [{prompt_id, position, included, heading_override}]   ← replaces bundle_items

workflow_patterns/{patternId}
    team_id|null, name, description, source_label, source_url, is_system, created_by
    steps: [{key, label, short_label, color, position}]          ← replaces workflow_pattern_steps

prompt_runs/{runId}
    team_id, prompt_id, prompt_version, owner_id, model, input_md, output_md,
    status, error, prompt_tokens, completion_tokens, total_tokens,
    cost_estimate, duration_ms, temperature, max_completion_tokens, created_at

invites/{token}                          ← doc ID = token, enforcing uniqueness
    team_id, email, role, expires_at, used_at, created_by, created_at

api_keys/{keyHash}                       ← doc ID = SHA-256 hash. SERVER ONLY.
    user_id, name, key_prefix, created_at, last_used_at

integrations/{uid}                       ← SERVER ONLY.
    openrouter: { api_key, key_prefix, updated_at }
```

### What collapses, and why

| Table | Becomes | Rationale |
|---|---|---|
| `memberships` | `member_ids[]` + `roles{}` on the team doc | **Load-bearing.** One `get()` on the team doc answers every authz question in the rules. |
| `prompt_tags` | `tag_ids[]` on the prompt | Idiomatic Firestore; enables `array-contains`; removes a join. |
| `bundle_items` | `items[]` on the bundle | Ordered, small, always read with its parent. |
| `workflow_pattern_steps` | `steps[]` on the pattern | 5–10 steps, always read together. |
| `prompt_versions` | subcollection | Natural parent–child; unbounded, so not embedded. |
| **`shares`** | **deleted** | `src/api/shares.ts` is imported by **nothing** (verified). Schema calls it "not fully implemented in MVP". Drop the module and the table. |

Denormalizing memberships is the cheap direction: a role change rewrites one
small, frequently-read, rarely-written document.

---

## Security rules

Write to `firestore.rules`. This is the complete file — the RLS model translates
directly because every policy bottoms out in `is_team_member(team_id)` or a role
check, and both are now fields on one document.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function team(tid)  { return get(/databases/$(database)/documents/teams/$(tid)).data; }
    function isMember(tid) { return signedIn() && request.auth.uid in team(tid).member_ids; }
    function canEdit(tid)  { return signedIn() && team(tid).roles[request.auth.uid] in ['owner','editor']; }
    function isOwner(tid)  { return signedIn() && team(tid).owner_id == request.auth.uid; }
    function promptTeam(pid) {
      return get(/databases/$(database)/documents/prompts/$(pid)).data.team_id;
    }

    match /users/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }

    match /teams/{tid} {
      allow get, list: if signedIn()
        && (request.auth.uid in resource.data.member_ids
            || resource.data.owner_id == request.auth.uid);
      allow create: if signedIn()
        && request.resource.data.owner_id == request.auth.uid
        && request.auth.uid in request.resource.data.member_ids;
      allow update, delete: if isOwner(tid);
    }

    // Mirrors prompts_read: visibility='public' OR is_team_member(team_id).
    // Unauthenticated slug reads work because getPromptBySlug constrains BOTH
    // visibility=='public' AND public_slug, so every returned document
    // satisfies the first branch.
    match /prompts/{pid} {
      allow get, list: if resource.data.visibility == 'public'
                          || isMember(resource.data.team_id);
      allow create: if canEdit(request.resource.data.team_id);
      allow update: if canEdit(resource.data.team_id)
                       && canEdit(request.resource.data.team_id);
      allow delete: if canEdit(resource.data.team_id);

      match /versions/{vid} {
        allow get, list: if isMember(promptTeam(pid));
        allow create:    if canEdit(promptTeam(pid));
        allow update, delete: if false;   // versions are immutable history
      }
    }

    match /folders/{id} {
      allow get, list: if isMember(resource.data.team_id);
      allow create: if canEdit(request.resource.data.team_id);
      allow update: if canEdit(resource.data.team_id) && canEdit(request.resource.data.team_id);
      allow delete: if canEdit(resource.data.team_id);
    }

    match /tags/{id} {
      allow get, list: if isMember(resource.data.team_id);
      allow create: if canEdit(request.resource.data.team_id);
      allow update: if canEdit(resource.data.team_id) && canEdit(request.resource.data.team_id);
      allow delete: if canEdit(resource.data.team_id);
    }

    match /bundles/{id} {
      allow get, list: if isMember(resource.data.team_id);
      allow create: if canEdit(request.resource.data.team_id);
      allow update: if canEdit(resource.data.team_id) && canEdit(request.resource.data.team_id);
      allow delete: if canEdit(resource.data.team_id);
    }

    match /prompt_runs/{id} {
      allow get, list: if isMember(resource.data.team_id);
      allow create: if canEdit(request.resource.data.team_id);
      allow update, delete: if canEdit(resource.data.team_id);
    }

    match /workflow_patterns/{id} {
      allow get, list: if (resource.data.is_system == true && signedIn())
                          || (resource.data.team_id != null && isMember(resource.data.team_id));
      allow create: if request.resource.data.team_id != null
                       && request.resource.data.is_system == false
                       && canEdit(request.resource.data.team_id);
      allow update, delete: if resource.data.team_id != null
                               && resource.data.is_system == false
                               && canEdit(resource.data.team_id);
    }

    // Accepting an invite requires knowing the unguessable token, which is the
    // document id. `get` only — never `list`, or tokens become enumerable.
    match /invites/{token} {
      allow get:    if signedIn();
      allow list:   if isOwner(resource.data.team_id);
      allow create: if isOwner(request.resource.data.team_id);
      allow update, delete: if isOwner(resource.data.team_id);
      // The accept path (email match + membership write) runs server-side.
    }

    // Server-only. Reachable exclusively via admin SDK in Netlify Functions.
    // Mirrors `revoke all on model_integrations from anon, authenticated`.
    match /api_keys/{h}     { allow read, write: if false; }
    match /integrations/{u} { allow read, write: if false; }
  }
}
```

### ⚠ The assumption that must be verified before any porting

Rules allow **10 document-access calls per single-document request and 20 per
query**. Every `isMember()` is a `get()`. Firestore is documented to cache
repeated `get()`s to the *same path* within one evaluation, which should make a
200-prompt list cost 1 read rather than 200 — **but verify it in the emulator
rather than assume it.**

If it does not hold, list views break and the fix is denormalizing `member_ids`
onto every document (write amplification on membership change). **That decision
must land before Phase 4 writes code depending on it.** It is Phase 2's exit
criterion and the single highest-risk item in this plan.

---

## Phases

Nobody uses the app, so this is a snapshot-and-move, not a zero-downtime
migration. Phases are still ordered so each is independently revertible and the
irreversible act comes last.

### Phase 0 — Snapshot everything · ✅ DONE

> Ran 2026-08-09 via `scripts/export-supabase.ts`. `.snapshot/` holds all 16
> tables plus `auth.users`; counts are in the assumption log. The migration no
> longer depends on Supabase staying awake. **This is where the five-user
> finding came from.** Re-run the script any time to refresh.
>
> _Original text below, kept for the record._

The Supabase project is under an active pause warning and its keep-alive is
green-but-broken. **Rather than nurse the keep-alive, take a complete snapshot
now and stop caring whether it pauses.** A paused project can be restored from
the dashboard; a snapshot on disk makes even that unnecessary.

**Adil does, in one dashboard sitting:**
1. Supabase → Project Settings → API → copy the **`service_role`** key.
2. Save it to `PromptStash/.env` (gitignored) as `SUPABASE_SERVICE_ROLE_KEY=…`.
   Also add `VITE_SUPABASE_URL=https://ecpmipfpknoxeohbafxs.supabase.co`.

   ⚠ **Append, do not overwrite.** Overwriting a `.env` during the qwizzle
   migration destroyed an unrecoverable Anthropic key. Use `>>`, never `>`.
3. Run this in the SQL editor and paste the result into the
   [Assumption log](#assumption-log):

```sql
select 'users' t, count(*) from auth.users
union all select 'teams',    count(*) from public.teams
union all select 'members',  count(*) from public.memberships
union all select 'folders',  count(*) from public.folders
union all select 'prompts',  count(*) from public.prompts
union all select 'versions', count(*) from public.prompt_versions
union all select 'tags',     count(*) from public.tags
union all select 'bundles',  count(*) from public.bundles
union all select 'runs',     count(*) from public.prompt_runs
union all select 'invites',  count(*) from public.invites
union all select 'api_keys', count(*) from public.api_keys
union all select 'patterns', count(*) from public.workflow_patterns
order by 1;
```

**Then the session does:** write `scripts/export-supabase.ts` that pulls every
table over PostgREST with the service-role key into `.snapshot/*.json`
(gitignored), plus `auth.users` via the Admin API for the bcrypt hashes.

**Exit:** `.snapshot/` holds every table as JSON, counts match step 3, and the
migration no longer depends on Supabase staying awake. Commit the script, not
the snapshot.

> The write-based keep-alive fix documented in `4dl.ca/docs/KEEPALIVE.md`
> remains available if you would rather keep the project healthy too. With a
> snapshot in hand it is optional — skip it unless the migration stalls for
> weeks.

### Phase 1 — Firebase project · ✅ DONE

> Project `promptstash-4dl`, Firestore native `nam5`, rules + indexes deployed,
> Email/Password + Google + GitHub enabled, authorized domains set. Details in
> "Phase 1 as built" in the assumption log.
>
> _Original text below, kept for the record._

```sh
npm i -g firebase-tools && firebase login
```

1. Create Firebase project **`promptstash`**, Spark plan.
2. Auth → enable **Email/Password**, **Google** and **GitHub**. GitHub is not
   optional and is not in the original plan: it is the *most* used provider
   (3 of 5 accounts, including both users holding real content). It needs a
   GitHub OAuth app whose callback is the Firebase handler URL. Add
   `promptstash.4dl.ca` and `promptstsh.netlify.app` to Authorized Domains
   (`localhost` is there by default).
3. Firestore → create in **native mode**, same region as Rhabbit for consistency.
4. Add to the repo: `firebase.json`, `.firebaserc`, `firestore.rules`,
   `firestore.indexes.json`. Copy `Rhabbit/firebase.json` as the starting point.
5. Wire the emulator suite (`firestore` + `auth`) into `npm run` scripts.
6. `npm i firebase` and `npm i -D @firebase/rules-unit-testing`.

**Branded OAuth domain** — copy qwizzle's trick so Google shows "Continue to
promptstash.4dl.ca" rather than the Firebase hostname. It needs both halves:
- `netlify.toml`: proxy `/__/auth/*` → `https://promptstash.firebaseapp.com/__/auth/:splat` (status 200)
- `client.ts`: use `window.location.hostname` as `authDomain` **only** on
  `promptstash.4dl.ca`; previews and local dev keep the configured domain,
  because they have no proxy.

**Exit:** emulator starts; `firebase deploy --only firestore:rules` succeeds.

### Phase 2 — Rules + emulator tests · ✅ DONE — **GATE PASSED**

> `firestore.rules` + `tests/rules/firestore.test.ts`, 33 tests green, deployed
> to the live project. **The `get()` budget assumption holds** — repeated
> `get()`s to one team doc collapse, so `member_ids` does NOT need denormalizing
> and the data model below stands. The suite carries a control proving the
> emulator actually enforces the budget, so the pass is meaningful. Still worth
> re-confirming against real Firestore once Phase 6 loads data.
>
> _Original text below, kept for the record._

Write the rules above, then a `@firebase/rules-unit-testing` suite covering:

- non-member cannot read another team's prompts (get **and** list)
- viewer cannot write; editor can; owner can manage members
- unauthenticated **can** read a public prompt by slug
- unauthenticated **cannot** list a team's prompts
- `invites` cannot be listed by a non-owner (token enumeration)
- `prompts/{id}/versions` are immutable once written
- `api_keys` and `integrations` are unreachable from any client, signed in or not
- a `create` cannot smuggle a `team_id` the caller can't edit
- **the `get()` budget on a realistic list query (≥50 prompts)** ← the gate

**Exit:** all green. If the `get()` caching assumption fails, denormalize
`member_ids` onto every document and update the model above **before Phase 4**.

### Phase 3 — `src/firebase/*` client layer · ✅ DONE

> `client.ts`, `auth.ts`, `useAuth.ts`, `README.md`. Static imports and throws
> on missing env (unlike qwizzle's lazy null-client — reasoning in the log).
> Nothing imports these yet.
>
> _Original text below, kept for the record._

Mirror `qwizzle/src/firebase/`:

```
src/firebase/
  client.ts     app init, auth, db; VITE_FIREBASE_* config
  useAuth.ts    auth state hook
  README.md     ← document the snake_case decision here
```

Lives **alongside** `src/lib/supabase.ts`. Nothing is deleted yet; both clients
coexist through Phase 6. Add `VITE_FIREBASE_*` to `.env.example` and to Netlify
in **deploy-preview context only**, so production is untouched.

Note: current `src/lib/supabase.ts` **throws** if env vars are missing. Decide
whether Firebase should throw too (recommended here — unlike qwizzle, this app
is useless without a backend) and note it in the log.

### Phase 4 — Port `src/api/*` · 🔧 IN PROGRESS

> **Done:** `src/firebase/auth.ts` — the auth adapter (`currentUser`,
> `requireUser`, `getIdToken`, sign-in/up, OAuth by popup, reset, updates,
> `describeAuthError`).
>
> **Also done:** the 9 non-`src/api` auth files, in one commit — `SignIn`,
> `ResetPassword`, `Settings`, `AppLayout`, `InviteAccept`, `Sidebar`,
> `TemplateGallery`, `BundleEditor`, and `AuthCallback` **deleted** along with
> its route. Auth cannot flip over gradually; see the assumption log.
> **The app is broken from that commit until the last module lands** — that is
> expected, and is why this stays on the branch.
>
> **Next:** the 12 modules below, using `requireUser()` where they currently
> call `supabase.auth.getUser()`. The only non-auth Supabase calls left outside
> `src/api/` are `Dashboard.tsx:452` and `CommandPalette.tsx:60`, which go with
> `prompts.ts`.

Twelve modules, smallest first so the pattern is proven on low-risk code. **Each
keeps its exported signatures. Each is one commit with its tests converted.**

| # | Module | LOC | Notes |
|---|---|---|---|
| 1 | ~~`shares.ts`~~ | 52 | **Delete.** Imported by nothing. Also drop its tests. |
| 2 | `invites.ts` | 40 | `accept_invite` RPC → Netlify Function (Phase 5); client just calls it |
| 3 | `runs.ts` | 51 | Straight port |
| 4 | `folders.ts` | 72 | Straight port. **Add recursive delete** — Postgres cascaded, Firestore won't |
| 5 | `versions.ts` | 76 | Version increment → `runTransaction` (was `unique(prompt_id, version)`) |
| 6 | `tags.ts` | 82 | Doc ID `{teamId}__{name}` replaces the unique constraint |
| 7 | `apikeys.ts` | 83 | Create/revoke move server-side (hashing must not be client-side) |
| 8 | `openrouter.ts` | 130 | All 3 RPCs → Netlify Function |
| 9 | `patterns.ts` | 148 | `steps[]` embedded; system patterns readable by all signed-in users |
| 10 | `bundles.ts` | 165 | `items[]` embedded; removes the `prompts!inner` join |
| 11 | `teams.ts` | 171 | `list_user_teams` → `where('member_ids','array-contains',uid)`. **Add recursive delete** |
| 12 | `prompts.ts` | 257 | Biggest — see below |

**`prompts.ts` specifics:**
- `listPrompts` — drop the `plfts` branch entirely; fetch team prompts and
  filter `title`/`body_md` in memory. Firestore has no full-text search; at this
  data volume in-memory is instant. This is the one accepted feature regression.
- tags — resolve from `tag_ids[]` against a cached team-tags map. Removes the
  two-query join in both `listPrompts` and `getPrompt`.
- `getPromptBySlug` — `where('public_slug','==',slug).where('visibility','==','public')`.
  Both constraints are required for the unauthenticated rule to pass. Don't drop either.
- `makePromptPublic` — `nanoid(10)`. Postgres enforced `public_slug unique`;
  Firestore can't. Do it in a transaction that re-checks for collision.
- `updatePrompt` — set `updated_at: serverTimestamp()` explicitly. This replaces
  the `moddatetime` trigger. Same in `bundles.ts`. **Easy to forget; assert in tests.**
- `deletePrompt` — delete the `versions` subcollection first.

**Also in this phase**, close the last two non-auth leaks. `Dashboard.tsx:456`
and `CommandPalette.tsx:64` both run `count:'exact', head:true` with
`.or('stage.not.is.null,workflow_label.not.is.null')` directly against Supabase.
Move both behind a new `hasStagedPrompts(teamId)` in `src/api/prompts.ts`.
Firestore can't express that `or` on absence — fetch the team's prompts (already
cached by TanStack Query) and check in memory, or maintain a boolean. Prefer the
in-memory check; note the choice in the log.

### Phase 5 — Netlify Functions · ~6h

Port `supabase/functions/api/index.ts` (490 LOC) to `netlify/functions/`.

**Auth strategy** (see decision 3): Firebase ID tokens verify via Identity
Toolkit `accounts:lookup` (no secret, copy qwizzle). Firestore access uses
`firebase-admin` with a service account in Netlify env as
`FIREBASE_SERVICE_ACCOUNT` (JSON, single line). Never commit it.

| Endpoint | Notes |
|---|---|
| `POST /v1/openrouter/run` | Verify ID token → read `integrations/{uid}` → proxy. **Keep `AbortSignal.any([req.signal, AbortSignal.timeout(120_000)])`** — it exists to stop paid OpenRouter work when the client cancels. Do not drop it. |
| `GET /v1/prompts` | API-key auth: SHA-256 the bearer → `api_keys/{hash}` → update `last_used_at`. Search was `plfts`; filter in memory. |
| `GET/POST/PATCH/DELETE /v1/prompts/:id` | Same auth |
| `GET /v1/workspaces` | `where('member_ids','array-contains',uid)` |
| `POST /v1/invites/accept` | Was the `accept_invite` security-definer RPC. **Must stay server-side** — it validates the invite email against the caller's *verified* email, then writes membership. Firestore transaction. |
| `POST/GET/DELETE /v1/integrations/openrouter` | Replaces the 3 OpenRouter RPCs, since `integrations/*` denies all client access |

Keep paths and response envelopes identical to the current edge function. There
are no external consumers, so this is free insurance rather than a requirement.

### Phase 6 — Data · ~3h

1. **Users first.** `firebase auth:import` with `localId` set to each Supabase
   UUID. This preserves every `owner_id`/`created_by`/`edited_by` reference with
   **zero ID rewriting**.

   ⚠ **Five real accounts, and three of them sign in with GitHub.** The import
   record for each must carry `providerUserInfo` — the federated identities from
   `.snapshot/auth_users.json` (`identities[].provider` and `identities[].id`,
   which is the GitHub/Google numeric subject) — or those users have no way in
   at all: there is no password to reset because they never set one.

   ```jsonc
   {
     "localId": "<supabase uuid>",
     "email": "…",
     "emailVerified": true,
     "providerUserInfo": [
       { "providerId": "github.com", "rawId": "<identity.id>", "email": "…" }
     ]
   }
   ```

   Password hashes are a separate, optional concern — the Admin API does not
   return them (see the log). Only two accounts use email/password at all, and
   both can reset. Federated identities are the part that must not be dropped.
2. `scripts/import-firestore.ts` transforms `.snapshot/*.json` per the model
   (fold memberships into `member_ids`/`roles`, `prompt_tags` into `tag_ids`,
   `bundle_items` into `items[]`, `workflow_pattern_steps` into `steps[]`) and
   writes via admin SDK, **preserving all UUIDs as document IDs**.
3. Re-seed `is_system` workflow patterns from
   `supabase/migrations/20260705020000_workflow_patterns.sql`.
4. Verify per-collection counts against Phase 0.

If the counts come back trivially small, re-creating by hand is a legitimate
alternative — but the script is more reliable and barely slower.

### Phase 7 — Cutover · ~3h

1. Set `VITE_FIREBASE_*` and `FIREBASE_SERVICE_ACCOUNT` in Netlify **production**.
2. Deploy. Leave the Supabase env vars in place but unused — reverting the
   bundle is then a complete rollback.
3. Verify in production (full checklist below).
4. Watch 48h.

**Google sign-in cannot be driven by browser automation** — the popup needs a
real click. This was the one step of qwizzle's migration that couldn't be
verified unattended. Expect the same; it needs a human minute.

### Phase 8 — Decommission · ~2h · only after Phase 7 is clean

In this order:

1. Remove PromptStash from `4dl.ca/.github/workflows/supabase-keepalive.yml`;
   delete `PROMPTSTASH_SERVICE_ROLE_KEY` if it was ever set.
2. `git rm -r supabase/`; delete `src/lib/supabase.ts` and
   `src/lib/database.types.ts`; `npm rm @supabase/supabase-js`.
3. Remove Supabase env vars from Netlify.
4. **Delete Supabase project `ecpmipfpknoxeohbafxs`** ← only irreversible act.
5. Update `README.md` and `.env.example`.

**While you are in that dashboard:** qwizzle's project `qxdipvsqnjzqbzkuzcua` is
still alive with its own keep-alive cron, its migration finished weeks ago, and
step 3 of the prior plan was never completed. Delete it too and remove
`qwizzle/.github/workflows/supabase-keepalive.yml`. That retires the last
Supabase project behind the 4dl.ca apps. (ThreatDex still has one, kept alive by
its own nightly writes — leave it.)

---

## Verification checklist

Run in production after Phase 7. Every line must pass before Phase 8.

- [ ] Sign up with email/password; receive and complete verification
- [ ] Sign in with email/password
- [ ] Sign in with Google (**manual click required**)
- [ ] Sign in with GitHub (**manual click required**)
- [ ] Password reset end-to-end
- [ ] Sign out clears session; protected routes redirect
- [ ] Create / rename / delete a team; team list loads
- [ ] Create nested folders; delete a folder and confirm **no orphaned prompts**
- [ ] Create, edit, delete a prompt
- [ ] Prompt search returns expected results (in-memory filter)
- [ ] Add/remove tags; tag filter works
- [ ] Version history records an entry per edit; restore works
- [ ] Make a prompt public → open `/p/{slug}` **signed out** → renders
- [ ] Make it private again → the slug 404s
- [ ] Create a bundle, reorder items, export
- [ ] Save an OpenRouter key in Settings; run a prompt; cancel mid-run and
      confirm the upstream call aborts
- [ ] Run history records the run
- [ ] Create an invite; accept it from a second account; role is correct
- [ ] Create an API key; call `/v1/prompts` and `/v1/workspaces` with it
- [ ] Revoke the key; the call now 401s
- [ ] `api_keys` and `integrations` unreadable from the browser console
- [ ] `updated_at` changes on edit (the `moddatetime` replacement)
- [ ] Delete a team and confirm no orphaned prompts/folders/tags/bundles/runs

### Every account, before Phase 8

Phase 8 deletes the Supabase project, and Adil chose to keep that as planned —
so there is no fallback afterwards. These five lines are what stands between a
stranded user and permanent data loss, and they must all pass **first**. Verify
against the imported UIDs, not fresh signups.

- [ ] `ad***@gmail.com` — email, Google **and** GitHub all resolve to the one
      account (this user has all three identities linked; they must not split
      into duplicates on first sign-in)
- [ ] `jo***@pm.me` — GitHub. Their **9 prompts and 1 bundle** are present
- [ ] `me***@gilbertsanchez.com` — GitHub. Their 1 prompt is present, and their
      stored OpenRouter key still works or has been deliberately dropped
- [ ] `he***@gmail.com` — Google
- [ ] `an***@andrewpla.tech` — email/password, via a reset
- [ ] Each lands in **their own** workspace and cannot see another's prompts
      (the rules suite covers this, but confirm once against real data)

---

## Effort

| Phase | Est. | State |
|---|---|---|
| 0 · Snapshot | 1h | ✅ |
| 1 · Firebase project | 3h | ✅ |
| 2 · Rules + emulator tests (**gate**) | 8h | ✅ |
| 3 · `src/firebase/*` | 3h | ✅ |
| 4 · Port `src/api/*` | 14h | 🔧 auth adapter done; UI + 12 modules left |
| 5 · Netlify Functions | 6h | ⬜ |
| 6 · Data | 3h | ⬜ |
| 7 · Cutover | 3h | ⬜ |
| 8 · Decommission | 2h | ⬜ |
| Tests (92 refs, threaded through 4–5) | 7h | ⬜ |
| **Remaining** | **≈33h** | |

Focused hours, not calendar. There is no deadline; the ordering matters more
than the estimate.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| ~~Rules `get()` budget~~ | ~~High~~ | ✅ **Retired.** Phase 2 gate passed with a control proving the budget is enforced. Re-confirm against real Firestore at Phase 6. |
| **Stranding a real user at cutover** | **High** | Four other people have accounts; three sign in with GitHub. Phase 6 must carry `providerUserInfo`. Phase 7's per-account checklist is the last recovery point before Phase 8 deletes the source. |
| **Someone else's OpenRouter key** in `model_integrations` | Medium | It is a live third-party secret, and it is now also in `.snapshot/` on disk. Do not commit `.snapshot/`; decide deliberately whether to migrate the key or drop it and let them re-enter it. |
| **No cascade deletes** — orphans on team/folder/prompt delete | **High** | Postgres did this for free via `on delete cascade`; it is the easiest thing in this plan to forget. Explicit recursive deletes in `teams.ts`, `folders.ts`, `prompts.ts`; assert in tests; two checklist lines. |
| Supabase pauses mid-migration | Low | Phase 0 snapshot removes the dependency entirely. |
| Losing full-text search | Low (accepted) | In-memory filter. Revisit only if the corpus grows. |
| `updated_at` no longer automatic | Low | `serverTimestamp()` at every write site; assert in tests. |
| `public_slug` collision | Very low | Transactional re-check in `makePromptPublic`. |
| Service-account key leaking | Medium | Netlify env only, never committed. It is the only new secret. |

---

## Assumption log

Append here during execution. Include the date, the question, the default taken,
and why. This section is the record for the next session.

- **2026-08-09** — "Nobody uses this app" (Adil, verbatim). Taken to mean: no
  other accounts, no external `/v1/*` consumers, no uptime obligation. Justifies
  snapshot-and-move over zero-downtime, and no API compatibility window. Revisit
  Phases 6–8 if false.
- **2026-08-09** — `snake_case` retained in Firestore documents. Rationale in
  decision 2. Re-document in `src/firebase/README.md`.
- **2026-08-09** — `shares` deleted rather than ported. `src/api/shares.ts` has
  no importers anywhere in `src/`; the schema itself calls it unimplemented.
- **2026-08-09** — Row counts from Phase 0, from `.snapshot/_counts.json`:
  teams 4, memberships 4, folders 0, prompts 12, prompt_versions 0, tags 0,
  prompt_tags 0, shares 0, invites 0, api_keys 1, model_integrations 1,
  bundles 1, bundle_items 8, prompt_runs 6, workflow_patterns 5,
  workflow_pattern_steps 21, **auth.users 5**.

- **2026-08-09** — 🚨 **"Nobody uses this app" is false, and the plan says to
  stop here.** The snapshot shows **five accounts, four of them other people**,
  with content:

  | Account | Signed up | Last seen | Provider | Content |
  |---|---|---|---|---|
  | `ad***@gmail.com` (Adil) | 2026-05-01 | 2026-07-26 | email, google, github | 2 prompts, 6 runs, 1 API key |
  | `jo***@pm.me` | 2026-07-26 | 2026-07-26 | github | **9 prompts, 1 bundle** |
  | `me***@gilbertsanchez.com` | 2026-05-04 | **2026-07-09** | github | 1 prompt, **an OpenRouter key** |
  | `he***@gmail.com` | 2026-05-26 | 2026-05-26 | google | account only |
  | `an***@andrewpla.tech` | 2026-05-01 | 2026-05-01 | email | account only |

  `jo***@pm.me` holds more content than Adil does. `me***@gilbertsanchez.com`
  came back after two months and has stored **their own OpenRouter API key** in
  `model_integrations` — someone else's live secret, now also sitting in
  `.snapshot/` on disk (gitignored, but worth knowing it is there).

  What this invalidates: Phase 8 step 4 deletes four other people's data, and
  the "no rollback window, no API compatibility shim" stance was justified
  solely by this assumption. **Do not run Phase 8 without an explicit decision.**
  One relief: **zero public prompts**, so no shared `/p/{slug}` links break.

- **2026-08-09** — 🚨 **GitHub OAuth is in use and the plan does not mention
  it.** The plan's "Auth surface in use" lists `signInWithOAuth` as Google only.
  Providers in the snapshot are **github ×3**, google ×2, email ×2 — GitHub is
  the *most* used. Phase 1 enabled Email/Password and Google, which would strand
  three of five users, including both users holding real content.

  Consequences: Firebase Auth needs the **GitHub provider enabled** and a GitHub
  OAuth app with the new callback URL, and Phase 6's `auth:import` must carry
  **`providerUserInfo`** (the federated identities) — not just the bcrypt
  hashes, which is all the plan discusses. Import a GitHub user without their
  federated identity and they cannot sign in at all: there is no password to
  reset, because they never had one.

- **2026-08-09** — Phase 1 is complete including the console steps.
  Email/Password, Google **and** GitHub are enabled, and authorized domains are
  `localhost`, `promptstash-4dl.firebaseapp.com`, `promptstash-4dl.web.app`,
  `promptstash.4dl.ca`, `promptstsh.netlify.app`. Verify any of this without the
  console — the client config is public:

  ```sh
  curl -s "https://identitytoolkit.googleapis.com/v1/projects?key=$VITE_FIREBASE_API_KEY"
  ```

  Note the endpoint takes **no project id**; `/v1/projects/{id}` 404s and that
  404 says nothing about whether Auth is configured.
- **2026-08-09** — `SignIn.tsx` already has a **GitHub button** —
  `handleOAuth('google' | 'github')`. The plan's "Auth surface in use" lists
  OAuth as Google only, which understated the code as well as the users. No new
  sign-in UI is needed for GitHub, only the provider and the import.
- **2026-08-09** — OAuth moves to **popup** (`signInWithPopup`), not redirect.
  Supabase redirected to `/auth/callback` and exchanged a PKCE `?code=` there;
  Firebase's popup hands the credential back to the caller, which removes both
  the round trip and the route that served it. `AuthCallback.tsx` should go away
  in the Phase 4 UI port rather than shrink. Popup-blocked and popup-dismissed
  are handled explicitly in `describeAuthError`.
- **2026-08-09** — `currentUser()` in `src/firebase/auth.ts` awaits the first
  `onAuthStateChanged` instead of reading `auth.currentUser` directly.
  `auth.currentUser` is **null until the SDK finishes restoring the session**,
  so a bare read returns null for the first moments of every hard refresh and
  any query firing in that window throws "Not authenticated" against a valid
  session. The Supabase call it replaces, `supabase.auth.getUser()`, was already
  a promise and hid this. Nine of the twelve api modules depend on it.
- **2026-08-09** — Email verification is **sent but not enforced**, where
  Supabase refused sign-in until confirmed. Firebase signs the user in
  immediately and treats verification as advisory. Enforcing it would be a
  product change rather than a migration one, so it was left alone — flagging it
  because it is a real behaviour difference, not an oversight.
- **2026-08-09 — decisions on both, from Adil:**
  1. **Migrate all five accounts and their data, and delete the Supabase project
     at Phase 8 as originally planned.** No indefinite fallback.
  2. **Enable GitHub in Firebase Auth** and carry the federated identities, so
     no user has to do anything to get back in.

  Because there is no fallback once Phase 8 runs, **Phase 7 now has to prove
  every account works before Phase 8 starts** — see the added checklist section.
  This does not delay Phase 8; it just moves the discovery of a stranded user to
  while their data still exists.
- **2026-08-09** — **The Phase 2 gate passes. `member_ids` does NOT need
  denormalizing onto every document; the model above stands and Phase 4 can be
  written against it.** A member listing 60 team prompts succeeds, so Firestore
  does collapse repeated `get()`s to the same path within one rule evaluation.
  The suite carries a deliberate control — a query needing one `get()` against
  30 *distinct* team documents, which must fail — so that a green gate cannot
  simply mean the emulator ignores the access-call budget. It fails as required,
  which is what makes the pass meaningful. Caveat: this is the emulator. Re-run
  `npm run test:rules` against the real project once it exists (Phase 1) before
  treating it as settled in production.
- **2026-08-09** — Secrets live in `.env.local`, not `.env`. The plan said
  `PromptStash/.env` was empty; there is in fact no `.env` at all, and
  `.env.local` (gitignored) already holds `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. Phase 0's `SUPABASE_SERVICE_ROLE_KEY` appends there.
  Separately, the `SUPABASE_ACCESS_TOKEN` in that file is expired — the
  management API returns 401 — so it cannot substitute for the service-role key.
- **2026-08-09** — `invites` rules kept at **owner-only read**, against the
  plan's proposed `allow get: if signedIn()`. No client path needs to read an
  invite: `InviteAccept.tsx` calls `acceptInvite()` and nothing else, and that
  runs server-side on the admin SDK, which bypasses rules. The narrower rule is
  the one with no caller, and it matches `invites_read_owners` exactly.
- **2026-08-09** — `prompts/{id}/versions` read is narrowed to team members.
  Postgres `versions_read` also allowed reading versions of a *public* prompt;
  nothing uses that. `VersionHistoryDialog` is app-side only and `PublicPrompt`
  never requests versions. Revisit if public prompts ever show their history.
- **2026-08-09** — Rules read a nullable `team_id` as
  `resource.data.get('team_id', null)`, not as a property. A bare
  `resource.data.team_id` raises "Property team_id is undefined" when the field
  is absent, and absent is indistinguishable from explicit-null once the Phase 6
  import runs — it has no reason to write nulls out. Caught by the rules suite.
- **2026-08-09** — Added `staysEditable()`: an update must satisfy `canEdit` on
  the stored `team_id` **and** leave `team_id` unchanged. The plan checked
  `canEdit` on both old and new team, which permits moving a document between
  two teams the caller can edit — a cross-team move no API function performs.
  Also pinned: an owner cannot reassign `owner_id` by update.
- **2026-08-09** — Added a terminal `match /{document=**} { allow read, write:
  if false; }`. Firestore already denies unmatched paths; making it explicit
  means a collection added later is closed until someone writes a rule for it.
- **2026-08-09** — `npm test` is `vitest` in **watch mode**, so the working
  agreement's "run `npm test` before every push" would hang. Added `test:run`
  (`vitest run`), `test:rules`, `emulators`, and a `verify` script chaining
  lint + build + both test suites. Use `npm run verify`.
- **2026-08-09** — **The Admin API does not return password hashes**, contrary
  to Phase 0's "plus `auth.users` via the Admin API for the bcrypt hashes".
  GoTrue redacts `encrypted_password` from every admin response; the column is
  reachable only over SQL. This matters for Phase 6, where
  `firebase auth:import --hash-algo=BCRYPT` wants them. Two ways forward:
  run the SQL the export script prints and save it as
  `.snapshot/auth_passwords.json`, or import users without passwords and have
  them reset once after cutover. **UUIDs are preserved either way** — that is
  what every `owner_id`/`created_by`/`edited_by` actually depends on — and
  Google sign-in is unaffected. With one user, the reset is likely simpler.
  The script checks the payload rather than assuming, so it will stop warning by
  itself if a future GoTrue starts returning them.
- **2026-08-09** — Scripts are plain `.ts` run by `node scripts/foo.ts`. Node 25
  strips types natively, so no `tsx`/`ts-node` dependency is needed. `tsconfig`
  has `include: ["src"]`, so `scripts/` and `tests/` are linted but not
  typechecked by `npm run build`.
- **2026-08-09** — **The plan undercounts the auth work.** It says "the only
  non-`src/api` files needing real work are the six auth call sites"; there are
  in fact ~32 `supabase.auth.*` references across 20 files, and **9 of them are
  outside `src/api/`**: `SignIn` (4), `AuthCallback` (3), `ResetPassword` (3),
  `Settings` (4), `AppLayout` (2), `InviteAccept`, `Sidebar`, `TemplateGallery`,
  `BundleEditor`. There is no existing `useAuth` hook — session state is handled
  inline in `AppLayout`. Budget for this in Phase 4; `AuthCallback` should
  shrink, since Firebase needs no `exchangeCodeForSession` PKCE dance.
- **2026-08-09** — **Phase 4 cannot be sequenced module-by-module in a working
  app, and its ordering should change.** The plan ports `src/api/*` smallest
  first and says both clients coexist until Phase 6. Each *module* is
  independently testable, but the *app* is not independently runnable: nine of
  the twelve modules call `supabase.auth.getUser()` for the acting user, and a
  ported module needs `auth.currentUser` from Firebase instead. Auth does not
  flip over gradually — the moment `AppLayout` authenticates against Firebase,
  every unported module loses its user, and until it does, every ported one has
  none. So the real order is: **auth first (the 9 non-`src/api` files), then the
  data modules**, with the app non-functional in between. That is acceptable
  here only because nobody uses it — this is precisely the kind of thing the
  "nobody uses this app" assumption is buying, so re-read that assumption before
  starting. Do the auth port in one commit, not nine.
- **2026-08-09** — `src/firebase/client.ts` uses **static imports and throws**
  on missing env, unlike qwizzle's lazy null-client. qwizzle defers the SDK
  because that app is fully playable signed out, so most visitors never pay for
  it. Every PromptStash route behind `/app` needs a backend on first paint, so
  deferring would only add a round trip, and a missing config is a broken
  deployment that should look like one immediately. Matches `src/lib/supabase.ts`.
- **2026-08-09** — Emulator wiring is `VITE_FIREBASE_USE_EMULATOR=true`, which
  points `auth` and `db` at ports 9099/8080 from `firebase.json`.
- **2026-08-09** — **The Firebase project id is `promptstash-4dl`, not
  `promptstash`.** The bare name is taken by someone else — project ids are
  globally unique — so the `-4dl` suffix follows the existing `forkast-4dl`
  convention. Rhabbit hit the same thing and ended up `rhabbit-e8f9d`.
  Everything derived from the id was updated: `.firebaserc`, the
  `/__/auth/*` proxy target in `netlify.toml`, and `VITE_FIREBASE_*` in
  `.env.local`. `PRODUCTION_HOST` in `client.ts` stays `promptstash.4dl.ca` —
  that is the site's own domain and never depended on the project id.

- **2026-08-09** — **The reset-password page is now an `oobCode` action
  handler, and that needs one console step nobody has done yet.** Supabase's
  reset link created a short-lived recovery *session*, so `ResetPassword.tsx`
  asked `getSession()` whether the link was still good. Firebase grants no
  session; it puts a single-use code in the URL. So the page now reads
  `?oobCode=`, calls `verifyPasswordResetToken` to decide between the form and
  the "link expired" card, and calls `completePasswordReset` on submit — two
  functions added to `src/firebase/auth.ts` for it. It then sends the user to
  `/signin`, not `/app`, because consuming the code signs nobody in.

  **The console step:** Firebase's default action URL points at
  `promptstash-4dl.firebaseapp.com/__/auth/action`, its own hosted page, so
  until Authentication → Templates → Password reset → *customise action URL* is
  pointed at `https://promptstash.4dl.ca/reset-password`, this route is simply
  never reached and Firebase's generic page does the job instead. Nothing
  breaks either way; the branded page just does not appear. Add it to Phase 7.
- **2026-08-09** — `AuthCallback.tsx` **deleted**, not ported, along with the
  `/auth/callback` route. With OAuth by popup there is no `?code=` to exchange
  and no redirect to catch, so the route had no remaining job. This was already
  the recorded intent; noting the execution.
- **2026-08-09** — `AppLayout` no longer has a `checkAuth`. `useAuth()`'s single
  `onAuthStateChanged` subscription replaces both halves of the Supabase
  version — the initial `getSession()` **and** the separate `SIGNED_OUT`
  listener — since it fires on restore and on every later change. The effect is
  keyed on `user?.uid` rather than the `User` object so a token refresh handing
  back a new object identity cannot re-run workspace setup. The `ready` flag is
  load-bearing: without it, the first render of every hard refresh looks signed
  out and bounces to `/signin`. Added a test that pins exactly that.
- **2026-08-09** — **Settings shows fewer provider badges than it used to, and
  that is a fix.** The Supabase version added an `email` badge whenever
  `user.email` was set, which is true of every GitHub and Google account too —
  so all five users saw "Email" whether or not they had a password. Firebase's
  `providerData` lists only real linked providers, so a GitHub-only user now
  correctly shows GitHub alone. Firebase's ids (`password`, `google.com`,
  `github.com`) are translated back to the app's vocabulary (`email`, `google`,
  `github`) in `PROVIDER_IDS` so the badge labels and the snapshot keep speaking
  one language.
- **2026-08-09** — Display name collapses from three fields to one. Supabase
  wrote `display_name`, `full_name` and `name` into `user_metadata` together
  because each provider populated a different one; Firebase normalises all of
  them into `displayName`, so `updateDisplayName()` writes the single field and
  the read falls back to the email local part exactly as before. Deliberately
  **not** also writing `users/{uid}.display_name` — that document exists in the
  model but has no reader in `src/api/*`, and inventing a write for it here
  would be scope creep into Phase 6.
- **2026-08-09** — `auth.test.tsx` mocks `src/firebase/useAuth` rather than the
  Firebase SDK. Mocking the hook keeps `src/firebase/client.ts` out of the test
  run entirely, which matters because it **throws by design** when
  `VITE_FIREBASE_*` is unset, and the test env sets only the Supabase vars.

### Phase 1 as built

| Thing | Value |
|---|---|
| Firebase project | `promptstash-4dl` (number `769531546660`) |
| Web app id | `1:769531546660:web:92f59024f6f0bdb12a9cb1` |
| Firestore | native mode, `nam5`, standard edition — same as Rhabbit |
| Auth domain | `promptstash-4dl.firebaseapp.com` |
| Netlify site name | `promptstsh` — note the missing `a`; previews are `*--promptstsh.netlify.app` |
| Console | https://console.firebase.google.com/project/promptstash-4dl |

- **2026-08-09** — The Firestore API did not need enabling by hand.
  `firebase firestore:databases:create` fails with a 403 telling you to visit
  the Cloud console, but `firebase deploy --only firestore` enables the API,
  creates the `(default)` database, and deploys rules and indexes in one go. Use
  the deploy; it avoids needing an authenticated `gcloud` entirely.
- **2026-08-09** — `.firebaserc` is now committed, pointing at
  `promptstash-4dl`. The emulator scripts still pass
  `--project promptstash-rules-test` explicitly, so the rules suite stays
  isolated from the real project and cannot touch live data.
- **2026-08-09** — **Auth providers remain the one console-only step.** There
  is no Firebase CLI command to enable Email/Password or Google sign-in, and
  Google additionally needs an OAuth consent-screen support email. Authorized
  domains must list `promptstash.4dl.ca` and `promptstsh.netlify.app`
  (`localhost` is there by default). Firebase does not support wildcards there,
  so per-PR deploy previews on `deploy-preview-N--promptstsh.netlify.app` will
  not be able to complete sign-in. Not worth solving — nobody uses the app.
