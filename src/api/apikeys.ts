import { supabase } from '@/lib/supabase';

const API_KEY_PREFIX = 'ps_';
const API_KEY_LENGTH = 32;

function generateApiKey(): string {
  const bytes = new Uint8Array(API_KEY_LENGTH);
  crypto.getRandomValues(bytes);
  const hexChars = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${API_KEY_PREFIX}${hexChars}`;
}

async function hashApiKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createApiKey(name: string): Promise<{
  id: string;
  name: string;
  rawKey: string;
  key_prefix: string;
  created_at: string;
}> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const rawKey = generateApiKey();
  const keyHash = await hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 10);

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create API key');

  return {
    id: data.id,
    name: data.name,
    rawKey,
    key_prefix: data.key_prefix,
    created_at: data.created_at,
  };
}

export async function listApiKeys(): Promise<Array<{
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}>> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteApiKey(id: string): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
