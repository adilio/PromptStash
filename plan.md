# PromptStash - Pattern-Neutral Agent Context Plan

This file is both a plan and a live progress tracker. Update task status as you work.
After completing each issue, commit and push to `main`.

## Validated status (2026-07-04)

The task checkboxes below all read `[ ]`, but git history shows the QRSPI-first
buildout **already shipped** — stage typing, auto-disclosed filter chips, the
template gallery (starter-first, QRSPI as an advanced option), bundles, token
budgeting, and Learn docs are all in `main`. That shipped set is the **baseline**
the work below refines; treat it as archived/done, not pending:

- **QRSPI / stage / template / bundle / token-budget features — DONE** (baseline).
- **Issue #16 (neutralize the QRSPI-first UX) — partially landed, still forward
  work.** The plan doc was made pattern-neutral (`a14efdf`) and the gallery was
  reordered, but the UI-neutralization acceptance strings ("Workflow label"
  rename, the "one practitioner model" disclaimer, the renamed advanced toggle)
  are not yet in `src/`.
- **Issue #17 (custom workflow patterns + labels) — not built.** No
  `workflow_patterns` migration, no `PatternPicker`, no `src/api/patterns.ts`.

## Brand & design — 4dl

PromptStash ships as a **4dl-branded app** at `promptstash.4dl.ca`. The core 4dl
mark is a **stylized "4" with a down-arrow**, minimalist and **monochrome**
(pure `#000000` / `#ffffff`) — high contrast and iconographic. Individual apps
theme that mark for their own identity (e.g. `worldcup.4dl.ca` wraps it in a
soccer ball); the soccer ball is **worldcup's theme, not the 4dl brand**.

Reference for the mark's style and construction (note: the ball is the
worldcup-specific treatment — draw from the "4" + down-arrow, not the ball):
`https://github.com/adilio/assets/blob/main/4dl_soccer_icon_image_match.svg`

Any new PromptStash brand asset (social card, favicon, OG image) should carry the
core monochrome "4" + down-arrow mark in a PromptStash-appropriate treatment (no
soccer motif), and must not clash with the existing in-app palette (the `--ps-*`
CSS variables).

## Social card & SEO — finish the started work

A half-finished social-card / SEO feature is sitting uncommitted in the working
tree (`index.html` + `public/social-card.svg`): Open Graph and Twitter meta tags
were added, but they reference a `social-card.png` (1200×630) that was **never
generated** — only the SVG exists, and Slack, iMessage, and X won't render an SVG
OG image.

- **Scope:** design a 1200×630 social card in the 4dl brand (above), rasterize it
  to `public/social-card.png`, keep `social-card.svg` as the editable source, and
  commit the `index.html` meta tags alongside both assets.
- **Guardrails:** the OG image must be PNG/JPG, not SVG; `og:image:width`/`height`
  must stay accurate (1200×630); `og:url` (`https://promptstash.4dl.ca`) must match
  the live domain; verify in a link-preview validator before calling it done.
- **Done when:** pasting the site URL into Slack/X/iMessage shows the branded card;
  `index.html` + `social-card.svg` + `social-card.png` are committed together.

## Executing this with Fable

Guidance for the Fable agent that will implement the work below.

- **Effort:** run at `high`/`xhigh`; give each item its full spec in one opening
  turn — Fable does its best long-horizon work from a complete brief, not a
  drip-feed.
- **No refusal risk here.** This is a prompt-management app, not security tooling —
  do **not** add the QRCheck-style `fallbacks` / `server-side-fallback` boilerplate;
  it isn't needed.
- **Fable under-reaches for tools/subagents by default** — when an item fans out
  (e.g. the DB → API → UI slices of a feature), tell it explicitly to parallelize.
