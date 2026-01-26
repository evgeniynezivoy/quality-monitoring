import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { issuesApi, syncApi } from '@/lib/api';
import { formatDate, getRateColor, getRateLabel } from '@/lib/utils';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Issue } from '@/types';

export function IssuesPage() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    source: '',
    issue_rate: '',
    issue_category: '',
    date_from: '',
    date_to: '',
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['sync', 'sources'],
    queryFn: () => syncApi.status(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['issues', filters],
    queryFn: () =>
      issuesApi.list({
        ...filters,
        source: filters.source || undefined,
        issue_rate: filters.issue_rate ? parseInt(filters.issue_rate) : undefined,
        issue_category: filters.issue_category || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        search: filters.search || undefined,
      }),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.source) params.set('source', filters.source);
    if (filters.issue_rate) params.set('issue_rate', filters.issue_rate);
    if (filters.issue_category) params.set('issue_category', filters.issue_category);

    window.open(`/api/issues/export?${params.toString()}`, '_blank');
  };

  return (
    <div>
      <Header title="Issues" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select
                value={filters.source || 'all'}
                onValueChange={(value) => handleFilterChange('source', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sourcesData?.sources?.map((s: { name: string }) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.issue_rate || 'all'}
                onValueChange={(value) => handleFilterChange('issue_rate', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="1">Minor (1)</SelectItem>
                  <SelectItem value="2">Medium (2)</SelectItem>
                  <SelectItem value="3">Critical (3)</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.issue_category || 'all'}
                onValueChange={(value) => handleFilterChange('issue_category', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="From"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />

              <Input
                type="date"
                placeholder="To"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                Loading...
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>CC Name</TableHead>
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
                        <TableCell>{issue.cc_name || issue.responsible_cc_name || '-'}</TableCell>
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
                        <TableCell colSpan={8} className="text-center py-8">
                          No issues found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {data?.pagination && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{' '}
                      {Math.min(
                        data.pagination.page * data.pagination.limit,
                        data.pagination.total
                      )}{' '}
                      of {data.pagination.total} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                        }
                        disabled={data.pagination.page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {data.pagination.page} of {data.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                        }
                        disabled={data.pagination.page >= data.pagination.totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
