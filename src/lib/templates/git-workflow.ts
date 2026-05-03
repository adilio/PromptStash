import type { PromptTemplate, Template, Difficulty } from './index';

const prompt: PromptTemplate = {
  title: 'Git Workflow',
  body_md: `Follow these conventions when working with Git in this repository.

## Branch naming

- Feature branches: \`feature/description\` or \`feat/description\`
- Bugfix branches: \`fix/description\` or \`bugfix/description\`
- Hotfix branches: \`hotfix/description\`
- Release branches: \`release/version\`

Examples:
- \`feature/user-authentication\`
- \`fix/login-memory-leak\`
- \`hotfix/security-patch-2024-03\`

## Commit messages

Use the conventional commits format:

\`\`
type(scope): description

[optional body]
\`\`

**Types:**
- \`feat\`: New feature
- \`fix\`: Bug fix
- \`docs\`: Documentation changes
- \`style\`: Code style changes (formatting, etc.)
- \`refactor\`: Code refactoring
- \`test\`: Adding or updating tests
- \`chore\`: Maintenance tasks

**Examples:**
- \`feat(auth): add OAuth2 login support\`
- \`fix(api): resolve race condition in user creation\`
- \`docs(readme): update installation instructions\`

## Pull requests

- PR title should match the commit message format
- Include a clear description of what changes and why
- Reference related issues (e.g., "Closes #123")
- Keep PRs focused and small enough to review thoroughly
- Ensure all CI checks pass before requesting review

## Code review

- Be respectful and constructive
- Explain the reasoning behind suggestions
- Approve when you're comfortable with the changes merging`,
};

export const gitWorkflowTemplate: Template & { difficulty: Difficulty } = {
  kind: 'prompt',
  id: 'git-workflow',
  category: 'Development',
  description: 'Git conventions covering branch naming, commit messages, and pull request practices.',
  difficulty: 'starter',
  prompt,
};
