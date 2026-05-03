# PromptStash — Agent Execution Plan

This file is both a plan and a live progress tracker. Update task status as you work.
After completing each issue, commit and push to `main`.

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
- Match the style of surrounding code exactly (inline styles via `style={{}}`, CSS variables like `var(--ps-fg)`, `var(--ps-accent)`, etc.).

### Status legend
- `[ ]` not started
- `[~]` in progress
- `[x]` complete

---

## Issue #3 — Make the app fully responsive and mobile-friendly

**GitHub issue:** https://github.com/adilio/PromptStash/issues/3

### Context
The layout is built with a fixed-width sidebar (`Sidebar.tsx`) and a `Shell` that uses `flex h-screen`. On viewports below ~768px the sidebar overflows and the editor is unusable. The goal is a drawer-based sidebar on mobile, a single-column dashboard, and a thumb-friendly editor.

### Key files
- `src/components/Shell.tsx` — top-level flex container
- `src/components/Sidebar.tsx` — fixed-width left sidebar
- `src/routes/app/AppLayout.tsx` — manages `currentTeamId`, renders `Sidebar` + `Outlet`
- `src/routes/app/Dashboard.tsx` — prompt grid, header, toolbar
- `src/routes/app/PromptEditor.tsx` — editor layout and header
- `src/routes/app/Settings.tsx` — settings layout
- `src/routes/auth/SignIn.tsx` — sign-in page

### Tasks

#### Sidebar drawer
- [x] Add `sidebarOpen` state (default `false` on mobile, `true` on desktop) to `AppLayout.tsx`.
  - Use a `useEffect` that sets initial state based on `window.innerWidth >= 768`.
  - Pass `sidebarOpen` and `setSidebarOpen` down to `Sidebar` as props.
