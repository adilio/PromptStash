import type { PromptTemplate, Template, Difficulty } from './index';

const prompt: PromptTemplate = {
  title: 'Testing Guidelines',
  body_md: `Follow these guidelines when writing tests for this codebase.

## Test placement

- Place unit tests next to the file they test (e.g., \`Component.test.tsx\`)
- Place integration tests in a \`tests/integration/\` directory
- Place e2e tests in a \`tests/e2e/\` directory

## Test naming

Name tests clearly using the \`should\` or \`it should\` convention:

\`\`\`
describe('UserService', () => {
  it('should create a new user with valid input', () => {
    // ...
  });

  it('should return null when user does not exist', () => {
    // ...
  });
});
\`\`\`

## What to test

**DO test:**
- Business logic and edge cases
- Error handling and failure modes
- Integration points between modules
- Critical user workflows

**DON'T test:**
- Implementation details that don't affect behavior
- Third-party libraries (trust they work)
- Framework internals

## Mocks vs integration tests

- Use mocks for external services (APIs, databases)
- Prefer integration tests for module interactions
- Don't mock the code you're testing
- Keep mocks simple and focused

## Test coverage

- Aim for >80% coverage on business logic
- 100% coverage is not always the goal
- Focus on covering meaningful scenarios, not lines
- Untested critical paths are technical debt`,
};

export const testingTemplate: Template & { difficulty: Difficulty } = {
  kind: 'prompt',
  id: 'testing',
  category: 'Development',
  description: 'Best practices for test placement, naming, mocks vs integration tests, and coverage goals.',
  difficulty: 'starter',
  prompt,
};
