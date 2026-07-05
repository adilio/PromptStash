-- Run history for OpenRouter executions (GitHub #17).
-- Each row is one model run: the exact input sent, the output, usage/cost
-- estimates, and status. The raw OpenRouter key is never stored here.

create table if not exists public.prompt_runs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  prompt_version integer,
  owner_id uuid not null,
  model text not null,
  input_md text not null,
  output_md text,
  status text not null default 'success' check (status in ('success', 'error', 'cancelled')),
  error text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  cost_estimate numeric,
  duration_ms integer,
  temperature numeric,
  max_completion_tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists prompt_runs_prompt_idx on public.prompt_runs (prompt_id, created_at desc);
create index if not exists prompt_runs_team_idx on public.prompt_runs (team_id, created_at desc);

alter table public.prompt_runs enable row level security;

-- Mirrors the prompts access model: team members read, owner/editor write.
create policy "prompt_runs_read" on public.prompt_runs
  for select
  using (is_team_member(team_id));

create policy "prompt_runs_write" on public.prompt_runs
  for all
  using (
    exists (
      select 1
      from public.memberships m
      where m.team_id = prompt_runs.team_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'editor')
    )
  );
