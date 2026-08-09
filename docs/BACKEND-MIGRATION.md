# PromptStash — evaluating a move off Supabase

_Written 2026-08-08, triggered by "I keep getting pinged about inactivity."_

**Status: evaluation only. No code has moved. Nothing here is decided.**

This document exists because the [qwizzle migration plan][prior] deliberately
left PromptStash on Supabase, and that decision is now being revisited. It
evaluates two targets — Firebase and Neon — with per-item effort estimates, and
makes a recommendation. Pick a path before any code moves.

[prior]: ../../SUPABASE-TO-FIREBASE-PLAN.md

---

## TL;DR

1. **The read-based keep-alive does not work. This is now proven, not
   suspected.** The cron ran green every single day from 07-30 to 08-08, and
   Supabase still emailed on **Aug 7** saying PromptStash
   (`ecpmipfpknoxeohbafxs`) had "not seen sufficient activity for more than 7
   days." A guard that reports success while failing at its only job is the
   worst available failure mode. See [Finding](#finding-first).
2. **There is a known fix, and a control group proving it works.** Upgrade the
   ping from a read to a **write**, exactly as `4dl.ca/docs/KEEPALIVE.md`
   already specifies. ThreatDex writes to its project nightly and has never once
   been flagged. ~30 minutes, and it needs you at a computer.
3. **If you then still want to migrate, Neon beats Firebase** — roughly *half*
   the work, because PromptStash is the most relational of your three apps and
   Neon keeps the schema, the RLS policies, the full-text search and even the
   query-builder syntax largely intact.
4. **Firebase ≈75–100h; Neon ≈45–60h.** Both are real projects. Do the 30-minute
   fix first, then decide the migration on its merits rather than under
   deadline.

---

## Finding first — the keep-alive is green and not working

The prior plan moved PromptStash's keep-alive to a central cron in `4dl.ca` with
a dead-man's switch. That cron **runs perfectly and does not achieve its
purpose.**

| Date | Keep-alive run | |
|---|---|---|
| 2026-07-30 → 2026-08-08 | 10 consecutive scheduled runs | ✅ all green |
| **2026-08-07** | **Supabase pause warning email** | ❌ "not seen sufficient activity for more than 7 days" |

The email names the project explicitly — `PromptStash (ID:
ecpmipfpknoxeohbafxs)`, organization `Adilio`. The warning window it describes
(roughly Jul 31 → Aug 7) is a window in which the cron pinged successfully
**every single day**.

That settles the "known gap" the workflow documents in its own comments: the
ping is a `HEAD` request with `Prefer: count=exact` against `prompt_runs`, plus
an `/auth/v1/health` call. **Supabase does not count this as activity.** Likely
because it is unauthenticated, RLS-filtered to zero rows, and `HEAD` so it
transfers no body — about as close to no activity as a request can get while
still being a request. [Supabase's docs][pause] describe activity loosely as
incoming API requests; the observed behaviour is stricter than that.

**ThreatDex is the control group.** `docs/KEEPALIVE.md` records that it has no
keep-alive cron and has never needed one, because its own `sync.yml` (03:00 UTC)
and `image-gen.yml` (04:00 UTC) **write** to its project nightly. Writes work;
reads do not.

[pause]: https://supabase.com/docs/guides/platform/free-project-pausing

### The fix — already written down, needs you at a computer

`4dl.ca/docs/KEEPALIVE.md` specifies it exactly. Three steps:

1. **Run the DDL** in the PromptStash SQL editor — creates a `public.keepalive`
   table with RLS on and no policies, so only the service-role key can reach it.
2. **Copy the service-role key** (Project Settings → API → `service_role`) and
   store it: `gh secret set PROMPTSTASH_SERVICE_ROLE_KEY -R adilio/4dl.ca`.
3. **Swap the ping step** for the `POST`-with-`merge-duplicates` upsert version.

Steps 1 and 2 are blocked on you: `PromptStash/.env` is empty, and the project
sits under a Supabase org that no credential on this machine can reach. Step 3
is a two-minute edit once the secret exists.

### The legitimate reason to migrate anyway

The fix above is correct and will very likely hold. But note what it is: **you
are writing to your own database on a schedule to stop it being deleted**, with
a dead-man's switch to catch the writer failing — and the first version of that
guard reported green for over a week while silently not working. That is a
standing operational burden and a real data-loss risk. It is a legitimate reason
to leave the free tier, whether by paying for it or by moving off it.

What it is *not* is a reason to migrate **this week**. Do the 30-minute fix,
confirm the warnings stop, then choose calmly.

---

## What PromptStash actually uses Supabase for

Any replacement has to cover four things. This is the whole problem in one table.

| # | What Supabase provides | Where it's used |
|---|---|---|
| 1 | **Postgres with relational queries + FTS** | 16 tables; GIN indexes on `to_tsvector(title)` and `to_tsvector(body_md)`; joins at 6 call sites |
| 2 | **RLS enforcing authz in the DB** — so the browser talks straight to the database with no server | 25+ policies across every table; `is_team_member()` helper |
| 3 | **Auth** — email/password, OAuth, password reset | 6 files: `SignIn`, `ResetPassword`, `AuthCallback`, `AppLayout`, `Sidebar`, `Settings` |
| 4 | **Edge function runtime** | `supabase/functions/api/index.ts` (490 LOC): public API-key-authenticated `/v1/*` REST API **and** the OpenRouter proxy |

Point 2 is the one people underestimate. **PromptStash has no backend.** The
security model *is* RLS. Any target that can't enforce per-row authorization
from an untrusted client forces you to build an API layer for the entire app —
which is a much bigger job than swapping a database.

### Codebase facts that drive the estimates

| Metric | Value |
|---|---|
| App source (excl. tests) | 15,396 LOC |
| Data-access layer `src/api/` | 1,327 LOC across 12 files |
| Supabase call sites (non-test) | 50 |
| Files importing the client directly | 23 (12 in `src/api`, 11 elsewhere — 6 of those auth-only) |
| Supabase references in tests | 92, across 2,935 LOC |
| Tables | 16 |
| RLS policies | 25+ |
| Security-definer RPCs | 6 (`list_user_teams`, `accept_invite`, `is_team_member`, and 3 OpenRouter key functions) |
| Postgres triggers | 2 (`moddatetime` on `prompts`, `bundles`) |
| Unique constraints needing emulation | 4 (`public_slug`, `tags(team_id,name)`, `api_keys.key_hash`, `invites.token`) |

The data layer is *mostly* well-isolated behind `src/api/` — that's the single
biggest thing working in your favour. The leaks are `Dashboard.tsx` and
`CommandPalette.tsx` (both run `count: 'exact', head: true` queries with an
`.or()` filter), plus `TemplateGallery` and `BundleEditor` calling `getUser()`.

---

## Path A — Firebase

**Shape:** Firestore + Firebase Auth + Netlify Functions.

Cloud Functions [require the Blaze plan][blaze] — confirmed on Firebase's own
pricing page — so the edge function goes to **Netlify Functions** with
`firebase-admin`, exactly as qwizzle's palette endpoint did. That keeps you on
Spark and on $0.

[blaze]: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans

### What works well

- **Firebase Auth is a straight upgrade** over what you have. Email/password,
  OAuth and password reset all built in.
- **User IDs can be preserved.** `firebase auth:import` accepts an explicit
  `localId`, so each user's Firebase UID can be set to their existing Supabase
  UUID. Every `owner_id`/`created_by`/`user_id` reference survives untouched.
  Passwords come across too — Supabase stores bcrypt, and the importer takes
  bcrypt hashes directly.
- **The client-direct model survives.** Firestore Security Rules replace RLS, so
  you still don't need a backend for ordinary reads and writes.
- **Consolidation.** Same backend as qwizzle and Rhabbit. One mental model, one
  set of credentials, no keep-alives ever again.

### What breaks, and what it costs

| Work item | Est. |
|---|---|
| Data model redesign: 16 relational tables → collections; denormalization decisions | 6–8h |
| `firestore.rules` replacing 25+ RLS policies, within the 10-`get()`-per-request budget | 8–12h |
| Rewrite `src/api/` (1,327 LOC) to the Firestore SDK — **semantic** rewrite, not mechanical | 16–24h |
| Replace 6 join sites (`prompt_tags→tags`, `bundle_items→prompts!inner`, `memberships→teams`) with N+1 reads or denormalized copies | 4h |
| **Replace full-text search** — Firestore has none. Client-side filter, or add Typesense/Algolia | 4–8h |
| Emulate 4 unique constraints via doc-ID encoding + a `/slugs/{slug}` index collection | 3h |
| `prompt_versions` auto-increment → Firestore transaction | 2h |
| `moddatetime` triggers → client-side `serverTimestamp()` | 1h |
| `count:'exact'` → `getCountFromServer()` at 2 sites | 1h |
| Composite index definitions + tuning | 3h |
| Data transform: relational rows → documents, preserving all UUIDs | 6–8h |
| **Firebase-specific subtotal** | **54–76h** |
| Shared work (see below) | 21–27h |
| **Total** | **≈75–100h** |

### The three that hurt

1. **No full-text search.** `prompts` search is `plfts` across `title` and
   `body_md` with two GIN indexes. Firestore cannot do this. At your data volume
   a client-side filter is honestly fine — but it's a real feature regression
   the moment the corpus grows, and the "proper" fix is a third service.
2. **Rules are not policies.** `prompts_read` is
   `visibility = 'public' OR is_team_member(team_id)`. In Firestore that's two
   separate queries the client must union itself, and `is_team_member` becomes a
   billed `get()` on every single rule evaluation.
3. **`model_integrations` holds a plaintext OpenRouter key**, currently revoked
   from `anon`/`authenticated` and reachable only through security-definer RPCs.
   Firestore has no equivalent of "deny the client, allow the function" other
   than: rules deny everything, and only the admin SDK touches it. That works,
   and is arguably cleaner — but it's a rewrite of all 3 key functions.

---

## Path B — Neon

**Shape:** Neon Postgres + [Neon Data API][dataapi] + a JWT auth provider +
Netlify Functions.

[dataapi]: https://neon.com/docs/data-api/overview

This is the option that changed my recommendation while researching it. Neon's
Data API is **PostgREST-compatible** — the same protocol `supabase-js` speaks —
and ships `@neondatabase/postgrest-js` plus a `neon-js` SDK with a
deliberately Supabase-compatible surface.

### Why that matters enormously

`supabase-js` is not a Postgres driver. It's a PostgREST query builder. So the
1,327 LOC in `src/api/` — every `.select()`, `.eq()`, `.or()`, even the
`title.plfts.${normalized}` full-text syntax — is **PostgREST syntax, not
Supabase syntax**. Against a PostgREST-compatible endpoint, most of it compiles
unchanged. This is close to an import swap for the data layer, where Firebase is
a ground-up rewrite.

And the rest of the stack survives outright:

- **Schema moves via `pg_dump`/restore.** 16 tables, FKs, checks, cascades,
  unique constraints, GIN indexes, `moddatetime` triggers — all of it.
- **Full-text search keeps working.** No replacement, no third service.
- **RLS is still RLS.** Policies need `auth.uid()` → `auth.user_id()` and a
  cast, but the logic — including `is_team_member()` — is unchanged.
- **The 6 RPCs stay Postgres functions.** PostgREST exposes `/rpc/{fn}` natively
  and `postgrest-js` has `.rpc()`. *(Verify — see risks.)*
- **Firebase Auth is a supported JWT provider for Neon.** So you can still get
  auth consolidation with qwizzle and Rhabbit *and* keep Postgres. Neon's own
  managed auth (Better Auth), Clerk and Auth0 also work.

### What it costs

| Work item | Est. |
|---|---|
| `pg_dump` → restore into Neon; verify `moddatetime` + `pgcrypto` extensions available | 2–3h |
| Rewrite 25+ RLS policies: `auth.uid()` → `auth.user_id()`, UUID casting, JWKS config | 4–5h |
| Wire the JWT provider (recommend Firebase Auth) to the Data API | 3–4h |
| Swap `supabase-js` → `@neondatabase/postgrest-js` across 23 files; fix API deltas | 5–8h |
| Verify/port the 6 security-definer RPCs (they call `auth.uid()` internally) | 3–4h |
| Cold-start UX — Neon Free scales to zero after 5 min idle | 2–3h |
| Beta-risk contingency | 4h |
| **Neon-specific subtotal** | **23–31h** |
| Shared work (see below) | 21–27h |
| **Total** | **≈45–60h** |

### The three that hurt

1. **The Data API is in Beta.** Neon's docs say so plainly. You would be putting
   a live app on a beta interface. This is the single strongest argument against
   this path, and it's a real one.
2. **Cold starts.** [Neon Free always scales to zero after 5 minutes idle][s2z]
   and it can't be disabled. For a low-traffic app that means most visits pay a
   cold start. Mitigable with loading states or a warming ping — but note the
   irony: you'd be trading a keep-alive cron for a warming cron. The difference
   is that missing a Neon ping costs 500ms of latency, whereas missing a
   Supabase ping costs you the database.
3. **A fourth backend in the stack.** Rhabbit and qwizzle are Firebase. Adding
   Neon means three backends across four apps. Real cognitive cost.

[s2z]: https://neon.com/docs/introduction/scale-to-zero

### Free-plan headroom

100 projects, 0.5 GB storage/project, 100 CU-hours/month, 5 GB egress. For
PromptStash's volume this is not close to binding.

---

## Shared work — applies to both paths

| Work item | Est. |
|---|---|
| Pull row counts + a service-role key from the Supabase dashboard **(manual — see below)** | 0.5h |
| Export all data | 1h |
| Auth migration incl. bcrypt import with `localId` = existing Supabase UUID | 3–4h |
| Rewrite the 6 auth call sites | 3h |
| Port the edge function (490 LOC: `/v1/*` API + OpenRouter proxy) to Netlify Functions | 4–6h |
| Rewrite 92 Supabase references across the test suite | 6–8h |
| Netlify env vars, deploy, production verification | 2h |
| Cutover + rollback plan | 2h |
| **Subtotal** | **21–27h** |

---

## Comparison

| | Firebase | Neon |
|---|---|---|
| **Total effort** | ≈75–100h | ≈45–60h |
| Schema | Redesigned from scratch | `pg_dump` / restore |
| `src/api/` (1,327 LOC) | Semantic rewrite | Mostly an import swap |
| RLS → authz | 25 policies → `firestore.rules` | 25 policies, `auth.uid()`→`auth.user_id()` |
| Full-text search | ❌ Lost — rebuild or add a service | ✅ Unchanged |
| Joins | ❌ N+1 or denormalize | ✅ Unchanged |
| 6 RPCs | Rewritten as Netlify Functions | ✅ Stay as Postgres functions |
| Unique constraints | ❌ Emulate via doc IDs | ✅ Unchanged |
| Auth | ✅ Firebase Auth, excellent | Bring your own (Firebase Auth works) |
| Client-direct, no backend | ✅ Yes | ✅ Yes |
| Maturity | ✅ Very mature | ⚠️ **Data API in Beta** |
| Idle behaviour | ✅ None — always on | ⚠️ Cold start after 5 min |
| Stack consolidation | ✅ Matches qwizzle + Rhabbit | ⚠️ Third backend |
| Cost | $0 (Spark) | $0 (Free) |

---

## Recommendation

**Don't migrate yet. Do this instead, in order:**

1. **Confirm which project the emails name.** Most likely ThreatDex.
2. **Add ThreatDex to the central `4dl.ca` cron.** ~10 minutes, fixes the actual
   gap, and covers the app that genuinely has no protection.
3. **Decide whether qwizzle's Supabase project should just be deleted.** It's
   still alive, still running its own keep-alive, and its migration finished —
   step 3 of the prior plan was never completed. Deleting it removes a third of
   this problem permanently.
4. **Then, if you still want off Supabase — go Neon, not Firebase.**

**Why Neon over Firebase, given you asked about Firebase:** PromptStash is the
worst of your three apps to put on Firestore. qwizzle ported cleanly because it
was essentially key-value. PromptStash is 16 tables, 25 RLS policies, six joins
and Postgres full-text search — everything Firestore is *specifically* not for.
You'd spend roughly twice the effort to end up with a strictly less capable data
layer, and lose search along the way.

The consolidation argument for Firebase is real, and it's the one thing pulling
the other way. But you can have most of it: **use Firebase Auth as the JWT
provider in front of Neon.** Same login stack as qwizzle and Rhabbit, one auth
system to reason about, and Postgres underneath. That hybrid is the best
outcome available here.

**The honest caveat:** the Neon path's advantage rests on the Data API, which is
in Beta. If that's disqualifying for a live app — a defensible position — then
the comparison changes, because the alternative is building a real API layer,
and at that point Firebase's numbers stop looking so bad. **Step 0 below settles
this before you commit.**

---

## Step 0 — facts to confirm before committing to anything

Nothing above should be acted on until these are checked. The first two are
blocking; the rest are cheap.

### Blocking

1. **Which Supabase project do the inactivity emails name?** Everything hinges
   on this. If it's ThreatDex, stop here and go fix the cron.
2. **How much data is actually in PromptStash?** This is currently **unknown**,
   and it changes the plan materially — a faithful data migration with preserved
   UUIDs and referential integrity is a large share of both estimates, and if
   the answer is "just my workspace," a clean re-create removes most of that
   risk and effort.

   **This needs you at a computer.** `PromptStash/.env` is empty; its anon key
   lives only in the GitHub repo secret `SUPABASE_ANON_KEY`; and the project sits
   under an org that no credential on this machine can reach. Grab a service-role
   key from the dashboard for project `ecpmipfpknoxeohbafxs`, then:

   ```sql
   select 'users' t, count(*) from auth.users
   union all select 'teams',   count(*) from public.teams
   union all select 'prompts', count(*) from public.prompts
   union all select 'versions',count(*) from public.prompt_versions
   union all select 'runs',    count(*) from public.prompt_runs
   union all select 'bundles', count(*) from public.bundles
   union all select 'api_keys',count(*) from public.api_keys
   order by 1;
   ```

   Also worth knowing: `select count(*) from auth.users where id <> '<your-uid>'`
   — i.e. does anyone else actually have an account?

### Cheap, but decide before writing code

3. **Is the Data API's Beta status acceptable to you?** If no, Neon's advantage
   shrinks and Firebase becomes competitive again.
4. **Verify `.rpc()` works against Neon's Data API** for the 6 security-definer
   functions, and that `auth.user_id()` is callable inside them. A 30-minute
   spike on a throwaway Neon project settles it.
5. **Confirm `moddatetime` is available on Neon.** If not, the 2 triggers become
   client-side timestamps — minor, but it should be known up front.
6. **Are there any live consumers of the `/v1/*` public API?** Any issued API key
   in use means the edge-function port needs a compatibility window rather than a
   straight cutover.

---

## Assumptions and gaps in this document

Stated plainly, so they can be challenged:

- **Effort estimates are focused hours, not calendar time**, and they're mine
  rather than measured. Treat the *ratio* (Firebase ≈ 1.7× Neon) as the
  load-bearing claim; the absolute numbers are softer.
- **Data volume is unknown**, so migration effort is estimated for a small
  dataset. A large one raises both paths, Firebase more (the relational →
  document transform is the part that scales badly).
- **"ThreatDex is the source of the pings" is inference, not evidence.** It's
  the only uncovered project, which makes it the best candidate — but I have not
  seen the emails.
- **Neon's `.rpc()` support is inferred** from "fully PostgREST-compatible"
  rather than confirmed in the docs. Item 4 above exists to close this.
- **Nothing was verified against a running Neon or Firebase project.** This is
  desk research plus a full read of the PromptStash codebase.
