import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createTeam, listTeams } from '@/api/teams';
import { useToast } from '@/components/ui/use-toast';
import type { Team } from '@/lib/types';

interface ContextType {
  currentTeamId?: string;
}

export function Settings() {
  const { currentTeamId } = useOutletContext<ContextType>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(false);
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
      await createTeam(newTeamName);
      setNewTeamName('');
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
      </div>
    </div>
  );
}
