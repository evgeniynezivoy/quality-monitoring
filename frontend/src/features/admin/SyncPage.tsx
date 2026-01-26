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
import { syncApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { SyncLog } from '@/types';

export function SyncPage() {
  const queryClient = useQueryClient();

  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['sync', 'status'],
    queryFn: syncApi.status,
    refetchInterval: 5000,
  });

  const { data: syncLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['sync', 'logs'],
    queryFn: () => syncApi.logs(50),
    refetchInterval: 10000,
  });

  const triggerSyncMutation = useMutation({
    mutationFn: syncApi.trigger,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
  });

  const isRunning = syncStatus?.isRunning;

  return (
    <div>
      <Header title="Sync Status" />
      <div className="p-6 space-y-6">
        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <RefreshCw
                className={`h-4 w-4 ${isRunning ? 'animate-spin text-blue-500' : 'text-gray-400'}`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isRunning ? (
                  <span className="text-blue-600">Running</span>
                ) : (
                  <span className="text-green-600">Idle</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Successful Sync</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {syncStatus?.lastSync ? formatDateTime(syncStatus.lastSync) : 'Never'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{syncStatus?.sources?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="flex items-center justify-center p-6">
            <Button
              size="lg"
              onClick={() => triggerSyncMutation.mutate()}
              disabled={triggerSyncMutation.isPending || isRunning}
              className="w-full"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${triggerSyncMutation.isPending ? 'animate-spin' : ''}`}
              />
              {isRunning ? 'Sync in Progress...' : 'Trigger Manual Sync'}
            </Button>
          </Card>
        </div>

        {/* Sources Status */}
        <Card>
          <CardHeader>
            <CardTitle>Source Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="py-8 text-center">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncStatus?.sources?.map((source: { name: string; lastSync: string | null }) => (
                    <TableRow key={source.name}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell>
                        {source.lastSync ? formatDateTime(source.lastSync) : 'Never synced'}
                      </TableCell>
                      <TableCell>
                        {source.lastSync ? (
                          <Badge variant="success">Synced</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="py-8 text-center">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Fetched</TableHead>
                    <TableHead className="text-right">Inserted</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs?.logs?.map((log: SyncLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.source_name || `Source ${log.source_id}`}
                      </TableCell>
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
                          {log.status === 'success' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {log.status === 'failed' && <XCircle className="mr-1 h-3 w-3" />}
                          {log.status === 'running' && (
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{log.rows_fetched}</TableCell>
                      <TableCell className="text-right">{log.rows_inserted}</TableCell>
                      <TableCell className="text-right">{log.rows_updated}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-red-600">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!syncLogs?.logs || syncLogs.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No sync logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
