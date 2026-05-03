<img src="icon.svg" width="48" height="48" alt="PromptStash icon" />

# PromptStash

A fast, clean SPA for saving, organizing, and sharing prompts. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Overview

PromptStash lets users:
- Sign in and create teams
- Organize prompts into folders with hierarchical structure
- Tag and search prompts by title and full content
- Share prompts publicly via read-only links
- Collaborate with team members (owner, editor, viewer roles) with a built-in invite flow
- Write prompts in Markdown with live preview and token/word count
- Version-track every save automatically
- Access prompts programmatically via a REST API with API key auth
- Export prompts as an Espanso text-expansion package
- Use the app fully on mobile with a responsive layout and drawer sidebar

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Routing**: React Router v6
- **UI**: Tailwind CSS, shadcn/ui, Radix UI primitives
- **Fonts**: Inter (UI), JetBrains Mono (display/code)
- **Data**: Supabase (Postgres + Auth + Edge Functions)
- **Server state**: TanStack React Query
- **Forms**: react-hook-form + zod validation
- **Markdown**: react-markdown + DOMPurify
- **Search**: Command palette (Cmd+K) + full-text search across title and body
- **Testing**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### 1. Clone and Install

```bash
git clone <repository-url>
cd promptstash
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from Settings > API
3. In Supabase Auth settings:
   - Set Site URL to `http://localhost:5173`
   - Enable Email provider

### 3. Run Database Migrations

Copy the contents of `supabase/migrations/` and run them in your Supabase SQL Editor in order. This will:
- Create all tables (teams, prompts, folders, tags, invites, api_keys, etc.)
- Enable Row Level Security
- Set up RLS policies
- Add triggers for `updated_at` timestamps
- Add GIN full-text search indexes on `title` and `body_md`
- Add the `espanso_trigger` column to prompts

### 4. Configure Environment

Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For production OAuth, configure Supabase Auth with your deployed origin:

- Site URL: `https://promptstash.4dl.ca`
- Redirect URLs: `https://promptstash.4dl.ca/**` and `https://promptstash.4dl.ca/auth/callback`
- Google authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
- GitHub authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`

### 5. Deploy Edge Functions (optional, for REST API)

```bash
supabase functions deploy api
```

The Edge Function lives at `supabase/functions/api/`. It handles all REST API routes and requires a `SUPABASE_SERVICE_ROLE_KEY` secret in your Supabase project.

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm test             # Run tests with Vitest
npm run test:ui      # Run tests with UI
```

## Database Schema

- **teams**: Top-level organization units
- **memberships**: User-team relationships with roles (owner, editor, viewer)
- **folders**: Hierarchical folder structure
- **prompts**: Main content — title, body (Markdown), visibility, optional `espanso_trigger`
- **prompt_versions**: Full version history for every prompt save
- **tags**: Team-scoped tags
- **prompt_tags**: Many-to-many relationship between prompts and tags
- **shares**: Individual prompt sharing with public slugs
- **invites**: Email-based team invitations with expiry, tokens, and role assignment
- **api_keys**: Hashed API keys for programmatic access (key hash stored, raw key never persisted)

All tables have Row Level Security enabled. Users can only access data from teams they belong to. API keys are scoped to the key owner.

## REST API

PromptStash exposes a REST API via Supabase Edge Functions. Authenticate with an API key generated in Settings > API access.

### Authentication

```
Authorization: Bearer ps_your_api_key_here
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/workspaces` | List all workspaces the key owner belongs to |
| `GET` | `/api/v1/prompts` | List prompts — accepts `workspace`, `search`, `tag` query params |
| `GET` | `/api/v1/prompts/:id` | Get a single prompt |
| `POST` | `/api/v1/prompts` | Create a prompt — body: `{ team_id, title, body_md, folder_id? }` |
| `PATCH` | `/api/v1/prompts/:id` | Update a prompt — body: partial `{ title?, body_md?, folder_id? }` |
| `DELETE` | `/api/v1/prompts/:id` | Delete a prompt |

Base URL: `https://your-project.supabase.co/functions/v1/api`

Full curl examples and your project's base URL are shown in Settings > API access.

### Generating an API Key

1. Go to Settings > API access
2. Enter a name for the key and click "Generate key"
3. Copy the key immediately — it is shown only once
4. Use the key in the `Authorization` header of your requests

## Espanso Integration

