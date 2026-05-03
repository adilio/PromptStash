import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Bundle, BundleItem, BundleWithItems, Prompt } from '@/lib/types';

interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

export async function listBundles(teamId: string): Promise<Bundle[]> {
  const { data, error } = await supabase
    .from('bundles')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false }) as QueryResult<Bundle[]>;

  if (error) throw error;
  return data ?? [];
}

export async function getBundle(id: string): Promise<BundleWithItems> {
  const { data: bundle, error: bundleError } = await supabase
    .from('bundles')
    .select('*')
    .eq('id', id)
    .single() as QueryResult<Bundle>;

  if (bundleError) throw bundleError;
  if (!bundle) throw new Error('Bundle not found');

  const { data: items, error: itemsError } = await supabase
    .from('bundle_items')
    .select('*, prompts!inner(*)')
    .eq('bundle_id', id)
    .order('position', { ascending: true }) as unknown as QueryResult<(BundleItem & { prompts: Prompt })[]>;

  if (itemsError) throw itemsError;

  return {
    ...bundle,
    items: (items ?? []).map(item => ({
      ...item,
      prompt: item.prompts,
    })),
  };
}

export async function createBundle(input: {
  team_id: string;
  name: string;
  description?: string;
  target_format: string;
  created_by: string;
}): Promise<Bundle> {
  const { data, error } = await supabase
    .from('bundles')
    .insert(input)
    .select('*')
    .single() as QueryResult<Bundle>;

  if (error) throw error;
  if (!data) throw new Error('Failed to create bundle');
  return data;
}

export async function updateBundle(
  id: string,
  patch: Partial<{
    name: string;
    description: string;
    target_format: string;
  }>
): Promise<Bundle> {
  const { data, error } = await supabase
    .from('bundles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single() as QueryResult<Bundle>;

  if (error) throw error;
  if (!data) throw new Error('Failed to update bundle');
  return data;
}

export async function deleteBundle(id: string): Promise<void> {
  const { error } = await supabase.from('bundles').delete().eq('id', id);
  if (error) throw error;
}

export async function addBundleItem(bundleId: string, promptId: string): Promise<BundleItem> {
  const { data: existingItems } = await supabase
    .from('bundle_items')
    .select('position')
    .eq('bundle_id', bundleId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = (existingItems?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('bundle_items')
    .insert({
      bundle_id: bundleId,
      prompt_id: promptId,
      position: nextPosition,
      included: true,
    })
    .select('*')
    .single() as QueryResult<BundleItem>;

  if (error) throw error;
  if (!data) throw new Error('Failed to add bundle item');
  return data;
}

export async function removeBundleItem(bundleId: string, promptId: string): Promise<void> {
  const { error } = await supabase
    .from('bundle_items')
    .delete()
    .eq('bundle_id', bundleId)
    .eq('prompt_id', promptId);

  if (error) throw error;
}

export async function reorderBundleItems(bundleId: string, orderedPromptIds: string[]): Promise<void> {
  const updates = orderedPromptIds.map((promptId, index) =>
    supabase
      .from('bundle_items')
      .update({ position: index })
      .eq('bundle_id', bundleId)
      .eq('prompt_id', promptId)
  );

  await Promise.all(updates);
}

export async function setBundleItemIncluded(
  bundleId: string,
  promptId: string,
  included: boolean
): Promise<void> {
  const { error } = await supabase
    .from('bundle_items')
    .update({ included })
    .eq('bundle_id', bundleId)
    .eq('prompt_id', promptId);

  if (error) throw error;
}

export async function setBundleItemHeadingOverride(
  bundleId: string,
  promptId: string,
  heading: string | null
): Promise<void> {
  const { error } = await supabase
    .from('bundle_items')
    .update({ heading_override: heading })
    .eq('bundle_id', bundleId)
    .eq('prompt_id', promptId);

  if (error) throw error;
}
