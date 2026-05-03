-- Add Espanso trigger field for inline prompt expansion
alter table public.prompts
  add column if not exists espanso_trigger text;