- [x] Add a `MobileTopBar` component inside `AppLayout` that renders only on mobile (`display: none` at `min-width: 768px` via a `<style>` tag or Tailwind's `hidden md:flex`).
  - Shows the PromptStash brandmark on the left.
  - Shows a hamburger icon button (`Menu` from lucide-react) on the right to toggle `sidebarOpen`.
- [x] Update `Sidebar.tsx` to accept `open?: boolean` and `onClose?: () => void` props.
  - On mobile (screen width < 768px): render as a fixed overlay drawer (`position: fixed`, full height, z-index 50, width 260px). When `open` is false, translate off-screen (`transform: translateX(-100%)`). Add a semi-transparent backdrop behind it that calls `onClose` on click.
  - On desktop: render as normal (`position: static`, always visible). Ignore the `open` prop.
  - Add a close button (`X` icon) inside the sidebar header that calls `onClose`, visible only on mobile.
- [x] In `Shell.tsx`, ensure the main content area does not shrink below 0 and scrolls properly on mobile.

#### Dashboard
- [x] In `Dashboard.tsx`, change the prompt card grid from `repeat(auto-fill, minmax(280px, 1fr))` to `repeat(auto-fill, minmax(min(280px, 100%), 1fr))` so it collapses to a single column on narrow screens.
- [x] Wrap the header `<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>` so that on screens < 640px the action buttons (`ExportImportDialog`, `New prompt`) stack below the title or use `flex-wrap: wrap` with `gap: 8px`.
- [x] Hide the toolbar search and filter row on mobile behind a toggle button (a filter icon) if the viewport is narrow — or simply ensure it wraps gracefully with `flex-wrap: wrap`.
- [x] In list view (`PromptListRow`), the `gridTemplateColumns: '22px 1fr 160px 130px 32px'` will overflow on mobile. On narrow screens, hide the Tags and Updated columns and use a two-column grid (`22px 1fr`).

#### Prompt Editor
- [x] In `PromptEditor.tsx`, reduce the editor body padding from `28px 56px 80px` to `16px 20px 80px` on screens < 640px. Use a CSS-in-JS approach: read `window.innerWidth` in a `useMemo` or inject a `<style>` block. Alternatively, add a `responsivePadding` CSS class via a `<style>` tag in the component.
- [x] Move the header action buttons (Share, Copy, Save) into a sticky bottom bar on mobile:
  - When viewport < 640px, hide the header action buttons.
  - Render a `<div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, ... }}>` containing Share, Copy, and Save.
  - Make sure the fixed bar only appears when the editor route is active (it lives inside `PromptEditor`, so it naturally scopes itself).
- [x] Ensure the title `<input>` font size reduces to ~22px on mobile so it doesn't overflow.

#### Settings
- [x] In `Settings.tsx`, the settings layout (sidebar nav + content) should stack vertically on mobile (column direction) instead of the side-by-side layout. On mobile, show the section nav as a horizontal scrollable tab strip at the top instead of a vertical list.

#### Sign-in
- [x] In `src/routes/auth/SignIn.tsx`, ensure the sign-in card is full-width with 16px horizontal padding on viewports < 480px.

#### Testing
- [ ] Manually verify at 375px (iPhone SE), 414px (iPhone Plus), 768px (iPad), and 1280px (desktop).
- [ ] Verify no horizontal scroll at any of the above breakpoints.
- [ ] Verify sidebar drawer opens and closes correctly on mobile.
- [x] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Make layout responsive with mobile sidebar drawer and adaptive editor`

---

## Issue #6 — Comprehensive keyboard shortcuts and full keyboard navigation

**GitHub issue:** https://github.com/adilio/PromptStash/issues/6

### Context
Currently wired shortcuts:
- `N` (global, not in input) — new prompt (`AppLayout.tsx` lines 40–59)
- `Cmd/Ctrl+K` — open command palette (`CommandPalette.tsx` lines 50–62)
- `Ctrl+S` — save prompt (`PromptEditor.tsx` via `useKeyboardShortcut`)

The `useKeyboardShortcut` hook at `src/hooks/useKeyboardShortcut.ts` handles modifier matching and `window.addEventListener`. Use it wherever possible.

### Key files
- `src/hooks/useKeyboardShortcut.ts` — the existing hook
- `src/routes/app/AppLayout.tsx` — global shortcut registration and sidebar state
- `src/routes/app/Dashboard.tsx` — prompt list, search input
- `src/routes/app/PromptEditor.tsx` — editor tabs, save, copy
- `src/components/CommandPalette.tsx` — existing palette, needs shortcut hints
- `src/routes/app/Settings.tsx` — already has a `shortcuts` section stub

### Tasks

#### New global shortcuts
- [x] Register `Cmd/Ctrl+\` in `AppLayout.tsx` to toggle the sidebar (set `sidebarOpen = !sidebarOpen`). Use `useKeyboardShortcut` with `ctrlKey: true, key: '\\'`.
- [x] Register `?` (no modifiers, not in an editable target) in `AppLayout.tsx` to open a shortcuts help modal. Add state `shortcutsHelpOpen` and pass it to a new `ShortcutsHelp` component. Guard against firing when focus is in an input (reuse the existing `isEditableTarget` helper already in `AppLayout.tsx`).

#### Dashboard shortcuts
- [x] Register `/` (no modifiers, not in editable target) in `Dashboard.tsx` to focus the search input. Use a `useRef` on the search `<input>` and call `.focus()` on keydown.
- [x] Implement arrow-key navigation through the prompt list:
  - Track a `focusedPromptIndex` state in `Dashboard.tsx` (default `-1`).
  - On `ArrowDown`, increment index (capped at `filteredPrompts.length - 1`). On `ArrowUp`, decrement (floor 0). Don't fire when focus is in an editable element.
  - Render a visual focus ring on the focused card/row using a border or background change.
  - On `Enter`, navigate to the focused prompt: `navigate(`/app/p/${filteredPrompts[focusedPromptIndex].id}`)`.
  - Reset `focusedPromptIndex` to `-1` when the prompt list changes.

#### PromptEditor shortcuts
- [x] Register `Cmd/Ctrl+1` to switch to the Write tab: `setTab('write')`. Use `useKeyboardShortcut`.
- [x] Register `Cmd/Ctrl+2` to switch to the Preview tab: `setTab('preview')`.
- [x] Register `Cmd/Ctrl+Shift+C` to copy the prompt body to clipboard. Reuse the existing clipboard logic already in the Copy button handler.

#### ShortcutsHelp modal
- [x] Create `src/components/ShortcutsHelp.tsx`. It renders a `Dialog` (use the existing `Dialog` component from `src/components/ui/dialog.tsx`).
  - Title: "Keyboard shortcuts"
  - Two-column grid of shortcut rows. Each row: left cell = key combo rendered in `<kbd>` style, right cell = description.
  - List every shortcut in the app (include the pre-existing ones).
  - Full shortcut table:
    | Keys | Action |
    |------|--------|
    | `N` | New prompt |
    | `?` | Open this help |
    | `/` | Focus search |
    | `Cmd K` | Command palette |
    | `Cmd \` | Toggle sidebar |
    | `Cmd S` | Save prompt |
    | `Cmd 1` | Write tab |
    | `Cmd 2` | Preview tab |
    | `Cmd Shift C` | Copy prompt body |
    | `↑ ↓` | Navigate prompt list |
    | `Enter` | Open focused prompt |
    | `Esc` | Close modal / palette |
- [x] Wire `shortcutsHelpOpen` state from `AppLayout.tsx` into `ShortcutsHelp`.
- [x] Render `<ShortcutsHelp>` inside `AppLayout.tsx` alongside `CommandPalette`.

#### CommandPalette shortcut hints
- [x] Add a `<span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ps-fg-faint)' }}>` after each action label in `CommandPalette.tsx` showing its shortcut (e.g. `N` next to "New Prompt").

