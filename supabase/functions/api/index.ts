import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Prompt {
  id: string;
  team_id: string;
  folder_id: string | null;
  owner_id: string;
  title: string;
  body_md: string;
  visibility: 'private' | 'team' | 'public';
  public_slug: string | null;
  espanso_trigger: string | null;
  created_at: string;
  updated_at: string;
}

interface Tag {
  id: string;
  name: string;
  team_id: string | null;
  created_at: string;
  created_by: string;
}

interface PromptWithTags extends Prompt {
  tags?: Tag[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawKey = authHeader.replace('Bearer ', '');
  const keyHash = await hashKey(rawKey);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: keyData, error: keyError } = await supabase
    .from('api_keys')
    .select('user_id, id')
    .eq('key_hash', keyHash)
    .single();

  if (keyError || !keyData) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);

  const url = new URL(req.url);
  const path = url.pathname.replace('/functions/v1/api', '');

  try {
    if (path === '/v1/prompts' && req.method === 'GET') {
      const workspace = url.searchParams.get('workspace');
      const search = url.searchParams.get('search');
      const tag = url.searchParams.get('tag');

      if (!workspace) {
        return new Response(JSON.stringify({ error: 'Missing workspace parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let query = supabase
        .from('prompts')
        .select('*')
        .eq('team_id', workspace)
        .order('updated_at', { ascending: false });

      if (search) {
        const normalized = search.trim().replace(/[(),]/g, ' ').replace(/\s+/g, ' ');
        query = query.textSearch('fts', normalized);
      }

      const { data: prompts, error } = await query;

      if (error) throw error;

      const promptIds = (prompts as Prompt[]).map(p => p.id);
      const { data: promptTags } = await supabase
        .from('prompt_tags')
        .select('prompt_id, tags(*)')
        .in('prompt_id', promptIds);

      const tagsByPromptId = new Map<string, Tag[]>();
      for (const row of promptTags || []) {
        const tag = row.tags;
        if (tag && Array.isArray(tag)) {
          const promptId = row.prompt_id;
          const existing = tagsByPromptId.get(promptId) || [];
          tagsByPromptId.set(promptId, [...existing, tag[0]]);
        } else if (tag) {
          const promptId = row.prompt_id;
          const existing = tagsByPromptId.get(promptId) || [];
          tagsByPromptId.set(promptId, [...existing, tag]);
        }
      }

      const result: PromptWithTags[] = (prompts as Prompt[]).map(p => ({
        ...p,
        tags: tagsByPromptId.get(p.id) || [],
      }));

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/v1/prompts/') && req.method === 'GET') {
      const id = path.split('/').pop();
      const { data: prompt, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !prompt) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: promptTags } = await supabase
        .from('prompt_tags')
        .select('tag_id, tags(*)')
        .eq('prompt_id', id);

      const tags: Tag[] = [];
      for (const join of promptTags || []) {
        if (join.tags && Array.isArray(join.tags)) {
          const tag = join.tags[0];
          if (tag) tags.push(tag);
        } else if (join.tags) {
          tags.push(join.tags);
        }
      }

      const result: PromptWithTags = { ...prompt, tags };
      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/v1/prompts' && req.method === 'POST') {
      const body = await req.json();
      const { team_id, title, body_md, folder_id } = body;

      if (!team_id || !title || !body_md) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: prompt, error } = await supabase
        .from('prompts')
        .insert({
          team_id,
          owner_id: keyData.user_id,
          title,
          body_md,
          folder_id: folder_id || null,
          visibility: 'private',
        })
        .select('*')
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: prompt }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/v1/prompts/') && req.method === 'PATCH') {
      const id = path.split('/').pop();
      const body = await req.json();

      const { data: prompt, error } = await supabase
        .from('prompts')
        .update(body)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !prompt) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: prompt }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/v1/prompts/') && req.method === 'DELETE') {
      const id = path.split('/').pop();

      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/v1/workspaces' && req.method === 'GET') {
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('teams(*)')
        .eq('user_id', keyData.user_id);

      if (error) throw error;

      const teams = memberships?.map((m: any) => m.teams).filter(Boolean) || [];
      return new Response(JSON.stringify({ data: teams }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
