import type { Database } from './database.types';

export type { Database } from './database.types';

export type Team = Database['public']['Tables']['teams']['Row'];
export type Membership = Database['public']['Tables']['memberships']['Row'];
export type Folder = Database['public']['Tables']['folders']['Row'];
export type Prompt = Database['public']['Tables']['prompts']['Row'];
export type PromptVersion = Database['public']['Tables']['prompt_versions']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];
export type PromptTag = Database['public']['Tables']['prompt_tags']['Row'];
export type Share = Database['public']['Tables']['shares']['Row'];

export type PromptWithTags = Prompt & {
  tags?: Tag[];
};
