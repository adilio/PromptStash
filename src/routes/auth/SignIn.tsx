import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, color: 'var(--ps-accent)' }}
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 9h16M4 15h16" />
      <path d="M10 6h4M10 12h4M10 18h4" />
    </svg>
  );
}

const inputStyle: React.CSSProperties = {
  appearance: 'none',
  width: '100%',
  height: 38,
  padding: '0 12px',
  background: 'var(--ps-bg-elev)',
  border: '1px solid var(--ps-hairline)',
  borderRadius: 8,
  color: 'var(--ps-fg)',
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 120ms, box-shadow 120ms',
};

const oauthBtnStyle: React.CSSProperties = {
  flex: 1,
  height: 38,
  border: '1px solid var(--ps-hairline)',
  background: 'var(--ps-bg-elev)',
  borderRadius: 8,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ps-fg)',
};

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const requestedRedirectPath = searchParams.get('redirect');
  const redirectPath = requestedRedirectPath?.startsWith('/') ? requestedRedirectPath : '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: 'Check your email to confirm your account' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirectPath);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Authentication failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        minHeight: '100vh',
        background: 'var(--ps-bg)',
      }}
    >
      {/* Editorial aside */}
      <aside
        style={{
          background: 'var(--ps-bg-sunken)',
          borderRight: '1px solid var(--ps-hairline-soft)',
          padding: '56px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={24} />
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
              fontSize: 20,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: 'var(--ps-fg)',
            }}
          >
            PromptStash
          </span>
        </div>

        <div>
          <p
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 500,
              fontSize: 32,
              lineHeight: 1.25,
              letterSpacing: '-0.025em',
              color: 'var(--ps-fg)',
              maxWidth: '18ch',
              margin: 0,
            }}
          >
            A quiet home for the{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--ps-accent)', fontWeight: 400 }}>
              prompts
            </em>{' '}
            you keep coming back to.
          </p>
          <div
            style={{
              marginTop: 24,
              fontSize: 12.5,
              color: 'var(--ps-fg-faint)',
              display: 'flex',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <span>Versioned</span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--ps-fg-dim)',
                display: 'inline-block',
              }}
            />
            <span>Searchable</span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--ps-fg-dim)',
                display: 'inline-block',
              }}
            />
            <span>Yours alone</span>
          </div>

          <div style={{ marginTop: 36 }}>
            <div
              style={{
                border: '1px solid var(--ps-hairline)',
                background: 'var(--ps-bg-elev)',
                borderRadius: 10,
                padding: '14px 16px',
                boxShadow: 'var(--ps-shadow-md)',
                maxWidth: 380,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 12,
                color: 'var(--ps-fg-muted)',
                lineHeight: 1.65,
              }}
            >
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 10.5,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--ps-fg-dim)',
                  marginBottom: 6,
                }}
              >
                code-review.md · v3
              </div>
              <div>
                Act as a senior{' '}
                <span
                  style={{
                    color: 'var(--ps-accent)',
                    background: 'var(--ps-accent-soft)',
                    padding: '1px 4px',
                    borderRadius: 3,
                  }}
                >
                  {'{{language}}'}
                </span>
              </div>
              <div>engineer. Review the diff for:</div>
              <div>— correctness &amp; edge cases</div>
              <div>— performance hotspots</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ps-fg-faint)' }}>© 2026 PromptStash</div>
      </aside>

      {/* Sign-in form */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '56px 48px',
          background: 'var(--ps-bg)',
        }}
      >
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '-0.018em',
              margin: '0 0 6px',
              color: 'var(--ps-fg)',
            }}
          >
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ margin: '0 0 32px', color: 'var(--ps-fg-muted)', fontSize: 14 }}>
            {mode === 'signin' ? 'Sign in to your stash.' : 'Start your free stash today.'}
          </p>

          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="si-email"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--ps-fg-muted)',
                marginBottom: 6,
                letterSpacing: '-0.005em',
              }}
            >
              Email
            </label>
            <input
              id="si-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <label
                htmlFor="si-pw"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ps-fg-muted)',
                  letterSpacing: '-0.005em',
                }}
              >
                Password
              </label>
              {mode === 'signin' && (
                <a
                  href="#"
                  style={{ fontSize: 12, color: 'var(--ps-accent)', textDecoration: 'none' }}
                >
                  Forgot?
                </a>
              )}
            </div>
            <input
              id="si-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 42,
              border: 0,
              borderRadius: 8,
              background: 'var(--ps-accent)',
              color: 'var(--ps-accent-fg)',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '-0.005em',
              transition: 'background 120ms',
            }}
          >
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'var(--ps-fg-faint)',
              fontSize: 12.5,
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--ps-hairline)' }} />
            <span>or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'var(--ps-hairline)' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="button" style={oauthBtnStyle}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.24 1.3-1.66 3.8-5.5 3.8a6 6 0 1 1 0-12 5.4 5.4 0 0 1 3.8 1.5l2.6-2.5A9.5 9.5 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.07-1.2-.16-1.7z"
                />
              </svg>
              Google
            </button>
            <button type="button" style={oauthBtnStyle}>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2a10 10 0 0 0-3.16 19.5c.5.09.66-.22.66-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.1-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.16.58.67.48A10 10 0 0 0 12 2" />
              </svg>
              GitHub
            </button>
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 13,
              color: 'var(--ps-fg-muted)',
              textAlign: 'center',
            }}
          >
            {mode === 'signin' ? (
              <>
                New here?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  style={{
                    background: 'none',
                    border: 0,
                    color: 'var(--ps-accent)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  style={{
                    background: 'none',
                    border: 0,
                    color: 'var(--ps-accent)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
