import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { syncApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface TeamMember {
  id: number;
  full_name: string;
  email: string;
  team: string;
}

interface TeamStructure {
  team_lead_id: number;
  team_lead_name: string;
  team_lead_email: string;
  team_members: TeamMember[] | null;
}

export function TeamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team-structure'],
    queryFn: syncApi.teamStructure,
  });

  const syncMutation = useMutation({
    mutationFn: syncApi.syncTeam,
    onSuccess: (data) => {
      setSyncMessage(
        `Sync completed: ${data.team_leads_created + data.team_leads_updated} team leads, ${data.ccs_created + data.ccs_updated} CCs`
      );
      queryClient.invalidateQueries({ queryKey: ['team-structure'] });
      setTimeout(() => setSyncMessage(null), 5000);
    },
    onError: (error: any) => {
      setSyncMessage(`Sync failed: ${error.message}`);
      setTimeout(() => setSyncMessage(null), 5000);
    },
  });

  const teams: TeamStructure[] = teamData?.teams || [];
  const totalTeamLeads = teams.length;
  const totalMembers = teams.reduce(
    (sum, t) => sum + (t.team_members?.length || 0),
    0
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <Header title="Team Structure" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Team Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTeamLeads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Team Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalTeamLeads > 0
                  ? (totalMembers / totalTeamLeads).toFixed(1)
                  : '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Button */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Team Roster Sync</span>
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending ? 'Syncing...' : 'Sync from Google Sheets'}
                </Button>
              </CardTitle>
            </CardHeader>
            {syncMessage && (
              <CardContent>
                <div
                  className={`p-3 rounded ${
                    syncMessage.includes('failed')
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {syncMessage}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Team Structure */}
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">Loading...</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.team_lead_id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{team.team_lead_name}</span>
                    <Badge variant="outline">
                      {team.team_members?.length || 0} members
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {team.team_lead_email}
                  </p>
                </CardHeader>
                <CardContent>
                  {team.team_members && team.team_members.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.team_members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium py-2">
                              {member.full_name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground py-2">
                              {member.email}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No team members
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {teams.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No team structure found. Click the sync button to import from
                Google Sheets.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
