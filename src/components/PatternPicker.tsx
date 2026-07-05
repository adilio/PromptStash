import { useQuery } from '@tanstack/react-query';
import { listPatterns } from '@/api/patterns';
import { patternKeys } from '@/lib/queryClient';
import { ConceptInfo } from '@/components/ConceptInfo';

export interface WorkflowSelection {
  patternId: string | null;
  stepId: string | null;
  label: string | null;
}

interface PatternPickerProps {
  teamId?: string;
  value: WorkflowSelection;
  onChange: (value: WorkflowSelection) => void;
}

const CUSTOM = '__custom__';
const NONE = '__none__';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--ps-hairline)',
  background: 'var(--ps-bg-elev)',
  borderRadius: 8,
  padding: '0 12px',
  height: 32,
  color: 'var(--ps-fg)',
  fontFamily: 'inherit',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

/**
 * Workflow label picker for the PromptEditor Advanced section. A prompt can
 * take a step from a built-in or team pattern, a one-off custom label with no
 * pattern, or no label at all.
 */
export function PatternPicker({ teamId, value, onChange }: PatternPickerProps) {
  const patternsQuery = useQuery({
    queryKey: patternKeys.list(teamId),
    queryFn: () => listPatterns(teamId),
  });

  const patterns = patternsQuery.data ?? [];
  const selectedPattern = patterns.find((p) => p.id === value.patternId) ?? null;
  const isCustom = !value.patternId && value.label !== null;

  const patternSelectValue = value.patternId ?? (isCustom ? CUSTOM : NONE);

  const handlePatternChange = (next: string) => {
    if (next === NONE) {
      onChange({ patternId: null, stepId: null, label: null });
    } else if (next === CUSTOM) {
      onChange({ patternId: null, stepId: null, label: value.label ?? '' });
    } else {
      onChange({ patternId: next, stepId: null, label: null });
    }
  };

  const handleStepChange = (stepId: string) => {
    if (!selectedPattern) return;
    if (!stepId) {
      onChange({ patternId: selectedPattern.id, stepId: null, label: null });
      return;
    }
    const step = selectedPattern.steps.find((s) => s.id === stepId);
    onChange({
      patternId: selectedPattern.id,
      stepId,
      label: step?.label ?? null,
    });
  };

  return (
    <div>
      <label
        htmlFor="workflow-pattern"
        style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ps-fg-muted)', marginBottom: 6 }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Workflow label
          <ConceptInfo conceptId="stages" />
        </span>
      </label>
      <select
        id="workflow-pattern"
        value={patternSelectValue}
        onChange={(e) => handlePatternChange(e.target.value)}
        style={fieldStyle}
      >
        <option value={NONE}>No workflow label</option>
        {patterns.filter((p) => p.is_system).map((pattern) => (
          <option key={pattern.id} value={pattern.id}>
            {pattern.name}
          </option>
        ))}
        {patterns.some((p) => !p.is_system) && (
          <optgroup label="Team patterns">
            {patterns.filter((p) => !p.is_system).map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.name}
              </option>
            ))}
          </optgroup>
        )}
        <option value={CUSTOM}>Custom label…</option>
      </select>

      {selectedPattern && (
        <select
          id="workflow-step"
          aria-label="Workflow step"
          value={value.stepId ?? ''}
          onChange={(e) => handleStepChange(e.target.value)}
          style={{ ...fieldStyle, marginTop: 8 }}
        >
          <option value="">Pick a step…</option>
          {selectedPattern.steps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.label}
            </option>
          ))}
        </select>
      )}

      {isCustom && (
        <input
          aria-label="Custom workflow label"
          value={value.label ?? ''}
          onChange={(e) => onChange({ patternId: null, stepId: null, label: e.target.value })}
          placeholder="e.g. Discovery, Spike, Triage…"
          style={{ ...fieldStyle, marginTop: 8 }}
        />
      )}

      <p style={{ fontSize: 12, color: 'var(--ps-fg-faint)', marginTop: 6 }}>
        Optionally label where this prompt fits in your workflow.
      </p>
    </div>
  );
}
