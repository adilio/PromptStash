-- Custom workflow patterns and labels (issue #17).
-- Replaces the hard-coded QRSPI stage model with a flexible pattern model:
-- QRSPI becomes one built-in (system) pattern among several, teams can define
-- their own, and a prompt can carry a free-form label with no pattern at all.
-- The legacy prompts.stage column is kept for backward compatibility.

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

alter table public.prompts
  add column if not exists workflow_pattern_id uuid references public.workflow_patterns(id) on delete set null,
  add column if not exists workflow_step_id uuid references public.workflow_pattern_steps(id) on delete set null,
  add column if not exists workflow_label text;

create index if not exists workflow_pattern_steps_pattern_idx
  on public.workflow_pattern_steps (pattern_id, position);

alter table public.workflow_patterns enable row level security;
alter table public.workflow_pattern_steps enable row level security;

-- System patterns (is_system, no team) are readable by all authenticated
-- users; team patterns mirror the prompts access model.
create policy "workflow_patterns_read" on public.workflow_patterns
  for select
  using (
    (is_system and team_id is null and auth.uid() is not null)
    or (team_id is not null and is_team_member(team_id))
  );

create policy "workflow_patterns_write" on public.workflow_patterns
  for all
  using (
    team_id is not null and exists (
      select 1 from public.memberships m
      where m.team_id = workflow_patterns.team_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'editor')
    )
  );

create policy "workflow_pattern_steps_read" on public.workflow_pattern_steps
  for select
  using (
    exists (
      select 1 from public.workflow_patterns p
      where p.id = workflow_pattern_steps.pattern_id
        and (
          (p.is_system and p.team_id is null and auth.uid() is not null)
          or (p.team_id is not null and is_team_member(p.team_id))
        )
    )
  );

create policy "workflow_pattern_steps_write" on public.workflow_pattern_steps
  for all
  using (
    exists (
      select 1 from public.workflow_patterns p
      join public.memberships m on m.team_id = p.team_id
      where p.id = workflow_pattern_steps.pattern_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'editor')
    )
  );

-- Seed the built-in patterns. Fixed UUIDs so re-running is idempotent and the
-- backfill below can reference them.
insert into public.workflow_patterns (id, team_id, name, description, source_label, source_url, is_system)
values
  ('a0000000-0000-4000-8000-000000000001', null, 'QRSPI',
   'Question, Research, Design, Structure, Plan, Work, Implement, Review — an eight-stage agent workflow.',
   'Dex Horthy / HumanLayer', 'https://www.youtube.com/watch?v=5MWl3eRXVQk', true),
  ('a0000000-0000-4000-8000-000000000002', null, 'RPI',
   'Research, Plan, Implement — a lighter three-stage workflow.',
   'Practitioner shorthand', null, true),
  ('a0000000-0000-4000-8000-000000000003', null, 'Spec-driven (SDD)',
   'Spec, Plan, Tasks, Research — spec-driven development artifacts as workflow steps.',
   'GitHub Spec Kit / Kiro', 'https://github.com/github/spec-kit/blob/main/spec-driven.md', true),
  ('a0000000-0000-4000-8000-000000000004', null, 'Freeform checklist',
   'To do, Doing, Done — the simplest possible progression.',
   null, null, true)
on conflict (id) do nothing;

insert into public.workflow_pattern_steps (pattern_id, key, label, short_label, color, position)
values
  -- QRSPI: keys match the legacy prompts.stage values, colors match the app's stage palette
  ('a0000000-0000-4000-8000-000000000001', 'question',  'Question',  'Q',  'oklch(0.65 0.18 250)', 1),
  ('a0000000-0000-4000-8000-000000000001', 'research',  'Research',  'R',  'oklch(0.55 0.20 280)', 2),
  ('a0000000-0000-4000-8000-000000000001', 'design',    'Design',    'D',  'oklch(0.70 0.15 320)', 3),
  ('a0000000-0000-4000-8000-000000000001', 'structure', 'Structure', 'S',  'oklch(0.68 0.12 200)', 4),
  ('a0000000-0000-4000-8000-000000000001', 'plan',      'Plan',      'P',  'oklch(0.75 0.10 150)', 5),
  ('a0000000-0000-4000-8000-000000000001', 'work',      'Work',      'W',  'oklch(0.70 0.14 80)',  6),
  ('a0000000-0000-4000-8000-000000000001', 'implement', 'Implement', 'I',  'oklch(0.72 0.16 60)',  7),
  ('a0000000-0000-4000-8000-000000000001', 'review',    'Review/PR', 'PR', 'oklch(0.65 0.18 30)',  8),
  ('a0000000-0000-4000-8000-000000000002', 'research',  'Research',  'R',  'oklch(0.55 0.20 280)', 1),
  ('a0000000-0000-4000-8000-000000000002', 'plan',      'Plan',      'P',  'oklch(0.75 0.10 150)', 2),
  ('a0000000-0000-4000-8000-000000000002', 'implement', 'Implement', 'I',  'oklch(0.72 0.16 60)',  3),
  ('a0000000-0000-4000-8000-000000000003', 'spec',      'Spec',      'Sp', 'oklch(0.65 0.18 250)', 1),
  ('a0000000-0000-4000-8000-000000000003', 'plan',      'Plan',      'P',  'oklch(0.75 0.10 150)', 2),
  ('a0000000-0000-4000-8000-000000000003', 'tasks',     'Tasks',     'T',  'oklch(0.70 0.14 80)',  3),
  ('a0000000-0000-4000-8000-000000000003', 'research',  'Research',  'R',  'oklch(0.55 0.20 280)', 4),
  ('a0000000-0000-4000-8000-000000000004', 'todo',      'To do',     'TD', 'oklch(0.65 0.18 250)', 1),
  ('a0000000-0000-4000-8000-000000000004', 'doing',     'Doing',     'Dg', 'oklch(0.70 0.14 80)',  2),
  ('a0000000-0000-4000-8000-000000000004', 'done',      'Done',      'Dn', 'oklch(0.75 0.10 150)', 3)
on conflict (pattern_id, key) do nothing;

-- Backfill: every stage-tagged prompt gets the equivalent QRSPI pattern step
-- and label, so existing data shows up in the new model unchanged.
update public.prompts p
set workflow_pattern_id = s.pattern_id,
    workflow_step_id = s.id,
    workflow_label = s.label
from public.workflow_pattern_steps s
where s.pattern_id = 'a0000000-0000-4000-8000-000000000001'
  and p.stage = s.key
  and p.workflow_step_id is null;
