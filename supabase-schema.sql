-- PromptStash Database Schema
-- Run this SQL in the Supabase SQL Editor after creating your project

-- Create tables
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete set null,
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  owner_id uuid not null,
  title text not null,
  body_md text not null,
  visibility text not null default 'private' check (visibility in ('private','team','public')),
  public_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prompts_title_fts_idx
  on public.prompts using gin (to_tsvector('english', coalesce(title, '')));

create index prompts_body_md_fts_idx
  on public.prompts using gin (to_tsvector('english', coalesce(body_md, '')));

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references public.prompts(id) on delete cascade,
  version int not null,
  body_md text not null,
  edited_by uuid not null,
  edited_at timestamptz not null default now(),
  unique (prompt_id, version)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

create table public.prompt_tags (
  prompt_id uuid references public.prompts(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (prompt_id, tag_id)
);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references public.prompts(id) on delete cascade,
  target_user uuid not null,
  permission text not null check (permission in ('view','edit')),
  created_at timestamptz not null default now(),
  unique (prompt_id, target_user)
);

-- Enable Row Level Security
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.folders enable row level security;
alter table public.prompts enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.tags enable row level security;
alter table public.prompt_tags enable row level security;
alter table public.shares enable row level security;

-- Helper function to check team membership
create or replace function public.is_team_member(t_id uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.memberships m
    where m.team_id = t_id and m.user_id = auth.uid()
  );
$$;

-- RLS Policies for teams
create policy teams_read on public.teams
  for select using (owner_id = auth.uid() or public.is_team_member(id));

create policy teams_write on public.teams
  for all using (owner_id = auth.uid());

-- RLS Policies for memberships
create policy memberships_read on public.memberships
  for select using (user_id = auth.uid() or exists(
    select 1 from public.teams t
    where t.id = team_id and (t.owner_id = auth.uid() or public.is_team_member(team_id))
  ));

create policy memberships_write on public.memberships
  for all using (exists(
    select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()
  ));

-- RLS Policies for folders
create policy folders_read on public.folders
  for select using (public.is_team_member(team_id));

create policy folders_write on public.folders
  for all using (exists(
    select 1 from public.memberships m
    where m.team_id = team_id and m.user_id = auth.uid() and m.role in ('owner','editor')
  ));

-- RLS Policies for prompts
create policy prompts_read on public.prompts
  for select using (
    visibility = 'public'
    or public.is_team_member(team_id)
  );

create policy prompts_write on public.prompts
  for all using (exists(
    select 1 from public.memberships m
    where m.team_id = team_id and m.user_id = auth.uid() and m.role in ('owner','editor')
  ));

-- RLS Policies for prompt_versions
create policy versions_read on public.prompt_versions
  for select using (exists(
    select 1 from public.prompts p where p.id = prompt_id
      and (p.visibility = 'public' or public.is_team_member(p.team_id))
  ));

create policy versions_write on public.prompt_versions
  for all using (exists(
    select 1 from public.prompts p
    join public.memberships m on m.team_id = p.team_id
    where p.id = prompt_id and m.user_id = auth.uid() and m.role in ('owner','editor')
  ));

-- RLS Policies for tags
create policy tags_read on public.tags
  for select using (public.is_team_member(team_id));

create policy tags_write on public.tags
  for all using (exists(
    select 1 from public.memberships m
    where m.team_id = team_id and m.user_id = auth.uid() and m.role in ('owner','editor')
  ));

-- RLS Policies for prompt_tags
create policy prompt_tags_read on public.prompt_tags
  for select using (exists(
    select 1 from public.prompts p join public.tags t on t.id = tag_id
    where p.id = prompt_id and public.is_team_member(p.team_id) and public.is_team_member(t.team_id)
  ));

create policy prompt_tags_write on public.prompt_tags
  for all using (exists(
    select 1 from public.prompts p join public.tags t on t.id = tag_id
    join public.memberships m on m.team_id = p.team_id
    where p.id = prompt_id and t.team_id = p.team_id and m.user_id = auth.uid() and m.role in ('owner','editor')
  ));

-- RLS Policies for shares (not fully implemented in MVP but structure is ready)
create policy shares_read on public.shares
  for select using (target_user = auth.uid() or exists(
    select 1 from public.prompts p
    join public.memberships m on m.team_id = p.team_id
    where p.id = prompt_id and m.user_id = auth.uid() and m.role in ('owner','editor')
  ));

create policy shares_write on public.shares
  for all using (exists(
    select 1 from public.prompts p
    join public.memberships m on m.team_id = p.team_id
    where p.id = prompt_id and m.user_id = auth.uid() and m.role in ('owner','editor')
  ));

-- Trigger for updated_at timestamp
create extension if not exists moddatetime;

create trigger update_prompts_updated_at
before update on public.prompts
for each row execute procedure moddatetime (updated_at);
