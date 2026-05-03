import type { Prompt } from '@/lib/types';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export function generateEspansoYaml(prompts: Prompt[]): string {
  const date = new Date().toISOString();

  let yaml = `# PromptStash — Espanso export
# Generated: ${date}
# Install: place this file in your Espanso config/match directory
# See: https://espanso.org/docs/packages/creating-a-package/

matches:
`;

  for (const prompt of prompts) {
    const trigger = prompt.espanso_trigger && prompt.espanso_trigger.trim()
      ? prompt.espanso_trigger.trim()
      : `:${slugify(prompt.title || 'untitled')}`;

    const body = (prompt.body_md || '')
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/\n/g, '\n    ') // Indent continuation lines

    yaml += `  - trigger: "${trigger}"\n`;
    yaml += `    replace: |\n`;
    yaml += `      ${body.trim()}\n`;
    yaml += `\n`;
  }

  return yaml.trimEnd();
}
