import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Copy, Plus, User, Sun, Key, Folder, Code, Bell, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createInvite, type InviteRole } from '@/api/invites';
import { createTeam, listTeams } from '@/api/teams';
import { createApiKey, listApiKeys, deleteApiKey } from '@/api/apikeys';
import { listPrompts } from '@/api/prompts';
import { getApiBaseUrl } from '@/lib/api';
import { generateEspansoYaml } from '@/lib/espanso';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { useShowAdvanced } from '@/lib/preferences';
import { AGENT_FORMATS, filenameFor, wrapPromptsForFormat, downloadFile } from '@/lib/agentExport';
import type { Team } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
  setCurrentTeamId?: (teamId: string) => void;
}

type Section = 'account' | 'appearance' | 'models' | 'workspace' | 'shortcuts' | 'notifications' | 'data' | 'api';

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account', icon: <User style={{ width: 14, height: 14 }} /> },
  { id: 'appearance', label: 'Appearance', icon: <Sun style={{ width: 14, height: 14 }} /> },
  { id: 'models', label: 'Models & keys', icon: <Key style={{ width: 14, height: 14 }} /> },
  { id: 'workspace', label: 'Workspace', icon: <Folder style={{ width: 14, height: 14 }} /> },
  { id: 'shortcuts', label: 'Shortcuts', icon: <Code style={{ width: 14, height: 14 }} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell style={{ width: 14, height: 14 }} /> },
  { id: 'data', label: 'Data & export', icon: <Database style={{ width: 14, height: 14 }} /> },
  { id: 'api', label: 'API access', icon: <Code style={{ width: 14, height: 14 }} /> },
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

const providerLabel: Record<string, string> = {
  email: 'Email',
  google: 'Google',
  github: 'GitHub',
};

