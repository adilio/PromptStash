import type { PromptTemplate, Template, Difficulty } from './index';

const prompt: PromptTemplate = {
  title: 'Code Review',
  body_md: `You are a senior software engineer conducting a thorough code review. Analyze the following code with a focus on correctness, readability, maintainability, and performance.

\`\`\`{{language}}
{{code}}
\`\`\`

## Review criteria

**Correctness**
- Are there any bugs, edge cases, or logical errors?
- Are error cases handled properly?
- Are there any race conditions or concurrency issues?

**Readability**
- Is the code clear and self-documenting?
- Are variable and function names meaningful?
- Is the complexity appropriate for the task?

**Maintainability**
- Is there duplication that could be extracted?
- Are abstractions appropriate and not over-engineered?
- Will this be easy to modify in the future?

**Performance**
- Are there any obvious inefficiencies?
- Are there unnecessary allocations or expensive operations?
- Is the algorithm appropriate for the expected scale?

**Security**
- Are there any potential vulnerabilities?
- Is user input properly validated?
- Are sensitive data handled correctly?

Provide specific, actionable feedback. For each issue, explain *why* it matters and suggest a concrete fix. Note what's done well too.`,
};

export const codeReviewTemplate: Template & { difficulty: Difficulty } = {
  kind: 'prompt',
  id: 'code-review',
  category: 'Development',
  description: 'Senior-engineer style review prompt covering correctness, readability, maintainability, performance, and security.',
  difficulty: 'starter',
  prompt,
};
