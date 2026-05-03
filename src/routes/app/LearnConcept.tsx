import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { CONCEPTS } from '@/content/concepts';
import { MarkdownViewer } from '@/components/MarkdownViewer';

export function LearnConcept() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const concept = conceptId ? CONCEPTS[conceptId] : undefined;

  if (!concept) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: 28, color: 'var(--ps-fg)', margin: '0 0 16px' }}>
          Concept not found
        </h1>
        <p style={{ color: 'var(--ps-fg-muted)', marginBottom: 24 }}>
          The concept you're looking for doesn't exist.
        </p>
        <Link
          to="/app/learn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--ps-accent)',
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to Learn
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px 64px' }}>
      <Link
        to="/app/learn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--ps-fg-muted)',
          textDecoration: 'none',
          fontSize: 13,
          marginBottom: 24,
          fontWeight: 500,
        }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Back to Learn
      </Link>

      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: '-0.02em',
            color: 'var(--ps-fg)',
            margin: '0 0 12px',
          }}
        >
          {concept.title}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ps-fg-muted)', margin: 0, lineHeight: 1.6 }}>
          {concept.summary}
        </p>
      </header>

      <section style={{ marginBottom: 32 }}>
        <MarkdownViewer content={concept.body} />
      </section>

      <section
        style={{
          padding: 20,
          borderRadius: 10,
          background: 'var(--ps-bg-elev)',
          border: '1px solid var(--ps-hairline)',
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--ps-fg)',
            margin: '0 0 10px',
          }}
        >
          Why this matters
        </h2>
        <MarkdownViewer content={concept.why} />
      </section>

      <section
        style={{
          padding: 20,
          borderRadius: 10,
          background: 'var(--ps-bg-elev)',
          border: '1px solid var(--ps-hairline)',
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--ps-fg)',
            margin: '0 0 10px',
          }}
        >
          How PromptStash uses it
        </h2>
        <MarkdownViewer content={concept.howPromptStashUses} />
      </section>

      {concept.references && concept.references.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--ps-fg)',
              margin: '0 0 16px',
            }}
          >
            References
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {concept.references.map((ref, idx) => (
              <a
                key={idx}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  background: 'var(--ps-bg-elev)',
                  border: '1px solid var(--ps-hairline)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ps-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ps-hairline)')}
              >
                <ExternalLink
                  style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2, color: 'var(--ps-fg-faint)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ps-accent)', marginBottom: 4 }}>
                    {ref.label}
                  </div>
                  {ref.note && (
                    <div style={{ fontSize: 13, color: 'var(--ps-fg-muted)', lineHeight: 1.5 }}>
                      {ref.note}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {concept.related && concept.related.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--ps-fg)',
              margin: '0 0 12px',
            }}
          >
            Related concepts
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {concept.related.map((relatedId) => {
              const relatedConcept = CONCEPTS[relatedId];
              if (!relatedConcept) return null;
              return (
                <Link
                  key={relatedId}
                  to={`/app/learn/${relatedId}`}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: 'var(--ps-bg-elev)',
                    border: '1px solid var(--ps-hairline)',
                    color: 'var(--ps-fg)',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ps-accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ps-hairline)')}
                >
                  {relatedConcept.title}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
