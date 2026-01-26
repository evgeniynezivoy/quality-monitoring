import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { dashboardApi, usersApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types';

export function TeamPage() {
  const { user } = useAuth();

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const { data: byCC } = useQuery({
    queryKey: ['dashboard', 'byCC'],
    queryFn: () => dashboardApi.byCC(50),
  });

  const { data: byTeam } = useQuery({
    queryKey: ['dashboard', 'byTeam'],
    queryFn: dashboardApi.byTeam,
  });

  const teamMembers = usersData?.users || [];
  const ccStats = byCC?.by_cc || [];

  // Merge user data with stats
  const membersWithStats = teamMembers.map((member: User) => {
    const stats = ccStats.find((s: any) => s.cc_id === member.id);
    return {
      ...member,
      issue_count: stats?.count || 0,
      rate_avg: stats?.rate_avg || null,
    };
  });

  return (
    <div>
      <Header title="Team Overview" />
      <div className="p-6 space-y-6">
        {/* Team Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamMembers.filter((m: User) => m.is_active !== false).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Team Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {membersWithStats.reduce((sum: number, m: any) => sum + m.issue_count, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Issues/Member</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamMembers.length > 0
                  ? (
                      membersWithStats.reduce((sum: number, m: any) => sum + m.issue_count, 0) /
                      teamMembers.length
                    ).toFixed(1)
                  : '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team by Department */}
        {user?.role === 'admin' && byTeam?.by_team && (
          <Card>
            <CardHeader>
              <CardTitle>Issues by Team</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Minor (1)</TableHead>
                    <TableHead className="text-right">Medium (2)</TableHead>
                    <TableHead className="text-right">Critical (3)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byTeam.by_team.map((team: any) => (
                    <TableRow key={team.team}>
                      <TableCell className="font-medium">{team.team}</TableCell>
                      <TableCell className="text-right">{team.count}</TableCell>
                      <TableCell className="text-right">{team.rate_1}</TableCell>
                      <TableCell className="text-right">{team.rate_2}</TableCell>
                      <TableCell className="text-right text-red-600">{team.rate_3}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Issues</TableHead>
                  <TableHead className="text-right">Avg Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersWithStats.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.team}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{member.issue_count}</TableCell>
                    <TableCell className="text-right">
                      {member.rate_avg ? member.rate_avg.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.is_active !== false ? 'success' : 'secondary'}>
                        {member.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {membersWithStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No team members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
