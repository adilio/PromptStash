import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Database, Prompt, PromptWithTags, Tag } from '@/lib/types';

type DatabasePromptInsert = Database['public']['Tables']['prompts']['Insert'];

interface PromptTagJoin {
  tag_id: string;
  tags: Tag | Tag[] | null;
}

interface PromptListTagJoin extends PromptTagJoin {
  prompt_id: string;
}

interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

function extractTag(join: PromptTagJoin): Tag | null {
  if (Array.isArray(join.tags)) {
    return join.tags[0] ?? null;
  }

  return join.tags;
}

function isTag(tag: Tag | null): tag is Tag {
  return tag !== null;
}

function normalizeFullTextSearchQuery(searchQuery: string): string {
  return searchQuery.trim().replace(/[(),]/g, ' ').replace(/\s+/g, ' ');
}

export async function listPrompts(
  teamId: string,
  folderId?: string,
  searchQuery?: string
): Promise<PromptWithTags[]> {
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false });

  if (folderId) {
    query = query.eq('folder_id', folderId);
  }

  if (searchQuery) {
    const normalized = normalizeFullTextSearchQuery(searchQuery);
    query = query.or(`title.plfts.${normalized},body_md.plfts.${normalized}`);
  }

  const { data: prompts, error } = await query;

  if (error) throw error;
  const promptRows = prompts ?? [];

  // Get tags for all prompts
  const promptIds = promptRows.map((p: Prompt) => p.id);
  const { data: promptTags, error: tagsError } = await supabase
    .from('prompt_tags')
    .select('prompt_id, tags(*)')
    .in('prompt_id', promptIds) as unknown as QueryResult<PromptListTagJoin[]>;

  if (tagsError) throw tagsError;

  // Group tags by prompt_id
  const tagsByPromptId = new Map<string, Tag[]>();
  for (const row of promptTags || []) {
    const tag = extractTag(row);
    if (tag) {
      const promptId = row.prompt_id;
      const existing = tagsByPromptId.get(promptId) || [];
      tagsByPromptId.set(promptId, [...existing, tag]);
    }
  }

  return promptRows.map((p: Prompt) => ({
    ...p,
    tags: tagsByPromptId.get(p.id) || [],
  }));
}

export async function getPrompt(id: string): Promise<PromptWithTags> {
  const { data: prompt, error: promptError } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', id)
    .single() as unknown as QueryResult<Prompt>;

  if (promptError) throw promptError;
  if (!prompt) throw new Error('Prompt not found');

  // Get tags for this prompt
  const { data: promptTags, error: tagsError } = await supabase
    .from('prompt_tags')
    .select('tag_id, tags(*)')
    .eq('prompt_id', id);

  if (tagsError) throw tagsError;

  return {
    ...prompt,
    tags: (promptTags as PromptTagJoin[]).map(extractTag).filter(isTag),
  };
}

export async function getPromptBySlug(slug: string): Promise<PromptWithTags> {
  const { data: prompt, error: promptError } = await supabase
    .from('prompts')
    .select('*')
    .eq('public_slug', slug)
    .eq('visibility', 'public')
    .single();

  if (promptError) throw promptError;

  // Get tags for this prompt
  const { data: promptTags, error: tagsError } = await supabase
    .from('prompt_tags')
    .select('tag_id, tags(*)')
    .eq('prompt_id', prompt.id);

  if (tagsError) throw tagsError;

  return {
    ...prompt,
    tags: (promptTags as PromptTagJoin[]).map(extractTag).filter(isTag),
  };
}

export async function createPrompt(input: {
  team_id: string;
  folder_id?: string;
  title: string;
  body_md: string;
  visibility?: 'private' | 'team' | 'public';
  espanso_trigger?: string;
  agent_format?: string | null;
}): Promise<Prompt> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const insertData: DatabasePromptInsert = {
    team_id: input.team_id,
    folder_id: input.folder_id || null,
    owner_id: user.id,
    title: input.title,
    body_md: input.body_md,
    visibility: input.visibility || 'private',
  };

  if (input.espanso_trigger) {
    insertData.espanso_trigger = input.espanso_trigger;
  }

  if (input.agent_format) {
    insertData.agent_format = input.agent_format;
  }

  const { data, error } = await supabase
    .from('prompts')
    .insert(insertData)
    .select('*')
    .single() as unknown as QueryResult<Prompt>;

  if (error) throw error;
  if (!data) throw new Error('Failed to create prompt');
  return data;
}

export async function updatePrompt(
  id: string,
  patch: Partial<{
    title: string;
    body_md: string;
    folder_id: string | null;
    visibility: 'private' | 'team' | 'public';
    public_slug: string | null;
    espanso_trigger: string;
    agent_format: string | null;
  }>
): Promise<Prompt> {
  const { data, error } = await supabase
    .from('prompts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single() as unknown as QueryResult<Prompt>;

  if (error) throw error;
  if (!data) throw new Error('Failed to update prompt');
  return data;
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await supabase.from('prompts').delete().eq('id', id);
  if (error) throw error;
}

export async function makePromptPublic(id: string): Promise<Prompt> {
  const slug = nanoid(10);

  const { data, error } = await supabase
    .from('prompts')
    .update({
      visibility: 'public',
      public_slug: slug,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function makePromptPrivate(id: string): Promise<Prompt> {
  const { data, error } = await supabase
    .from('prompts')
    .update({
      visibility: 'private',
      public_slug: null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
