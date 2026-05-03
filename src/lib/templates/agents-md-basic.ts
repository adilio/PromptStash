import type { PromptTemplate, BundleTemplate, Template, Difficulty } from './index';
import type { AgentFormat, Stage } from '../types';

const items: PromptTemplate[] = [
  {
    title: 'Project Overview',
    body_md: `# Project Overview

## Project name
{{project_name}}

## Purpose
{{purpose}}

## Tech stack
{{tech_stack}}
`,
    stage: 'question' as Stage,
  },
  {
    title: 'Build and Run',
    body_md: `# Build and Run

## Installation
\`\`\`bash
{{install_command}}
\`\`\`

## Development
\`\`\`bash
{{dev_command}}
\`\`\`

## Build
\`\`\`bash
{{build_command}}
\`\`\`

## Test
\`\`\`bash
{{test_command}}
\`\`\`
`,
    stage: 'work' as Stage,
  },
  {
    title: 'Code Style',
    body_md: `# Code Style

## Formatting
{{formatting_rules}}

## Naming conventions
{{naming_conventions}}

## File organization
{{file_organization}}
`,
    stage: 'design' as Stage,
  },
  {
    title: 'PR Conventions',
    body_md: `# Pull Request Conventions

## PR title format
{{pr_title_format}}

## Required checks
{{required_checks}}

## Review process
{{review_process}}
`,
    stage: 'review' as Stage,
  },
];

const bundle: BundleTemplate = {
  name: 'AGENTS.md Basic',
  description: 'A minimal AGENTS.md skeleton with essential project instructions.',
  target_format: 'agents' as AgentFormat,
  items,
};

export const agentsMdBasicTemplate: Template & { difficulty: Difficulty } = {
  kind: 'bundle',
  id: 'agents-md-basic',
  category: 'Agent Configuration',
  description: 'A minimal AGENTS.md skeleton covering project overview, build/run commands, code style, and PR conventions.',
  difficulty: 'intermediate',
  bundle,
};
