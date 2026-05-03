# PromptStash — Agent Execution Plan

This file is both a plan and a live progress tracker. Update task status as you work.
After completing each issue, commit and push to `main`.

The plan operationalizes the strategic direction in `FUTURE.md`: reposition PromptStash as the **instruction hub for AI coding agents** (AGENTS.md, CLAUDE.md, Copilot, Cursor, Windsurf), with first-class support for QRSPI-style stage-typed modules, composable bundles, and Dumb Zone–aware token budgets.

**The cardinal constraint: do not impose any of this on a user who just wants to save a prompt.** The existing Dashboard → New prompt → write title and body → save flow must remain exactly that simple. Stages, bundles, token gauges, and agent-format dropdowns appear *only* when they are relevant — either because the user has opted in, or because their data already shows they're using the feature (e.g. stage filter chips appear only once at least one prompt in the workspace has a stage).

Each new concept also ships with a short in-app explainer that links to its source material (Dex Horthy's QRSPI posts, the AGENTS.md spec, HumanLayer's Dumb Zone write-up, etc.) so curious users can learn the *why* without leaving the app, and skeptical users can dismiss them entirely.

The six issues below are ordered so each unlocks the next:

1. **Issue #10** — Multi-format agent file export. Establishes the wrapping/download plumbing that every later feature reuses, plus the `<ConceptInfo>` slot component every later feature plugs into.
2. **Issue #11** — QRSPI stage typing on prompts. Adds the metadata bundles and linting will key off, behind the existing Advanced disclosure in the editor.
3. **Issue #12** — Bundles. Lets users compose stage-typed modules into a single AGENTS.md/CLAUDE.md output. The Bundles nav item only appears once a bundle exists.
4. **Issue #13** — Token budget and Dumb Zone indicator. Layers analysis on prompts and bundles, with a default "compact" mode that's a single token count and an optional full gauge.
5. **Issue #14** — Agent instruction template gallery. Ships content (QRSPI starter harness + common modules) using the whole stack. Templates are sorted simple-first so the first thing a new user sees is "Code Review prompt", not an 8-stage QRSPI bundle.
6. **Issue #15** — Concepts library and Learn page. Replaces the placeholder explainers from Issue #10 with full-length docs that cite their sources, and adds an `/app/learn` page for browsing them.

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
- Use TanStack Query for all server state. Mutations must invalidate the relevant `promptKeys.*` queries on success.
- Use the existing `Dialog` from `src/components/ui/dialog.tsx` for any new modals. Use `useToast()` for user feedback.
- New tables must enable RLS and define policies that mirror the existing `prompts` access model (team members read; editor/owner write) unless otherwise specified.

### Status legend
- `[ ]` not started
- `[~]` in progress
- `[x]` complete

### Progressive disclosure principles

Every issue below must follow these rules. They are non-negotiable — a reviewer who finds a violation should reject the PR.

1. **Default to invisible.** A new control or section may *only* be shown by default if it is essential to the simple "save a prompt" flow. Stages, bundles, agent formats, token gauges, lint warnings — all opt-in or auto-disclosed.
2. **Auto-disclose from data, not toggles where possible.** Prefer "show this UI when the user has data that uses it" over "expose a settings checkbox." Examples:
   - Stage filter chips on Dashboard appear only when at least one prompt in the workspace has `stage IS NOT NULL`.
   - The Bundles sidebar nav item appears only when `bundles` count > 0 for the current team, OR when the user is currently inside a `/app/bundles/*` route.
   - The stage badge on a `PromptCard` renders only when `prompt.stage` is set.
   - The Dumb Zone gauge (full version) appears only inside `BundleEditor`. Per-prompt token pills are subtle (small dim text), not colored alarms, until the prompt exceeds a soft threshold.
3. **Push advanced controls into existing "Advanced" surfaces.** The PromptEditor already has an Advanced `<details>` disclosure (containing the Espanso trigger). Stage selectors, agent-format selectors, and any other instruction-module metadata go *inside* that same disclosure. Do not add new always-visible form fields to the editor header.
4. **Every new concept ships with a `<ConceptInfo conceptId="..." />` slot.** This is a small `i` icon that opens a popover with a 2-3 sentence summary plus a "Learn more →" link. It is the user's escape hatch for "what is this thing?" — never assume they know.
5. **No jargon in default UI labels.** Use "Stage" not "QRSPI stage", "Token estimate" not "Dumb Zone risk", "Target agent" not "AGENTS.md format". Jargon belongs in the concept docs, not the buttons.
6. **A user who never explores advanced features should never know they exist** — except for the "From template" button on Dashboard and a single "Learn" entry in the sidebar footer. Those two are the only standing invitations into the deeper feature set.
7. **Settings has a single master switch as a fallback.** Add a "Show all advanced features" checkbox to Settings → Appearance. When on, every auto-disclosed surface is forced visible regardless of data state. Default off. This is for users who want to explore without first creating data.

When a task in any issue conflicts with these principles, the principles win — adjust the task and note the deviation in the commit message.

---

## Issue #10 — Multi-format agent file export (AGENTS.md, CLAUDE.md, Copilot, Cursor, Windsurf)

**GitHub issue:** _to be filed_

### Context
Different AI coding agents expect system instructions in different files: `AGENTS.md` (the emerging community standard), `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursorrules`, `.windsurfrules`. Today PromptStash exports JSON (via `ExportImportDialog`) and YAML (via `src/lib/espanso.ts`) only. Adding native multi-format export per prompt and as a workspace-level bulk download is the first concrete step toward the "instruction hub" positioning in `FUTURE.md` §3.1 / §5.2.

This issue is purely about the wrapping and download plumbing for individual prompts. Bundle-level composition lands in Issue #12.

### Key files
- `supabase/migrations/<timestamp>_agent_format.sql` — new migration
- `src/lib/database.types.ts` — regenerate or hand-edit to include the new column
- `src/lib/types.ts` — add `AgentFormat` and extend `Prompt` typing if not flowing through automatically
- `src/api/prompts.ts` — include `agent_format` in select queries and create/update payload types
- `src/lib/agentExport.ts` — NEW: format wrappers and filename helpers
- `src/lib/preferences.ts` — NEW: small `useShowAdvanced()` hook backed by localStorage
- `src/content/concepts/` — NEW directory; placeholder concept stubs land here in this issue, full content in Issue #15
- `src/components/ConceptInfo.tsx` — NEW: reusable info-icon → popover slot
- `src/routes/app/PromptEditor.tsx` — target-agent selector inside the existing Advanced disclosure (next to Espanso trigger)
- `src/routes/app/PromptView.tsx` — "Download as…" dropdown on the header
- `src/routes/app/Settings.tsx` — bulk export subsection in the existing `data` section, plus the master "Show all advanced features" toggle in the `appearance` section
- `src/components/ui/dropdown-menu.tsx` — already wraps Radix DropdownMenu; reuse it
- `src/components/ui/popover.tsx` — already wraps Radix Popover; used by `ConceptInfo`