#### Settings — Shortcuts section
- [x] In `Settings.tsx`, find the existing `shortcuts` section (it already exists in the `sections` array but likely has a placeholder body). Replace the placeholder with the same shortcut table from `ShortcutsHelp`, rendered as a read-only reference.

#### Focus management and accessibility
- [x] Ensure all `Dialog` modals in the app trap focus when open and return focus to the trigger element on close. The existing `Dialog` component from Radix UI (used via `src/components/ui/dialog.tsx`) handles this automatically — verify it is being used correctly in `ConfirmDialog`, `ExportImportDialog`, `ShareDialog`, and `VersionHistoryDialog`.
- [ ] Add `tabIndex={0}` and `onKeyDown` (Enter/Space to activate) to any interactive `<div>` elements that are missing keyboard activation. Audit: `PromptCard.tsx`, `PromptListRow` in `Dashboard.tsx`, `NavItem` in `Sidebar.tsx`.

#### Testing
- [ ] Test every shortcut listed in the table above in a browser.
- [ ] Verify shortcuts do NOT fire when typing in the title input, body textarea, or search input.
- [ ] Verify `?` opens the help modal and `Esc` closes it.
- [ ] Verify arrow keys navigate the dashboard prompt list.
- [x] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Add comprehensive keyboard shortcuts and navigation with shortcuts help modal`

---

## Issue #7 — Programmatic access via a REST API with API key auth

**GitHub issue:** https://github.com/adilio/PromptStash/issues/7

### Context
The app uses Supabase (client: `src/lib/supabase.ts`). The best approach for a REST API is Supabase Edge Functions (Deno), deployed under `supabase/functions/`. API keys are stored hashed (SHA-256) in a new `api_keys` table. The client UI for key management lives in `Settings.tsx`.

### Key files
- `src/lib/supabase.ts` — Supabase client
- `src/lib/types.ts` — shared TypeScript types
- `src/routes/app/Settings.tsx` — API key management UI goes in a new section here
- `src/api/` — add `src/api/apikeys.ts` for client-side key CRUD
- `supabase/functions/` — create this directory with Edge Functions

### Tasks

#### Database migration
- [x] Create `supabase/migrations/<timestamp>_api_keys.sql`:
  ```sql
  create table if not exists public.api_keys (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    key_hash text not null unique,
    key_prefix text not null,  -- first 8 chars of the raw key, shown in UI
    created_at timestamptz not null default now(),
    last_used_at timestamptz
  );

  alter table public.api_keys enable row level security;

  create policy "Users manage own api keys"
    on public.api_keys
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  ```
- [x] Generate the migration timestamp using the current UTC timestamp in the format `YYYYMMDDHHMMSS`.

#### Client-side API key management (`src/api/apikeys.ts`)
- [x] Create `src/api/apikeys.ts` with the following functions:
  - `generateApiKey(): string` — generates a random 32-byte hex string using `crypto.getRandomValues`. Format: `ps_` prefix + 64 hex chars (e.g. `ps_a1b2c3...`).
  - `hashApiKey(rawKey: string): Promise<string>` — SHA-256 hash using `crypto.subtle.digest`. Returns hex string.
  - `createApiKey(name: string): Promise<{ id: string; name: string; rawKey: string; key_prefix: string; created_at: string }>` — generates raw key, hashes it, inserts into `api_keys` table via Supabase, returns the raw key (only time it's available). The raw key is NOT stored.
  - `listApiKeys(): Promise<Array<{ id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null }>>` — fetches all keys for the current user (no `key_hash` returned).
  - `deleteApiKey(id: string): Promise<void>` — deletes a key by ID.

#### Settings UI — API Keys section
- [x] In `Settings.tsx`, add `'api'` to the `Section` type and add `{ id: 'api', label: 'API access', icon: <Code .../> }` to the `sections` array. (The `Code` icon is already imported.)
- [x] Add an API access section body:
  - Header: "API Keys" with a description: "Use API keys to access your prompts programmatically. Keys are shown only once."
  - A form: text input for key name + "Generate key" button.
  - On submit: call `createApiKey(name)`, show the raw key in a read-only `<input>` with a copy button, display a warning: "Copy this key now — it won't be shown again."
  - A table listing existing keys: columns = Name, Prefix (e.g. `ps_a1b2c3…`), Created, Last used, Revoke button.
  - Revoking a key calls `deleteApiKey(id)` and removes it from the list.
  - State: `apiKeys`, `newKeyName`, `justCreatedKey` (stores raw key temporarily until dismissed).

#### Edge Functions
- [ ] Create directory `supabase/functions/api/`. All API routes will be one function with path-based dispatch.
- [ ] Create `supabase/functions/api/index.ts`:
  - Parse `Authorization: Bearer <key>` header. If missing or malformed, return `401`.
  - Hash the raw key and look up `api_keys` table by `key_hash`. If not found, return `401`.
  - Fetch `user_id` from the matched row. Update `last_used_at = now()`.
  - Dispatch on `req.method` + URL path:

  **GET /api/v1/prompts**
  - Accepts query params: `workspace` (team_id), `search`, `tag`.
  - Calls the same logic as `listPrompts` in `src/api/prompts.ts` but server-side via Supabase service role client.
  - Returns `{ data: PromptWithTags[] }`.

  **GET /api/v1/prompts/:id**
  - Returns `{ data: PromptWithTags }` or `{ error: 'Not found' }` with 404.

  **POST /api/v1/prompts**
  - Body: `{ team_id, title, body_md, folder_id? }`.
  - Validates required fields. Returns `{ data: Prompt }` with 201.

  **PATCH /api/v1/prompts/:id**
  - Body: partial `{ title?, body_md?, folder_id? }`.
  - Returns `{ data: Prompt }` or 404.

  **DELETE /api/v1/prompts/:id**
  - Returns `{ success: true }` or 404.

  **GET /api/v1/workspaces**
  - Returns all teams the user is a member of.
  - Returns `{ data: Team[] }`.

  - All responses include `Content-Type: application/json`.
  - Rate limiting: implement a simple in-memory counter per `key_hash` (reset every 60s). Return 429 with `{ error: 'Rate limit exceeded' }` if > 60 requests/min. Note: Supabase Edge Functions are stateless per invocation, so use Supabase KV or a `rate_limits` table for persistence if needed; a simple approach is to count requests in a `rate_limits` table with a 60-second TTL row.

- [ ] Create `supabase/functions/api/cors.ts` that exports a `corsHeaders` object and a `handleCors(req)` function for preflight requests.

#### In-app docs
- [ ] In the Settings API section, below the key management UI, add a "Usage" subsection showing:
  - Base URL: display the Supabase Edge Function URL (read from `import.meta.env.VITE_SUPABASE_URL` + `/functions/v1/api`).
  - Example curl snippets for: list prompts, get one prompt, create a prompt.
  - Render snippets in a `<pre>` block styled with the existing monospace font.

#### Testing
- [ ] Generate an API key in the Settings UI, copy it, and use curl to hit `GET /api/v1/workspaces` — verify it returns teams.
- [ ] Verify `GET /api/v1/prompts?workspace=<id>` returns prompts for that workspace.
- [ ] Verify that an invalid key returns 401.
- [ ] Verify the key is NOT retrievable after dismissing the "copy this key" dialog.
- [ ] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Add programmatic API access with API key management and Edge Function endpoints`

