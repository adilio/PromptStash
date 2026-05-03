export type ConceptReference = { label: string; url: string; note?: string };

export type Concept = {
  id: string;
  title: string;
  summary: string;
  body: string;
  why: string;
  howPromptStashUses: string;
  references: ConceptReference[];
  related?: string[];
};

export const CONCEPTS: Record<string, Concept> = {
  'agents-md': {
    id: 'agents-md',
    title: 'AGENTS.md',
    summary: 'A community-standard file for AI coding agent instructions, providing consistency across different tools and teams.',
    body: `AGENTS.md is an emerging community standard for storing AI coding agent instructions in a markdown file at the root of a repository. It provides a consistent way to define system prompts across different tools like Claude Code, GitHub Copilot, Cursor, and Windsurf.

The file typically contains project context, build/test commands, code style guidelines, and specific instructions for how the AI should approach tasks in that codebase. By standardizing on AGENTS.md, teams can maintain a single source of truth for agent instructions that works across multiple tools.

AGENTS.md files are typically plain markdown with section headers like "Project overview", "Build and test commands", "Code style", and "PR conventions". The format is intentionally flexible—tools parse the markdown and extract relevant sections.`,
    why: `As AI coding agents become central to development workflows, having a standard format for instructions helps teams maintain consistency. Developers can switch between tools without rewriting their prompts, and teams can share agent configurations across repositories.

The community-driven nature of AGENTS.md means it evolves with best practices. Tool authors are adopting it because it reduces onboarding friction—users can drop an existing AGENTS.md file into a new project and have their AI agent already understand the codebase context.`,
    howPromptStashUses: `PromptStash treats AGENTS.md as the default export format for bundles. You can compose prompts into a bundle, export it as AGENTS.md, and place it in your repository root. Each prompt in your bundle becomes a section in the file.

You can also export individual prompts to AGENTS.md format, and use the "Target agent" selector to specify that a prompt should be exported as AGENTS.md. This makes PromptStash a convenient editor for maintaining your AGENTS.md file over time.`,
    references: [
      { label: 'agents.md specification', url: 'https://agents.md', note: 'Official specification and documentation' },
      { label: 'OpenAI agents.md repo', url: 'https://github.com/openai/agents-md', note: 'Reference implementation and examples' },
      { label: 'GitHub Copilot docs', url: 'https://docs.github.com/en/copilot', note: 'GitHub\'s documentation on Copilot instruction files' },
    ],
    related: ['claude-md', 'bundles', 'stages'],
  },
  'claude-md': {
    id: 'claude-md',
    title: 'CLAUDE.md',
    summary: "Claude Code's custom instruction file format, similar to AGENTS.md but specific to Anthropic's Claude Code editor.",
    body: `CLAUDE.md is Anthropic's custom instruction file format for Claude Code, their AI-powered code editor. It serves the same purpose as AGENTS.md but is specifically parsed and used by Claude Code to provide project-specific context.

The format is nearly identical to AGENTS.md—both use markdown with section headers. Claude Code looks for CLAUDE.md at the root of your project and incorporates its contents into the context window when you're working in that directory.

Key sections that Claude Code recognizes include project overview, architecture descriptions, preferred coding patterns, and any project-specific conventions. The editor uses this information to provide more relevant code suggestions and responses.`,
    why: `Having a dedicated instruction file for Claude Code allows for customization specific to Anthropic's models. While AGENTS.md provides cross-tool compatibility, CLAUDE.md can include instructions that take advantage of Claude's specific capabilities and behaviors.

For teams standardized on Claude Code, CLAUDE.md ensures that every developer gets consistent AI assistance that understands their codebase conventions and architectural decisions.`,
    howPromptStashUses: `PromptStash can export prompts and bundles to CLAUDE.md format. When creating a prompt, you can set "Target agent" to "Claude" to indicate it should be exported as CLAUDE.md. Bundles can also target CLAUDE.md format, composing multiple prompts into a single file.

This makes PromptStash a convenient way to maintain your CLAUDE.md file over time—you can edit sections as individual prompts, compose them into a bundle, and export the complete file whenever you make changes.`,
    references: [
      { label: 'Claude Code documentation', url: 'https://docs.anthropic.com/en/docs/claude-code', note: 'Official Claude Code documentation' },
      { label: 'Customizing Claude Code', url: 'https://docs.anthropic.com/en/docs/claude-code/overview', note: 'How to configure Claude Code for your project' },
    ],
    related: ['agents-md', 'bundles', 'context-engineering'],
  },
  stages: {
    id: 'stages',
    title: 'Stages',
    summary: 'Tag prompts as part of a structured workflow (Research, Plan, Implement, etc.) to organize and compose them into bundles.',
    body: `Stage typing is a way to categorize prompts by their role in a larger workflow. Rather than treating all prompts as equivalent, stages recognize that different prompts serve different purposes in the process of getting work done with an AI agent.

PromptStash supports eight stages inspired by QRSPI and other structured methodologies:
- **Question**: Clarifying what needs to be done
- **Research**: Gathering context and information
- **Design**: Planning the solution approach
- **Structure**: Breaking down implementation steps
- **Plan**: Creating the detailed implementation plan
- **Work**: Executing the implementation
- **Implement**: Completing and verifying the work
- **Review/PR**: Pull request and code review

By tagging prompts with stages, you create a structured library of instructions that can be composed into complete workflows. This is especially powerful when combined with bundles.`,
    why: `Stage typing turns a collection of disconnected prompts into a coherent system. When you know which stage a prompt belongs to, you can see gaps in your workflow—do you have research prompts but no design prompts? Are you missing review stage instructions?

For teams, stages provide a shared language for discussing AI-assisted workflows. Everyone understands what "implement stage" means, making it easier to share and reuse prompts across projects.`,
    howPromptStashUses: `In PromptStash, you assign a stage to any prompt from the Advanced section of the editor. The stage then appears as a colored badge on the prompt card, and you can filter your dashboard by stage using the stage filter chips.

When composing bundles, stages help ensure you have complete coverage of your workflow. You can see at a glance if your bundle is missing a critical stage, and the bundle editor shows stage badges for each included prompt.`,
    references: [
      { label: 'QRSPI methodology', url: 'https://betterquestions.ai', note: 'Dex Horthy\'s blog on the QRSPI methodology' },
      { label: 'Advanced context engineering', url: 'https://github.com/humanlayer/context-engineering', note: 'HumanLayer\'s guide to context engineering with stages' },
    ],
    related: ['qrspi', 'bundles', 'context-engineering'],
  },
  bundles: {
    id: 'bundles',
    title: 'Bundles',
    summary: "Ordered collections of prompts that work together as complete instruction sets for AI agents.",
    body: `Bundles are PromptStash's way of composing multiple prompts into a cohesive instruction set. Instead of one giant prompt that tries to do everything, bundles let you break instructions into focused modules and then combine them for export.

A bundle contains:
- A name and description
- A target format (AGENTS.md, CLAUDE.md, etc.)
- An ordered list of prompt references
- Optional overrides like custom headings or inclusion toggles

When you export a bundle, PromptStash generates a single file with all the included prompts rendered as sections. For markdown formats like AGENTS.md, each prompt becomes a second-level heading with its content below.

Bundles also support the token budget gauge, which shows you the total token count and warns if you're approaching the "Dumb Zone" where model performance degrades.`,
    why: `Bundles solve two problems: composability and token budgeting. By breaking instructions into modules, you can reuse the same prompt across multiple bundles. A "testing conventions" prompt can appear in both your frontend and backend bundles without duplication.

The token budget gauge addresses a critical issue: AI models perform worse when their context window is too full. Bundles let you see exactly how many tokens your instructions consume and optimize by removing or condensing sections.`,
    howPromptStashUses: `Create bundles from the Bundles page (auto-disclosed in the sidebar once you have one). Add prompts to your bundle, reorder them, and toggle which ones are included. Use the preview pane to see the exported output in real-time.

You can download bundles directly from the bundle editor, and soon you'll be able to sync them to GitHub repositories automatically. Bundles also integrate with the template gallery—instantiating the QRSPI template creates a bundle with eight staged prompts.`,
    references: [
      { label: 'Dumb Zone', url: 'https://github.com/adilio/PromptStash/blob/main/FUTURE.md', note: 'See the Dumb Zone concept for more on token budgets' },
    ],
    related: ['dumb-zone', 'stages', 'agents-md'],
  },
  'dumb-zone': {
    id: 'dumb-zone',
    title: 'Dumb Zone',
    summary: "The point where an AI model's context is too full (typically >40% of the window), leading to degraded performance.",
    body: `The "Dumb Zone" is a term coined by the context engineering community to describe the point at which an AI model's performance degrades due to context window saturation. Research suggests this happens around 40% of the model's maximum context length.

When an AI model operates in the Dumb Zone, you might see:
- Reduced ability to follow complex instructions
- Increased hallucination and errors
- Forgetting of earlier context
- Inconsistent reasoning across the conversation

The phenomenon occurs because language models process context through a fixed-size attention mechanism. As more tokens are added, each token gets less "attention weight," diluting the model's ability to reason about the full context.

Different models have different context windows (Claude Sonnet: 200k tokens, GPT-5: 400k tokens), but the 40% threshold is a useful rule of thumb across models.`,
    why: `Understanding the Dumb Zone is critical for effective prompt engineering. If you're feeding an agent 150k tokens of instructions when the model's sweet spot is under 80k, you're actively hurting performance.

Smart practitioners keep their instructions lean and focused. Rather than dumping entire codebases into context, they use retrieval systems to find the most relevant snippets and keep the total token count in the model's optimal range.`,
    howPromptStashUses: `PromptStash surfaces token estimates at multiple levels. Individual prompts show a token count in the editor, with color coding when you exceed recommended limits. Bundles have a full context budget gauge that shows your total tokens relative to the model's context window, with tick marks at 40% and 60%.

The gauge changes color based on which zone you're in: green for safe, amber for warning (>40%), and red for danger (>60%). This makes it easy to see at a glance whether your instructions are optimized for model performance.`,
    references: [
      { label: 'HumanLayer: Skill Issue', url: 'https://humanlayer.io/skill-issue', note: 'Blog post on harness engineering and the Dumb Zone' },
      { label: 'Dex Horthy on context saturation', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7168220456152014848/', note: 'LinkedIn post on context window performance' },
    ],
    related: ['bundles', 'context-engineering'],
  },
  qrspi: {
    id: 'qrspi',
    title: 'QRSPI',
    summary: 'A methodology for breaking down complex tasks into stages: Question, Research, Structure, Plan, and Implement.',
    body: `QRSPI (Question, Research, Structure, Plan, Implement) is a methodology for structured AI-human collaboration. It recognizes that the best outcomes come from breaking complex work into discrete stages, each with its own prompts and context.

The eight stages in PromptStash's QRSPI implementation are:
1. **Question**: Clarify what's being asked. Restate the problem, identify constraints, flag ambiguities.
2. **Research**: Gather context. Search codebases, read documentation, find similar patterns.
3. **Design**: Plan the solution. Define architecture, data structures, APIs, and error handling.
4. **Structure**: Break down the work. List files to change, identify dependencies, estimate complexity.
5. **Plan**: Create the implementation plan. Order tasks, define commit strategy, outline test approach.
6. **Work**: Execute. Follow coding principles, run tests frequently, refactor as you go.
7. **Implement**: Finalize. Verify tests pass, update docs, self-review against requirements.
8. **Review/PR**: Prepare for integration. Write PR description, respond to feedback, address issues.

QRSPI emphasizes that each stage should have its own prompts, optimized for that specific phase of work. A "research" prompt should be structured differently than a "work" prompt.`,
    why: `Structured methodologies like QRSPI dramatically improve AI-assisted development outcomes. Without structure, AI agents tend to jump to implementation without understanding requirements, or they get bogged down in research without moving to execution.

By explicitly staging the work, you create clear handoff points between human and AI. You can review the research output before moving to design, and validate the plan before implementation begins. This catch errors early and prevents wasted effort.`,
    howPromptStashUses: `PromptStash includes a QRSPI Starter Harness template in the template gallery. Instantiating it creates eight prompts, one for each stage, already populated with opinionated instructions for that phase.

You can customize each stage prompt to match your workflow, then compose them into a bundle for export as AGENTS.md or another format. The stage badges on prompts help you see at a glance which phase each prompt serves.`,
    references: [
      { label: 'BetterQuestions.ai', url: 'https://betterquestions.ai', note: 'Dex Horthy\'s blog on QRSPI and AI collaboration' },
      { label: 'qrspi-agent npm package', url: 'https://www.npmjs.com/package/qrspi-agent', note: 'Reference implementation of QRSPI as an agent harness' },
      { label: 'QRSPI GitHub repo', url: 'https://github.com/dexhorthy/qrspi-agent', note: 'Source code for the qrspi-agent package' },
    ],
    related: ['stages', 'bundles', 'context-engineering'],
  },
  'context-engineering': {
    id: 'context-engineering',
    title: 'Context Engineering',
    summary: 'The practice of designing and optimizing prompts for AI agents to improve performance and outcomes.',
    body: `Context engineering is the discipline of designing inputs to AI systems to produce optimal outputs. It encompasses prompt writing, but also includes structuring information, managing token budgets, and designing workflows that play to AI strengths while avoiding weaknesses.

Key principles of context engineering include:
- **Modularity**: Break instructions into focused modules rather than monolithic prompts
- **Staging**: Use structured workflows like QRSPI to guide AI through complex tasks
- **Budgeting**: Monitor token usage and stay under the Dumb Zone threshold
- **Retrieval**: Use RAG and other techniques to surface only the most relevant context
- **Validation**: Include explicit checks and tests in AI workflows

Context engineering recognizes that AI performance is highly dependent on how problems are framed and what context is provided. The same model can produce dramatically different results based on small changes to context structure.`,
    why: `As AI models become more capable, the limiting factor shifts from model intelligence to context engineering skill. The difference between a useful AI assistant and one that produces generic or incorrect outputs often comes down to how the problem is presented and what context is included.

Practitioners who invest in context engineering see dramatically better outcomes. They can tackle more complex problems, get more consistent results, and build workflows that reliably produce high-quality work.`,
    howPromptStashUses: `PromptStash is designed around context engineering principles. Stages, bundles, and token budgeting are all context engineering concepts. The app provides tooling to implement these principles without requiring manual tracking of token counts or prompt organization.

The template gallery includes context-engineered prompts like the QRSPI harness, and the concept docs explain the "why" behind each feature so you can apply these principles in your own workflows.`,
    references: [
      { label: 'HumanLayer context engineering', url: 'https://github.com/humanlayer/context-engineering', note: 'Comprehensive guide to context engineering techniques' },
      { label: 'Boundary ML podcast', url: 'https://boundaryml.com/blog', note: 'Podcast on AI engineering with context experts' },
    ],
    related: ['dumb-zone', 'stages', 'qrspi'],
  },
};

export const CONCEPT_SUMMARIES: Record<string, { title: string; summary: string }> = Object.fromEntries(
  Object.entries(CONCEPTS).map(([id, concept]) => [id, { title: concept.title, summary: concept.summary }])
);
