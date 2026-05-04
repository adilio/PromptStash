-- Store model provider keys behind RPCs so raw keys are never selected by the client.
create table if not exists public.model_integrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openrouter')),
  api_key text not null,
  key_prefix text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.model_integrations enable row level security;
revoke all on public.model_integrations from anon, authenticated;

create or replace function public.set_openrouter_api_key(openrouter_api_key text)
returns table (
  connected boolean,
  key_prefix text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_key text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized_key := btrim(coalesce(openrouter_api_key, ''));

  if length(normalized_key) < 20 then
    raise exception 'OpenRouter API key is too short';
  end if;

  insert into public.model_integrations (user_id, provider, api_key, key_prefix)
  values (auth.uid(), 'openrouter', normalized_key, left(normalized_key, 10))
  on conflict (user_id, provider)
  do update set
    api_key = excluded.api_key,
    key_prefix = excluded.key_prefix,
    updated_at = now();

  return query
    select true, mi.key_prefix, mi.updated_at
    from public.model_integrations mi
    where mi.user_id = auth.uid() and mi.provider = 'openrouter';
end;
$$;

create or replace function public.get_openrouter_integration_status()
returns table (
  connected boolean,
  key_prefix text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    exists(
      select 1
      from public.model_integrations mi
      where mi.user_id = auth.uid() and mi.provider = 'openrouter'
    ) as connected,
    (
      select mi.key_prefix
      from public.model_integrations mi
      where mi.user_id = auth.uid() and mi.provider = 'openrouter'
    ) as key_prefix,
    (
      select mi.updated_at
      from public.model_integrations mi
      where mi.user_id = auth.uid() and mi.provider = 'openrouter'
    ) as updated_at;
$$;

create or replace function public.delete_openrouter_api_key()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.model_integrations
  where user_id = auth.uid() and provider = 'openrouter';
end;
$$;

grant execute on function public.set_openrouter_api_key(text) to authenticated;
grant execute on function public.get_openrouter_integration_status() to authenticated;
grant execute on function public.delete_openrouter_api_key() to authenticated;
