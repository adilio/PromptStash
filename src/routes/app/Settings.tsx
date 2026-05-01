import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Copy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createInvite, type InviteRole } from '@/api/invites';
import { createTeam, listTeams } from '@/api/teams';
import { useToast } from '@/components/ui/use-toast';
import type { Team } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
  setCurrentTeamId?: (teamId: string) => void;
}

export function Settings() {
  const { currentTeamId, setCurrentTeamId } = useOutletContext<ContextType>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('editor');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const { toast } = useToast();

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
      toast({
        title: 'Success',
        description: 'Team created',
      });
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
      const invite = await createInvite({
        teamId: currentTeamId,
        email: inviteEmail,
        role: inviteRole,
      });
      const link = `${window.location.origin}/invite/${invite.token}`;
      setInviteLink(link);
      setInviteEmail('');
      toast({
        title: 'Invite created',
        description: 'Share the invite link with your teammate.',
      });
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
      toast({
        title: 'Copied',
        description: 'Invite link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to copy invite link',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your teams and account settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Create and manage your teams</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateTeam} className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="New team name..."
                  maxLength={60}
                />
              </div>
              <Button type="submit" disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </form>

            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(team.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {team.id === currentTeamId && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Invites</CardTitle>
            <CardDescription>Create manual invite links for the current team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateInvite} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  disabled={!currentTeamId}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as InviteRole)}
                  disabled={!currentTeamId}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={!currentTeamId || inviteLoading}>
                  Send invite
                </Button>
              </div>
            </form>

            {inviteLink && (
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly />
                <Button type="button" variant="outline" size="icon" onClick={handleCopyInviteLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
