import { getApiBaseUrl } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/utils';

export const OPENROUTER_MODELS = [
  { id: 'openai/gpt-4.1', label: 'OpenAI GPT-4.1' },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
] as const;

export interface OpenRouterStatus {
  connected: boolean;
  key_prefix: string | null;
  updated_at: string | null;
}

export interface RunPromptInput {
  prompt: string;
  model: string;
  temperature: number;
  maxCompletionTokens: number;
}

export interface RunPromptResult {
  content: string;
  model: string;
  id: string | null;
  finish_reason: string | null;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number | null;
  } | null;
}

function normalizeStatus(value: unknown): OpenRouterStatus {
  const row = Array.isArray(value) ? value[0] : value;

  if (!row || typeof row !== 'object') {
    return { connected: false, key_prefix: null, updated_at: null };
  }

  const status = row as Partial<OpenRouterStatus>;
  return {
    connected: Boolean(status.connected),
    key_prefix: status.key_prefix ?? null,
    updated_at: status.updated_at ?? null,
  };
}

function throwOpenRouterIntegrationError(error: unknown): never {
  const message = getErrorMessage(error, 'Could not save OpenRouter key');

  if (
    message.includes('set_openrouter_api_key') ||
    message.includes('get_openrouter_integration_status') ||
    message.includes('delete_openrouter_api_key') ||
    message.includes('schema cache')
  ) {
    throw new Error('OpenRouter setup is not installed yet. Apply the latest Supabase migrations and try again.');
  }

  throw new Error(message);
}

export async function getOpenRouterStatus(): Promise<OpenRouterStatus> {
  const { data, error } = await supabase.rpc('get_openrouter_integration_status');

  if (error) throwOpenRouterIntegrationError(error);
  return normalizeStatus(data);
}

export async function setOpenRouterApiKey(apiKey: string): Promise<OpenRouterStatus> {
  const { data, error } = await supabase.rpc('set_openrouter_api_key', {
    openrouter_api_key: apiKey,
  });

  if (error) throwOpenRouterIntegrationError(error);
  return normalizeStatus(data);
}

export async function deleteOpenRouterApiKey(): Promise<void> {
  const { error } = await supabase.rpc('delete_openrouter_api_key');

  if (error) throwOpenRouterIntegrationError(error);
}

export async function runPromptWithOpenRouter(
  input: RunPromptInput,
  signal?: AbortSignal
): Promise<RunPromptResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Sign in before running prompts.');
  }

  const response = await fetch(`${getApiBaseUrl()}/v1/openrouter/run`, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: input.prompt,
      model: input.model,
      temperature: input.temperature,
      max_completion_tokens: input.maxCompletionTokens,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.error?.message === 'string'
        ? payload.error.message
        : 'OpenRouter request failed';
    throw new Error(message);
  }

  return payload.data as RunPromptResult;
}
