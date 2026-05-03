import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CONCEPT_SUMMARIES } from '@/content/concepts';
import { Link } from 'react-router-dom';

interface ConceptInfoProps {
  conceptId: string;
}

export function ConceptInfo({ conceptId }: ConceptInfoProps) {
  const concept = CONCEPT_SUMMARIES[conceptId];

  if (!concept) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          style={{
            appearance: 'none',
            border: 'none',
            background: 'transparent',
            color: 'var(--ps-fg-faint)',
            cursor: 'help',
            padding: 2,
            borderRadius: 4,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={`Learn about ${concept.title}`}
        >
          <Info style={{ width: 14, height: 14 }} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        style={{
          width: 280,
          padding: 14,
          fontSize: 13,
          lineHeight: 1.5,
          background: 'var(--ps-bg-elev)',
          border: '1px solid var(--ps-hairline)',
          borderRadius: 8,
        }}
        side="top"
        align="start"
      >
        <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--ps-fg)' }}>
          {concept.title}
        </div>
        <div style={{ color: 'var(--ps-fg-muted)', marginBottom: 10 }}>
          {concept.summary}
        </div>
        <Link
          to={`/app/learn/${conceptId}`}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ps-accent)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          Learn more →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
