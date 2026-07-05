import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, ChevronRight, Play, Settings, Square } from 'lucide-react';
import {
  OPENROUTER_MODELS,
  runPromptWithOpenRouter,
  type RunPromptResult,
} from '@/api/openrouter';
import { listRunsForPrompt, recordRun } from '@/api/runs';
import { runKeys } from '@/lib/queryClient';
import type { PromptRun } from '@/lib/types';

interface PromptRunnerProps {
  prompt: string;
  teamId?: string;
  promptId?: string;
}

interface ModelRunState {
  model: string;
  label: string;
  loading: boolean;
  result?: RunPromptResult;
  error?: string;
  cancelled?: boolean;
  durationMs?: number;
}

function modelLabel(modelId: string): string {
  return OPENROUTER_MODELS.find((m) => m.id === modelId)?.label ?? modelId;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

export function PromptRunner({ prompt, teamId, promptId }: PromptRunnerProps) {
  const [selectedModels, setSelectedModels] = useState<string[]>([OPENROUTER_MODELS[0].id]);
  const [customModel, setCustomModel] = useState('');
  const [customEnabled, setCustomEnabled] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxCompletionTokens, setMaxCompletionTokens] = useState(800);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<ModelRunState[]>([]);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: runKeys.list(promptId),
    queryFn: () => listRunsForPrompt(promptId!),
    enabled: Boolean(promptId) && historyOpen,
  });

  const toggleModel = (modelId: string) => {
    setSelectedModels((current) =>
      current.includes(modelId) ? current.filter((m) => m !== modelId) : [...current, modelId]
    );
  };

  const activeModels = [
    ...selectedModels,
    ...(customEnabled && customModel.trim() ? [customModel.trim()] : []),
  ];

  const persistRun = async (
    model: string,
    outcome: { result?: RunPromptResult; error?: string; cancelled?: boolean },
    durationMs: number
  ) => {
    if (!teamId) return;
    try {
      await recordRun({
        team_id: teamId,
        prompt_id: promptId ?? null,
        model,
        input_md: prompt,
        output_md: outcome.result?.content ?? null,
        status: outcome.cancelled ? 'cancelled' : outcome.error ? 'error' : 'success',
        error: outcome.error ?? null,
        prompt_tokens: outcome.result?.usage?.prompt_tokens ?? null,
        completion_tokens: outcome.result?.usage?.completion_tokens ?? null,
        total_tokens: outcome.result?.usage?.total_tokens ?? null,
        cost_estimate: typeof outcome.result?.usage?.cost === 'number' ? outcome.result.usage.cost : null,
        duration_ms: durationMs,
        temperature,
        max_completion_tokens: maxCompletionTokens,
      });
      queryClient.invalidateQueries({ queryKey: runKeys.list(promptId) });
    } catch {
      // History is best-effort — a failed insert must not disturb the run UI
    }
  };

  const handleRun = async () => {
    setError('');

    if (!prompt.trim()) {
      setError('Add prompt content before running.');
      return;
    }

    if (activeModels.length === 0) {
      setError('Choose at least one model first.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setRuns(
      activeModels.map((model) => ({ model, label: modelLabel(model), loading: true }))
    );

    await Promise.allSettled(
      activeModels.map(async (model) => {
        const startedAt = Date.now();
        try {
          const result = await runPromptWithOpenRouter(
            { prompt, model, temperature, maxCompletionTokens },
            controller.signal
          );
          const durationMs = Date.now() - startedAt;
          setRuns((current) =>
            current.map((r) => (r.model === model ? { ...r, loading: false, result, durationMs } : r))
          );
          void persistRun(model, { result }, durationMs);
        } catch (runError) {
          const durationMs = Date.now() - startedAt;
          if (isAbortError(runError)) {
            setRuns((current) =>
              current.map((r) => (r.model === model ? { ...r, loading: false, cancelled: true, durationMs } : r))
            );
            void persistRun(model, { cancelled: true }, durationMs);
            return;
          }
          const message = runError instanceof Error ? runError.message : 'OpenRouter request failed';
          setRuns((current) =>
            current.map((r) => (r.model === model ? { ...r, loading: false, error: message, durationMs } : r))
          );
          void persistRun(model, { error: message }, durationMs);
        }
      })
    );

    abortRef.current = null;
    setRunning(false);
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  return (
    <section
      aria-label="Run prompt"
      style={{
        border: '1px solid var(--ps-hairline)',
        borderRadius: 8,
        background: 'var(--ps-bg-elev)',
        marginTop: 18,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @media (max-width: 720px) {
          .prompt-runner-controls {
            grid-template-columns: 1fr !important;
          }
          .prompt-runner-results {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--ps-hairline-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--ps-fg)' }}>
            OpenRouter run
          </div>
          <div style={{ fontSize: 12, color: 'var(--ps-fg-faint)', marginTop: 2 }}>
            Pick one model, or several to compare side by side
          </div>
        </div>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          {running && (
            <button
              type="button"
              onClick={handleCancel}
              style={{
                height: 30,
                padding: '0 11px',
                borderRadius: 7,
                background: 'transparent',
                color: 'var(--ps-fg)',
                border: '1px solid var(--ps-hairline)',
                fontFamily: 'inherit',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Square style={{ width: 12, height: 12 }} />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            style={{
              height: 30,
              padding: '0 11px',
              borderRadius: 7,
              background: 'var(--ps-accent)',
              color: 'var(--ps-accent-fg)',
              border: 0,
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: running ? 'not-allowed' : 'pointer',
              opacity: running ? 0.75 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Play style={{ width: 13, height: 13 }} />
            {running ? 'Running...' : activeModels.length > 1 ? `Run ${activeModels.length} models` : 'Run'}
          </button>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ marginBottom: 12 }}>
          <span style={labelStyle}>Models</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {OPENROUTER_MODELS.map((option) => {
              const active = selectedModels.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleModel(option.id)}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    borderRadius: 999,
                    border: `1px solid ${active ? 'var(--ps-accent)' : 'var(--ps-hairline)'}`,
                    background: active ? 'var(--ps-accent)' : 'transparent',
                    color: active ? 'var(--ps-accent-fg)' : 'var(--ps-fg-muted)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 550,
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={customEnabled}
              onClick={() => setCustomEnabled((v) => !v)}
              style={{
                height: 28,
                padding: '0 10px',
                borderRadius: 999,
                border: `1px solid ${customEnabled ? 'var(--ps-accent)' : 'var(--ps-hairline)'}`,
                background: customEnabled ? 'var(--ps-accent)' : 'transparent',
                color: customEnabled ? 'var(--ps-accent-fg)' : 'var(--ps-fg-muted)',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 550,
                cursor: 'pointer',
              }}
            >
              Custom slug
            </button>
          </div>
        </div>

        <div
          className="prompt-runner-controls"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1fr) 140px 160px',
            gap: 10,
            alignItems: 'end',
          }}
        >
          {customEnabled ? (
            <label style={{ display: 'block' }}>
              <span style={labelStyle}>Model slug</span>
              <input
                value={customModel}
                onChange={(event) => setCustomModel(event.target.value)}
                placeholder="provider/model-name"
                style={fieldStyle}
              />
            </label>
          ) : (
            <div />
          )}

          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Temperature</span>
            <input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(event) => setTemperature(Number(event.target.value))}
              style={fieldStyle}
            />
          </label>

          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Max output</span>
            <input
              type="number"
              min={16}
              max={32000}
              step={1}
              value={maxCompletionTokens}
              onChange={(event) => setMaxCompletionTokens(Number(event.target.value))}
              style={fieldStyle}
            />
          </label>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              color: 'hsl(var(--destructive))',
              fontSize: 13,
            }}
          >
            <AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {runs.length > 0 && (
          <div
            className="prompt-runner-results"
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: runs.length > 1 ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr',
              gap: 10,
            }}
          >
            {runs.map((run) => (
              <div
                key={run.model}
                style={{
                  border: '1px solid var(--ps-hairline-soft)',
                  borderRadius: 8,
                  background: 'var(--ps-bg)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--ps-hairline-soft)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--ps-fg)' }}>
                    {run.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--ps-fg-faint)' }}>
                    {run.loading
                      ? 'Running...'
                      : run.cancelled
                      ? 'Cancelled'
                      : run.error
                      ? 'Error'
                      : run.durationMs !== undefined
                      ? `${(run.durationMs / 1000).toFixed(1)}s`
                      : ''}
                  </span>
                </div>
                <div
                  style={{
                    padding: '12px 12px',
                    minHeight: 72,
                    whiteSpace: 'pre-wrap',
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: run.error
                      ? 'hsl(var(--destructive))'
                      : run.result?.content.trim()
                      ? 'var(--ps-fg)'
                      : 'var(--ps-fg-faint)',
                  }}
                >
                  {run.loading
                    ? 'Waiting for the model...'
                    : run.cancelled
                    ? 'Run cancelled.'
                    : run.error
                    ? run.error
                    : run.result?.content.trim() || 'No text returned.'}
                </div>
                {run.result && (
                  <div
                    style={{
                      padding: '0 12px 10px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      fontSize: 11.5,
                      color: 'var(--ps-fg-faint)',
                    }}
                  >
                    {run.result.usage?.total_tokens !== undefined && (
                      <span>{run.result.usage.total_tokens} tokens (est.)</span>
                    )}
                    {typeof run.result.usage?.cost === 'number' && (
                      <span>${run.result.usage.cost.toFixed(6)} est.</span>
                    )}
                    {run.result.finish_reason && <span>Finish: {run.result.finish_reason}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {promptId && (
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              style={{
                appearance: 'none',
                border: 0,
                background: 'transparent',
                color: 'var(--ps-fg-muted)',
                fontFamily: 'inherit',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
              }}
            >
              {historyOpen ? (
                <ChevronDown style={{ width: 14, height: 14 }} />
              ) : (
                <ChevronRight style={{ width: 14, height: 14 }} />
              )}
              Run history
            </button>

            {historyOpen && (
              <div style={{ marginTop: 8 }}>
                {historyQuery.isLoading ? (
                  <div style={{ fontSize: 12.5, color: 'var(--ps-fg-faint)' }}>Loading runs...</div>
                ) : (historyQuery.data?.length ?? 0) === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--ps-fg-faint)' }}>
                    No recorded runs for this prompt yet.
                  </div>
                ) : (
                  <div
                    style={{
                      border: '1px solid var(--ps-hairline-soft)',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    {historyQuery.data!.map((run: PromptRun) => (
                      <div key={run.id} style={{ borderBottom: '1px solid var(--ps-hairline-soft)' }}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRunId((current) => (current === run.id ? null : run.id))
                          }
                          style={{
                            appearance: 'none',
                            border: 0,
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            padding: '9px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ps-fg)' }}>
                            {modelLabel(run.model)}
                          </span>
                          <span
                            style={{
                              fontSize: 11.5,
                              color:
                                run.status === 'success'
                                  ? 'var(--ps-fg-faint)'
                                  : 'hsl(var(--destructive))',
                            }}
                          >
                            {run.status}
                          </span>
                          {run.total_tokens !== null && (
                            <span style={{ fontSize: 11.5, color: 'var(--ps-fg-faint)' }}>
                              {run.total_tokens} tokens (est.)
                            </span>
                          )}
                          {run.cost_estimate !== null && (
                            <span style={{ fontSize: 11.5, color: 'var(--ps-fg-faint)' }}>
                              ${Number(run.cost_estimate).toFixed(6)} est.
                            </span>
                          )}
                          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ps-fg-faint)' }}>
                            {new Date(run.created_at).toLocaleString()}
                          </span>
                        </button>
                        {expandedRunId === run.id && (
                          <div
                            style={{
                              padding: '0 12px 12px',
                              fontSize: 13,
                              lineHeight: 1.6,
                              whiteSpace: 'pre-wrap',
                              color: run.status === 'error' ? 'hsl(var(--destructive))' : 'var(--ps-fg)',
                            }}
                          >
                            {run.status === 'error'
                              ? run.error || 'Run failed.'
                              : run.output_md?.trim() || 'No text returned.'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <a
          href="/app/settings"
          style={{
            marginTop: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            color: 'var(--ps-fg-muted)',
            fontSize: 12.5,
            textDecoration: 'none',
          }}
        >
          <Settings style={{ width: 13, height: 13 }} />
          Configure OpenRouter key
        </a>
      </div>
    </section>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ps-fg-muted)',
  marginBottom: 5,
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 34,
  border: '1px solid var(--ps-hairline)',
  background: 'var(--ps-bg)',
  borderRadius: 7,
  padding: '0 10px',
  color: 'var(--ps-fg)',
  fontFamily: 'inherit',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};
