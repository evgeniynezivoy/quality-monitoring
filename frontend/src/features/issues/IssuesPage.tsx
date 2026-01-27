import { useState, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { issuesApi, syncApi, usersApi } from '@/lib/api';
import { formatDate, getRateColor, getRateLabel } from '@/lib/utils';
import { Search, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Issue } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface GroupedIssues {
  date: string;
  issues: (Issue & { source_name: string; cc_name: string })[];
}

export function IssuesPage() {
  const { user } = useAuth();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    search: '',
    source: '',
    issue_rate: '',
    team_lead_id: '',
    date_from: '',
    date_to: '',
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['sync', 'sources'],
    queryFn: () => syncApi.status(),
  });

  const { data: teamLeadsData } = useQuery({
    queryKey: ['team-leads'],
    queryFn: () => usersApi.teamLeads(),
  });

  // Fetch more issues for timeline view
  const { data, isLoading } = useQuery({
    queryKey: ['issues', filters],
    queryFn: () =>
      issuesApi.list({
        page: 1,
        limit: 500, // Get more for grouping
        source: filters.source || undefined,
        issue_rate: filters.issue_rate ? parseInt(filters.issue_rate) : undefined,
        team_lead_id: filters.team_lead_id ? parseInt(filters.team_lead_id) : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        search: filters.search || undefined,
      }),
  });

  // Group issues by date
  const groupedIssues = useMemo(() => {
    if (!data?.data) return [];

    const groups: Record<string, (Issue & { source_name: string; cc_name: string })[]> = {};

    data.data.forEach((issue: Issue & { source_name: string; cc_name: string }) => {
      const date = issue.issue_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(issue);
    });

    return Object.entries(groups)
      .map(([date, issues]) => ({ date, issues }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data?.data]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedDates(new Set(groupedIssues.map((g) => g.date)));
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.source) params.set('source', filters.source);
    if (filters.issue_rate) params.set('issue_rate', filters.issue_rate);
    if (filters.team_lead_id) params.set('team_lead_id', filters.team_lead_id);

    window.open(`/api/issues/export?${params.toString()}`, '_blank');
  };

  // Auto-expand first 3 dates
  useMemo(() => {
    if (groupedIssues.length > 0 && expandedDates.size === 0) {
      setExpandedDates(new Set(groupedIssues.slice(0, 3).map((g) => g.date)));
    }
  }, [groupedIssues.length]);

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <Header title="Issues Timeline" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
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

              {/* Team Lead filter - only for admins */}
              {isAdmin && (
                <Select
                  value={filters.team_lead_id || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('team_lead_id', value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Team Lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Leads</SelectItem>
                    {teamLeadsData?.team_leads?.map((tl: { id: number; full_name: string }) => (
                      <SelectItem key={tl.id} value={tl.id.toString()}>
                        {tl.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

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
                onValueChange={(value) =>
                  handleFilterChange('issue_rate', value === 'all' ? '' : value)
                }
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

            <div className="mt-4 flex justify-between">
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.pagination?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Days with Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groupedIssues.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {data?.data?.filter((i: Issue) => i.issue_rate === 3).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg per Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groupedIssues.length > 0
                  ? ((data?.data?.length || 0) / groupedIssues.length).toFixed(1)
                  : '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">Loading...</CardContent>
          </Card>
        ) : groupedIssues.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No issues found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedIssues.map((group) => {
              const isExpanded = expandedDates.has(group.date);
              const criticalCount = group.issues.filter((i) => i.issue_rate === 3).length;
              const mediumCount = group.issues.filter((i) => i.issue_rate === 2).length;

              return (
                <Card key={group.date}>
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleDate(group.date)}
                  >
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                        <span className="text-lg">{formatDate(group.date)}</span>
                        <Badge variant="secondary">{group.issues.length} issues</Badge>
                      </div>
                      <div className="flex gap-2">
                        {criticalCount > 0 && (
                          <Badge className="bg-red-500">{criticalCount} Critical</Badge>
                        )}
                        {mediumCount > 0 && (
                          <Badge className="bg-yellow-500">{mediumCount} Medium</Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {group.issues.map((issue) => (
                          <div
                            key={issue.id}
                            className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                          >
                            <Badge variant="outline" className="shrink-0">
                              {issue.source_name}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {issue.cc_name || issue.responsible_cc_name || 'Unknown'}
                                </span>
                                {issue.cid && (
                                  <span className="text-sm text-muted-foreground">
                                    ({issue.cid})
                                  </span>
                                )}
                              </div>
                              {issue.issue_type && issue.issue_type !== '-' && (
                                <div className="text-sm text-muted-foreground">
                                  {issue.issue_type}
                                </div>
                              )}
                              {issue.comment && issue.comment !== '-' && (
                                <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                                  {issue.comment}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0">
                              {issue.issue_rate ? (
                                <Badge className={getRateColor(issue.issue_rate)}>
                                  {getRateLabel(issue.issue_rate)}
                                </Badge>
                              ) : (
                                <Badge variant="outline">-</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
