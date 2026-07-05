import { STAGE_OPTIONS } from './types';

export interface WorkflowBadge {
  label: string;
  color: string;
}

const NEUTRAL_COLOR = 'oklch(0.50 0.04 260)';

interface WorkflowFields {
  workflow_label?: string | null;
  stage?: string | null;
}

/**
 * The badge a prompt should display: its workflow label (pattern step or
 * custom), falling back to the legacy stage. QRSPI step labels keep the
 * original stage colors; custom labels get a neutral tone.
 */
export function workflowBadgeFor(prompt: WorkflowFields): WorkflowBadge | null {
  const label = prompt.workflow_label?.trim();
  if (label) {
    const stageMatch = STAGE_OPTIONS.find((option) => option.label === label);
    return { label, color: stageMatch?.color ?? NEUTRAL_COLOR };
  }

  if (prompt.stage) {
    const option = STAGE_OPTIONS.find((o) => o.id === prompt.stage);
    if (option) return { label: option.label, color: option.color };
  }

  return null;
}

/**
 * Distinct workflow labels present in a prompt list, for building filter
 * chips. QRSPI-known labels come first in canonical stage order, then custom
 * labels alphabetically. Empty when no prompt carries a label — the filter
 * strip auto-discloses from data.
 */
export function distinctWorkflowLabels(prompts: WorkflowFields[]): WorkflowBadge[] {
  const byLabel = new Map<string, WorkflowBadge>();
  for (const prompt of prompts) {
    const badge = workflowBadgeFor(prompt);
    if (badge && !byLabel.has(badge.label)) {
      byLabel.set(badge.label, badge);
    }
  }

  const stageOrder = new Map(STAGE_OPTIONS.map((option, index) => [option.label, index]));
  return Array.from(byLabel.values()).sort((a, b) => {
    const aStage = stageOrder.get(a.label);
    const bStage = stageOrder.get(b.label);
    if (aStage !== undefined && bStage !== undefined) return aStage - bStage;
    if (aStage !== undefined) return -1;
    if (bStage !== undefined) return 1;
    return a.label.localeCompare(b.label);
  });
}
