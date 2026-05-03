import type { Database } from './database.types';

export type { Database } from './database.types';

export type AgentFormat = 'agents' | 'claude' | 'copilot' | 'cursor' | 'windsurf' | 'generic';

export type Team = Database['public']['Tables']['teams']['Row'];
export type Membership = Database['public']['Tables']['memberships']['Row'];
export type Invite = Database['public']['Tables']['invites']['Row'];
export type Folder = Database['public']['Tables']['folders']['Row'];
export type Prompt = Database['public']['Tables']['prompts']['Row'];
export type PromptVersion = Database['public']['Tables']['prompt_versions']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];
export type PromptTag = Database['public']['Tables']['prompt_tags']['Row'];
export type Share = Database['public']['Tables']['shares']['Row'];

export type PromptWithTags = Prompt & {
  tags?: Tag[];
};

export type Stage =
  | 'question' | 'research' | 'design' | 'structure'
  | 'plan' | 'work' | 'implement' | 'review';

export const STAGE_OPTIONS: { id: Stage; label: string; short: string; color: string }[] = [
  { id: 'question',  label: 'Question',  short: 'Q',  color: 'oklch(0.65 0.18 250)' },
  { id: 'research',  label: 'Research',  short: 'R',  color: 'oklch(0.55 0.20 280)' },
  { id: 'design',    label: 'Design',    short: 'D',  color: 'oklch(0.70 0.15 320)' },
  { id: 'structure', label: 'Structure', short: 'S',  color: 'oklch(0.68 0.12 200)' },
  { id: 'plan',      label: 'Plan',      short: 'P',  color: 'oklch(0.75 0.10 150)' },
  { id: 'work',      label: 'Work',      short: 'W',  color: 'oklch(0.70 0.14 80)' },
  { id: 'implement', label: 'Implement', short: 'I',  color: 'oklch(0.72 0.16 60)' },
  { id: 'review',    label: 'Review/PR', short: 'PR', color: 'oklch(0.65 0.18 30)' },
];

export type Bundle = Database['public']['Tables']['bundles']['Row'];
export type BundleItem = Database['public']['Tables']['bundle_items']['Row'];
export type BundleWithItems = Bundle & { items: (BundleItem & { prompt: Prompt })[] };
