-- Fix infinite RLS recursion between teams and memberships.
--
-- is_team_member() was a plain (invoker-rights) function, so teams_read RLS
-- called it, it queried memberships, memberships_read RLS ran an EXISTS on
-- teams, which called is_team_member again — infinite recursion. Any direct
-- select on teams/memberships failed with Postgres 54001 (stack depth
-- exceeded); only the list_user_teams security-definer RPC worked around it.
--
-- Making the helper SECURITY DEFINER breaks the cycle: its membership check
-- no longer re-enters RLS. Semantics are unchanged — it still only answers
-- "is auth.uid() a member of this team".

create or replace function public.is_team_member(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.memberships m
    where m.team_id = t_id and m.user_id = auth.uid()
  );
$$;
