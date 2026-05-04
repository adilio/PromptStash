import { useState } from 'react';
import { AlertCircle, Play, Settings } from 'lucide-react';
import {
  OPENROUTER_MODELS,
  runPromptWithOpenRouter,
  type RunPromptResult,
} from '@/api/openrouter';
import { useToast } from '@/components/ui/use-toast';

interface PromptRunnerProps {
  prompt: string;
}

export function PromptRunner({ prompt }: PromptRunnerProps) {
  const [model, setModel] = useState<string>(OPENROUTER_MODELS[0].id);
  const [customModel, setCustomModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxCompletionTokens, setMaxCompletionTokens] = useState(800);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunPromptResult | null>(null);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const selectedModel = model === 'custom' ? customModel.trim() : model;

  const handleRun = async () => {
    setError('');
    setResult(null);

    if (!prompt.trim()) {
      setError('Add prompt content before running.');
      return;
    }

    if (!selectedModel) {
      setError('Choose a model first.');
      return;
    }

    setLoading(true);
    try {
      const response = await runPromptWithOpenRouter({
        prompt,
        model: selectedModel,
        temperature,
        maxCompletionTokens,
      });
      setResult(response);
      if (!response.content.trim()) {
        toast({
          title: 'OpenRouter returned an empty response',
          description: 'The request succeeded, but the model did not return text.',
        });
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'OpenRouter request failed');
    } finally {
      setLoading(false);
    }
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
            OpenRouter test run
          </div>
          <div style={{ fontSize: 12, color: 'var(--ps-fg-faint)', marginTop: 2 }}>
            Non-streaming chat completion
          </div>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={loading}
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
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.75 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Play style={{ width: 13, height: 13 }} />
          {loading ? 'Running...' : 'Run'}
        </button>
      </div>

      <div style={{ padding: 14 }}>
        <div
          className="prompt-runner-controls"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1fr) 140px 160px',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Model</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              style={fieldStyle}
            >
              {OPENROUTER_MODELS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
              <option value="custom">Custom model slug</option>
            </select>
          </label>

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

        {model === 'custom' && (
          <label style={{ display: 'block', marginTop: 10 }}>
            <span style={labelStyle}>Model slug</span>
            <input
              value={customModel}
              onChange={(event) => setCustomModel(event.target.value)}
              placeholder="provider/model-name"
              style={fieldStyle}
            />
          </label>
        )}

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

        {result && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                border: '1px solid var(--ps-hairline-soft)',
                borderRadius: 8,
                background: 'var(--ps-bg)',
                padding: '14px 16px',
                minHeight: 88,
                whiteSpace: 'pre-wrap',
                fontSize: 14,
                lineHeight: 1.65,
                color: result.content.trim() ? 'var(--ps-fg)' : 'var(--ps-fg-faint)',
              }}
            >
              {result.content.trim() || 'No text returned.'}
            </div>
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                fontSize: 12,
                color: 'var(--ps-fg-faint)',
              }}
            >
              <span>{result.model}</span>
              {result.finish_reason && <span>Finish: {result.finish_reason}</span>}
              {result.usage?.total_tokens !== undefined && (
                <span>{result.usage.total_tokens} tokens</span>
              )}
              {typeof result.usage?.cost === 'number' && (
                <span>${result.usage.cost.toFixed(6)}</span>
              )}
            </div>
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
