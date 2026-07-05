import { supabase } from '@/lib/supabase';
import type { WorkflowPattern, WorkflowPatternStep, WorkflowPatternWithSteps } from '@/lib/types';

/** Fixed id of the seeded system QRSPI pattern (see the workflow_patterns migration). */
export const QRSPI_PATTERN_ID = 'a0000000-0000-4000-8000-000000000001';

/** System patterns plus the team's own, each with ordered steps. */
export async function listPatterns(teamId?: string): Promise<WorkflowPatternWithSteps[]> {
  let query = supabase.from('workflow_patterns').select('*');
  query = teamId ? query.or(`is_system.eq.true,team_id.eq.${teamId}`) : query.eq('is_system', true);

  const { data: patterns, error } = await query.order('is_system', { ascending: false }).order('name');
  if (error) throw error;

  const ids = (patterns ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: steps, error: stepsError } = await supabase
    .from('workflow_pattern_steps')
    .select('*')
    .in('pattern_id', ids)
    .order('position');
  if (stepsError) throw stepsError;

  const stepsByPattern = new Map<string, WorkflowPatternStep[]>();
  for (const step of steps ?? []) {
    const list = stepsByPattern.get(step.pattern_id) ?? [];
    list.push(step);
    stepsByPattern.set(step.pattern_id, list);
  }

  return (patterns ?? []).map((pattern) => ({
    ...pattern,
    steps: stepsByPattern.get(pattern.id) ?? [],
  }));
}

export async function createPattern(input: {
  team_id: string;
  name: string;
  description?: string;
  steps: Array<{ key: string; label: string; short_label?: string; color?: string }>;
}): Promise<WorkflowPatternWithSteps> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data: pattern, error } = await supabase
    .from('workflow_patterns')
    .insert({
      team_id: input.team_id,
      name: input.name,
      description: input.description ?? null,
      created_by: user.id,
    })
    .select('*')
    .single();
  if (error) throw error;

  const stepRows = input.steps.map((step, index) => ({
    pattern_id: pattern.id,
    key: step.key,
    label: step.label,
    short_label: step.short_label ?? null,
    color: step.color ?? null,
    position: index + 1,
  }));

  const { data: steps, error: stepsError } = await supabase
    .from('workflow_pattern_steps')
    .insert(stepRows)
    .select('*');
  if (stepsError) throw stepsError;

  return { ...pattern, steps: (steps ?? []).sort((a, b) => a.position - b.position) };
}

export async function updatePattern(
  patternId: string,
  patch: Partial<Pick<WorkflowPattern, 'name' | 'description'>>
): Promise<WorkflowPattern> {
  const { data, error } = await supabase
    .from('workflow_patterns')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', patternId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deletePattern(patternId: string): Promise<void> {
  const { error } = await supabase.from('workflow_patterns').delete().eq('id', patternId);
  if (error) throw error;
}

export async function createStep(input: {
  pattern_id: string;
  key: string;
  label: string;
  short_label?: string;
  color?: string;
  position: number;
}): Promise<WorkflowPatternStep> {
  const { data, error } = await supabase
    .from('workflow_pattern_steps')
    .insert({
      pattern_id: input.pattern_id,
      key: input.key,
      label: input.label,
      short_label: input.short_label ?? null,
      color: input.color ?? null,
      position: input.position,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateStep(
  stepId: string,
  patch: Partial<Pick<WorkflowPatternStep, 'key' | 'label' | 'short_label' | 'color'>>
): Promise<WorkflowPatternStep> {
  const { data, error } = await supabase
    .from('workflow_pattern_steps')
    .update(patch)
    .eq('id', stepId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStep(stepId: string): Promise<void> {
  const { error } = await supabase.from('workflow_pattern_steps').delete().eq('id', stepId);
  if (error) throw error;
}

export async function reorderSteps(patternId: string, orderedStepIds: string[]): Promise<void> {
  for (let i = 0; i < orderedStepIds.length; i++) {
    const { error } = await supabase
      .from('workflow_pattern_steps')
      .update({ position: i + 1 })
      .eq('id', orderedStepIds[i])
      .eq('pattern_id', patternId);
    if (error) throw error;
  }
}
