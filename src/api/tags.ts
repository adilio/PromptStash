import { supabase } from '@/lib/supabase';
import type { Tag } from '@/lib/types';

interface PromptTagJoin {
  tag_id: string;
  tags: Tag;
}

export async function listTags(teamId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('team_id', teamId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createTag(teamId: string, name: string): Promise<Tag> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tags')
    .insert({
      team_id: teamId,
      name,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw error;
}

export async function addTagToPrompt(promptId: string, tagId: string): Promise<void> {
  const { error } = await supabase.from('prompt_tags').insert({
    prompt_id: promptId,
    tag_id: tagId,
  });

  if (error) throw error;
}

export async function removeTagFromPrompt(promptId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('prompt_tags')
    .delete()
    .eq('prompt_id', promptId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

export async function getPromptTags(promptId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('prompt_tags')
    .select('tag_id, tags(*)')
    .eq('prompt_id', promptId);

  if (error) throw error;
  return data.map((pt: PromptTagJoin) => pt.tags).filter(Boolean);
}
