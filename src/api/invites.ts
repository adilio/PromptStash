import { supabase } from '@/lib/supabase';
import type { Invite } from '@/lib/types';

export type InviteRole = 'editor' | 'viewer';

export async function createInvite(input: {
  teamId: string;
  email: string;
  role: InviteRole;
}): Promise<Invite> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('invites')
    .insert({
      team_id: input.teamId,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invite', {
    invite_token: token,
  });

  if (error) throw error;
  return data;
}
