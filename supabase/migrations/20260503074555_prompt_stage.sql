alter table public.prompts
  add column if not exists stage text;

alter table public.prompts
  add constraint prompts_stage_check
  check (stage is null or stage in
    ('question','research','design','structure','plan','work','implement','review'));

create index if not exists prompts_team_stage_idx
  on public.prompts (team_id, stage);
