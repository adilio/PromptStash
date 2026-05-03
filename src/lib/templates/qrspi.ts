import type { PromptTemplate, BundleTemplate, Template, Difficulty } from './index';
import type { AgentFormat, Stage } from '../types';

const items: PromptTemplate[] = [
  {
    title: 'Question Clarification',
    body_md: `# Question Clarification

Before starting any task, ensure you understand what's being asked.

## Initial analysis
- Restate the problem in your own words
- Identify the core requirement vs. nice-to-haves
- Flag any ambiguities or missing information

## Questions to ask
- What is the success criteria?
- What are the constraints (time, resources, compatibility)?
- What is the context (existing code, users affected)?
- What are the edge cases to consider?

## When to proceed
Only proceed once you can explain:
1. What you're building
2. Why it's needed
3. How you'll know it's done`,
    stage: 'question' as Stage,
  },
  {
    title: 'Research Phase',
    body_md: `# Research Phase

Gather context before making changes.

## What to research
- Existing code that solves similar problems
- External dependencies and their capabilities
- Platform/framework best practices
- Previous decisions and their rationale

## Sources
- Codebase: grep, git history, comments
- Documentation: official docs, RFCs, specs
- Community: StackOverflow, GitHub issues, forums

## Output
Document your findings:
- Relevant code snippets with file paths
- Links to documentation or discussions
- Trade-offs and considerations
- Recommended approach with justification`,
    stage: 'research' as Stage,
  },
  {
    title: 'Design Planning',
    body_md: `# Design Planning

Plan the solution before implementing.

## Design artifacts
- Architecture: components, modules, and their relationships
- Data structures: types, schemas, and validation
- APIs: function signatures and contracts
- Error handling: failure modes and recovery

## Considerations
- Performance: complexity, bottlenecks, optimization points
- Security: input validation, authorization, edge cases
- Maintainability: clarity, testability, extensibility
- Compatibility: backward compatibility, migration path

## Review
Before implementing, verify:
- The design solves the stated problem
- Trade-offs are explicit and justified
- Edge cases are handled
- The design fits existing patterns`,
    stage: 'design' as Stage,
  },
  {
    title: 'Structure Planning',
    body_md: `# Structure Planning

Break down the implementation into manageable steps.

## Task breakdown
- List all files to create or modify
- Identify dependencies between tasks
- Estimate complexity for each task

## Ordering
- Start with foundational changes (types, utilities)
- Group related changes together
- Incremental: keep the code working after each step

## Test strategy
- What needs to be tested at each step
- How to verify correctness incrementally
- What integration points need validation`,
    stage: 'structure' as Stage,
  },
  {
    title: 'Implementation Plan',
    body_md: `# Implementation Plan

Execute the structured plan.

## Before coding
- Set up any necessary tooling or environment
- Create feature branch from main
- Document the plan in comments or a TODO file

## During implementation
- Follow the planned task order
- Keep commits atomic and focused
- Write tests alongside or before code
- Update documentation as you go

## Commit discipline
- Commit messages should explain what and why
- Keep diffs reviewable (avoid massive reformats)
- Ensure tests pass before pushing

## When stuck
- Revisit the research and design phases
- Ask for clarification or guidance
- Document what you tried and why it didn't work`,
    stage: 'plan' as Stage,
  },
  {
    title: 'Work Execution',
    body_md: `# Work Execution

Focus on clean, correct implementation.

## Coding principles
- Clear over clever: readability matters most
- Don't repeat yourself (DRY)
- Keep functions small and focused
- Use types and validation to catch errors early

## As you code
- Run tests frequently
- Use linters and formatters
- Refactor when you see a better way
- Delete dead code; don't comment it out

## Handling changes
If the plan needs adjustment:
- Update the plan document
- Explain why the change was needed
- Consider if other tasks are affected`,
    stage: 'work' as Stage,
  },
  {
    title: 'Implementation Complete',
    body_md: `# Implementation Complete

Finalize and verify the work.

## Before considering done
- All tests pass
- Code is formatted and linted
- Documentation is updated
- Edge cases are tested

## Self-review checklist
- Does this solve the original problem?
- Is the code clear to future readers?
- Are there obvious bugs or performance issues?
- What would I criticize in a code review?

## Known limitations
Document any trade-offs or future work:
- What wasn't implemented
- What could be improved
- What might need revisiting`,
    stage: 'implement' as Stage,
  },
  {
    title: 'Pull Request',
    body_md: `# Pull Request

Prepare for code review and integration.

## PR description
- Summary: what changed and why
- Context: link to related issue or discussion
- Testing: how to verify the changes
- Screenshots: if UI changes are included

## Review considerations
- Highlight areas needing careful review
- Note any trade-offs or alternatives considered
- Flag any breaking changes or migration steps

## Responsiveness
- Address feedback promptly
- Explain your reasoning if you disagree
- Update the PR as requested
- Keep the conversation constructive and focused

## After merge
- Delete the feature branch
- Document any follow-up work
- Celebrate the small win`,
    stage: 'review' as Stage,
  },
];

const bundle: BundleTemplate = {
  name: 'QRSPI Starter Harness',
  description: 'A complete 8-stage QRSPI workflow for AI coding agents.',
  target_format: 'agents' as AgentFormat,
  items,
};

export const qrspiTemplate: Template & { difficulty: Difficulty } = {
  kind: 'bundle',
  id: 'qrspi',
  category: 'Agent Configuration',
  description: 'Complete QRSPI workflow covering Question, Research, Design, Structure, Plan, Work, Implement, and Pull Request stages.',
  difficulty: 'advanced',
  bundle,
};