---

## Issue #8 — Espanso integration for inline prompt expansion

**GitHub issue:** https://github.com/adilio/PromptStash/issues/8

### Context
[Espanso](https://espanso.org) is a cross-platform text expander. Prompts exported as an Espanso package allow users to trigger full prompt bodies anywhere on their system by typing a short keyword. The integration is purely an export feature — no Espanso process is bundled. A stretch goal is to add a trigger field to each prompt.

### Key files
- `src/routes/app/Settings.tsx` — export lives in the `data` section
- `src/routes/app/PromptEditor.tsx` — add optional trigger field to prompt form
- `src/lib/types.ts` — may need to add `espanso_trigger?: string` to the `Prompt` type
- `src/api/prompts.ts` — check if `espanso_trigger` can be stored in the existing schema (add a column if not)
- `src/routes/app/Dashboard.tsx` — no changes needed

### Tasks

#### Database — add trigger field
- [ ] Create `supabase/migrations/<timestamp>_espanso_trigger.sql`:
  ```sql
  alter table public.prompts
    add column if not exists espanso_trigger text;
  ```
- [ ] Add `espanso_trigger?: string | null` to the `Prompt` interface in `src/lib/types.ts`.
- [ ] In `src/api/prompts.ts`, include `espanso_trigger` in the select query and in the `createPrompt` / `updatePrompt` parameter types.

#### Prompt editor — trigger field
- [ ] In `PromptEditor.tsx`, add `espansoTrigger` state (string, default `''`).
- [ ] When loading an existing prompt (`promptQuery.data`), set `espansoTrigger` from `promptQuery.data.espanso_trigger ?? ''`.
- [ ] In the editor body, below the Tags section, add an optional "Espanso trigger" field:
  - A text input, placeholder `:prompt-name` (e.g. `:codereview`).
  - Label: "Espanso trigger" with a hint: "Type this keyword anywhere on your system to expand the prompt."
  - Only shown when the user expands an "Advanced" disclosure (a `<details>` / `<summary>` toggle) to keep the UI clean for users who don't use Espanso.
  - Auto-populate the trigger on `onBlur` if empty and a title exists: slugify the title with a `:` prefix (e.g. "Code review" → `:code-review`).
- [ ] Include `espanso_trigger` in the `handleSave` payload for both create and update paths.
- [ ] Include it in the auto-save `updatePromptMutation` payload.

#### Export function
- [ ] Create `src/lib/espanso.ts` that exports:
  ```ts
  function slugify(text: string): string
  // Lowercases, replaces spaces/special chars with hyphens, strips leading/trailing hyphens.

  function generateEspansoYaml(prompts: Prompt[]): string
  // Returns a complete Espanso package YAML string.
  // Format:
  // matches:
  //   - trigger: ":prompt-slug"
  //     replace: |
  //       <full prompt body>
  // For prompts with espanso_trigger set, use that. Otherwise, fall back to `:` + slugify(title).
  // Escape any `\` in the prompt body.
  ```
- [ ] The YAML output should include a header comment explaining the file and how to install it.
  ```yaml
  # PromptStash — Espanso export
  # Generated: <ISO date>
  # Install: place this file in your Espanso config/match directory
  # See: https://espanso.org/docs/packages/creating-a-package/
  ```

#### Settings — Export section
- [ ] In `Settings.tsx`, find the `data` section body. Add an "Espanso" subsection:
  - Header: "Espanso export"
  - Description: "Download your prompts as an Espanso match file. Drop the file into your Espanso config/match directory to expand prompts by keyword anywhere on your system."
  - Button: "Download Espanso package".
  - On click:
    1. Fetch all prompts for `currentTeamId` via `listPrompts(currentTeamId)`.
    2. Call `generateEspansoYaml(prompts)`.
    3. Trigger a browser file download: create a `Blob` with `type: 'text/yaml'`, create an object URL, click a hidden `<a>` link, revoke the URL. Filename: `promptstash-espanso-<YYYY-MM-DD>.yml`.
  - Show a loading state on the button while fetching prompts.
- [ ] Below the button, add an "Install guide" collapsible:
  - macOS: `~/.config/espanso/match/promptstash.yml`
  - Windows: `%APPDATA%\espanso\match\promptstash.yml`
  - Linux: `~/.config/espanso/match/promptstash.yml`
  - After placing the file: `espanso restart` (or it auto-reloads).

#### Testing
- [ ] Create a prompt, set an Espanso trigger (e.g. `:test`), save — verify trigger persists on reload.
- [ ] Go to Settings > Data & export, click "Download Espanso package" — verify a `.yml` file downloads.
- [ ] Open the file and verify YAML is valid: each prompt has a `trigger` and `replace` entry.
- [ ] Verify prompts without a trigger get an auto-generated slug.
- [ ] Run `npx tsc --noEmit` — zero errors.

**Commit message:** `Add Espanso export with per-prompt trigger field and YAML package download`

---

## Completion checklist

- [x] Issue #3 complete — committed and pushed
- [x] Issue #6 complete — committed and pushed
- [ ] Issue #7 complete — committed and pushed
- [ ] Issue #8 complete — committed and pushed
