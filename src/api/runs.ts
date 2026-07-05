import { supabase } from '@/lib/supabase';
import type { PromptRun } from '@/lib/types';

export interface RecordRunInput {
  team_id: string;
  prompt_id?: string | null;
  prompt_version?: number | null;
  model: string;
  input_md: string;
  output_md?: string | null;
  status: 'success' | 'error' | 'cancelled';
  error?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  cost_estimate?: number | null;
  duration_ms?: number | null;
  temperature?: number | null;
  max_completion_tokens?: number | null;
}

export async function recordRun(input: RecordRunInput): Promise<PromptRun> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('prompt_runs')
    .insert({ ...input, owner_id: user.id })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listRunsForPrompt(promptId: string, limit = 50): Promise<PromptRun[]> {
  const { data, error } = await supabase
    .from('prompt_runs')
    .select('*')
    .eq('prompt_id', promptId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function deleteRun(runId: string): Promise<void> {
  const { error } = await supabase.from('prompt_runs').delete().eq('id', runId);
  if (error) throw error;
}
