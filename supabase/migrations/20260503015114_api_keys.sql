-- Create api_keys table for programmatic API access
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.api_keys enable row level security;

create policy "Users manage own api keys"
  on public.api_keys
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
