import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen } from 'lucide-react';
import { CONCEPTS } from '@/content/concepts';

export function Learn() {
  const [search, setSearch] = useState('');

  const filteredConcepts = Object.values(CONCEPTS).filter(
    (concept) =>
      concept.title.toLowerCase().includes(search.toLowerCase()) ||
      concept.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>
      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: '-0.02em',
            color: 'var(--ps-fg)',
            margin: '0 0 8px',
          }}
        >
          Learn
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ps-fg-muted)', margin: 0 }}>
          Background on the concepts behind PromptStash's instruction-module features.
        </p>
      </header>

      <div style={{ position: 'relative', marginBottom: 32 }}>
        <Search
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--ps-fg-faint)',
            width: 16,
            height: 16,
          }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search concepts..."
          style={{
            appearance: 'none',
            width: '100%',
            height: 40,
            paddingLeft: 40,
            paddingRight: 16,
            background: 'var(--ps-bg-elev)',
            border: '1px solid var(--ps-hairline)',
            borderRadius: 8,
            color: 'var(--ps-fg)',
            fontFamily: 'inherit',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {filteredConcepts.map((concept) => (
          <Link
            key={concept.id}
            to={`/app/learn/${concept.id}`}
            style={{
              display: 'block',
              padding: 16,
              borderRadius: 10,
              border: '1px solid var(--ps-hairline)',
              background: 'var(--ps-bg-elev)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ps-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ps-hairline)')}
          >
            <h3
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 500,
                fontSize: 16,
                color: 'var(--ps-fg)',
                margin: '0 0 6px',
                letterSpacing: '-0.01em',
              }}
            >
              {concept.title}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ps-fg-muted)', margin: 0, lineHeight: 1.6 }}>
              {concept.summary}
            </p>
          </Link>
        ))}
      </div>

      {filteredConcepts.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 0',
            color: 'var(--ps-fg-muted)',
          }}
        >
          <BookOpen style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.5 }} />
          <p>No concepts match your search.</p>
        </div>
      )}
    </div>
  );
}
