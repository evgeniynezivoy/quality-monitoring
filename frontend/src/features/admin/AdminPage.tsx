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
import { adminApi, syncApi, reportsApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { RefreshCw, Users, Database, Activity, Mail, Trash2 } from 'lucide-react';
import { User, IssueSource, SyncLog } from '@/types';

interface EmailLog {
  id: number;
  report_type: string;
  report_date: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  issues_count: number;
  status: string;
  error_message: string | null;
  sent_at: string;
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'sources' | 'sync' | 'emails'>('users');

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

  const { data: emailLogs } = useQuery({
    queryKey: ['reports', 'email-logs'],
    queryFn: () => reportsApi.getEmailLogs(100),
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

  const cleanupEmailLogsMutation = useMutation({
    mutationFn: reportsApi.cleanupEmailLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'email-logs'] });
    },
  });

  const sendAllReportsMutation = useMutation({
    mutationFn: () => reportsApi.sendAllReports(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'email-logs'] });
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
          {['users', 'sources', 'sync', 'emails'].map((tab) => (
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

        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Report Logs
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => cleanupEmailLogsMutation.mutate()}
                  disabled={cleanupEmailLogsMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cleanup Old
                </Button>
                <Button
                  onClick={() => sendAllReportsMutation.mutate()}
                  disabled={sendAllReportsMutation.isPending}
                >
                  <Mail className={`mr-2 h-4 w-4 ${sendAllReportsMutation.isPending ? 'animate-pulse' : ''}`} />
                  Send All Reports
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {emailLogs?.logs?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No email logs yet. Reports will be logged here after sending.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Report Date</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs?.logs?.map((log: EmailLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(log.sent_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.report_type === 'operations' ? 'default' : 'secondary'}>
                            {log.report_type === 'operations' ? 'Operations' : 'Team Lead'}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.report_date}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{log.recipient_name || '-'}</span>
                            <span className="text-xs text-muted-foreground">{log.recipient_email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{log.issues_count}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'sent' ? 'success' : 'danger'}>
                            {log.status}
                          </Badge>
                          {log.error_message && (
                            <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
