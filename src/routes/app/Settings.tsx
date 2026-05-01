import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Copy, Plus, User, Sun, Key, Folder, Code, Bell, Database } from 'lucide-react';
import { createInvite, type InviteRole } from '@/api/invites';
import { createTeam, listTeams } from '@/api/teams';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/hooks/useTheme';
import type { Team } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
  setCurrentTeamId?: (teamId: string) => void;
}

type Section = 'account' | 'appearance' | 'models' | 'workspace' | 'shortcuts' | 'notifications' | 'data';

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account', icon: <User style={{ width: 14, height: 14 }} /> },
  { id: 'appearance', label: 'Appearance', icon: <Sun style={{ width: 14, height: 14 }} /> },
  { id: 'models', label: 'Models & keys', icon: <Key style={{ width: 14, height: 14 }} /> },
  { id: 'workspace', label: 'Workspace', icon: <Folder style={{ width: 14, height: 14 }} /> },
  { id: 'shortcuts', label: 'Shortcuts', icon: <Code style={{ width: 14, height: 14 }} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell style={{ width: 14, height: 14 }} /> },
  { id: 'data', label: 'Data & export', icon: <Database style={{ width: 14, height: 14 }} /> },
];

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid var(--ps-hairline)',
        background: 'var(--ps-bg-elev)',
        borderRadius: 10,
        padding: '20px 22px',
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderTop: '1px solid var(--ps-hairline-soft)',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ps-fg)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12.5, color: 'var(--ps-fg-faint)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  appearance: 'none',
  width: 240,
  height: 34,
  padding: '0 12px',
  background: 'var(--ps-bg)',
  border: '1px solid var(--ps-hairline)',
  borderRadius: 8,
  color: 'var(--ps-fg)',
  fontFamily: 'inherit',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnSecondaryStyle: React.CSSProperties = {
  height: 28,
  padding: '0 10px',
  borderRadius: 7,
  background: 'var(--ps-bg-elev)',
  border: '1px solid var(--ps-hairline)',
  color: 'var(--ps-fg)',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};

const btnPrimaryStyle: React.CSSProperties = {
  height: 28,
  padding: '0 10px',
  borderRadius: 7,
  background: 'var(--ps-accent)',
  border: 0,
  color: 'var(--ps-accent-fg)',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};

function SegControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 2,
        background: 'var(--ps-bg-sunken)',
        border: '1px solid var(--ps-hairline)',
        borderRadius: 999,
      }}
    >
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            appearance: 'none',
            border: 0,
            background: value === o ? 'var(--ps-bg-elev)' : 'transparent',
            boxShadow: value === o ? 'var(--ps-shadow-sm)' : 'none',
            padding: '4px 12px',
            borderRadius: 999,
            cursor: 'pointer',
            color: value === o ? 'var(--ps-fg)' : 'var(--ps-fg-muted)',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'inherit',
          }}
        >
          {o.charAt(0).toUpperCase() + o.slice(1)}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const { currentTeamId, setCurrentTeamId } = useOutletContext<ContextType>();
  const [section, setSection] = useState<Section>('workspace');
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('editor');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadTeams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTeams = async () => {
    try {
      const data = await listTeams();
      setTeams(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setLoading(true);
    try {
      const team = await createTeam(newTeamName);
      setNewTeamName('');
      setCurrentTeamId?.(team.id);
      await loadTeams();
      toast({ title: 'Team created' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeamId || !inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const invite = await createInvite({ teamId: currentTeamId, email: inviteEmail, role: inviteRole });
      const link = `${window.location.origin}/invite/${invite.token}`;
      setInviteLink(link);
      setInviteEmail('');
      toast({ title: 'Invite created', description: 'Share the link with your teammate.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({ title: 'Copied', description: 'Invite link copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Unable to copy invite link', variant: 'destructive' });
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
      }}
    >
      {/* Settings nav */}
      <nav
        style={{
          background: 'var(--ps-bg-sunken)',
          borderRight: '1px solid var(--ps-hairline-soft)',
          padding: '28px 14px',
          overflow: 'auto',
        }}
      >
        <h2
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ps-fg-faint)',
            margin: '0 8px 12px',
          }}
        >
          Settings
        </h2>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 30,
              padding: '0 8px',
              borderRadius: 6,
              color: section === s.id ? 'var(--ps-fg)' : 'var(--ps-fg-muted)',
              fontSize: 13,
              cursor: 'pointer',
              background: section === s.id ? 'var(--ps-bg-elev)' : 'transparent',
              fontWeight: section === s.id ? 500 : 400,
              boxShadow: section === s.id ? 'var(--ps-shadow-sm)' : 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              fontFamily: 'inherit',
              marginBottom: 2,
              transition: 'background 100ms, color 100ms',
            }}
          >
            <span style={{ color: section === s.id ? 'var(--ps-accent)' : 'var(--ps-fg-faint)' }}>
              {s.icon}
            </span>
            {s.label}
          </button>
        ))}
      </nav>

      {/* Settings content */}
      <div style={{ overflow: 'auto', padding: '56px 64px', maxWidth: 760 }}>
        {section === 'account' && (
          <>
            <h2 style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--ps-fg)' }}>Account</h2>
            <p style={{ color: 'var(--ps-fg-muted)', margin: '0 0 32px', maxWidth: '56ch', fontSize: 14 }}>
              How you sign in and how you appear across PromptStash.
            </p>
            <SettingsCard>
              <div style={{ borderTop: 'none' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ps-fg)', marginBottom: 4 }}>Profile</div>
                <div style={{ fontSize: 13, color: 'var(--ps-fg-muted)', marginBottom: 14 }}>Your name and email address.</div>
                <SettingsRow label="Display name" hint="Shown next to shared prompts.">
                  <input className="" style={inputStyle} defaultValue="Your name" />
                </SettingsRow>
                <SettingsRow label="Email" hint="Your primary login address.">
                  <input style={inputStyle} type="email" defaultValue="" />
                </SettingsRow>
              </div>
            </SettingsCard>
          </>
        )}

        {section === 'appearance' && (
          <>
            <h2 style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--ps-fg)' }}>Appearance</h2>
            <p style={{ color: 'var(--ps-fg-muted)', margin: '0 0 32px', maxWidth: '56ch', fontSize: 14 }}>
              Tune the look to your taste.
            </p>
            <SettingsCard>
              <SettingsRow
                label="Theme"
                hint="Sync with your system, or pick one."
              >
                <SegControl
                  options={['light', 'dark', 'system']}
                  value={theme}
                  onChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
                />
              </SettingsRow>
            </SettingsCard>
          </>
        )}

        {section === 'models' && (
          <>
            <h2 style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--ps-fg)' }}>Models &amp; keys</h2>
            <p style={{ color: 'var(--ps-fg-muted)', margin: '0 0 32px', maxWidth: '56ch', fontSize: 14 }}>
              Bring your own keys — we never train on your prompts.
            </p>
            <SettingsCard>
              {[
                { name: 'Anthropic', model: 'Claude Sonnet', status: 'Not connected' },
                { name: 'OpenAI', model: 'GPT-4.1', status: 'Not connected' },
                { name: 'Google', model: 'Gemini 2.5 Pro', status: 'Not connected' },
              ].map((p, i) => (
                <SettingsRow key={i} label={p.name} hint={p.model}>
                  <button style={p.status === 'Connected' ? btnSecondaryStyle : btnPrimaryStyle}>
                    {p.status === 'Connected' ? 'Manage' : 'Connect'}
                  </button>
                </SettingsRow>
              ))}
            </SettingsCard>
          </>
        )}

        {section === 'workspace' && (
          <>
            <h2 style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--ps-fg)' }}>Workspace</h2>
            <p style={{ color: 'var(--ps-fg-muted)', margin: '0 0 32px', maxWidth: '56ch', fontSize: 14 }}>
              Manage your teams and invite collaborators.
            </p>

            <SettingsCard>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ps-fg)', marginBottom: 4 }}>Teams</div>
              <div style={{ fontSize: 13, color: 'var(--ps-fg-muted)', marginBottom: 14 }}>Create and manage your workspaces.</div>
              <form
                onSubmit={handleCreateTeam}
                style={{ display: 'flex', gap: 8, marginBottom: 16 }}
              >
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="New workspace name…"
                  maxLength={60}
                  style={{ ...inputStyle, flex: 1, width: 'auto' }}
                />
                <button type="submit" disabled={loading} style={btnPrimaryStyle}>
                  <Plus style={{ width: 14, height: 14 }} />
                  Create
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teams.map((team) => (
                  <div
                    key={team.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      border: '1px solid var(--ps-hairline)',
                      borderRadius: 8,
                      background: team.id === currentTeamId ? 'var(--ps-accent-soft)' : 'transparent',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ps-fg)' }}>
                        {team.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ps-fg-faint)' }}>
                        Created {new Date(team.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {team.id === currentTeamId && (
                      <span
                        style={{
                          fontSize: 11,
                          background: 'var(--ps-accent-soft)',
                          color: 'var(--ps-accent)',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontWeight: 500,
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ps-fg)', marginBottom: 4 }}>Team Invites</div>
              <div style={{ fontSize: 13, color: 'var(--ps-fg-muted)', marginBottom: 14 }}>
                Create invite links for your team.
              </div>
              <form onSubmit={handleCreateInvite} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ps-fg-muted)', marginBottom: 6 }}>Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      disabled={!currentTeamId}
                      required
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ps-fg-muted)', marginBottom: 6 }}>Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                      disabled={!currentTeamId}
                      style={{ ...inputStyle, width: '100%' }}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" disabled={!currentTeamId || inviteLoading} style={btnPrimaryStyle}>
                      Send invite
                    </button>
                  </div>
                </div>
              </form>

              {inviteLink && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <input
                    value={inviteLink}
                    readOnly
                    style={{ ...inputStyle, flex: 1, width: 'auto', background: 'var(--ps-bg-sunken)', fontSize: 12 }}
                  />
                  <button type="button" onClick={handleCopyInviteLink} style={btnSecondaryStyle}>
                    <Copy style={{ width: 14, height: 14 }} />
                    Copy
                  </button>
                </div>
              )}
            </SettingsCard>
          </>
        )}

        {section === 'shortcuts' && (
          <>
            <h2 style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--ps-fg)' }}>Shortcuts</h2>
            <p style={{ color: 'var(--ps-fg-muted)', margin: '0 0 32px', maxWidth: '56ch', fontSize: 14 }}>
              The fewer clicks, the better.
            </p>
            <SettingsCard>
              {[
                ['New prompt', 'N'],
                ['Save', '⌘ S'],
                ['Search', '⌘ K'],
                ['Toggle theme', '⌘ ⇧ L'],
              ].map(([k, v], i) => (
                <SettingsRow key={i} label={k}>
                  <code
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 12,
                      padding: '3px 7px',
                      border: '1px solid var(--ps-hairline)',
                      borderRadius: 5,
                      background: 'var(--ps-bg-sunken)',
                      color: 'var(--ps-fg-muted)',
                    }}
                  >
                    {v}
                  </code>
                </SettingsRow>
              ))}
            </SettingsCard>
          </>
        )}

        {section === 'notifications' && (
          <>
            <h2 style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--ps-fg)' }}>Notifications</h2>
            <p style={{ color: 'var(--ps-fg-muted)', margin: '0 0 32px', maxWidth: '56ch', fontSize: 14 }}>
              Quiet by default.
            </p>
            <SettingsCard>
              {[
                ['Comments on shared prompts', true],
                ['Weekly usage digest', true],
                ['Product updates', false],
                ['Security alerts', true],
              ].map(([label, _val], i) => (
                <SettingsRow key={i} label={label as string}>
                  <div
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 999,
                      background: 'var(--ps-hairline)',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 2,
                        top: 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      }}
                    />
                  </div>
                </SettingsRow>
              ))}
            </SettingsCard>
          </>
        )}

        {section === 'data' && (
          <>
            <h2 style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--ps-fg)' }}>Data &amp; export</h2>
            <p style={{ color: 'var(--ps-fg-muted)', margin: '0 0 32px', maxWidth: '56ch', fontSize: 14 }}>
              Your prompts, your file.
            </p>
            <SettingsCard>
              <SettingsRow label="Export everything" hint="JSON · includes versions and runs.">
                <button style={btnSecondaryStyle}>Download .json</button>
              </SettingsRow>
              <SettingsRow label="Import" hint="Bring prompts in from .json or .md.">
                <button style={btnSecondaryStyle}>Choose file…</button>
              </SettingsRow>
              <SettingsRow
                label={<span style={{ color: 'hsl(var(--destructive))' }}>Delete workspace</span>}
                hint="Permanent. Irreversible."
              >
                <button
                  style={{
                    ...btnSecondaryStyle,
                    color: 'hsl(var(--destructive))',
                    borderColor: 'hsl(var(--destructive) / 0.3)',
                  }}
                >
                  Delete…
                </button>
              </SettingsRow>
            </SettingsCard>
          </>
        )}
      </div>
    </div>
  );
}
