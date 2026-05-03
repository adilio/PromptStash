import type { PromptTemplate, Template, Difficulty } from './index';

const prompt: PromptTemplate = {
  title: 'Markdown Style Guide',
  body_md: `Follow these conventions when writing Markdown in this project.

## Headings

- Start with \`h1\` (# Title) or \`h2\` (## Heading) for page structure
- Skip heading levels (don't go from ## to ####)
- End headings with proper punctuation only if they're complete sentences

## Lists

**Bulleted lists:** Use for items without sequence or priority.
- Item one
- Item two
  - Nested item
  - Another nested item

**Numbered lists:** Use for sequential steps or priorities.
1. First step
2. Second step
3. Third step

## Code

**Inline code:** Use \`\`backticks\`\` for code references in text.

**Code blocks:** Use fenced blocks with language identifier:
\`\`\`typescript
function example() {
  return 'hello';
}
\`\`\`

**No language identifier:** When the code is generic or illustrative.

## Emphasis

- Use **bold** for strong emphasis or key terms
- Use *italics* for light emphasis or terms being defined
- Avoid underlines (not portable)
- Use ALL CAPS sparingly

## Links

[Link text](https://example.com)

For reference-style links with long URLs:
[Link text][reference-id]
...
[reference-id]: https://very-long-url.com/path/to/resource

## Horizontal rules

Use for thematic breaks. Limit to one per section.
\`\`\`
---
\`\`\`
`,
};

export const markdownStyleTemplate: Template & { difficulty: Difficulty } = {
  kind: 'prompt',
  id: 'markdown-style',
  category: 'Documentation',
  description: 'Conventions for Markdown formatting including headings, lists, code blocks, emphasis, and links.',
  difficulty: 'starter',
  prompt,
};
