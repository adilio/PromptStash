import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import type { Prompt, PromptWithTags, Tag } from '@/lib/types';

interface PromptTagJoin {
  tag_id: string;
  tags: Tag | Tag[] | null;
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
    const normalizedSearchQuery = normalizeFullTextSearchQuery(searchQuery);

    if (normalizedSearchQuery) {
      query = query.or(
        `title.plfts.${normalizedSearchQuery},body_md.plfts.${normalizedSearchQuery}`
      );
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getPrompt(id: string): Promise<PromptWithTags> {
  const { data: prompt, error: promptError } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', id)
    .single();

  if (promptError) throw promptError;

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
}): Promise<Prompt> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('prompts')
    .insert({
      team_id: input.team_id,
      folder_id: input.folder_id || null,
      owner_id: user.id,
      title: input.title,
      body_md: input.body_md,
      visibility: input.visibility || 'private',
    })
    .select('*')
    .single();

  if (error) throw error;
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
  }>
): Promise<Prompt> {
  const { data, error } = await supabase
    .from('prompts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
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
