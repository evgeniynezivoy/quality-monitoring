import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
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
import { issuesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, getRateColor, getRateLabel } from '@/lib/utils';
import { Issue } from '@/types';

export function MyIssuesPage() {
  const { user } = useAuth();

  const { data: statsData } = useQuery({
    queryKey: ['issues', 'stats', 'my'],
    queryFn: () => issuesApi.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['issues', 'my', user?.id],
    queryFn: () =>
      issuesApi.list({
        responsible_cc_id: user?.id,
        limit: 100,
      }),
    enabled: !!user?.id,
  });

  const stats = statsData || { total: 0, by_rate: [], by_category: [] };

  return (
    <div>
      <Header title="My Issues" />
      <div className="p-6 space-y-6">
        {/* Personal Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Minor (1)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.by_rate.find((r: any) => r.rate === 1)?.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Medium (2)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.by_rate.find((r: any) => r.rate === 2)?.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical (3)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.by_rate.find((r: any) => r.rate === 3)?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issues Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Issues</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((issue: Issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>{formatDate(issue.issue_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{issue.source_name}</Badge>
                      </TableCell>
                      <TableCell>{issue.cid || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {issue.issue_type}
                      </TableCell>
                      <TableCell>
                        {issue.issue_rate ? (
                          <Badge className={getRateColor(issue.issue_rate)}>
                            {getRateLabel(issue.issue_rate)}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {issue.issue_category ? (
                          <Badge variant="secondary">{issue.issue_category}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {issue.comment || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.data || data.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No issues found
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
