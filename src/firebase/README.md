# The Firebase layer

Client init, auth state, and the conventions the ported `src/api/*` modules
depend on. The migration this came from is documented in
[`docs/FIREBASE-MIGRATION-PLAN.md`](../../docs/FIREBASE-MIGRATION-PLAN.md).

## Fields are `snake_case`. Do not "fix" this.

Firestore documents use `team_id`, `body_md`, `public_slug`, `updated_at` — not
`teamId`, `bodyMd`, `publicSlug`, `updatedAt`. This looks wrong for Firestore
and it is deliberate.

The domain types in `src/lib/types.ts` were generated from the Postgres schema
and flow straight into components, tests and props. Keeping the field names
means every ported `src/api/*` function returns a **byte-identical shape** to
the Supabase one it replaced, so ~15,000 lines of UI never changed and the port
could proceed one module at a time with the rest of the app still working.

Renaming them would touch every component, every test and every type for zero
functional gain, and would have to land as one large mechanical diff — exactly
the kind with real regression risk and no way to bisect it. There was no
deadline pressure to justify skipping it; it simply was not worth doing.

If you are here because the naming bothers you, the cost of changing it has not
gone down.

## The other conventions

**`updated_at` is not automatic.** Postgres had a `moddatetime` trigger.
Firestore has nothing equivalent, so every write path that should bump it must
pass `serverTimestamp()` explicitly — currently `prompts` and `bundles`. This is
the single easiest thing in the data layer to forget; the api tests assert it.

**Deletes do not cascade.** Postgres did this for free with
`on delete cascade`. Deleting a team, folder or prompt in Firestore leaves
orphans unless the code walks the children itself, so `teams.ts`, `folders.ts`
and `prompts.ts` carry explicit recursive deletes.

**Uniqueness lives in document ids.** Firestore has no unique indexes, so
constraints that Postgres enforced are encoded as keys instead:

| Postgres constraint | Becomes |
|---|---|
| `unique (team_id, name)` on `tags` | doc id `{teamId}__{name}`, via `tagId()` |
| `invites.token unique` | the token *is* the doc id |
| `api_keys.key_hash unique` | the SHA-256 hash *is* the doc id |
| `prompts.public_slug unique` | nothing — re-checked inside a transaction |

**`api_keys` and `integrations` are server-only.** `firestore.rules` denies all
client access to both, signed in or not; they are reachable only through the
admin SDK in `netlify/functions/*`. `integrations` holds plaintext OpenRouter
keys and `api_keys` holds hashes that must not be enumerable.

**There is no full-text search.** Postgres `plfts` is gone; `listPrompts`
fetches the team's prompts and filters `title`/`body_md` in memory. This is the
one accepted feature regression, and it is fine at this data volume.

## Local development

```sh
npm run emulators    # auth on 9099, firestore on 8080
npm run test:rules   # the security rules suite, in a throwaway project
```

Set `VITE_FIREBASE_USE_EMULATOR=true` in `.env.local` to point the app at the
emulator suite instead of the cloud project.
