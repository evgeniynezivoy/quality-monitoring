import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi, syncApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { RefreshCw, Users, Database, Activity } from 'lucide-react';
import { User, IssueSource, SyncLog } from '@/types';

export function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'sources' | 'sync'>('users');

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.users,
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['admin', 'sources'],
    queryFn: adminApi.sources,
  });

  const { data: syncLogs } = useQuery({
    queryKey: ['sync', 'logs'],
    queryFn: () => syncApi.logs(20),
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['sync', 'status'],
    queryFn: syncApi.status,
    refetchInterval: 10000,
  });

  const triggerSyncMutation = useMutation({
    mutationFn: syncApi.trigger,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  return (
    <div>
      <Header title="Admin Panel" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users?.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.users?.active || 0} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.issues?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.sources?.active || 0}</div>
              <p className="text-xs text-muted-foreground">
                of {stats?.sources?.total || 0} configured
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <RefreshCw
                className={`h-4 w-4 ${syncStatus?.isRunning ? 'animate-spin' : ''}`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {syncStatus?.isRunning ? 'Running' : 'Idle'}
              </div>
              {syncStatus?.lastSync && (
                <p className="text-xs text-muted-foreground">
                  Last: {formatDateTime(syncStatus.lastSync)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b">
          {['users', 'sources', 'sync'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.users?.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.team}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            updateUserMutation.mutate({
                              id: user.id,
                              data: { role: value },
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="team_lead">Team Lead</SelectItem>
                            <SelectItem value="cc">CC</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.is_active !== false ? 'success' : 'secondary'}
                        >
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateUserMutation.mutate({
                              id: user.id,
                              data: { is_active: user.is_active === false },
                            })
                          }
                        >
                          {user.is_active !== false ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Sources Tab */}
        {activeTab === 'sources' && (
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Sheet ID</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourcesData?.sources?.map((source: IssueSource) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell>{source.display_name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {source.google_sheet_id.substring(0, 20)}...
                      </TableCell>
                      <TableCell>
                        {source.last_sync_at
                          ? formatDateTime(source.last_sync_at)
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={source.is_active ? 'success' : 'secondary'}>
                          {source.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sync Logs</CardTitle>
              <Button
                onClick={() => triggerSyncMutation.mutate()}
                disabled={triggerSyncMutation.isPending || syncStatus?.isRunning}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    triggerSyncMutation.isPending ? 'animate-spin' : ''
                  }`}
                />
                Trigger Sync
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fetched</TableHead>
                    <TableHead>Inserted</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs?.logs?.map((log: SyncLog) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.source_name || `Source ${log.source_id}`}</TableCell>
                      <TableCell>{formatDateTime(log.started_at)}</TableCell>
                      <TableCell>
                        {log.completed_at ? formatDateTime(log.completed_at) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === 'success'
                              ? 'success'
                              : log.status === 'failed'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.rows_fetched}</TableCell>
                      <TableCell>{log.rows_inserted}</TableCell>
                      <TableCell>{log.rows_updated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
