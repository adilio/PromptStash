create index if not exists memberships_user_id_idx
  on public.memberships (user_id);

create or replace function public.list_user_teams()
returns setof public.teams
language sql
security definer
set search_path = public
as $$
  select distinct t.*
  from public.teams t
  left join public.memberships m on m.team_id = t.id
  where t.owner_id = auth.uid()
     or m.user_id = auth.uid()
  order by t.name asc;
$$;

grant execute on function public.list_user_teams() to authenticated;
