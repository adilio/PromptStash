alter table public.prompts
  add column if not exists agent_format text;

alter table public.prompts
  add constraint prompts_agent_format_check
  check (agent_format is null or agent_format in
    ('agents','claude','copilot','cursor','windsurf','generic'));
