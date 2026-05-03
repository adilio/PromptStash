import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  return (
    <div className="space-y-2 h-full flex flex-col">
      <Label>Content (Markdown)</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Write your prompt in Markdown...'}
        className="flex-1 resize-none font-mono text-sm leading-7"
      />
    </div>
  );
}
