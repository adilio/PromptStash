<img src="icon.svg" width="48" height="48" alt="PromptStash icon" />

# PromptStash

A fast, clean SPA for saving, organizing, and sharing prompts. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Overview

PromptStash is a production-ready app that lets users:
- Sign in and create teams
- Organize prompts into folders with hierarchical structure
- Tag and search prompts by title and full content
- Share prompts publicly via read-only links
- Collaborate with team members (owner, editor, viewer roles) with a built-in invite flow
- Write prompts in Markdown with live preview and token/word count
- Store everything securely in Supabase with Row Level Security

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Routing**: React Router v6
- **UI**: Tailwind CSS, shadcn/ui, Radix UI primitives
- **Fonts**: Inter (UI), JetBrains Mono (display/code)
- **Data**: Supabase (Postgres + Auth + generated types)
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

### 3. Run Database Migration

Copy the contents of `supabase/migrations/` and run them in your Supabase SQL Editor in order. This will:
- Create all tables (teams, prompts, folders, tags, invites, etc.)
- Enable Row Level Security
- Set up RLS policies
- Add triggers for `updated_at` timestamps
- Add GIN full-text search indexes on `title` and `body_md`

### 4. Configure Environment

Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Start Development Server

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
npm test            # Run tests with Vitest
npm run test:ui     # Run tests with UI
```

## Database Schema

The application uses the following tables:

- **teams**: Top-level organization units
- **memberships**: User-team relationships with roles (owner, editor, viewer)
- **folders**: Hierarchical folder structure
- **prompts**: The main content, with title, body (Markdown), and visibility
- **prompt_versions**: Version history for prompts
- **tags**: Team-scoped tags
- **prompt_tags**: Many-to-many relationship between prompts and tags
- **shares**: Individual prompt sharing
- **invites**: Email-based team invitations with expiry, tokens, and role assignment

All tables have Row Level Security enabled. The RLS policies ensure:
- Users can only see teams they're members of
- Only owners can manage team memberships and send invitations
- Only editors and owners can create/modify prompts
- Viewers can read but not modify
- Public prompts are visible to anyone via public slug

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

This ensures users can only access data from teams they belong to.

### Markdown Sanitization

All Markdown content is sanitized using DOMPurify before rendering:
- Allows safe HTML tags (headings, lists, links, code blocks, tables)
- Strips potentially dangerous content (scripts, iframes, etc.)
- Only allows http/https/mailto URL schemes

See `src/lib/markdown.ts` for configuration.

## Deployment

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Update Supabase Auth settings with your production URL

### Netlify

1. Connect your GitHub repository to Netlify
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables in Netlify dashboard
4. Update Supabase Auth settings with your production URL

### Vercel

1. Import your GitHub repository to Vercel
2. Vercel auto-detects Vite configuration
3. Add environment variables in project settings
4. Update Supabase Auth settings with your production URL

## Architecture Decisions

### Why Supabase?

- Built-in authentication
- Row Level Security for data isolation
- Real-time capabilities (for future features)
- Generous free tier
- No custom backend needed

### Why TanStack React Query?

Server state is managed with React Query for prompts (list, detail, create, update, delete). This gives automatic caching, background refetching, and optimistic mutation handling without a custom store. Local UI state stays in component-level `useState`.

### Why shadcn/ui?

- Unstyled, accessible primitives
- Copy-paste components (you own the code)
- Built on Radix UI (production-ready)
- Easy to customize

## User Flows

### First-Time User

1. Navigate to `/signin`
2. Sign up with email/password
3. Auto-redirected to `/app`
4. Create your first team (auto-assigned as owner)
5. Create your first prompt

### Creating a Public Prompt

1. Create or edit a prompt
2. Click "Share" button
3. Enable public access
4. Copy the public link (e.g., `/p/abc123xyz`)
5. Share the link — anyone can view without auth

### Inviting Team Members

1. Go to Settings > Workspace
2. Enter the invitee's email and choose a role (editor or viewer)
3. Click "Send invite" — an invite link (`/invite/:token`) is generated
4. Share the link with your teammate
5. When they visit the link they are added to the team automatically

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Open command palette |
| `Cmd+N` / `N` | New prompt |
| `Cmd+S` | Save prompt |

## Testing

The test suite covers:

- **auth.test.tsx**: Authentication flow and redirects
- **prompt-crud.test.tsx**: Create, read, update, delete operations
- **sharing.test.tsx**: Public prompt rendering without auth

Run tests:

```bash
npm test              # Run once
npm run test:ui       # Interactive mode
```

## Changelog

### v0.2.0

**Features:**
- Full UI redesign — Inter UI font, JetBrains Mono display font, muted indigo-blue (oklch hue 258) theme, light and dark mode
- Split sign-in layout with editorial left panel and clean auth form
- Dashboard list/grid toggle for prompt browsing
- Redesigned sidebar with workspace switcher, system folders, and folder drop-target highlighting
- Title-first prompt editor with large monospace title input
- Two-pane Settings with sidebar navigation
- Command palette (`Cmd+K`) — fuzzy search prompts, New Prompt action, folder navigation
- Full-text search on prompt title and body (PostgreSQL `tsvector` + GIN index)
- Token and word count in editor, updated live with 300ms debounce (`~N tokens · N words`)
- Team invite flow — invite by email, shareable `/invite/:token` link, auto membership on accept
- `N` keyboard shortcut for new prompt (when not focused in an input)
- Prompt card copy button (hover-to-reveal, copies body to clipboard)
- Prompt cards show title, truncated body preview, and tag pills
- Folder drag-and-drop to move prompts

**Infrastructure:**
- Migrated to DOMPurify for Markdown sanitization (replaced sanitize-html)
- Added Supabase generated TypeScript types (`src/lib/database.types.ts`)
- Added TanStack React Query for prompts server state
- `invites` table with owner-only RLS and `accept_invite()` SQL function
- GIN full-text indexes on `prompts.title` and `prompts.body_md`

### v0.1.0 (MVP)

**Features:**
- User authentication (email/password)
- Team creation and management
- Folder organization (hierarchical)
- Prompt CRUD with Markdown editor
- Live Markdown preview
- Public sharing with unique slugs
- Search prompts by title
- Tag support
- Row Level Security
- Markdown sanitization

**Infrastructure:**
- Vite + React + TypeScript
- Tailwind + shadcn/ui
- Supabase backend
- GitHub Actions CI
- Test coverage

## Project Structure

```
promptstash/
├── .github/workflows/     # CI configuration
├── supabase/
│   └── migrations/        # SQL migration files
├── src/
│   ├── api/              # Supabase API calls
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   ├── lib/             # Utilities and config
│   ├── routes/          # Route components
│   │   ├── auth/        # Auth pages
│   │   ├── app/         # App pages
│   │   └── public/      # Public pages
│   ├── tests/           # Test files
│   ├── app.css          # Global styles and design tokens
│   └── main.tsx         # App entry point
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Build: `npm run build`
6. Submit a pull request

## License

MIT License — see LICENSE file for details

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Built with React, TypeScript, and Supabase
