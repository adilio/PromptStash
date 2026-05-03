import type { AgentFormat, Stage } from '../types';
import { codeReviewTemplate } from './code-review';
import { gitWorkflowTemplate } from './git-workflow';
import { testingTemplate } from './testing';
import { markdownStyleTemplate } from './markdown-style';
import { agentsMdBasicTemplate } from './agents-md-basic';
import { qrspiTemplate } from './qrspi';

export type PromptTemplate = {
  title: string;
  body_md: string;
  stage?: Stage;
  agent_format?: AgentFormat;
};

export type BundleTemplate = {
  name: string;
  description: string;
  target_format: AgentFormat;
  items: PromptTemplate[];
};

export type Template =
  | { kind: 'prompt'; id: string; category: string; description: string; prompt: PromptTemplate }
  | { kind: 'bundle'; id: string; category: string; description: string; bundle: BundleTemplate };

export type Difficulty = 'starter' | 'intermediate' | 'advanced';

export type TemplateWithDifficulty = Template & { difficulty: Difficulty };

export const TEMPLATES: TemplateWithDifficulty[] = [
  codeReviewTemplate,
  gitWorkflowTemplate,
  testingTemplate,
  markdownStyleTemplate,
  agentsMdBasicTemplate,
  qrspiTemplate,
];