- **Supabase / auth / migration safety** (P0 and #17 both touch DB and auth):
  reproduce before changing anything; never drop the `stage` column or any existing
  column; enable RLS on new tables and mirror the `prompts` access model (team
  members read; editor/owner write); test every migration against a scratch project
  before `main`. The **"Rules for the agent"** section below is authoritative for
  coding conventions (inline `--ps-*` styles, TanStack Query, `Dialog`/`useToast`).
- **Verify each item:** `npx tsc --noEmit` clean + `vitest` green, plus the item's
  own manual smoke steps, before committing.

## Fable work — priority order

1. **P0 — Auth & session persistence** (investigate first; users are actively
   affected).
2. **P1 — Complete OpenRouter support** (GitHub #17).
3. **Social card & SEO** (above) + **Issue #16** (finish the QRSPI neutralization).
4. **Issue #17** (custom workflow patterns + labels).
5. **Bigger bets — later** (end of file) — only after 1–4.

## ✅ P0 — Auth & session persistence — ROOT-CAUSED & FIXED (2026-07-04)

**What the investigation found (verified against the live Supabase project):**

1. **The Supabase project was PAUSED (`INACTIVE`)** — free-tier auto-pause after
   inactivity. While paused, every login and every read/write fails outright.
   Restored via the Management API; a scheduled GitHub Action
   (`.github/workflows/supabase-keepalive.yml`, secret `SUPABASE_ANON_KEY`) now
   pings REST twice a week so it can't pause again.
2. **`site_url` in Supabase auth config had two leading spaces**
   (`'  https://promptstash.4dl.ca/'`) → malformed fallback redirects for every
   flow that falls back to site_url. Fixed via Management API PATCH.
3. **OAuth ran on the implicit flow** (supabase-js default) — the PKCE exchange
   branch in AuthCallback was dead code, and login success depended on hash
   parsing winning a 3s race. Client now sets `flowType: 'pkce'`;
   AuthCallback tolerates the auto-exchange/manual-exchange overlap.
4. **Workspace association was fire-and-forget** — DB check confirmed one real
   user (andrew@) has NO workspace row: `ensureWorkspace()` failed silently and
   everything he did was unsavable. Workspace resolution is now
   `resolveWorkspaceId` (`src/lib/workspace.ts`): stored id validated, else
   OLDEST team (stable across devices), create-only-on-successful-empty-list
   (a transient error can no longer fork data into a duplicate workspace).
   First-run blocks render until the workspace settles (10s timeout → retry
   UI); remembered-workspace path still renders instantly. SIGNED_OUT events
   now navigate to /signin instead of leaving a silently broken app.
5. Data-side check: no duplicate workspaces exist; total prod data was 1 prompt
   (adilio). The second "Gilbert" account is two different sign-in emails
   (github vs google) — separate accounts by design, not a bug.

6 new regression tests (workspace resolution + first-run failure UI).

**Also found & fixed while verifying:** infinite RLS recursion between
`teams` and `memberships` (`is_team_member` was invoker-rights, so any direct
select on those tables hit Postgres 54001 / HTTP 500 — only the
`list_user_teams` RPC dodged it). Migration
`20260705011000_fix_rls_recursion.sql` makes the helper SECURITY DEFINER;
applied live and verified (anon: 200 empty; authenticated context: exactly the
user's teams).

**Manually verified end-to-end in production (2026-07-04):** real Google login
via the PKCE callback → landed in the correct "Adilio" workspace with existing
data intact → created a prompt → hard reload → session, workspace, and both
prompts identical → row confirmed in the DB under the right team.

## P0 (original spec) — Auth & session persistence (investigate first)

**Reported by users:** (1) their data isn't retained between sessions, and
(2) Google social login sometimes just fails. Top priority — it's a live
data-integrity / trust problem. This area has a history of fragility
(`b8de1ad` workspace loading, `5e8eb57` avoid blocking login on workspace setup,
`f1252e4` default workspace on first run, `382197b` harden workspace loading).

**Investigate and root-cause before changing code.** Concrete leads in the codebase
(starting points, not conclusions):

- **PKCE callback (login flakiness).** `src/lib/supabase.ts` sets
  `persistSession`/`autoRefreshToken: true` but no explicit `flowType` /
  `detectSessionInUrl`, and the custom `/auth/callback` route (`AuthCallback`, wired
  in `src/main.tsx`) shows no `exchangeCodeForSession` call. If the callback doesn't
  reliably exchange the OAuth code for a session (or races the React Router render),
  login intermittently fails. Verify the callback completes the PKCE exchange before
  the app reads the session.
- **Redirect URL mismatch.** `src/routes/auth/SignIn.tsx` builds `redirectTo` from
  `window.location.origin` (`/auth/callback?next=...`). Confirm the production origin
  (`https://promptstash.4dl.ca`) is listed **exactly** in both Supabase Auth →
  Redirect URLs and Google OAuth → Authorized redirect URIs (watch www vs apex,
  trailing slash, Netlify preview domains). Mismatch here is the most common cause of
  intermittent OAuth failure.
- **Workspace race (the "not saved" symptom).** `src/routes/app/AppLayout.tsx` calls
  `void ensureWorkspace().catch(...)` — fire-and-forget, not awaited. The likely root
  cause of "stuff isn't saved" is **not** lost data but an unstable workspace
  association: data written under a default workspace that isn't reliably re-loaded,
  or a fresh one created each visit. **First disambiguate in the DB:** is the user's
  data actually present in Supabase after a session? That tells you whether the bug
  is write-side (RLS/session) or read-side (workspace loading).
- **RLS silent failures.** If `auth.uid()` is null during a flaky session, writes are
  silently rejected by RLS and look "not saved." Check whether failed writes surface
  any error to the user.

- **Guardrails:** reproduce end-to-end with a real Google login (log in → create a
  prompt → close browser → reopen → log in again) before and after the fix; verify
  against the DB, not just the UI; don't paper over the race with retries — fix the
  session/workspace association.
- **Done when:** Google login succeeds reliably; the session persists across a full
  browser-close/reopen; a user's prompts/workspace are identical across logins,
  confirmed in the database; and a regression test covers the auth/session path.

## ✅ P1 — Complete OpenRouter support — DONE (2026-07-04)

> Shipped: model comparison + run history. The runner now takes multi-select
> model chips (+ custom slug) and fans out one request per model concurrently,
> rendering results side by side (output, duration, tokens/cost labeled
> "est."). Runs are cancellable via AbortController without blocking the
> editor. Every run (success/error/cancelled) is persisted to the new
> `prompt_runs` table (migration `20260705014000_prompt_runs.sql`, RLS
> mirrors prompts: team read / owner-editor write; raw OpenRouter key never
> stored) and a collapsible "Run history" lists past runs with expandable
> outputs. Also fixed en route: the `prompts_write` RLS policy was
> tautological (`m.team_id = m.team_id`) — any editor anywhere could write
> every team's prompts (migration `20260705013000_fix_prompts_write_rls.sql`,
> applied + verified live). 6 runner tests; tsc/vitest/lint clean.
>
> **Deployment finding:** the project had NO edge functions deployed at all —
> the entire OpenRouter runner (including the earlier MVP) failed with
> "Failed to fetch" in production. Deployed `api` via the CLI and fixed its
> path routing (the runtime serves `/api/...`, not `/functions/v1/api/...`,
> so the OpenRouter route fell through to the API-key handler). Verified in
> prod: 2-model comparison renders side-by-side cards with the correct
> per-user guidance, and Run history lists all recorded runs. A real
> completion needs an OpenRouter key on the account — Adil's account has
> none; only Gilbert's does. Add a key in Settings to see live outputs.

## P1 (original spec) — Complete OpenRouter support (GitHub #17)

The OpenRouter model-gateway MVP shipped (`81fcfa4`); GitHub issue #17 ("Expand
OpenRouter support with model comparison and run history") completes it.

- **Scope:** model comparison (run a prompt against multiple OpenRouter models
  side-by-side) and run history (persist past runs — model, prompt version, output,
  tokens/cost, timestamp — and let users revisit them).
- **Data model:** new table(s) for run history with RLS mirroring `prompts` access;
  preserve the existing OpenRouter key handling (`b70396b` surfaces real key errors).
- **Guardrails:** never persist the raw OpenRouter key; comparison runs must be
  cancellable and must not block the editor; token/cost figures are estimates — label
  them as such (consistent with the app's existing budget-gauge framing).
- **Done when:** a user can run one prompt across ≥2 models and see outputs +
  token/cost side by side, and can reopen a past run from history; types clean,
  tests green.

## Product direction

PromptStash should be the place where people keep, shape, and reuse the context they give AI tools. That includes ordinary prompts, repo instruction files, agent rules, workflow harnesses, specs, checklists, and team conventions.

The last implementation batch added real support for agent-file export, QRSPI-style stages, bundles, token budgeting, templates, and Learn docs. That direction is still useful, but QRSPI, Dumb Zone language, and stage-typed workflows are one school of thought, not the product's doctrine.

The next batch should make PromptStash broader and calmer:

- A user can still save a plain prompt with a title and body, and never learn any agent-context jargon.
- QRSPI remains available as an advanced template and Learn topic.
- Other patterns are first-class too: freeform prompts, tags, AGENTS.md, CLAUDE.md, Gemini/GEMINI.md, Copilot instructions, Cursor rules, Kiro steering, GitHub Spec Kit / SDD, compact context notes, review checklists, and user-defined workflows.
- Users can define their own labels, stages, structures, and patterns without being forced into QRSPI's eight stages.
- Context-budget warnings are presented as estimates and heuristics, not universal truth.

**The cardinal constraint remains unchanged: do not impose any of this on a user who just wants to save a prompt.** The existing Dashboard -> New prompt -> write title and body -> save flow must stay simple. Advanced structure appears only when the user asks for it, imports data that uses it, creates a bundle/pattern, or enables an explicit exploration setting.

---

## Research anchors

Use these as grounding references when updating copy, Learn docs, templates, and export formats:

- [AGENTS.md](https://agents.md/) is intentionally plain Markdown with no required fields; it is a predictable "README for agents" rather than a strict schema.
- [Gemini CLI `GEMINI.md`](https://geminicli.com/docs/cli/gemini-md/) uses hierarchical context files, including global, workspace, and just-in-time context.
- [Gemini in Android Studio `AGENTS.md`](https://developer.android.com/studio/gemini/agent-files) supports checked-in `AGENTS.md` files, nested files, and modular `@file.md` imports; `GEMINI.md` takes precedence when both exist.
- [GitHub Copilot custom instructions](https://docs.github.com/en/copilot/concepts/prompting/response-customization) distinguish repository-wide instructions, path-specific instructions, and agent instructions such as `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`.
- [Claude Code memory docs](https://code.claude.com/docs/en/memory) distinguish `CLAUDE.md` from auto memory and explicitly note that vague or conflicting instructions are less reliable.
- [Cursor rules](https://cursor.com/docs) support project rules, user rules, AGENTS.md, and legacy `.cursorrules`; AGENTS.md is the simple Markdown option while structured project rules give more scope control.
- [Kiro specs](https://kiro.dev/docs/specs/) use requirements, design, and tasks files as the core SDD workflow.
- [Kiro steering](https://kiro.dev/docs/steering/) uses product, tech, and custom steering files; it also supports AGENTS.md as always-included steering context.
- [GitHub Spec Kit](https://github.com/github/spec-kit/blob/main/spec-driven.md) treats specs, plans, research, contracts, quickstarts, and task lists as primary development artifacts.
- [Google Antigravity](https://developers.googleblog.com/en/build-with-google-antigravity-our-new-agentic-development-platform/) frames the IDE around agents that plan, execute, and verify work across editor, terminal, and browser.
- [HumanLayer advanced context engineering](https://www.humanlayer.dev/blog/advanced-context-engineering) and [QRSPI/RPI commentary](https://betterquestions.ai/the-necessary-evolution-of-research-plan-implement-as-an-agentic-practice-in-2026/) are valuable, but should be presented as one practitioner lineage among several.

---

## Rules for the agent

### Committing

- ALWAYS commit as **Adil Leghari <adilio@gmail.com>** only.
- NEVER add a `Co-Authored-By` trailer, Claude signature, or any attribution other than the user.
- Verify with `git config user.name` and `git config user.email` before committing. If they are wrong, set them correctly for the repo (`git config user.name "Adil Leghari"` and `git config user.email "adilio@gmail.com"`).
- Commit message format: one concise imperative sentence, no body needed unless the change is complex.
- Push to `origin main` after each issue is fully complete and type-checks clean.
- Run `npx tsc --noEmit` before every commit. Fix all type errors before committing.

### General coding rules

- Do not add comments unless the reason is non-obvious.
- Do not add co-author lines, task references, or issue numbers in code comments.
- Prefer editing existing files over creating new ones.
- Do not introduce abstractions beyond what the task requires.
- Match the style of surrounding code exactly: inline `style={{}}` with CSS variables (`var(--ps-fg)`, `var(--ps-accent)`, `var(--ps-bg-elev)`, `var(--ps-hairline)`, etc.). Do not introduce Tailwind utility classes in components that currently use inline styles.
- Use TanStack Query for all server state. Mutations must invalidate the relevant `promptKeys.*`, `bundleKeys.*`, or new pattern query keys on success.
- Use the existing `Dialog` from `src/components/ui/dialog.tsx` for new modals. Use `useToast()` for user feedback.
- New tables must enable RLS and define policies that mirror the existing `prompts` access model (team members read; editor/owner write) unless otherwise specified.

### Status legend

- `[ ]` not started
- `[~]` in progress
- `[x]` complete

---

## Design principles for this batch

1. **Plain prompts are the default product.** No structural field, token gauge, method badge, concept icon, bundle affordance, or Learn copy should interrupt the default save-a-prompt path.
2. **Patterns are recipes, not requirements.** QRSPI, SDD, RPI, Kiro steering, Copilot path instructions, and Gemini hierarchical memory should be described as optional methods a user can adopt, remix, or ignore.
3. **Tags stay first-class.** Tags are the lowest-friction structure users already understand. Do not replace them with workflow stages. Make them easier to use before adding heavier structure.
4. **Custom beats canonical.** Any built-in workflow label should have a custom equivalent. If PromptStash ships "Research" as a label, a team must be able to create "Discovery", "Investigation", "Spike", or no label at all.
5. **Source-aware, not source-worshipping.** Learn docs should cite sources and show tradeoffs: what the method helps with, when it is too much, and how to adapt it.
6. **Use neutral UI language.** Prefer "Pattern", "Workflow label", "Context budget", "Instruction file", and "Export target" over QRSPI/Dumb Zone-specific labels in product surfaces.
7. **Auto-disclose from data.** If a workspace has no bundles, no patterns, no workflow labels, and no agent export targets, the app should stay quiet.
8. **Show uncertainty in estimates.** Token counts and "Dumb Zone" thresholds are heuristics. UI copy should say "estimate", "roughly", and "budget" rather than implying a hard scientific boundary.
9. **Multiple schools can coexist.** A bundle can be freeform, QRSPI, SDD, Kiro-style steering, Gemini context, Copilot path instructions, or a team-defined pattern.
10. **Migration must preserve user data.** Existing `stage` values, QRSPI templates, Learn docs, and bundles must continue to work while the model becomes more flexible.

---

## Issue #16 - Neutralize the shipped QRSPI-first UX

**Goal:** Keep the existing features, but reduce the sense that PromptStash endorses one workflow as the one true path.

### Key files

- `src/routes/app/PromptEditor.tsx`
- `src/routes/app/Dashboard.tsx`
- `src/routes/app/BundleEditor.tsx`
- `src/routes/app/BundleList.tsx`
- `src/routes/app/Settings.tsx`
- `src/components/TemplateGallery.tsx`
- `src/components/PromptCard.tsx`
- `src/content/concepts/index.ts`
- `src/lib/templates/*`
- `src/lib/preferences.ts`

### Tasks

- [ ] Rename visible "Stage" UI to "Workflow label" where it appears outside QRSPI-specific docs. Inside QRSPI docs/templates, keep "stage".
- [ ] Keep the PromptEditor workflow selector inside the existing Advanced disclosure.
- [ ] Update helper text from "Tag this prompt as part of a Research -> Plan -> Implement workflow" to a neutral line like "Optionally label where this prompt fits in your workflow."
- [ ] Rename "Show all advanced features" to "Show agent-workflow tools" or similarly neutral wording. The hint should say it reveals optional structure, bundles, export targets, and budget tools.
- [ ] In Dashboard filters, use "Workflow" as the strip label and suppress the strip unless data or the explicit preference reveals it.
- [ ] In BundleEditor, keep the gauge title as "Context budget"; move "Dumb Zone" wording into the ConceptInfo popover and Learn page only.
- [ ] Update TemplateGallery grouping so starter prompts are first, AGENTS.md/basic instruction files second, and methodology bundles later. QRSPI must not be the first advanced method users see.
- [ ] Add copy to every QRSPI and Dumb Zone concept page: "This is one useful practitioner model, not a requirement for using PromptStash."
- [ ] Audit empty states, CommandPalette entries, and sidebar labels for accidental QRSPI/Dumb Zone overexposure.

### Testing

- [ ] Manual: create a brand-new account/workspace, create a prompt, save it, and confirm the default path does not mention QRSPI, Dumb Zone, stages, or bundles.
- [ ] Manual: open Advanced in PromptEditor and confirm the optional workflow/export controls are still discoverable.
- [ ] Manual: instantiate the existing QRSPI template and confirm QRSPI-specific copy appears only after that opt-in action.
- [ ] Run `npx tsc --noEmit` - zero errors.

**Commit message:** `Neutralize agent workflow copy while preserving optional QRSPI tools`

---

## Issue #17 - Add custom workflow patterns and labels

**Goal:** Replace the hard-coded QRSPI stage model with a flexible pattern model while preserving existing `stage` data.

### Context

The current `stage` column is useful, but it bakes QRSPI-shaped labels into the data model. We need a broader structure where QRSPI is one built-in pattern and teams can create their own patterns.

### Key files

- `supabase/migrations/<timestamp>_workflow_patterns.sql`
- `src/lib/database.types.ts`
- `src/lib/types.ts`
- `src/api/patterns.ts` - NEW
- `src/lib/queryClient.ts`
- `src/routes/app/PromptEditor.tsx`
- `src/routes/app/Dashboard.tsx`
- `src/components/PromptCard.tsx`
- `src/routes/app/BundleEditor.tsx`
- `src/components/PatternPicker.tsx` - NEW

### Data model

- [ ] Add `workflow_patterns`:
  ```sql
  create table if not exists public.workflow_patterns (
    id uuid primary key default gen_random_uuid(),
    team_id uuid references public.teams(id) on delete cascade,
    name text not null,
    description text,
    source_label text,
    source_url text,
    is_system boolean not null default false,
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  ```
- [ ] Add `workflow_pattern_steps`:
  ```sql
  create table if not exists public.workflow_pattern_steps (
    id uuid primary key default gen_random_uuid(),
    pattern_id uuid not null references public.workflow_patterns(id) on delete cascade,
    key text not null,
    label text not null,
    short_label text,
    color text,
    position integer not null,
    unique (pattern_id, key)
  );
  ```
- [ ] Add nullable prompt columns:
  ```sql
  alter table public.prompts
    add column if not exists workflow_pattern_id uuid references public.workflow_patterns(id) on delete set null,
    add column if not exists workflow_step_id uuid references public.workflow_pattern_steps(id) on delete set null,
    add column if not exists workflow_label text;
  ```
- [ ] Keep the existing `stage` column for backward compatibility during this batch. Do not drop it.
- [ ] Backfill existing staged prompts into a system QRSPI pattern or set `workflow_label` from the existing stage labels.
- [ ] Enable RLS on new tables. System patterns (`is_system = true`, `team_id is null`) are readable by all authenticated users. Team patterns mirror prompt access.

### API and types

- [ ] Add `WorkflowPattern`, `WorkflowPatternStep`, and prompt workflow types in `src/lib/types.ts`.
- [ ] Add `patternKeys` in `src/lib/queryClient.ts`.
- [ ] Create `src/api/patterns.ts` with list/create/update/delete pattern functions and step CRUD/reorder functions.
- [ ] Add prompt create/update support for `workflow_pattern_id`, `workflow_step_id`, and `workflow_label`.

### UI

- [ ] Build `PatternPicker` for PromptEditor Advanced:
  - Empty state: "No workflow label".
  - Built-in options: QRSPI, RPI, SDD, freeform checklist.
  - Team-created patterns.
  - "Custom label..." option that stores `workflow_label` without a pattern.
- [ ] In Dashboard, filter by workflow labels and custom pattern steps when such data exists.
- [ ] In PromptCard/list rows, render a badge from `workflow_label` or the selected step label. Existing QRSPI colors can remain for QRSPI steps.
- [ ] In BundleEditor, group/filter modules by whatever workflow pattern the bundle uses, but allow mixed/freeform bundles.
- [ ] Add a Settings -> Organization or Settings -> Data subsection for managing team workflow patterns.

### Testing

- [ ] Manual: an existing QRSPI-staged prompt still shows an equivalent workflow label after migration.
- [ ] Manual: create a custom pattern with three labels, assign one to a prompt, reload, and confirm persistence.
- [ ] Manual: create a one-off custom label without selecting a pattern, reload, and confirm it appears only on that prompt.
- [ ] Manual: clear all workflow labels and confirm Dashboard filters disappear again.
- [ ] Run `npx tsc --noEmit` - zero errors.

**Commit message:** `Add custom workflow patterns and migrate hard-coded stages`

---

## Issue #18 - Expand the template gallery into a methods library

**Goal:** Add other schools of thought without overwhelming users.

### Built-in method families

- [ ] **Plain prompt starters:** Code review, testing, git workflow, docs style. These remain first.
- [ ] **Instruction-file starters:** AGENTS.md basic, CLAUDE.md basic, Copilot repo instructions, Gemini/GEMINI.md basic.
- [ ] **Spec-driven development:** GitHub Spec Kit-style `spec.md`, `plan.md`, `tasks.md`, `research.md`, `contracts/`, and `quickstart.md` templates.
- [ ] **Kiro-style steering:** `product.md`, `tech.md`, `structure.md`, and custom steering docs.
- [ ] **Gemini hierarchical context:** global context, workspace context, just-in-time context, and modular import examples.
- [ ] **Copilot scoped instructions:** repository-wide `.github/copilot-instructions.md`, path-specific `.github/instructions/*.instructions.md`, and agent instruction files.
- [ ] **QRSPI/RPI:** keep QRSPI advanced and add a lighter RPI template for users who want fewer stages.
- [ ] **Context hygiene:** compaction notes, session handoff, test-output backpressure, and "what not to include" templates.
- [ ] **Safety/review gates:** destructive-command policies, human approval checkpoints, PR review checklists, and rollback notes.

### Key files

- `src/lib/templates/index.ts`
- `src/lib/templates/*.ts`
- `src/components/TemplateGallery.tsx`
- `src/content/concepts/index.ts`
- `src/routes/app/Learn.tsx`

### Tasks

- [ ] Extend template metadata with:
  ```ts
  type TemplateMethod =
    | 'plain'
    | 'agent-file'
    | 'spec-driven'
    | 'steering'
    | 'hierarchical-context'
    | 'workflow'
    | 'context-hygiene'
    | 'safety';
  ```
- [ ] Add `method`, `source`, `sourceUrl`, `bestFor`, and `avoidWhen` metadata to templates.
- [ ] Update TemplateGallery filters from difficulty-only to method + difficulty. Starter templates remain visible by default.
- [ ] Add "Use as prompt", "Use as bundle", or "Use as file set" actions depending on template type.
- [ ] Keep QRSPI sorted after simpler workflow methods unless the user explicitly filters for QRSPI/workflow.
- [ ] Add concept links only on method-specific cards, not every starter prompt.

### Testing

- [ ] Manual: opening TemplateGallery starts with plain prompt templates, not methodology-heavy bundles.
- [ ] Manual: filter by "Spec-driven" and instantiate a Spec Kit-style template.
- [ ] Manual: filter by "Steering" and instantiate a Kiro-style steering bundle.
- [ ] Manual: QRSPI remains available and still creates the expected bundle.
- [ ] Run `npx tsc --noEmit` - zero errors.

**Commit message:** `Expand templates into a pattern-neutral methods library`

---

## Issue #19 - Support multi-file export targets

**Goal:** Move beyond "one bundle -> one file" so PromptStash can emit the structures used by SDD, Kiro, Gemini, Copilot, Cursor, and custom patterns.

### Context

AGENTS.md and CLAUDE.md are single-file exports. But many real workflows use folders:

- GitHub Spec Kit: `specs/<feature>/spec.md`, `plan.md`, `tasks.md`, `research.md`, `contracts/`, `quickstart.md`.
- Kiro steering: `.kiro/steering/product.md`, `tech.md`, `structure.md`, custom steering docs.
- Copilot: `.github/copilot-instructions.md` plus `.github/instructions/*.instructions.md`.
- Cursor: `.cursor/rules/*.mdc` plus AGENTS.md for simple projects.
- Gemini: `GEMINI.md`, AGENTS.md, nested context files, and imported Markdown modules.

### Key files

- `src/lib/agentExport.ts`
- `src/lib/exportTargets.ts` - NEW
- `src/routes/app/BundleEditor.tsx`
- `src/routes/app/Settings.tsx`
- `src/api/bundles.ts`

### Tasks

- [ ] Introduce `ExportTarget` as a registry-driven model instead of hard-coding single filenames.
- [ ] Support target kinds:
  - `single-file`
  - `multi-file`
  - `directory`
  - `zip`
- [ ] Add built-in targets:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `GEMINI.md`
  - `.github/copilot-instructions.md`
  - `.github/instructions/*.instructions.md`
  - `.cursor/rules/*.mdc`
  - `.windsurfrules` legacy
  - Kiro steering directory
  - Spec Kit feature spec directory
  - generic Markdown folder
- [ ] Add bundle-level export target selection. Preserve the existing `target_format` field during migration, but introduce a richer `export_target` value for new bundles.
- [ ] Add `bundleToFiles(bundle, items)` returning `{ path: string; content: string }[]`.
- [ ] Add ZIP download support for multi-file exports.
- [ ] In preview, show a file tree and selected file contents instead of one giant preview for multi-file targets.
- [ ] Use neutral wording: "Export target" and "File set", not "agent format" everywhere.

### Testing

- [ ] Manual: export an AGENTS.md bundle as a single file.
- [ ] Manual: export a Spec Kit template as a ZIP containing the expected files.
- [ ] Manual: export Kiro steering files and confirm paths match `.kiro/steering/...`.
- [ ] Manual: export Copilot path instructions and confirm file names live under `.github/instructions/`.
- [ ] Run `npx tsc --noEmit` - zero errors.

**Commit message:** `Add multi-file export targets for specs and agent context`

---

## Issue #20 - Make context budgeting configurable and heuristic

**Goal:** Keep token-budget value while making the Dumb Zone framing optional and adjustable.

### Key files

- `src/lib/tokens.ts`
- `src/routes/app/BundleEditor.tsx`
- `src/routes/app/Settings.tsx`
- `src/content/concepts/index.ts`
- `src/lib/preferences.ts`

### Tasks

- [ ] Rename any remaining default UI references from "Dumb Zone" to "Context budget" or "Context health".
- [ ] Add settings for budget thresholds:
  - default warning threshold, initially 40%
  - default danger threshold, initially 60%
  - model context presets
  - "show context warnings in bundles" toggle
- [ ] In Learn docs, explain that the 40% rule is a practitioner heuristic from the HumanLayer/Dex lineage, not a universal guarantee.
- [ ] Add "budget profiles" to BundleEditor: Claude, GPT, Gemini, custom.
- [ ] Allow users to set a custom context size for a bundle preview without persisting it globally.
- [ ] Add estimated overhead text: "This only estimates the exported instructions, not chat history, tool schemas, file reads, logs, or model-reserved output."
- [ ] Add a neutral "Reduce context" suggestion list: remove duplicated sections, split into path-specific files, move details into on-demand docs, use sub-agent/task-specific modules, summarize logs.

### Testing

- [ ] Manual: default bundle gauge says "Context budget" and does not mention Dumb Zone until ConceptInfo/Learn.
- [ ] Manual: change warning threshold and confirm the gauge responds.
- [ ] Manual: set a custom model context size and confirm percentages update.
- [ ] Run `npx tsc --noEmit` - zero errors.

**Commit message:** `Make context budget thresholds configurable and heuristic`

---

## Issue #21 - Rework Learn into a balanced methods library

**Goal:** Teach multiple approaches with tradeoffs rather than presenting one worldview.

### Key files

- `src/content/concepts/index.ts`
- `src/routes/app/Learn.tsx`
- `src/routes/app/LearnConcept.tsx`
- `src/components/ConceptInfo.tsx`

### Concepts to add or revise

- [ ] `patterns` - optional methods for structuring prompts and context.
- [ ] `tags-and-freeform` - why plain tags and loose organization are valid.
- [ ] `agents-md` - keep, but emphasize schema-light Markdown and no required headings.
- [ ] `claude-md` - distinguish instructions from memory and mention specificity.
- [ ] `gemini-md` - hierarchical context and just-in-time context.
- [ ] `copilot-instructions` - repo-wide, path-specific, and agent instructions.
- [ ] `cursor-rules` - project rules, user rules, AGENTS.md, legacy `.cursorrules`.
- [ ] `kiro-steering` - product, tech, structure, and custom steering files.
- [ ] `spec-driven-development` - requirements/design/tasks as living artifacts; include GitHub Spec Kit and Kiro.
- [ ] `context-budgeting` - neutral umbrella for token estimates and context health.
- [ ] `dumb-zone` - keep as one named heuristic under context budgeting.
- [ ] `qrspi` - keep as an advanced workflow method.
- [ ] `rpi` - lighter Research -> Plan -> Implement method.
- [ ] `context-compaction` - session handoff and compressed state notes.
- [ ] `agent-safety` - human approval, destructive actions, prompt injection, and review gates.

### Content structure

Every method page should include:

- [ ] What it is.
- [ ] What it is good for.
- [ ] When it is too much.
- [ ] How PromptStash supports it.
- [ ] How to adapt it.
- [ ] References.

### UI tasks

- [ ] Rename the Learn index description to avoid implying that advanced features are the center of the app.
- [ ] Add filters by family: Agent files, Specs, Workflows, Context hygiene, Safety, Basics.
- [ ] Add "Start simple" callout that links to plain prompts, tags, and templates.
- [ ] Ensure ConceptInfo popovers are short and non-prescriptive.

### Testing

- [ ] Manual: Learn index includes plain/freeform organization alongside advanced agent methods.
- [ ] Manual: each method page has "When it is too much" or equivalent tradeoff copy.
- [ ] Manual: QRSPI and Dumb Zone are findable but not visually dominant.
- [ ] Run `npx tsc --noEmit` - zero errors.

**Commit message:** `Rework Learn into a balanced library of agent context methods`

---

## Issue #22 - Improve tags and lightweight organization

**Goal:** Make the non-method path better, so users do not need patterns to stay organized.

### Key files

- `src/routes/app/Dashboard.tsx`
- `src/routes/app/PromptEditor.tsx`
- `src/components/PromptCard.tsx`
- `src/api/tags.ts` if present, otherwise the existing prompt/tag API files
- `src/components/CommandPalette.tsx`

### Tasks

- [ ] Add or improve tag filter chips on Dashboard if they are not already easy to use.
- [ ] Allow quick tag creation from PromptEditor without leaving the editor.
- [ ] Add tag rename/delete management in Settings or a lightweight tag manager dialog.
- [ ] Add CommandPalette entries for "Filter by tag" only when tags exist.
- [ ] Add "Untagged" filter for cleanup.
- [ ] Add optional saved views: a view can store search text, tags, workflow labels, and folders. Saved views are user-created and never shown by default.
- [ ] Make sure workflow pattern filters and tag filters can combine without confusion.

### Testing

- [ ] Manual: create a prompt with only tags, no workflow pattern, and confirm all advanced pattern UI remains hidden.
- [ ] Manual: filter by tag and then by workflow label in a workspace that has both.
- [ ] Manual: delete a tag and confirm prompt cards update.
- [ ] Run `npx tsc --noEmit` - zero errors.

**Commit message:** `Improve lightweight tag organization alongside workflow patterns`

---

## Issue #23 - Add import and migration affordances for existing rule files

**Goal:** Let users bring their current structures into PromptStash instead of adopting ours.

### Supported imports

- [ ] `AGENTS.md`
- [ ] `CLAUDE.md`
- [ ] `GEMINI.md`
- [ ] `.github/copilot-instructions.md`
- [ ] `.github/instructions/*.instructions.md`
- [ ] `.cursor/rules/*.mdc`
- [ ] `.cursorrules`
- [ ] `.windsurfrules`
- [ ] `.kiro/steering/*.md`
- [ ] `specs/**/{spec.md,plan.md,tasks.md,research.md,quickstart.md}`

### Tasks

- [ ] Add an "Import instruction files" action in Settings -> Data.
- [ ] Allow drag-and-drop of one or more Markdown files.
- [ ] Infer export target and method family from path/name, but let users override before importing.
- [ ] Parse Markdown headings into prompt modules when appropriate.
- [ ] Offer import modes:
  - one prompt per file
  - one prompt per top-level heading
  - one bundle/file set preserving paths
- [ ] Preserve source path metadata on imported prompts/bundles.
- [ ] Do not force a workflow pattern during import. Suggest one only if the files clearly match a known method.

### Testing

- [ ] Manual: import a single AGENTS.md as one prompt.
- [ ] Manual: import AGENTS.md by headings and confirm multiple prompts plus a bundle are created.
- [ ] Manual: import a Spec Kit directory and confirm a file-set bundle is created.
- [ ] Manual: import arbitrary Markdown notes and confirm they stay freeform.
- [ ] Run `npx tsc --noEmit` - zero errors.

**Commit message:** `Add flexible import for existing agent context files`

---

## Issue #24 - End-to-end pluralism audit

**Goal:** Verify the product now supports several ways of working without making the simple path worse.

### Audit script

1. Fresh account, empty workspace.
2. Create a plain prompt with title/body only. Confirm no methods, patterns, budget warnings, bundles, or concept icons interrupt the flow.
3. Add tags to the prompt. Confirm tags are useful on their own.
4. Create a custom workflow pattern and assign it to a prompt. Confirm QRSPI is not required.
5. Instantiate QRSPI. Confirm it works and is clearly advanced/optional.
6. Instantiate an SDD/Spec Kit template. Confirm it produces spec artifacts without QRSPI labels.
7. Instantiate Kiro steering. Confirm it produces steering artifacts without QRSPI labels.
8. Export AGENTS.md, GEMINI.md, Copilot instructions, and a multi-file spec ZIP.
9. Adjust context-budget thresholds and confirm the language stays heuristic.
10. Browse Learn. Confirm plain tags/freeform organization and multiple methods are presented alongside QRSPI.

### Tasks

- [ ] Record issues found during the audit as follow-up bugs or fix them immediately if small.
- [ ] Add regression tests for the most important disclosure rules.
- [ ] Run `npx tsc --noEmit` - zero errors.

**Commit message:** `Audit pattern-neutral workflows and progressive disclosure`

---

## Future ideas

These remain valuable but should wait until the pattern-neutral foundation is in place.

### GitHub repo sync

Connect a GitHub repo to a workspace; map bundles or file sets to paths and push generated files via PRs. This becomes more powerful once exports can target AGENTS.md, Gemini, Copilot, Kiro, Cursor, and Spec Kit layouts.

### MCP server and CLI

Ship a small MCP server and `npx promptstash` CLI that expose prompts, bundles, file sets, and patterns to local agents. Keep it pattern-neutral: agents should be able to ask for "the repo instructions", "the SDD spec", "the QRSPI stage prompts", or "all prompts tagged security".

### Community method gallery

Let users publish optional templates/patterns with attribution. Start as a curated gallery, not a marketplace.

### Validation and linting

Add opt-in checks for instruction files and specs:

- missing build/test commands
- vague or conflicting rules
- path-specific details in global instructions
- oversized context files
- missing acceptance criteria in specs
- unsafe command or credential-handling instructions

Each lint rule must name the method it belongs to and be dismissible. A QRSPI lint rule should not fire on a freeform prompt unless the user opted into QRSPI.

### Repo inventory

Scan connected repos for existing instruction files and show drift, duplication, stale rules, or conflicting agent instructions. This should help users understand their current context layer before PromptStash changes it.

### Versioned method packs

Treat built-in methods as versioned packs. A team can fork "QRSPI v1", "Spec Kit v1", or "Kiro steering v1", then edit their copy without future app updates changing their workflow.

---

## Bigger bets — later (vision)

Longest-horizon direction, captured so it isn't lost. **Do not start until the
priority queue (P0, P1) and Issues #16/#17 are cleared.** These extend the
"context control plane" thesis in `FUTURE.md` and complement the method-pack /
drift-scan ideas already sketched above.

- **Repo-level sync (push/pull) for instruction files.** Author `AGENTS.md`,
  `CLAUDE.md`, `GEMINI.md`, Copilot/Cursor rules once in PromptStash and push/pull
  them to connected repos, with traceability (which version is deployed where).
  Highest-leverage bet — it turns PromptStash from a store into a control plane.
- **Linting / eval for agent rules.** Validate instruction files against
  format/spec conventions and flag vague or conflicting rules (Claude's own memory
  docs note vague instructions are less reliable) — a differentiator no personal
  prompt library offers.
- **AGENTS.md as the hub format.** First-class understanding of the AGENTS.md
  standard (nested files, precedence) as the neutral anchor, with `CLAUDE.md` and
  Copilot instructions as first-class side formats.

Each is a multi-issue effort. When one is picked up, break it into its own issue
block with the same Fable-execution shaping as the priority items above.
