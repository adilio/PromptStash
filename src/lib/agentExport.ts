export type AgentFormat = 'agents' | 'claude' | 'copilot' | 'cursor' | 'windsurf' | 'generic';

export const AGENT_FORMATS: { id: AgentFormat; label: string; filename: string; description: string }[] = [
  { id: 'agents', label: 'AGENTS.md', filename: 'AGENTS.md', description: 'Community-standard agent instruction file' },
  { id: 'claude', label: 'CLAUDE.md', filename: 'CLAUDE.md', description: 'Claude Code custom instructions' },
  { id: 'copilot', label: 'GitHub Copilot', filename: '.github/copilot-instructions.md', description: 'GitHub Copilot workspace instructions' },
  { id: 'cursor', label: 'Cursor', filename: '.cursorrules', description: 'Cursor AI editor rules' },
  { id: 'windsurf', label: 'Windsurf', filename: '.windsurfrules', description: 'Windsurf AI editor rules' },
  { id: 'generic', label: 'Generic markdown', filename: 'prompt.md', description: 'Plain markdown file' },
];

export function filenameFor(format: AgentFormat): string {
  return AGENT_FORMATS.find(f => f.id === format)?.filename || 'prompt.md';
}

export function wrapPromptForFormat(prompt: { title: string; body_md: string }, format: AgentFormat): string {
  const isMarkdown = format === 'agents' || format === 'claude' || format === 'copilot' || format === 'generic';

  if (isMarkdown) {
    return `<!-- Source: PromptStash -->\n# ${prompt.title}\n\n${prompt.body_md}`;
  }

  return prompt.body_md;
}

export function wrapPromptsForFormat(prompts: { title: string; body_md: string }[], format: AgentFormat): string {
  const isMarkdown = format === 'agents' || format === 'claude' || format === 'copilot' || format === 'generic';

  if (isMarkdown) {
    return `<!-- Source: PromptStash -->\n${prompts.map(p => `## ${p.title}\n\n${p.body_md}`).join('\n\n')}`;
  }

  return prompts.map(p => `${p.title}\n\n${p.body_md}`).join('\n\n---\n\n');
}

export function downloadFile(filename: string, content: string, mimeType?: string): void {
  const blob = new Blob([content], { type: mimeType || 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
