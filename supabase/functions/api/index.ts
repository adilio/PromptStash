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

interface MembershipWithTeam {
  teams: Team | Team[] | null;
}

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface OpenRouterRunRequest {
  prompt?: unknown;
  model?: unknown;
  temperature?: unknown;
  max_completion_tokens?: unknown;
}

interface OpenRouterChatResult {
  id?: string;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: unknown;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number | null;
  };
}

function extractTeam(membership: MembershipWithTeam): Team | null {
  if (Array.isArray(membership.teams)) {
    return membership.teams[0] ?? null;
  }

  return membership.teams;
}

function isTeam(team: Team | null): team is Team {
  return team !== null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSupabaseServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

function extractOpenRouterContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('');
  }

  return '';
}

function openRouterErrorMessage(status: number, fallback: string): string {
  if (status === 401) return 'OpenRouter rejected the saved API key.';
  if (status === 402) return 'OpenRouter account has insufficient credits.';
  if (status === 404) return 'OpenRouter could not find that model.';
  if (status === 408 || status === 524) return 'OpenRouter request timed out.';
  if (status === 413) return 'The prompt is too large for this request.';
  if (status === 429) return 'OpenRouter rate limit exceeded. Try again later.';
  if (status === 502 || status === 503 || status === 529) return 'The selected provider is unavailable right now.';
  return fallback;
}

async function handleOpenRouterRequest(req: Request, path: string): Promise<Response> {
  if (path !== '/v1/openrouter/run' || req.method !== 'POST') {
    return jsonResponse({ error: 'Not found' }, 404);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing or invalid authorization header' }, 401);
  }

  const accessToken = authHeader.replace('Bearer ', '');
  const supabase = getSupabaseServiceClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonResponse({ error: 'Invalid session' }, 401);
  }

  const body = (await req.json().catch(() => null)) as OpenRouterRunRequest | null;
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const model = typeof body?.model === 'string' ? body.model.trim() : '';
  const temperature = typeof body?.temperature === 'number' ? body.temperature : 0.7;
  const maxCompletionTokens =
    typeof body?.max_completion_tokens === 'number' ? body.max_completion_tokens : 800;

  if (!prompt) {
    return jsonResponse({ error: 'Prompt content is required' }, 400);
  }

  if (!model) {
    return jsonResponse({ error: 'Model is required' }, 400);
  }

  if (temperature < 0 || temperature > 2) {
    return jsonResponse({ error: 'Temperature must be between 0 and 2' }, 400);
  }

  if (!Number.isInteger(maxCompletionTokens) || maxCompletionTokens < 16 || maxCompletionTokens > 32000) {
    return jsonResponse({ error: 'Max output tokens must be between 16 and 32000' }, 400);
  }

  const { data: integration, error: integrationError } = await supabase
    .from('model_integrations')
    .select('api_key')
    .eq('user_id', user.id)
    .eq('provider', 'openrouter')
    .single();

  if (integrationError || !integration?.api_key) {
    return jsonResponse({ error: 'Add an OpenRouter API key in Settings before running prompts.' }, 400);
  }

  // Bound the paid upstream call: abort when the browser cancels the run
  // (req.signal fires on client disconnect) and cap wall time regardless,
  // so cancelled or hung requests stop consuming the user's OpenRouter quota.
  const upstreamSignal = AbortSignal.any([req.signal, AbortSignal.timeout(120_000)]);

  let openRouterResponse: Response;
  try {
    openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: upstreamSignal,
      headers: {
        Authorization: `Bearer ${integration.api_key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('OPENROUTER_HTTP_REFERER') ?? req.headers.get('Origin') ?? 'https://promptstash.app',
        'X-Title': Deno.env.get('OPENROUTER_APP_TITLE') ?? 'PromptStash',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_completion_tokens: maxCompletionTokens,
        stream: false,
      }),
    });
  } catch (error) {
    if (upstreamSignal.aborted) {
      // Client cancelled or the 120s cap hit — either way, stop paid work.
      return jsonResponse({ error: 'OpenRouter request timed out.' }, 408);
    }
    throw error;
  }

  const payload = await openRouterResponse.json().catch(() => null);

  if (!openRouterResponse.ok) {
    const providerMessage =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : 'OpenRouter request failed';
    return jsonResponse(
      { error: openRouterErrorMessage(openRouterResponse.status, providerMessage) },
      openRouterResponse.status
    );
  }

  const result = payload as OpenRouterChatResult;
  const choice = result.choices?.[0];
  const content = extractOpenRouterContent(choice?.message?.content);

  return jsonResponse({
    data: {
      content,
      model: result.model ?? model,
      id: result.id ?? null,
      finish_reason: choice?.finish_reason ?? null,
      usage: result.usage ?? null,
    },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // The function sees different path prefixes depending on how it's invoked
  // (gateway: /functions/v1/api/..., runtime-direct: /api/...) — strip both.
  const path = url.pathname.replace(/^\/functions\/v1\/api/, '').replace(/^\/api/, '');

  if (path.startsWith('/v1/openrouter/')) {
    return handleOpenRouterRequest(req, path);
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

  const supabase = getSupabaseServiceClient();

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

  try {
    if (path === '/v1/prompts' && req.method === 'GET') {
      const workspace = url.searchParams.get('workspace');
      const search = url.searchParams.get('search');

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
        query = query.or(`title.plfts.${normalized},body_md.plfts.${normalized}`);
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

      const teams = ((memberships as MembershipWithTeam[] | null) ?? [])
        .map(extractTeam)
        .filter(isTeam);
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
