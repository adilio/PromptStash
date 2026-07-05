import { describe, it, expect } from 'vitest';
import { workflowBadgeFor, distinctWorkflowLabels } from '@/lib/workflowDisplay';

describe('workflowBadgeFor', () => {
  it('prefers the workflow label and keeps QRSPI colors for QRSPI step labels', () => {
    const badge = workflowBadgeFor({ workflow_label: 'Research', stage: null });
    expect(badge).toEqual({ label: 'Research', color: 'oklch(0.55 0.20 280)' });
  });

  it('gives custom labels a neutral color', () => {
    const badge = workflowBadgeFor({ workflow_label: 'Discovery', stage: null });
    expect(badge?.label).toBe('Discovery');
    expect(badge?.color).not.toContain('0.20 280');
  });

  it('falls back to the legacy stage when no label is set', () => {
    const badge = workflowBadgeFor({ workflow_label: null, stage: 'plan' });
    expect(badge?.label).toBe('Plan');
  });

  it('returns null for unlabeled prompts', () => {
    expect(workflowBadgeFor({ workflow_label: null, stage: null })).toBeNull();
    expect(workflowBadgeFor({ workflow_label: '  ', stage: null })).toBeNull();
  });
});

describe('distinctWorkflowLabels', () => {
  it('is empty when no prompt carries a label — filters auto-hide', () => {
    expect(distinctWorkflowLabels([
      { workflow_label: null, stage: null },
      { workflow_label: null, stage: null },
    ])).toEqual([]);
  });

  it('dedupes and orders stage labels canonically before custom labels', () => {
    const labels = distinctWorkflowLabels([
      { workflow_label: 'Zebra review', stage: null },
      { workflow_label: null, stage: 'plan' },
      { workflow_label: 'Research', stage: null },
      { workflow_label: 'Research', stage: null },
      { workflow_label: 'Alpha triage', stage: null },
    ]);
    expect(labels.map((l) => l.label)).toEqual(['Research', 'Plan', 'Alpha triage', 'Zebra review']);
  });
});