Export all your prompts as an [Espanso](https://espanso.org) match file so you can expand them by keyword anywhere on your system.

1. Go to Settings > Data & export
2. Click "Download Espanso package" — downloads a `.yml` file
3. Place the file in your Espanso match directory:
   - macOS / Linux: `~/.config/espanso/match/promptstash.yml`
   - Windows: `%APPDATA%\espanso\match\promptstash.yml`
4. Run `espanso restart`

Each prompt uses its `espanso_trigger` field as the expansion keyword (set it in the editor under Advanced). Prompts without a trigger get an auto-generated slug based on the title (e.g. "Code review" → `:code-review`).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | New prompt |
| `?` | Open shortcuts help |
| `/` | Focus search |
| `Cmd+K` / `Ctrl+K` | Open command palette |
| `Cmd+\` / `Ctrl+\` | Toggle sidebar |
| `Cmd+S` / `Ctrl+S` | Save prompt |
| `Cmd+1` / `Ctrl+1` | Switch to Write tab |
| `Cmd+2` / `Ctrl+2` | Switch to Preview tab |
| `Cmd+Shift+C` | Copy prompt body |
| `↑` / `↓` | Navigate prompt list |
| `Enter` | Open focused prompt |
| `Esc` | Close modal / palette |

Shortcuts do not fire when focus is inside an input, textarea, or contenteditable element.

## Security

### Row Level Security (RLS)

All database access is secured by Supabase RLS policies. The key helper function:

```sql
create or replace function public.is_team_member(t_id uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.memberships m
    where m.team_id = t_id and m.user_id = auth.uid()
  );
$$;
```

### API Key Storage

Raw API keys are never stored. On generation, the key is hashed with SHA-256 and only the hash is persisted. The raw key is shown once in the UI and then discarded.

### Markdown Sanitization

All Markdown content is sanitized using DOMPurify before rendering — allows safe HTML (headings, lists, links, code blocks, tables), strips scripts and iframes, only permits http/https/mailto URL schemes. See `src/lib/markdown.ts`.

## Deployment

### Production Domain

```
https://promptstash.4dl.ca
```

### Netlify

1. Connect your GitHub repository to Netlify
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables in Netlify dashboard:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Update Supabase Auth settings with your production URL

For DNS: add a CNAME record pointing `promptstash` → your Netlify domain, then verify the TLS certificate in Netlify and update Supabase Auth redirect URLs.

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Build command: `npm run build`, output directory: `dist`
3. Add the same environment variables as above

### Vercel

1. Import your GitHub repository to Vercel — Vite config is auto-detected
2. Add environment variables in project settings

## User Flows

### First-Time User

1. Navigate to `/signin`
2. Sign up with email/password, Google, or GitHub
3. Auto-redirected to `/app`
4. Create your first team (auto-assigned as owner)
5. Create your first prompt

### Creating a Public Prompt

1. Create or edit a prompt
2. Click "Share" → enable public access
3. Copy the public link (e.g. `/p/abc123xyz`) — viewable without auth

### Inviting Team Members

1. Settings > Workspace → enter email + role → "Send invite"
2. Share the generated `/invite/:token` link
3. When they visit, they are added to the team automatically

### Using the REST API

1. Settings > API access → generate a key → copy it
2. `curl -H "Authorization: Bearer ps_..." https://your-project.supabase.co/functions/v1/api/v1/prompts?workspace=<id>`

## Testing

```bash
npm test              # Run once
npm run test:ui       # Interactive mode
```

Test files in `src/tests/`:
- `auth.test.tsx` — authentication flow and redirects
- `prompt-crud.test.tsx` — create, read, update, delete
- `sharing.test.tsx` — public prompt rendering without auth

## Project Structure

```
promptstash/
├── .github/workflows/     # CI configuration
├── supabase/
│   ├── functions/
│   │   └── api/           # Edge Function — REST API routes
│   └── migrations/        # SQL migration files
├── src/
│   ├── api/               # Supabase client-side API calls
│   ├── components/        # React components
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities, types, config
│   ├── routes/
│   │   ├── auth/          # Sign-in, reset password, callback
│   │   ├── app/           # Dashboard, editor, settings
│   │   └── public/        # Public prompt view, invite accept
│   ├── tests/             # Test files
│   ├── app.css            # Global styles and design tokens
│   └── main.tsx           # App entry point
├── package.json
├── vite.config.ts
└── README.md
```

## Changelog

### v0.3.0

**Features:**
- Full mobile responsiveness — drawer sidebar, single-column dashboard, adaptive editor padding, sticky bottom action bar in editor, horizontal scrollable settings nav, responsive sign-in page
- Mobile sign-in branding — PromptStash logo/wordmark shown on mobile where the editorial sidebar is hidden
- Comprehensive keyboard shortcuts — `?` help modal, `/` search focus, `Cmd+\` sidebar toggle, arrow-key prompt navigation, `Cmd+1`/`2` tab switching, `Cmd+Shift+C` copy body
- Shortcuts help modal and Settings > Shortcuts reference table
- Command palette shortcut hints next to each action
- REST API via Supabase Edge Functions with API key authentication — full CRUD on prompts plus workspace listing
- API key management UI in Settings — generate, list, revoke; keys shown once and never stored in plaintext
- In-app API docs with curl examples and your project's base URL
- Espanso integration — per-prompt trigger field (Advanced section in editor), full YAML export from Settings > Data & export
- Mobile UX polish — wider sidebar drawer (85vw), shortcut badge hidden on mobile, visual separator between Sign out and Dark mode

**Infrastructure:**
- `api_keys` table with SHA-256 hashed key storage and RLS
- `espanso_trigger` column on `prompts`
- `supabase/functions/api/` Edge Function with path-based dispatch
- `src/lib/espanso.ts` — slugify + YAML generation

### v0.2.0

**Features:**
- Full UI redesign — Inter UI font, JetBrains Mono display font, muted indigo-blue theme, light and dark mode
- Split sign-in layout with editorial left panel
- Dashboard list/grid toggle
- Redesigned sidebar with workspace switcher and folder drop-target highlighting
- Title-first prompt editor with large monospace title input
- Two-pane Settings with sidebar navigation
- Command palette (`Cmd+K`) — fuzzy search, new prompt, folder navigation
- Full-text search (PostgreSQL `tsvector` + GIN index)
- Token and word count in editor (live, 300ms debounce)
- Team invite flow — invite by email, shareable `/invite/:token` link
- `N` shortcut for new prompt
- Prompt card copy button and tag pills
- Folder drag-and-drop

**Infrastructure:**
- DOMPurify for Markdown sanitization
- Supabase generated TypeScript types
- TanStack React Query for server state
- `invites` table with `accept_invite()` SQL function
- GIN full-text indexes on `prompts.title` and `prompts.body_md`

### v0.1.0 (MVP)

- User authentication (email/password)
- Team creation and management
- Folder organization (hierarchical)
- Prompt CRUD with Markdown editor and live preview
- Public sharing with unique slugs
- Tag support
- Row Level Security

## License

MIT License — see LICENSE file for details.

---

Built with React, TypeScript, and Supabase.
