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
  for each row execute procedure moddatetime(updated_at);

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
