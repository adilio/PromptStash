create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor','viewer')),
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

create or replace function public.accept_invite(invite_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  invite_record public.invites%rowtype;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  user_email := auth.jwt() ->> 'email';

  select * into invite_record
  from public.invites
  where token = invite_token
  for update;

  if not found or invite_record.used_at is not null or invite_record.expires_at <= now() then
    raise exception 'Invite is invalid or expired';
  end if;

  if lower(invite_record.email) <> lower(coalesce(user_email, '')) then
    raise exception 'Invite email does not match the signed-in user';
  end if;

  insert into public.memberships (team_id, user_id, role)
  values (invite_record.team_id, auth.uid(), invite_record.role)
  on conflict (team_id, user_id) do update set role = excluded.role;

  update public.invites
  set used_at = now()
  where id = invite_record.id;

  return invite_record.team_id;
end;
$$;

drop policy if exists invites_read_owners on public.invites;
create policy invites_read_owners on public.invites
  for select using (exists(
    select 1 from public.teams t
    where t.id = team_id and t.owner_id = auth.uid()
  ));

drop policy if exists invites_insert_owners on public.invites;
create policy invites_insert_owners on public.invites
  for insert with check (exists(
    select 1 from public.teams t
    where t.id = team_id and t.owner_id = auth.uid()
  ));

drop policy if exists invites_update_owners on public.invites;
create policy invites_update_owners on public.invites
  for update using (exists(
    select 1 from public.teams t
    where t.id = team_id and t.owner_id = auth.uid()
  ));
