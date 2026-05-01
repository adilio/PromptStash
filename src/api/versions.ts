import { supabase } from '@/lib/supabase';
import type { PromptVersion } from '@/lib/types';

export async function listPromptVersions(promptId: string): Promise<PromptVersion[]> {
  const { data, error } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('prompt_id', promptId)
    .order('edited_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPromptVersion(versionId: string): Promise<PromptVersion> {
  const { data, error } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (error) throw error;
  return data;
}

export async function createPromptVersion(input: {
  prompt_id: string;
  title: string;
  body_md: string;
  change_note?: string;
}): Promise<PromptVersion> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data: latestVersion, error: latestError } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('prompt_id', input.prompt_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;

  const { data, error } = await supabase
    .from('prompt_versions')
    .insert({
      prompt_id: input.prompt_id,
      version: (latestVersion?.version ?? 0) + 1,
      body_md: input.body_md,
      edited_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function restorePromptVersion(
  promptId: string,
  versionId: string
): Promise<void> {
  // Get the version content
  const version = await getPromptVersion(versionId);

  // Update the prompt with the version content
  const { error } = await supabase
    .from('prompts')
    .update({
      body_md: version.body_md,
    })
    .eq('id', promptId);

  if (error) throw error;
}
