-- Fix an over-broad prompts write policy.
--
-- The old qual compared m.team_id to itself (m.team_id = m.team_id), which is
-- always true — so any user who was an owner/editor of ANY team could insert,
-- update, or delete prompts in EVERY team. The check now correctly scopes the
-- membership to the prompt's own team.

drop policy if exists "prompts_write" on public.prompts;

create policy "prompts_write" on public.prompts
  for all
  using (
    exists (
      select 1
      from public.memberships m
      where m.team_id = prompts.team_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'editor')
    )
  );
