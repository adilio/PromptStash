export type Zone = 'safe' | 'warning' | 'danger';

export const MODEL_CONTEXTS = {
  'claude-sonnet': 200_000,
  'claude-opus': 200_000,
  'gpt-5': 400_000,
  default: 200_000,
} as const;
export type ModelKey = keyof typeof MODEL_CONTEXTS;

export const ZONE_THRESHOLDS = { safe: 0.40, warning: 0.60 };

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function getZone(tokens: number, contextSize: number): Zone {
  const ratio = tokens / contextSize;
  if (ratio < ZONE_THRESHOLDS.safe) return 'safe';
  if (ratio < ZONE_THRESHOLDS.warning) return 'warning';
  return 'danger';
}

export function zoneColor(zone: Zone): string {
  if (zone === 'safe') return 'oklch(0.72 0.16 150)';
  if (zone === 'warning') return 'oklch(0.78 0.16 80)';
  return 'oklch(0.65 0.20 25)';
}