### Tasks

#### Database migration
- [ ] Create `supabase/migrations/<UTC YYYYMMDDHHMMSS>_agent_format.sql`:
  ```sql
  alter table public.prompts
    add column if not exists agent_format text;

  alter table public.prompts
    add constraint prompts_agent_format_check
      check (agent_format is null or agent_format in
        ('agents','claude','copilot','cursor','windsurf','generic'));
  ```
- [ ] Update `src/lib/database.types.ts` so `prompts.Row`, `Insert`, and `Update` include `agent_format: string | null` (and the `Update` form makes it optional).

#### Format wrappers
- [ ] Create `src/lib/agentExport.ts` exporting:
  - `export type AgentFormat = 'agents' | 'claude' | 'copilot' | 'cursor' | 'windsurf' | 'generic';`
  - `export const AGENT_FORMATS: { id: AgentFormat; label: string; filename: string; description: string }[]` — labels and target filenames for each (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursorrules`, `.windsurfrules`, `prompt.md`).
  - `export function filenameFor(format: AgentFormat): string`
  - `export function wrapPromptForFormat(prompt: { title: string; body_md: string }, format: AgentFormat): string` — produces the file body. For markdown formats (`agents`, `claude`, `copilot`, `generic`) emit a header comment line + `# <title>` + body. For `cursor` and `windsurf`, emit plain text without a markdown title (just the body, since these files are read literally).
  - `export function wrapPromptsForFormat(prompts: { title: string; body_md: string }[], format: AgentFormat): string` — concatenates with `## <title>` per prompt for markdown formats; double-newline separated for plain-text formats.
  - `export function downloadFile(filename: string, content: string, mimeType?: string): void` — Blob + object URL + click + revoke. (Mirror the existing pattern in `src/lib/espanso.ts` callsite in `Settings.tsx`.)

#### Preferences hook (foundation for later issues)
- [ ] Create `src/lib/preferences.ts`:
  ```ts
  const STORAGE_KEY = 'ps:show-advanced';

  export function getShowAdvanced(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  }
  export function setShowAdvanced(value: boolean): void {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }
  export function useShowAdvanced(): [boolean, (v: boolean) => void] { /* useState + useEffect listening to 'storage' */ }
  ```
- [ ] Wire the master toggle in Settings → Appearance: a single checkbox row "Show all advanced features", with hint "Forces every advanced surface (stages, bundles, token gauges) visible regardless of whether you've used them yet. Off by default." Bound to `useShowAdvanced()`.

#### ConceptInfo slot (foundation for later issues)
- [ ] Create `src/content/concepts/` directory with one stub file per concept this plan introduces: `agents-md.md`, `stages.md`, `bundles.md`, `dumb-zone.md`, `qrspi.md`, `context-engineering.md`. Each stub is just a heading + 2-3 sentence summary + a "References" heading with at least one link (placeholder content; Issue #15 fills these out fully). Sources to draw from come from `FUTURE.md`'s reference lists.
- [ ] Create `src/components/ConceptInfo.tsx`:
  ```tsx
  type Props = { conceptId: string; label?: string };
  // Renders a small `i` icon (lucide-react `Info`, 14px, color var(--ps-fg-faint)).
  // On click: Popover with title + 2-3 sentence summary + "Learn more →" link to /app/learn/<conceptId>.
  // Pulls summary from a static map in src/content/concepts/index.ts (id → { title, summary }).
  // Issue #15 replaces the static map with a richer registry; the component API stays the same.
  ```
- [ ] Create `src/content/concepts/index.ts` exporting `CONCEPT_SUMMARIES: Record<string, { title: string; summary: string }>` populated from the stub files (manually transcribed to keep things simple in v1).

#### PromptEditor
- [ ] Add `agentFormat` state (`AgentFormat | ''`, default `''` meaning unset) inside `PromptEditor.tsx`.
- [ ] Hydrate from `promptQuery.data?.agent_format ?? ''` in the existing data-loading effect.
- [ ] Inside the Advanced `<details>` block (currently containing the Espanso trigger), add a "Target agent" row: label "Target agent" + `<ConceptInfo conceptId="agents-md" />` + a `<select>` populated from `AGENT_FORMATS`. Include an empty option labelled "Unspecified". Hint text: "Pick the agent file this prompt should be exported as."
- [ ] Include `agent_format: agentFormat || null` in the `createPromptMutation` and `updatePromptMutation` payloads, and in the autosave payload.
- [ ] Trigger autosave when `agentFormat` changes (add it to the autosave effect's dependency list).

#### PromptView
- [ ] Add a "Download as…" `DropdownMenu` button to the existing header action area.
- [ ] Menu items: one per `AgentFormat`, each showing the format label and filename in a smaller dim line.
- [ ] On select, call `downloadFile(filenameFor(format), wrapPromptForFormat(prompt, format))`.
- [ ] If the prompt has `agent_format` set, render a small marker next to the title in the header (e.g. "Target: AGENTS.md") so the user knows what the prompt is wired for.

#### Settings — bulk export
- [ ] In `Settings.tsx`, inside the `data` section body (after the existing JSON export and Espanso export blocks), add a new "Agent file export" subsection:
  - Header + description: "Download all prompts in this workspace as a single agent file."
  - A `<select>` for target format (same options as above).
  - A "Download" button that calls `listPrompts(currentTeamId)` then `downloadFile(filenameFor(format), wrapPromptsForFormat(prompts, format))`.
  - Loading state on the button while fetching.

#### Testing
- [ ] Manual: create a prompt, set Target agent to Cursor, save, reload — verify the value persists.
- [ ] Manual: from PromptView click "Download as… AGENTS.md" — verify the file downloads and the content has the expected header and body.
- [ ] Manual: from Settings → Data → Agent file export, pick CLAUDE.md, click Download — verify the file contains every prompt in the workspace separated by `## <title>`.
- [ ] **Progressive disclosure check:** A new user who creates one prompt and saves it should never see the words "AGENTS.md", "Target agent", or any concept icon unless they expand the Advanced disclosure. Verify by inspecting the editor in its default collapsed state.
- [ ] **ConceptInfo check:** Click the `i` icon next to "Target agent" — verify the popover renders with the placeholder summary and a "Learn more →" link (the link target page lands in Issue #15; for now it can be `/app/learn/agents-md` returning a 404-style placeholder).
- [ ] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Add multi-format agent file export with ConceptInfo slot and advanced-features toggle`

---

## Issue #11 — QRSPI stage typing for instruction modules

**GitHub issue:** _to be filed_

### Context
`FUTURE.md` (the QRSPI section) argues that prompts intended as agent instructions should be **stage-typed** so they can be composed into structured workflows: Question, Research, Design, Structure, Plan, Work, Implement, Review (PR). This is a small change to the data model with outsized payoff: it powers filtering today and bundle composition (Issue #12) and budget/lint awareness (Issue #13) tomorrow.

We add a single nullable `stage` column on `prompts` rather than introducing a separate `instruction_modules` table. Prompts and instruction modules are conceptually the same entity in PromptStash; the `stage` field (plus `agent_format` from Issue #10) is what makes a prompt "an instruction module."

**Disclosure rules for this issue:** Stage is a power-user feature. The selector lives inside the existing Advanced disclosure in `PromptEditor`, never in the header. The Dashboard filter strip and CommandPalette entries appear only when the workspace contains at least one prompt with a stage set (or when the master "Show advanced features" preference is on). The stage badge on a card renders only when the prompt has a stage. A user who never opens the Advanced disclosure will never encounter the word "stage" in the UI.

### Key files
- `supabase/migrations/<timestamp>_prompt_stage.sql` — new migration
- `src/lib/database.types.ts` — regenerate or hand-edit
- `src/lib/types.ts` — add `Stage` type and `STAGE_OPTIONS` constant
- `src/api/prompts.ts` — include `stage` in selects and write payload types
- `src/routes/app/PromptEditor.tsx` — stage selector
- `src/routes/app/Dashboard.tsx` — stage filter chips, persist selection in URL
- `src/components/PromptCard.tsx` — stage badge
- `src/components/CommandPalette.tsx` — "Filter by stage: <stage>" entries

### Tasks

#### Database migration
- [ ] Create `supabase/migrations/<UTC YYYYMMDDHHMMSS>_prompt_stage.sql`:
  ```sql
  alter table public.prompts
    add column if not exists stage text;

  alter table public.prompts
    add constraint prompts_stage_check
      check (stage is null or stage in
        ('question','research','design','structure','plan','work','implement','review'));

  create index if not exists prompts_team_stage_idx
    on public.prompts (team_id, stage);
  ```
- [ ] Update `src/lib/database.types.ts` to include `stage: string | null` on `prompts` Row/Insert/Update.

#### Types
- [ ] In `src/lib/types.ts` add:
  ```ts
  export type Stage =
    | 'question' | 'research' | 'design' | 'structure'
    | 'plan' | 'work' | 'implement' | 'review';

  export const STAGE_OPTIONS: { id: Stage; label: string; short: string; color: string }[] = [
    { id: 'question',  label: 'Question',  short: 'Q',  color: '...' },
    { id: 'research',  label: 'Research',  short: 'R',  color: '...' },
    { id: 'design',    label: 'Design',    short: 'D',  color: '...' },
    { id: 'structure', label: 'Structure', short: 'S',  color: '...' },
    { id: 'plan',      label: 'Plan',      short: 'P',  color: '...' },
    { id: 'work',      label: 'Work',      short: 'W',  color: '...' },
    { id: 'implement', label: 'Implement', short: 'I',  color: '...' },
    { id: 'review',    label: 'Review/PR', short: 'PR', color: '...' },
  ];
  ```
  Pick distinct accent shades drawn from existing `var(--ps-accent)` ramp; do not add new top-level CSS variables for this — inline the hex/oklch.

#### API
- [ ] In `src/api/prompts.ts`, include `stage` in the column list of every `select(...)` and add it to the `createPrompt` and `updatePrompt` parameter types.

#### PromptEditor
- [ ] Add `stage` state and hydrate from `promptQuery.data?.stage ?? ''`.
- [ ] **Inside the Advanced `<details>` block** (the same one that holds Espanso trigger and Target agent from Issue #10), add a "Stage" row: label "Stage" + `<ConceptInfo conceptId="stages" />` + a `<select>` populated from `STAGE_OPTIONS`. Empty option = "No stage". Hint text below the row: "Tag this prompt as part of a Research → Plan → Implement workflow."
- [ ] Do *not* add a stage selector to the editor header. Header stays clean.
- [ ] Include `stage: stage || null` in create/update/autosave payloads. Add to autosave dependency list.

#### Dashboard
- [ ] Add a TanStack Query for `hasAnyStagedPrompt(currentTeamId)` returning `boolean` (count > 0 of prompts where `stage IS NOT NULL`). Implement as a lightweight Supabase head-count query. Cache key: `promptKeys.hasStaged(teamId)`.
- [ ] Render the horizontal stage filter chips above the prompt grid **only when** `hasAnyStagedPrompt` is true *or* `useShowAdvanced()` returns true. When neither, render nothing — no empty container, no placeholder.
- [ ] When chips render, place a `<ConceptInfo conceptId="stages" />` icon inline at the start of the strip so first-time encounters have an explainer.
- [ ] Multi-select chip behavior; persist in `useSearchParams` (`?stages=research,plan`).
- [ ] Filter the rendered prompts client-side by `stage in selectedStages` only when at least one chip is active. When no chip is selected, show all prompts (current behavior).
- [ ] On mobile, allow horizontal scroll on the chip strip — match the existing Settings tab strip pattern.

#### PromptCard / PromptListRow
- [ ] In `PromptCard.tsx`, render a small colored stage badge under the title **only when** `prompt.stage` is set. Use the color from `STAGE_OPTIONS`. No placeholder when unset.
- [ ] In `PromptListRow` (defined inside `Dashboard.tsx`), add an inline stage badge before the title text, again only when set. Hide on the narrow mobile column layout (already drops Tags/Updated).

#### CommandPalette
- [ ] Add stage filter entries ("Filter by stage: Question", etc.) **only when** `hasAnyStagedPrompt` is true or `useShowAdvanced()` is true. Suppress entirely otherwise — the palette should not surface concepts the user hasn't engaged with.

#### Testing
- [ ] Manual: create a prompt, leave it un-staged — confirm no chip strip appears, no stage word anywhere except inside the Advanced disclosure.
- [ ] Manual: open Advanced, set stage to Plan, save, reload — verify it persists and the chip strip + card badge now appear.
- [ ] Manual: clear all stages from all prompts — verify the chip strip disappears again.
- [ ] Manual: with no staged prompts, toggle Settings → Appearance → Show all advanced features → on. Verify chip strip appears with all 8 stages.
- [ ] Manual: in Dashboard with at least one staged prompt, click the Plan chip — verify only Plan-stage prompts remain. URL contains `?stages=plan`.
- [ ] Manual: ConceptInfo `i` icon next to the chip strip opens a popover summarizing stages.
- [ ] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Add QRSPI stage typing with auto-disclosed filter chips and badges`

---

## Issue #12 — Bundles: compose modules into a single AGENTS.md / CLAUDE.md export

**GitHub issue:** _to be filed_

### Context
Multi-format export per prompt (Issue #10) plus stage typing (Issue #11) sets up the headline feature: **bundles**. A bundle is an ordered set of prompts (instruction modules) with a target format. Exporting a bundle produces one `AGENTS.md` (or `CLAUDE.md`, etc.) where each module appears as a section. This is the surface that turns PromptStash into a harness-configuration console — see `FUTURE.md` §3.4, §5.3, and the QRSPI implications section.

Scope is intentionally limited: no GitHub repo sync (deferred to Future Ideas), no per-bundle variables (deferred to a later issue once we see usage). Just CRUD, ordering, and download.

### Key files
- `supabase/migrations/<timestamp>_bundles.sql` — new migration with two tables and RLS
- `src/lib/database.types.ts` — extend with the new tables
- `src/lib/types.ts` — `Bundle`, `BundleItem`, `BundleWithItems`
- `src/api/bundles.ts` — NEW: CRUD
- `src/lib/queryClient.ts` — add `bundleKeys` factory mirroring `promptKeys`
- `src/lib/agentExport.ts` — extend with `bundleToFile()`
- `src/main.tsx` — add `/app/bundles` and `/app/bundles/:id` routes
- `src/routes/app/BundleList.tsx` — NEW
- `src/routes/app/BundleEditor.tsx` — NEW
- `src/components/Sidebar.tsx` — add "Bundles" nav item
- `src/components/CommandPalette.tsx` — "New bundle", "Open bundle…" entries
- `src/hooks/useDragAndDrop.ts` — reuse for item reordering

### Tasks

#### Database migration
- [x] Create `supabase/migrations/<UTC YYYYMMDDHHMMSS>_bundles.sql`:
  ```sql
  create table if not exists public.bundles (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references public.teams(id) on delete cascade,
    name text not null,
    description text,
    target_format text not null
      check (target_format in ('agents','claude','copilot','cursor','windsurf','generic')),
    created_by uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create trigger bundles_set_updated_at
    before update on public.bundles
    for each row execute function moddatetime(updated_at);

  create table if not exists public.bundle_items (
    bundle_id uuid not null references public.bundles(id) on delete cascade,
    prompt_id uuid not null references public.prompts(id) on delete cascade,
    position integer not null,
    included boolean not null default true,
    heading_override text,
    primary key (bundle_id, prompt_id)
  );

  create index if not exists bundle_items_bundle_position_idx
    on public.bundle_items (bundle_id, position);

  alter table public.bundles enable row level security;
  alter table public.bundle_items enable row level security;

  create policy "bundles_read"   on public.bundles
    for select using (is_team_member(team_id));
  create policy "bundles_write"  on public.bundles
    for all using (
      exists (select 1 from public.memberships m
              where m.team_id = bundles.team_id
                and m.user_id = auth.uid()
                and m.role in ('owner','editor'))
    ) with check (
      exists (select 1 from public.memberships m
              where m.team_id = bundles.team_id
                and m.user_id = auth.uid()
                and m.role in ('owner','editor'))
    );

  create policy "bundle_items_read" on public.bundle_items
    for select using (
      exists (select 1 from public.bundles b
              where b.id = bundle_items.bundle_id
                and is_team_member(b.team_id))
    );
  create policy "bundle_items_write" on public.bundle_items
    for all using (
      exists (select 1 from public.bundles b
              join public.memberships m on m.team_id = b.team_id
              where b.id = bundle_items.bundle_id
                and m.user_id = auth.uid()
                and m.role in ('owner','editor'))
    ) with check (
      exists (select 1 from public.bundles b
              join public.memberships m on m.team_id = b.team_id
              where b.id = bundle_items.bundle_id
                and m.user_id = auth.uid()
                and m.role in ('owner','editor'))
    );
  ```
- [x] Regenerate / hand-edit `src/lib/database.types.ts` to add both tables.

#### Types and query keys
- [x] In `src/lib/types.ts` add:
  ```ts
  export type Bundle = Database['public']['Tables']['bundles']['Row'];
  export type BundleItem = Database['public']['Tables']['bundle_items']['Row'];
  export type BundleWithItems = Bundle & { items: (BundleItem & { prompt: Prompt })[] };
  ```
- [x] In `src/lib/queryClient.ts` add a `bundleKeys` factory mirroring the shape of `promptKeys` (`all`, `lists`, `list(teamId)`, `details`, `detail(id)`).

#### API layer
- [x] Create `src/api/bundles.ts` with:
  - `listBundles(teamId: string): Promise<Bundle[]>` — ordered by `updated_at desc`.
  - `getBundle(id: string): Promise<BundleWithItems>` — joins `bundle_items` with `prompts`, sorted by `position asc`.
  - `createBundle(input: { team_id; name; description?; target_format }): Promise<Bundle>`.
  - `updateBundle(id, patch): Promise<Bundle>`.
  - `deleteBundle(id): Promise<void>`.
  - `addBundleItem(bundleId, promptId): Promise<BundleItem>` — assigns next available `position`.
  - `removeBundleItem(bundleId, promptId): Promise<void>`.
  - `reorderBundleItems(bundleId, orderedPromptIds: string[]): Promise<void>` — single update setting positions in order.
  - `setBundleItemIncluded(bundleId, promptId, included: boolean): Promise<void>`.
  - `setBundleItemHeadingOverride(bundleId, promptId, heading: string | null): Promise<void>`.

#### Routes and navigation
- [x] In `src/main.tsx` add child routes under `AppLayout`: `/app/bundles` → `BundleList`, `/app/bundles/new` → `BundleEditor`, `/app/bundles/:id` → `BundleEditor`.
- [x] In `src/components/Sidebar.tsx` add a "Bundles" `NavItem` (Layers icon from lucide-react) **with auto-disclosure**:
  - Render only when at least one of these is true: `bundles.length > 0` for the current team (use a TanStack Query keyed `bundleKeys.list(teamId)` already in flight from the layout), OR the current route matches `/app/bundles*`, OR `useShowAdvanced()` returns true.
  - When the nav item is hidden but the user navigates to `/app/bundles` directly (e.g. from the template gallery in Issue #14), it should temporarily appear because the route-match condition fires.
- [x] Pass through `currentTeamId` via outlet context (already provided).

#### Bundle list page
- [x] Create `src/routes/app/BundleList.tsx`:
  - Page header: title "Bundles" + `<ConceptInfo conceptId="bundles" />`, description "Compose modules into a single agent file like AGENTS.md or CLAUDE.md.", "New bundle" button.
  - Table or card grid with columns: Name, Target format, # modules, Updated, Actions (Open, Download, Delete).
  - Reuse `EmptyState` when there are no bundles. The empty-state CTA: "Create a bundle from scratch" + "Browse template gallery" (the latter opens the Issue #14 gallery if available, else falls back to a tooltip "Coming soon").

#### Bundle editor page
- [x] Create `src/routes/app/BundleEditor.tsx`. Layout: two-column on desktop, stacked on mobile.
  - **Left:**
    - Name input.
    - Description textarea.
    - Target format select (`AGENT_FORMATS` from `src/lib/agentExport.ts`).
    - Save button (auto-save on debounce mirrors PromptEditor).
    - Ordered list of items. Each row shows: drag handle, title, stage badge (from Issue #11), included checkbox, heading override input (collapsed behind a small "Edit heading" toggle), remove button.
    - "Add module" button → opens a Combobox/CommandPalette-style picker listing all prompts in `currentTeamId` not already in the bundle. Filter by stage chip.
  - **Right:**
    - Sticky preview pane rendering `bundleToFile(bundle, items, prompts).content` inside a `<pre>` with the existing monospace styling.
    - "Download" button at the top of the preview (calls `downloadFile` with the rendered output).
- [x] Use `useDragAndDrop` for reorder; on drop, call `reorderBundleItems`.
- [x] On any item mutation, invalidate `bundleKeys.detail(id)` so the preview re-renders.

#### Export wrapper
- [x] In `src/lib/agentExport.ts` add:
  ```ts
  export function bundleToFile(
    bundle: Bundle,
    items: (BundleItem & { prompt: Prompt })[],
  ): { filename: string; content: string }
  ```
  - Filename comes from `filenameFor(bundle.target_format)`.
  - Content begins with a header comment: `# <bundle.name>` then `<bundle.description>` (if any) then a horizontal rule.
  - For each `included` item in `position` order, render `## <heading_override or item.prompt.title>` followed by `item.prompt.body_md`. Skip excluded items.
  - For plain-text formats (`cursor`, `windsurf`), use a row of dashes as a section separator instead of `##`.

#### CommandPalette
- [x] Add entries: "New bundle" → navigate to `/app/bundles/new`. "Open bundle…" → list existing bundles.

#### Testing
- [x] Manual: create a bundle, add 3 prompts, reorder, exclude one, download — verify the resulting `AGENTS.md` has the right sections in the right order.
- [x] Manual: switch the target format from AGENTS.md to `.cursorrules` — verify the preview switches to plain-text section separators and the download has filename `.cursorrules`.
- [x] Manual: delete a prompt that's in a bundle — verify the bundle item disappears (cascade) and the editor still opens cleanly.
- [x] **Progressive disclosure check:** A workspace with zero bundles must not show "Bundles" in the sidebar. Create one bundle — the nav item appears. Delete it — the nav item disappears again.
- [x] **Direct-link check:** With zero bundles, navigate to `/app/bundles` directly — the page loads, the sidebar nav item temporarily appears (route match), and the empty state is shown with a "Create a bundle from scratch" CTA.
- [x] **ConceptInfo check:** Click the `i` icon next to "Bundles" in the page header — popover renders with the bundles summary.
- [x] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Add bundles with auto-disclosed sidebar nav for composing agent file exports`

---

## Issue #13 — Token budget and Dumb Zone indicator

**GitHub issue:** _to be filed_

### Context
Per `FUTURE.md`'s context-engineering section, agents degrade past roughly 40% of their context window — Dex Horthy's "Dumb Zone." PromptStash should surface token estimates so users can keep modules small and bundles in the smart zone. This issue adds a lightweight token estimator and an indicator that flows from per-prompt to per-bundle.

We use a character-count heuristic (chars ÷ 4) for v1 to avoid pulling in `js-tiktoken` (≈1 MB). The number is approximate, which is fine for the indicator's purpose.

**Disclosure rules for this issue:** The token count is informational, not alarming. In `PromptEditor` it sits next to the existing word counter as a single neutral pill — no color until the prompt crosses a generous soft threshold (e.g. > 8000 tokens). On `PromptCard` and `PromptListRow`, the token count renders as small dim text only when the prompt has body content > 1000 chars (most short prompts don't need it). The full color-coded "Dumb Zone" gauge only appears in `BundleEditor`, where users are explicitly composing for a model context. Per-prompt UI never uses the words "Dumb Zone".

### Key files
- `src/lib/tokens.ts` — NEW: estimator and zone helpers
- `src/components/PromptCard.tsx` — token badge
- `src/routes/app/Dashboard.tsx` (`PromptListRow`) — token column on desktop
- `src/routes/app/PromptEditor.tsx` — replace/augment the existing word/token counter
- `src/routes/app/BundleEditor.tsx` — aggregate budget gauge

### Tasks

#### Estimator
- [ ] Create `src/lib/tokens.ts`:
  ```ts
  export type Zone = 'safe' | 'warning' | 'danger';

  export const MODEL_CONTEXTS = {
    'claude-sonnet': 200_000,
    'claude-opus':   200_000,
    'gpt-5':         400_000,
    default:         200_000,
  } as const;
  export type ModelKey = keyof typeof MODEL_CONTEXTS;

  export const ZONE_THRESHOLDS = { safe: 0.40, warning: 0.60 };

  export function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  export function getZone(tokens: number, contextSize: number): Zone {
    const ratio = tokens / contextSize;
    if (ratio < ZONE_THRESHOLDS.safe)    return 'safe';
    if (ratio < ZONE_THRESHOLDS.warning) return 'warning';
    return 'danger';
  }

  export function zoneColor(zone: Zone): string {
    if (zone === 'safe')    return 'oklch(0.72 0.16 150)'; // green
    if (zone === 'warning') return 'oklch(0.78 0.16 80)';  // amber
    return 'oklch(0.65 0.20 25)';                          // red
  }
  ```

#### PromptEditor
- [ ] Next to the existing word counter, render a neutral "≈ N tokens" pill. Default styling: dim (`color: var(--ps-fg-faint)`, transparent background). When tokens exceed 8000 (`SOFT_THRESHOLD`), promote to amber styling (`zoneColor('warning')`); above 16000, red. No green styling for small prompts — small prompts don't need an alarm signal saying "you're fine."
- [ ] Recompute on the same debounce as the existing word count.
- [ ] Do NOT use the words "Dumb Zone" anywhere in the editor UI. The amber/red coloring is the only signal.

#### PromptCard / PromptListRow
- [ ] In `PromptCard.tsx`, render `≈ N tok` as small dim text in the existing meta row **only when** `prompt.body_md.length > 1000`. Short prompts get nothing — keeps cards quiet.
- [ ] In `PromptListRow`, add a tokens column between Tags and Updated on desktop, again only populated when `body_md.length > 1000`. Hide on the narrow mobile layout entirely.

#### BundleEditor
- [ ] Above (or below) the preview pane, render a "Context budget" panel:
  - Header: "Context budget" + `<ConceptInfo conceptId="dumb-zone" />`.
  - Sum tokens across `included` items.
  - A model selector (`claude-sonnet`, `claude-opus`, `gpt-5`) — local to this view, not persisted on the bundle.
  - A horizontal bar gauge: filled portion = `tokens / contextSize`, colored by `zoneColor(getZone(...))`. Two thin tick marks at 40% and 60%.
  - Below the bar: `≈ N tokens • X% of <model> context • Zone: <Safe|Warning|Danger>`.
  - When zone is `warning` or `danger`, render an inline message: "This bundle is approaching the Dumb Zone — consider splitting modules or moving detail into sub-agent instructions." Tone matches existing helper text. The "Dumb Zone" wording is OK *here* because the user is in a feature-aware view and the ConceptInfo icon explains it.

#### Testing
- [ ] Manual: open a small prompt (~50 tokens) in the editor — pill is dim, no color, just "≈ 50 tokens". Paste in 80k characters of lorem ipsum — pill goes amber, then red.
- [ ] Manual: on Dashboard, prompts with short bodies show no token text. Edit one to be long — the dim text appears.
- [ ] Manual: in a bundle, include enough modules to exceed 40% of 200k — gauge turns amber and the warning message appears with the ConceptInfo icon clickable.
- [ ] Manual: switch the bundle model selector to `gpt-5` (400k) — the same bundle drops back to safe.
- [ ] **Progressive disclosure check:** A user who never opens a bundle should never see the words "Dumb Zone" in the UI.
- [ ] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Add token estimation and Dumb Zone gauge for bundles with quiet per-prompt counts`

---

## Issue #14 — Agent instruction template gallery

**GitHub issue:** _to be filed_

### Context
With format export, stage typing, bundles, and budgets in place, the final piece is **content**: a curated gallery that lets a new user instantiate a working QRSPI harness or a code-review module in one click. This is `FUTURE.md` §3.6 / §5.5, and it's where the new positioning becomes tangible to users who just signed up.

Templates are static TypeScript modules in `src/lib/templates/` — no DB table needed. Selecting a template calls existing `createPrompt` and `createBundle` APIs to materialize it into the current workspace.

### Key files
- `src/lib/templates/` — NEW directory of seed content
- `src/lib/templates/index.ts` — registry
- `src/lib/templates/qrspi.ts` — 8-stage QRSPI bundle
- `src/lib/templates/agents-md-basic.ts` — minimal AGENTS.md skeleton
- `src/lib/templates/code-review.ts`
- `src/lib/templates/git-workflow.ts`
- `src/lib/templates/testing.ts`
- `src/lib/templates/markdown-style.ts`
- `src/components/TemplateGallery.tsx` — NEW dialog
- `src/routes/app/Dashboard.tsx` — "From template" button
- `src/components/CommandPalette.tsx` — "Browse templates" entry

### Tasks

#### Template registry
- [ ] Create `src/lib/templates/index.ts`:
  ```ts
  import type { AgentFormat, Stage } from '../types';

  export type PromptTemplate = {
    title: string;
    body_md: string;
    stage?: Stage;
    agent_format?: AgentFormat;
  };

  export type BundleTemplate = {
    name: string;
    description: string;
    target_format: AgentFormat;
    items: PromptTemplate[];
  };

  export type Template =
    | { kind: 'prompt'; id: string; category: string; description: string; prompt: PromptTemplate }
    | { kind: 'bundle'; id: string; category: string; description: string; bundle: BundleTemplate };

  export type Difficulty = 'starter' | 'intermediate' | 'advanced';

  export const TEMPLATES: (Template & { difficulty: Difficulty })[] = [
    // Order matters — gallery renders in this order.
    // Starters first so a brand-new user sees approachable content above QRSPI.
    codeReviewTemplate,        // starter, single prompt
    gitWorkflowTemplate,       // starter, single prompt
    testingTemplate,           // starter, single prompt
    markdownStyleTemplate,     // starter, single prompt
    agentsMdBasicTemplate,     // intermediate, single prompt — first encounter with agent files
    qrspiTemplate,             // advanced, 8-stage bundle — last
  ];
  ```
- [ ] Author `qrspi.ts`: a `BundleTemplate` with target `agents` and 8 prompt items (one per stage) following the QRSPI breakdown in `FUTURE.md`. Each item's body should be a short, opinionated instruction set — not generic placeholder text. Keep each under ~400 tokens. Difficulty: advanced.
- [ ] Author `agents-md-basic.ts`: a single-prompt template with a minimal AGENTS.md skeleton (project overview, build/test commands, code style, PR conventions sections). Difficulty: intermediate. `agent_format: 'agents'`.
- [ ] Author `code-review.ts`: prompt template, no stage required, format-agnostic, ~300 token instruction set. Difficulty: starter.
- [ ] Author `git-workflow.ts`: prompt template covering branch naming, commit messages, PR conventions. Difficulty: starter.
- [ ] Author `testing.ts`: prompt template covering test placement, naming, mocks vs integration tests. Difficulty: starter.
- [ ] Author `markdown-style.ts`: prompt template covering doc formatting conventions. Difficulty: starter.

#### Template gallery dialog
- [ ] Create `src/components/TemplateGallery.tsx`:
  - Uses `Dialog` from `src/components/ui/dialog.tsx`. Wide content (max-w 720px on desktop, full-width on mobile).
  - Header: "Browse templates", short description: "Pre-built prompts and bundles you can drop into your workspace.", difficulty filter pills (Starter / Intermediate / Advanced — defaults to Starter highlighted, but no items hidden).
  - Body: scrollable grid of cards, rendered in registry order. Each card: name, difficulty badge, kind badge (Prompt or Bundle), description, list of contained items for bundles with stage badges, "Use template" button.
  - For advanced templates (QRSPI), include `<ConceptInfo conceptId="qrspi" />` next to the name so users can read about the workflow before instantiating.
  - "Use template" action:
    - For `kind: 'prompt'`: call `createPrompt({ team_id: currentTeamId, title, body_md, stage, agent_format })`. On success, navigate to `/app/p/<id>/edit`.
    - For `kind: 'bundle'`: create each item prompt sequentially via `createPrompt`, then `createBundle({ team_id, name, target_format })`, then `addBundleItem` for each new prompt. On success, navigate to `/app/bundles/<id>`.
  - Show a loading state on the card during instantiation; toast on success/failure.

#### Dashboard integration
- [ ] In `Dashboard.tsx`, add a subtle "From template" button next to "New prompt" in the header. Use a secondary/ghost style so "New prompt" stays the primary CTA. On mobile, collapse into the existing overflow/wrap behavior.
- [ ] In the empty-state view (no prompts yet), surface a one-line invitation under the "New prompt" button: "Or browse templates →" linking to the gallery. This is the only place the gallery is highlighted to brand-new users — once they have any prompts, the standing CTA becomes secondary.

#### CommandPalette
- [ ] Add a "Browse templates" entry that opens the gallery (lift gallery state up to `AppLayout` if needed, or wire via a route — simplest path: gallery state in `AppLayout`, command palette toggles it).

#### Testing
- [ ] Manual: as a brand-new user with zero prompts, the empty state shows "New prompt" prominently and "Or browse templates →" as a quieter secondary action.
- [ ] Manual: open the gallery, confirm the first cards visible are starter prompts (Code Review, Git Workflow), with QRSPI at the bottom.
- [ ] Manual: instantiate the Code Review prompt — verify it opens at `/app/p/<id>/edit`. Stage stays unset (template doesn't force one).
- [ ] Manual: instantiate the QRSPI bundle — verify 8 prompts and 1 bundle appear in the workspace, opening at `/app/bundles/<id>`. Confirm the Bundles sidebar nav item now appears (Issue #12 auto-disclosure).
- [ ] Manual: instantiate the same bundle twice — verify it does not collide (creates new prompts and a new bundle each time).
- [ ] Manual: click the ConceptInfo icon on the QRSPI card — popover renders with summary + "Learn more →" link.
- [ ] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Add agent instruction template gallery sorted starter-first with QRSPI as advanced option`

---

## Issue #15 — Concepts library and Learn page

**GitHub issue:** _to be filed_

### Context
By this point, every advanced surface (Target agent dropdown, Stage selector, Bundles, Dumb Zone gauge, QRSPI templates) has a `<ConceptInfo>` slot pulling from a placeholder summary. This issue replaces those placeholders with full concept docs that cite their sources, and adds a dedicated `/app/learn` page so curious users can browse the why behind each feature.

The Learn page is the single standing invitation in the sidebar footer for users who don't engage with feature-level discovery. It must be skimmable: short summaries, why-it-matters, how-PromptStash-uses-it, and annotated references drawn from `FUTURE.md` (Dex Horthy's QRSPI posts, the AGENTS.md spec, HumanLayer's Dumb Zone write-ups, Vaibhav's Agentic RAG talk, etc.).

### Key files
- `src/content/concepts/*.md` — full content for each concept (replace stubs from Issue #10)
- `src/content/concepts/index.ts` — registry promoted from a flat summary map to a richer record with body and references
- `src/components/ConceptInfo.tsx` — no API change; updated implementation pulls richer data
- `src/main.tsx` — add `/app/learn` and `/app/learn/:id` routes
- `src/routes/app/Learn.tsx` — NEW: index page listing all concepts
- `src/routes/app/LearnConcept.tsx` — NEW: single-concept page rendering markdown via `MarkdownViewer`
- `src/components/Sidebar.tsx` — add "Learn" link to the sidebar footer (always visible)
- `src/components/CommandPalette.tsx` — add "Open Learn" + per-concept "Learn: <Concept>" entries

### Tasks

#### Concept registry
- [ ] Promote `src/content/concepts/index.ts` from a `Record<string, { title; summary }>` to a richer registry:
  ```ts
  export type ConceptReference = { label: string; url: string; note?: string };
  export type Concept = {
    id: string;
    title: string;
    summary: string;          // 2-3 sentences for the popover
    body: string;             // full markdown for the Learn page
    why: string;              // markdown, "why this matters" paragraph
    howPromptStashUses: string; // markdown, concrete tie-in to features in this app
    references: ConceptReference[];
    related?: string[];       // concept ids
  };
  export const CONCEPTS: Record<string, Concept> = { /* … */ };
  ```
- [ ] One concept entry per file under `src/content/concepts/`. Either keep them as `.md` with frontmatter and a tiny build-time loader, or just hand-author TypeScript objects — the latter is simpler and avoids adding a markdown loader to Vite. Pick TypeScript for v1.
- [ ] Authoring rules:
  - Plain English, ~150-300 words for `body`.
  - Avoid jargon in the first paragraph.
  - References: at least 2 per concept, each with a one-line note explaining what the link adds.

#### Concepts to author
- [ ] `agents-md` — What AGENTS.md is, why a community standard helps, how PromptStash treats it as the default target format. References: agents.md site, openai/agents.md repo, GitHub Copilot's AGENTS.md adoption blog.
- [ ] `claude-md` — Same shape as `agents-md` but framed around Claude Code's `CLAUDE.md`. References: Anthropic Claude Code docs (the link the user can click rather than us guessing the URL — leave the URL slot for the implementer to fill from official Anthropic docs).
- [ ] `stages` — What stage typing means, summary of QRSPI stages, why tagging modules helps composition. References: Dex Horthy's `betterquestions.ai` "necessary evolution of RPI" post, HumanLayer "advanced context engineering" GitHub doc.
- [ ] `bundles` — What a bundle is, why composing many small modules beats one giant prompt, link to `dumb-zone` and `stages` as related. No external references needed; this is a PromptStash concept.
- [ ] `dumb-zone` — Summary of the ~40% context utilization rule, why agent quality degrades, how the gauge maps to it. References: HumanLayer "skill issue: harness engineering" blog, the LinkedIn post Dex links from `FUTURE.md`.
- [ ] `qrspi` — Full QRSPI workflow walkthrough (Question → Research → Design → Structure → Plan → Work → Implement → Pull Request), with the betterquestions.ai post and `qrspi-agent` npm/GitHub references.
- [ ] `context-engineering` — The umbrella concept; summarize Dex/Vaibhav's framing. References: HumanLayer blog index, Boundary ML podcast episode listed in `FUTURE.md`.

#### ConceptInfo updates
- [ ] In `src/components/ConceptInfo.tsx`, swap the static summary lookup for `CONCEPTS[id]?.summary`. The "Learn more →" link target becomes `/app/learn/<id>`.
- [ ] If `id` is missing from `CONCEPTS`, render nothing (degrades gracefully if a future surface references a concept that hasn't been authored yet).

#### Learn index page
- [ ] Create `src/routes/app/Learn.tsx`:
  - Header: "Learn", description: "Background on the concepts behind PromptStash's instruction-module features."
  - Render a card grid of all `CONCEPTS`, sorted alphabetically by title. Each card shows title, summary, and a "Read →" affordance.
  - Search input that filters by title/summary substring.

#### Learn concept page
- [ ] Create `src/routes/app/LearnConcept.tsx`:
  - Title + summary block.
  - Body markdown rendered via existing `MarkdownViewer` component.
  - "Why this matters" section.
  - "How PromptStash uses it" section.
  - "References" — vertical list, each item: link (opens in new tab) + the one-line note.
  - "Related concepts" — chips linking to other Learn pages.
  - Back link to `/app/learn`.

#### Sidebar footer link
- [ ] In `src/components/Sidebar.tsx`, add a "Learn" `NavItem` to the footer area (next to settings/sign-out). Use `BookOpen` icon. **Always visible** — this is the canonical entry point for users who never engage with auto-disclosed features.

#### CommandPalette
- [ ] Add "Open Learn" entry navigating to `/app/learn`.
- [ ] Add per-concept entries: "Learn: AGENTS.md", "Learn: Stages", "Learn: Dumb Zone", etc., each navigating to `/app/learn/<id>`.

#### Testing
- [ ] Manual: from a fresh install, click "Learn" in the sidebar footer — index page renders with all concepts.
- [ ] Manual: open each concept page — verify summary, body, why, how-PromptStash, and at least 2 references render.
- [ ] Manual: click an external reference link — opens in new tab.
- [ ] Manual: in any feature view (Bundle editor, stage chip strip, Target agent dropdown), click the `i` icon — popover summary matches the Learn page summary, "Learn more →" navigates correctly.
- [ ] Manual: search the Learn index for "context" — only matching concepts show.
- [ ] **Cardinal-constraint check:** create a brand-new account, create one prompt, save it. The only place where you encountered any of these concept words ("AGENTS.md", "stage", "bundle", "Dumb Zone", "QRSPI") was the optional Learn link in the sidebar footer.
- [ ] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Add Learn page and full concept docs replacing placeholder ConceptInfo summaries`

---

## Completion checklist

- [x] Issue #10 complete — committed and pushed
- [x] Issue #11 complete — committed and pushed
- [x] Issue #12 complete — committed and pushed
- [ ] Issue #13 complete — committed and pushed
- [ ] Issue #14 complete — committed and pushed
- [ ] Issue #15 complete — committed and pushed

After all six issues land, perform the **end-to-end progressive disclosure audit**:

1. Sign up as a brand-new user. Create one workspace.
2. Create a prompt with title and body. Save it. Confirm: no concept icons, no stage chips, no Bundles nav, no token gauges, no advanced jargon visible anywhere except inside the Advanced disclosure on the editor and the optional "Learn" link in the sidebar footer.
3. Open the Advanced disclosure once. Confirm: Target agent and Stage selectors appear with `i` icons; clicking them shows summaries and lets you reach the Learn page.
4. Browse the gallery. Instantiate the QRSPI bundle. Confirm: Bundles nav appears, stage badges appear on the new prompts, the chip strip on Dashboard appears.
5. Toggle Settings → Appearance → Show all advanced features → on. Confirm every previously-hidden surface is now visible regardless of data state.

If any step surfaces an advanced feature when the user hasn't asked for it (and step 1's setup didn't include it), file a bug against the originating issue.

---

## Future ideas (not in this batch)

These are flagged in `FUTURE.md` but deliberately deferred until the five issues above are shipped and the new positioning has been validated.

### GitHub repo sync
Connect a GitHub repo to a workspace; map a bundle to a path (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`) and push generated files via PRs. Adds a CD pipeline for instruction files and is the deepest moat against generic note tools (Obsidian, Notion). Requires GitHub App + OAuth, branch/PR plumbing, and conflict detection. High implementation cost; defer until at least one team is using bundles in anger.

### Repo import / inventory
Scan a connected repo for existing `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `.cursorrules`; parse sections and import as prompts/bundles. Cuts onboarding friction for users adopting PromptStash mid-project.

### Variables and per-project overrides
Extend the existing prompt body with typed variables (`{{repo_name | string}}`, `{{stack | enum:typescript,python}}`) plus per-bundle default values. Lets one module serve many repos. Tightly complements bundles and repo sync — implement after sync exists so we know what overrides are actually needed.

### Agent-format linting
Static analysis over instruction modules: flag missing build/test sections, instruction-budget violations (count of bullet points), conflicting rules across stages, ambiguous phrasing. Lightweight v1 = a handful of heuristics. Strong differentiator vs generic prompt managers.

### Lightweight community sharing
Public/private flag on bundles plus a discovery gallery. Users can fork community bundles into their workspace. Adds content gravity once enough public bundles exist.

### MCP server / espanso-style local sync
An MCP server that exposes a workspace's instruction modules to local agents; same idea for syncing bundles to a local directory the way Espanso export already does for individual prompts.

### Claude Desktop and Codex desktop integrations
Both Claude Desktop and OpenAI's Codex desktop/CLI apps have first-class "cowork" surfaces for collaborating with an agent on a real workstation: Claude Desktop has Projects (custom instructions + uploaded knowledge), Skills, and MCP server support; Codex has its desktop app, the `codex` CLI, and the `qrspi-agent`-style harness pattern that reads stage prompts from disk. PromptStash should plug into these directly so a bundle authored in the web app shows up wherever the user actually works with their agent.

Concrete integration surfaces worth exploring, roughly in order of impact:

- **MCP server (canonical entry point).** Ship a small MCP server (Node or Deno) that authenticates with a PromptStash API key and exposes: `listBundles`, `getBundle`, `listPrompts`, `getPrompt`, `searchModules(stage?, agentFormat?)`. Both Claude Desktop and Codex desktop support adding MCP servers via their settings UI; a single server covers both. This is the lowest-effort, highest-leverage entry point because it works with any MCP-aware client present and future.
- **Claude Desktop Projects sync.** When a user connects a Project, push a chosen bundle's rendered AGENTS.md/CLAUDE.md content into the Project's custom instructions field, and optionally upload selected modules as Project knowledge files. Two-way sync (read changes back from the Project) is a stretch goal — start with one-way push driven from PromptStash.
- **Claude Desktop Skills export.** A Skill is essentially a packaged instruction module with optional supporting files. Add an export path that materializes a stage-typed module (or a small bundle) as a Skill bundle the user can drop into Claude Desktop's skills directory. Stage tagging maps naturally onto Skill metadata.
- **Codex desktop / CLI sync.** The `qrspi-agent` package already expects a project layout with AGENTS.md plus a `.qrspi/` directory of stage prompts. Add a one-button "Export to Codex project" action that writes that layout into a chosen local directory (via a small companion helper or a `npx promptstash sync` CLI). Pairs naturally with the QRSPI starter bundle from Issue #14.
- **Cowork / shared session hooks.** Both apps are leaning into shared agent sessions where one user kicks off a task and a teammate watches or takes over. PromptStash bundles are a perfect fit for "what instructions did this session start with?" — explore exposing a read-only public bundle URL the cowork session can pin, or a webhook that timestamps which bundle version was active for a given session.
- **Companion CLI (`npx promptstash`).** Even before deep app-specific integrations, a tiny CLI that authenticates with an API key and writes bundles to disk (or stdout) covers most of these use cases at low cost: `promptstash bundle pull <id> > AGENTS.md`, `promptstash bundle sync <id> --dir ~/projects/foo` for periodic refresh.

Open questions to resolve before implementation: Claude Desktop and Codex authentication models for third-party connectors (token vs. OAuth vs. local-only); whether MCP alone covers the cowork story or whether vendor-specific APIs are needed; how versioning and conflict resolution should behave when a Project's custom instructions are edited outside PromptStash.