function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        padding: '0 9px',
        borderRadius: 999,
        background: 'var(--ps-bg-sunken)',
        border: '1px solid var(--ps-hairline)',
        color: 'var(--ps-fg)',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {providerLabel[provider] ?? provider}
    </span>
  );
}

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
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [authProviders, setAuthProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null }>>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [justCreatedKey, setJustCreatedKey] = useState<{ rawKey: string; name: string } | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [espansoLoading, setEspansoLoading] = useState(false);
  const [agentExportFormat, setAgentExportFormat] = useState('agents');
  const [agentExportLoading, setAgentExportLoading] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [showAdvanced, setShowAdvanced] = useShowAdvanced();
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    loadTeams();
    loadProfile();
    loadApiKeys();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadApiKeys = async () => {
    try {
      const keys = await listApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const getDisplayName = (user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>) => {
    const metadata = user.user_metadata;
    return (
      metadata.display_name ||
      metadata.full_name ||
      metadata.name ||
      user.email?.split('@')[0] ||
      ''
    );
  };

  const loadProfile = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) return;

      setProfileName(getDisplayName(user));
      setProfileEmail(user.email ?? '');
      setAuthProviders(getAuthProviders(user));
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not load your profile',
        variant: 'destructive',
      });
    }
  };

  const getAuthProviders = (user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>) => {
    const providers = new Set<string>();

    user.identities?.forEach((identity) => {
      if (identity.provider) {
        providers.add(identity.provider);
      }
    });

    if (user.app_metadata.provider) {
      providers.add(user.app_metadata.provider);
    }

    if (user.email) {
      providers.add('email');
    }

    return Array.from(providers).sort((a, b) => {
      if (a === 'email') return -1;
      if (b === 'email') return 1;
      return a.localeCompare(b);
    });
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      const displayName = profileName.trim();
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          full_name: displayName,
          name: displayName,
        },
      });
      if (error) throw error;

      toast({ title: 'Profile updated' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not update your profile',
        variant: 'destructive',
      });
    } finally {
      setProfileLoading(false);
    }
  };

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

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setApiKeyLoading(true);
    try {
      const result = await createApiKey(newKeyName.trim());
      setJustCreatedKey({ rawKey: result.rawKey, name: result.name });
      setNewKeyName('');
      await loadApiKeys();
      toast({ title: 'API key created', description: 'Copy it now — it won\'t be shown again.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not create API key',
        variant: 'destructive',
      });
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    try {
      await deleteApiKey(id);
      await loadApiKeys();
      toast({ title: 'API key revoked' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not delete API key',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadEspanso = async () => {
    if (!currentTeamId) {
      toast({
        title: 'No workspace',
        description: 'Select a workspace first.',
        variant: 'destructive',
      });
      return;
    }
    setEspansoLoading(true);
    try {
      const prompts = await listPrompts(currentTeamId);
      const yaml = generateEspansoYaml(prompts);

      const blob = new Blob([yaml], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptstash-espanso-${new Date().toISOString().split('T')[0]}.yml`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Espanso package downloaded' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not download Espanso package',
        variant: 'destructive',
      });
    } finally {
      setEspansoLoading(false);
    }
  };

  const handleDownloadAgentFormat = async () => {
    if (!currentTeamId) {
      toast({
        title: 'No workspace',
        description: 'Select a workspace first.',
        variant: 'destructive',
      });
      return;
    }
    setAgentExportLoading(true);
    try {
      const prompts = await listPrompts(currentTeamId);
      const filename = filenameFor(agentExportFormat as any);
      const content = wrapPromptsForFormat(prompts, agentExportFormat as any);
      downloadFile(filename, content);
      toast({ title: 'Agent file downloaded' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not download agent file',
        variant: 'destructive',
      });
    } finally {
      setAgentExportLoading(false);
    }
  };

  return (
    <div
      id="settings-container"
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
      }}
    >
      <style>{`
        @media (max-width: 639px) {
          #settings-container {
            grid-template-columns: 1fr !important;
          }
          #settings-nav {
            border-right: none !important;
            border-bottom: 1px solid var(--ps-hairline-soft) !important;
            padding: 12px 16px !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            white-space: nowrap !important;
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
          }
          #settings-nav h2 {
            display: none !important;
          }
          #settings-nav button {
            width: auto !important;
            height: 28px !important;
            padding: 0 12px !important;
            margin-bottom: 0 !important;
          }
          #settings-content {
            padding: 32px 16px !important;
          }
        }
      `}</style>
      {/* Settings nav */}
      <nav
        id="settings-nav"
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
      <div id="settings-content" style={{ overflow: 'auto', padding: '56px 64px', maxWidth: 760 }}>
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
                  <input
                    style={inputStyle}
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="Your name"
                  />
                </SettingsRow>
                <SettingsRow label="Email" hint="Your primary login address.">
                  <input style={inputStyle} type="email" value={profileEmail} readOnly />
                </SettingsRow>
                <SettingsRow
                  label="Sign-in methods"
                  hint="Methods with this verified email open the same PromptStash account."
                >
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 260 }}>
                    {authProviders.map((provider) => (
                      <ProviderBadge key={provider} provider={provider} />
                    ))}
                  </div>
                </SettingsRow>
                <SettingsRow label="Save changes" hint="Updates how your name appears in PromptStash.">
                  <button
                    type="button"
                    style={profileLoading ? { ...btnPrimaryStyle, opacity: 0.7, cursor: 'not-allowed' } : btnPrimaryStyle}
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                  >
                    {profileLoading ? 'Saving...' : 'Save'}
                  </button>
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
              <SettingsRow
                label="Show all advanced features"
                hint="Forces every advanced surface (stages, bundles, token gauges) visible regardless of whether you've used them yet."
              >
                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 999,
                    background: showAdvanced ? 'var(--ps-accent)' : 'var(--ps-hairline)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 120ms',
                  }}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: showAdvanced ? 18 : 2,
                      top: 2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      transition: 'left 120ms',
                    }}
                  />
                </div>
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
                ['Open shortcuts help', '?'],
                ['Focus search', '/'],
                ['Command palette', '⌘ K'],
                ['Toggle sidebar', '⌘ \\'],
                ['Save prompt', '⌘ S'],
                ['Write tab', '⌘ 1'],
                ['Preview tab', '⌘ 2'],
                ['Copy prompt body', '⌘ ⇧ C'],
                ['Navigate prompt list', '↑ ↓'],
                ['Open focused prompt', 'Enter'],
                ['Close modal / palette', 'Esc'],
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

            <SettingsCard>
              <div style={{ borderTop: 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ps-fg)', marginBottom: 4 }}>Espanso export</div>
                <div style={{ fontSize: 13, color: 'var(--ps-fg-muted)', marginBottom: 14 }}>
                  Download your prompts as an Espanso match file. Drop the file into your Espanso config/match directory to expand prompts by keyword anywhere on your system.
                </div>
                <div style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={handleDownloadEspanso}
                    disabled={espansoLoading || !currentTeamId}
                    style={espansoLoading ? { ...btnPrimaryStyle, opacity: 0.7, cursor: 'not-allowed' } : btnPrimaryStyle}
                  >
                    {espansoLoading ? 'Downloading…' : 'Download Espanso package'}
                  </button>
                </div>

                <details style={{ marginTop: 12 }}>
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--ps-fg)',
                      userSelect: 'none',
                    }}
                  >
                    Install guide ▾
                  </summary>
                  <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ps-fg-muted)', lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 12px' }}>After downloading, place the .yml file in your Espanso match directory:</p>
                    <ul style={{ margin: 0, paddingLeft: 20, marginBottom: 12 }}>
                      <li><strong>macOS:</strong> <code style={{ background: 'var(--ps-bg-sunken)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>~/.config/espanso/match/</code></li>
                      <li><strong>Linux:</strong> <code style={{ background: 'var(--ps-bg-sunken)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>~/.config/espanso/match/</code></li>
                      <li><strong>Windows:</strong> <code style={{ background: 'var(--ps-bg-sunken)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>%APPDATA%\espanso\match\</code></li>
                    </ul>
                    <p style={{ margin: 0 }}>Then restart Espanso: <code style={{ background: 'var(--ps-bg-sunken)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>espanso restart</code></p>
                  </div>
                </details>
              </div>
            </SettingsCard>

            <SettingsCard>
              <div style={{ borderTop: 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ps-fg)', marginBottom: 4 }}>Agent file export</div>
                <div style={{ fontSize: 13, color: 'var(--ps-fg-muted)', marginBottom: 14 }}>
                  Download all prompts in this workspace as a single agent file.
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                  <select
                    value={agentExportFormat}
                    onChange={(e) => setAgentExportFormat(e.target.value)}
                    disabled={!currentTeamId}
                    style={{ ...inputStyle, width: 'auto', minWidth: 200 }}
                  >
                    {AGENT_FORMATS.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleDownloadAgentFormat}
                    disabled={agentExportLoading || !currentTeamId}
                    style={agentExportLoading ? { ...btnPrimaryStyle, opacity: 0.7, cursor: 'not-allowed' } : btnPrimaryStyle}
                  >
                    {agentExportLoading ? 'Downloading…' : 'Download'}
                  </button>
                </div>
              </div>
            </SettingsCard>
          </>
        )}

        {section === 'api' && (
          <>
            <h2 style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--ps-fg)' }}>API access</h2>
            <p style={{ color: 'var(--ps-fg-muted)', margin: '0 0 32px', maxWidth: '56ch', fontSize: 14 }}>
              Use API keys to access your prompts programmatically. Keys are shown only once.
            </p>
            <SettingsCard>
              <div style={{ borderTop: 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ps-fg)', marginBottom: 4 }}>API Keys</div>
                <div style={{ fontSize: 13, color: 'var(--ps-fg-muted)', marginBottom: 14 }}>Generate keys to access your prompts via API.</div>
                <form onSubmit={handleCreateApiKey} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name (e.g., Production app)"
                    maxLength={60}
                    style={{ ...inputStyle, flex: 1, width: 'auto' }}
                  />
                  <button type="submit" disabled={apiKeyLoading || !newKeyName.trim()} style={btnPrimaryStyle}>
                    <Plus style={{ width: 14, height: 14 }} />
                    Generate key
                  </button>
                </form>

                {justCreatedKey && (
                  <div style={{
                    marginTop: 16,
                    padding: '16px',
                    background: 'oklch(0.97 0.02 60)',
                    border: '1px solid oklch(0.88 0.05 60)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.45 0.08 60)', marginBottom: 8 }}>
                      Your new API key
                    </div>
                    <div style={{ fontSize: 12, color: 'oklch(0.45 0.06 60)', marginBottom: 12 }}>
                      Copy this key now — it won't be shown again.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={justCreatedKey.rawKey}
                        readOnly
                        style={{ ...inputStyle, flex: 1, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, background: 'var(--ps-bg)' }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(justCreatedKey.rawKey);
                          toast({ title: 'Copied to clipboard' });
                        }}
                        style={btnSecondaryStyle}
                      >
                        <Copy style={{ width: 14, height: 14 }} />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => setJustCreatedKey(null)}
                        style={btnSecondaryStyle}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {apiKeys.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--ps-hairline)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 0', fontWeight: 600, color: 'var(--ps-fg-faint)', fontSize: 11 }}>Name</th>
                          <th style={{ padding: '8px 0', fontWeight: 600, color: 'var(--ps-fg-faint)', fontSize: 11 }}>Prefix</th>
                          <th style={{ padding: '8px 0', fontWeight: 600, color: 'var(--ps-fg-faint)', fontSize: 11 }}>Created</th>
                          <th style={{ padding: '8px 0', fontWeight: 600, color: 'var(--ps-fg-faint)', fontSize: 11 }}>Last used</th>
                          <th style={{ padding: '8px 0', fontWeight: 600, color: 'var(--ps-fg-faint)', fontSize: 11 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.map((key) => (
                          <tr key={key.id} style={{ borderBottom: '1px solid var(--ps-hairline-soft)' }}>
                            <td style={{ padding: '10px 0', color: 'var(--ps-fg)' }}>{key.name}</td>
                            <td style={{ padding: '10px 0', fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'var(--ps-fg-muted)' }}>{key.key_prefix}…</td>
                            <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--ps-fg-faint)' }}>{new Date(key.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--ps-fg-faint)' }}>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</td>
                            <td style={{ padding: '10px 0', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteApiKey(key.id)}
                                style={{
                                  ...btnSecondaryStyle,
                                  color: 'hsl(var(--destructive))',
                                  borderColor: 'hsl(var(--destructive) / 0.3)',
                                }}
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </SettingsCard>

            <SettingsCard>
              <div style={{ borderTop: 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ps-fg)', marginBottom: 4 }}>API Usage</div>
                <div style={{ fontSize: 13, color: 'var(--ps-fg-muted)', marginBottom: 14 }}>
                  Use your API key to access your prompts programmatically.
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ps-fg-muted)', marginBottom: 4 }}>API base URL</div>
                  <code style={{
                    display: 'block',
                    background: 'var(--ps-bg-sunken)',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12,
                    color: 'var(--ps-fg)',
                    overflow: 'auto',
                  }}>
                    {apiBaseUrl}
                  </code>
                  {!import.meta.env.VITE_API_BASE_URL && (
                    <div style={{ fontSize: 12, color: 'var(--ps-fg-faint)', marginTop: 6, lineHeight: 1.5 }}>
                      This points to the Supabase Edge Function deployment. Set <code style={{ background: 'var(--ps-bg-sunken)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>VITE_API_BASE_URL</code> to show a custom API domain.
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ps-fg-muted)', marginBottom: 4 }}>Authentication</div>
                  <div style={{ fontSize: 13, color: 'var(--ps-fg)', lineHeight: 1.5 }}>
                    Include your API key in the <code style={{ background: 'var(--ps-bg-sunken)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>Authorization</code> header:
                  </div>
                  <pre style={{
                    background: 'var(--ps-bg-sunken)',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12,
                    color: 'var(--ps-fg)',
                    overflow: 'auto',
                    marginTop: 8,
                  }}><code>Authorization: Bearer ps_your_api_key_here</code></pre>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ps-fg-muted)', marginBottom: 4 }}>List all prompts</div>
                  <pre style={{
                    background: 'var(--ps-bg-sunken)',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12,
                    color: 'var(--ps-fg)',
                    overflow: 'auto',
                  }}><code>{`curl -H "Authorization: Bearer ps_your_key" \\
  "${apiBaseUrl}/v1/prompts?workspace=TEAM_ID"`}</code></pre>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ps-fg-muted)', marginBottom: 4 }}>Get a single prompt</div>
                  <pre style={{
                    background: 'var(--ps-bg-sunken)',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12,
                    color: 'var(--ps-fg)',
                    overflow: 'auto',
                  }}><code>{`curl -H "Authorization: Bearer ps_your_key" \\
  "${apiBaseUrl}/v1/prompts/PROMPT_ID"`}</code></pre>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ps-fg-muted)', marginBottom: 4 }}>Create a prompt</div>
                  <pre style={{
                    background: 'var(--ps-bg-sunken)',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12,
                    color: 'var(--ps-fg)',
                    overflow: 'auto',
                  }}><code>{`curl -X POST \\
  -H "Authorization: Bearer ps_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"team_id":"TEAM_ID","title":"My Prompt","body_md":"Prompt content"}' \\
  "${apiBaseUrl}/v1/prompts"`}</code></pre>
                </div>
              </div>
            </SettingsCard>
          </>
        )}
      </div>
    </div>
  );
}
