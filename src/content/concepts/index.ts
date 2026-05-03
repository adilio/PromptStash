export const CONCEPT_SUMMARIES: Record<string, { title: string; summary: string }> = {
  'agents-md': {
    title: 'AGENTS.md',
    summary: 'A community-standard file for AI coding agent instructions, providing consistency across different tools and teams.',
  },
  'claude-md': {
    title: 'CLAUDE.md',
    summary: 'Claude Code\'s custom instruction file format, similar to AGENTS.md but specific to Anthropic\'s Claude Code editor.',
  },
  stages: {
    title: 'Stages',
    summary: 'Tag prompts as part of a structured workflow (Research, Plan, Implement, etc.) to organize and compose them into bundles.',
  },
  bundles: {
    title: 'Bundles',
    summary: 'Ordered collections of prompts that work together as complete instruction sets for AI agents.',
  },
  'dumb-zone': {
    title: 'Dumb Zone',
    summary: 'The point where an AI model\'s context is too full (typically >40% of the window), leading to degraded performance.',
  },
  qrspi: {
    title: 'QRSPI',
    summary: 'A methodology for breaking down complex tasks into stages: Question, Research, Structure, Plan, and Implement.',
  },
  'context-engineering': {
    title: 'Context Engineering',
    summary: 'The practice of designing and optimizing prompts for AI agents to improve performance and outcomes.',
  },
};
