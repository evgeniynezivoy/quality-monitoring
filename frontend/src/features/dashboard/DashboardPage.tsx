import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { dashboardApi } from '@/lib/api';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { calculateStatus, getSourceBadgeClass } from '@/lib/analytics';
import { type Period } from '@/lib/constants';
import {
  StatCard,
  TeamLeadCard,
  CCCard,
  TabButton,
  ReturnsTabContent,
  type CCAnalytics,
} from './components';
import { IssueDatePeriodSelector, type IssueFilterParams } from './components/IssueDatePeriodSelector';

interface TeamAnalytics {
  team: string;
  team_lead: string;
  cc_count: number;
  total_issues: number;
  this_week: number;
  last_week: number;
  week_trend: number;
  this_month: number;
  critical_count: number;
  avg_rate: number | null;
  status: 'improving' | 'declining' | 'stable';
}

interface IssueAnalytics {
  issue_types: { type: string; count: number }[];
  comparison: {
    this_month: number;
    last_month: number;
    change_percent: number;
    this_month_critical: number;
    last_month_critical: number;
    critical_change_percent: number;
  };
  insights: string[];
  top_teams: { team: string; count: number; top_issue: string }[];
  top_sources: { source: string; count: number }[];
}

type DashboardTab = 'issues' | 'returns';

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('issues');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamLead, setSelectedTeamLead] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [period, setPeriod] = useState<Period>('week');
  const [showAllCC, setShowAllCC] = useState(false);
  const [issueFilterParams, setIssueFilterParams] = useState<IssueFilterParams>({});

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.overview,
  });

  const { data: trends } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => dashboardApi.trends(30),
  });

  const { data: ccAnalyticsData } = useQuery({
    queryKey: ['dashboard', 'cc-analytics', issueFilterParams],
    queryFn: () => dashboardApi.ccAnalytics(issueFilterParams),
  });

  const { data: teamAnalyticsData } = useQuery({
    queryKey: ['dashboard', 'team-analytics'],
    queryFn: dashboardApi.teamAnalytics,
  });

  const { data: issueAnalyticsData } = useQuery({
    queryKey: ['dashboard', 'issue-analytics'],
    queryFn: dashboardApi.issueAnalytics,
  });

  if (overviewLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-lg text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  const ccAnalytics: CCAnalytics[] = ccAnalyticsData?.cc_analytics || [];
  const teamAnalytics: TeamAnalytics[] = teamAnalyticsData?.team_analytics || [];
  const issueAnalytics: IssueAnalytics | null = issueAnalyticsData || null;

  // Aggregate data by team lead
  const teamLeadStats = ccAnalytics.reduce((acc, cc) => {
    const teamLead = cc.team_lead || 'Unassigned';
    if (!acc[teamLead]) {
      acc[teamLead] = {
        teamLead,
        ccCount: 0,
        this_week: 0,
        last_week: 0,
        this_month: 0,
        last_month: 0,
        this_quarter: 0,
        last_quarter: 0,
        members: [] as CCAnalytics[],
      };
    }
    acc[teamLead].ccCount++;
    acc[teamLead].this_week += cc.this_week;
    acc[teamLead].last_week += cc.last_week;
    acc[teamLead].this_month += cc.this_month;
    acc[teamLead].last_month += cc.last_month;
    acc[teamLead].this_quarter += cc.this_quarter || 0;
    acc[teamLead].last_quarter += cc.last_quarter || 0;
    acc[teamLead].members.push(cc);
    return acc;
  }, {} as Record<string, { teamLead: string; ccCount: number; this_week: number; last_week: number; this_month: number; last_month: number; this_quarter: number; last_quarter: number; members: CCAnalytics[] }>);

  // Convert to array and sort by current period issues
  const teamLeadList = Object.values(teamLeadStats)
    .filter(tl => tl.teamLead !== 'N/A' && tl.teamLead !== 'Unassigned')
    .sort((a, b) => {
      const aValue = period === 'week' ? a.this_week : period === 'month' ? a.this_month : a.this_quarter;
      const bValue = period === 'week' ? b.this_week : period === 'month' ? b.this_month : b.this_quarter;
      return bValue - aValue;
    });

  // Get CCs for selected team lead
  const selectedTeamLeadData = selectedTeamLead ? teamLeadStats[selectedTeamLead] : null;

  // Filter CCs within selected team lead
  const filteredCCAnalytics = selectedTeamLeadData
    ? selectedTeamLeadData.members.filter(cc => {
        const matchesSearch = cc.cc_name.toLowerCase().includes(searchTerm.toLowerCase());

        // Get values based on selected period
        const currentValue = period === 'week' ? cc.this_week : period === 'month' ? cc.this_month : cc.this_quarter;
        const previousValue = period === 'week' ? cc.last_week : period === 'month' ? cc.last_month : cc.last_quarter;

        // Calculate actual status based on selected period
        const periodStatus = calculateStatus(currentValue, previousValue);

        // Filter by status
        let matchesStatus = true;
        if (statusFilter !== 'all') {
          matchesStatus = periodStatus === statusFilter;
        }

        return matchesSearch && matchesStatus;
      })
    : [];

  // Summary stats
  const improvingCount = ccAnalytics.filter(cc => cc.status === 'improving').length;
  const decliningCount = ccAnalytics.filter(cc => cc.status === 'declining').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Analytics Dashboard" />

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-2">
          <TabButton
            active={activeTab === 'issues'}
            onClick={() => setActiveTab('issues')}
            icon={<AlertCircle className="w-4 h-4" />}
            label="Issues"
            badge={overview?.total_issues || 0}
          />
          <TabButton
            active={activeTab === 'returns'}
            onClick={() => setActiveTab('returns')}
            icon={<RotateCcw className="w-4 h-4" />}
            label="Returns"
          />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Issues Tab Content */}
        {activeTab === 'issues' && (
          <>
        {/* Historical Period Selector */}
        <IssueDatePeriodSelector value={issueFilterParams} onChange={setIssueFilterParams} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Issues"
            value={overview?.total_issues || 0}
            subtitle="All time"
            icon={<AlertCircle className="w-6 h-6" />}
            color="indigo"
          />
          <StatCard
            title="This Week"
            value={overview?.issues_this_week || 0}
            subtitle={`${improvingCount} improving, ${decliningCount} declining`}
            icon={<Calendar className="w-6 h-6" />}
            trend={teamAnalytics.reduce((sum, t) => sum + t.week_trend, 0) / (teamAnalytics.length || 1)}
            color="emerald"
          />
          <StatCard
            title="This Month"
            value={overview?.issues_this_month || 0}
            subtitle="Current period"
            icon={<TrendingUp className="w-6 h-6" />}
            color="amber"
          />
          <StatCard
            title="Critical Issues"
            value={overview?.critical_issues || 0}
            subtitle={`${((overview?.critical_issues || 0) / (overview?.total_issues || 1) * 100).toFixed(1)}% of total`}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="rose"
          />
        </div>

        {/* Trend Chart & Team Summary */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Issues Trend</h3>
                <p className="text-sm text-gray-500">Last 30 days</p>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends?.trends || []}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900">Improving</p>
                    <p className="text-xs text-emerald-600">fewer errors vs last 7 days</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-emerald-600">{improvingCount}</span>
                  <p className="text-xs text-emerald-500">people</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-rose-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-rose-900">Declining</p>
                    <p className="text-xs text-rose-600">more errors vs last 7 days</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-rose-600">{decliningCount}</span>
                  <p className="text-xs text-rose-500">people</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Month Comparison & Insights */}
        {issueAnalytics && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Month Comparison */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Month Comparison</h3>

              <div className="space-y-4">
                {/* Total Issues */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Total Issues</span>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                      issueAnalytics.comparison.change_percent > 0
                        ? 'bg-rose-100 text-rose-700'
                        : issueAnalytics.comparison.change_percent < 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {issueAnalytics.comparison.change_percent > 0 ? '+' : ''}
                      {issueAnalytics.comparison.change_percent}%
                    </span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {issueAnalytics.comparison.this_month}
                      </p>
                      <p className="text-xs text-gray-400">This Month</p>
                    </div>
                    <div className="text-gray-300 mb-1">vs</div>
                    <div>
                      <p className="text-lg font-semibold text-gray-400">
                        {issueAnalytics.comparison.last_month}
                      </p>
                      <p className="text-xs text-gray-400">Last Month</p>
                    </div>
                  </div>
                </div>

                {/* Critical Issues */}
                <div className="p-4 bg-rose-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-rose-600">Critical Issues</span>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                      issueAnalytics.comparison.critical_change_percent > 0
                        ? 'bg-rose-200 text-rose-800'
                        : issueAnalytics.comparison.critical_change_percent < 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {issueAnalytics.comparison.critical_change_percent > 0 ? '+' : ''}
                      {issueAnalytics.comparison.critical_change_percent}%
                    </span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div>
                      <p className="text-2xl font-bold text-rose-700">
                        {issueAnalytics.comparison.this_month_critical}
                      </p>
                      <p className="text-xs text-rose-400">This Month</p>
                    </div>
                    <div className="text-rose-200 mb-1">vs</div>
                    <div>
                      <p className="text-lg font-semibold text-rose-300">
                        {issueAnalytics.comparison.last_month_critical}
                      </p>
                      <p className="text-xs text-rose-300">Last Month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Insights</h3>
              </div>

              {issueAnalytics.insights.length > 0 ? (
                <div className="space-y-3">
                  {issueAnalytics.insights.map((insight, index) => (
                    <div key={index} className="flex gap-3 p-3 bg-amber-50 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{insight}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No insights available yet</p>
              )}

              {/* Top Sources */}
              {issueAnalytics.top_sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Top Sources This Month</p>
                  <div className="flex flex-wrap gap-2">
                    {issueAnalytics.top_sources.map((source) => (
                      <span
                        key={source.source}
                        className={`px-2 py-1 rounded-md text-xs font-medium ${getSourceBadgeClass(source.source)}`}
                      >
                        {source.source}: {source.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Performance - Interactive Section */}
        <div className="space-y-4">
          {/* Header with filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Team Performance</h2>
              <p className="text-sm text-gray-500">
                {selectedTeamLead
                  ? `${selectedTeamLeadData?.ccCount || 0} team members in ${selectedTeamLead}'s team`
                  : `${teamLeadList.length} team leads - click to see team details`
                }
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Period Selector */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['week', 'month', 'quarter'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      period === p
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Quarter'}
                  </button>
                ))}
              </div>

              {/* Back button when team lead is selected */}
              {selectedTeamLead && (
                <button
                  onClick={() => {
                    setSelectedTeamLead(null);
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  Back to all teams
                </button>
              )}

              {/* Search - only when team lead is selected */}
              {selectedTeamLead && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search CC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-40"
                  />
                </div>
              )}

              {/* Status Filter - only when team lead is selected */}
              {selectedTeamLead && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="declining">Declining</option>
                  <option value="improving">Improving</option>
                  <option value="stable">Stable</option>
                </select>
              )}
            </div>
          </div>

          {/* Team Leads Grid (default view) */}
          {!selectedTeamLead && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {teamLeadList.map((tl) => (
                <TeamLeadCard
                  key={tl.teamLead}
                  teamLead={tl.teamLead}
                  ccCount={tl.ccCount}
                  currentIssues={period === 'week' ? tl.this_week : period === 'month' ? tl.this_month : tl.this_quarter}
                  previousIssues={period === 'week' ? tl.last_week : period === 'month' ? tl.last_month : tl.last_quarter}
                  period={period}
                  onClick={() => setSelectedTeamLead(tl.teamLead)}
                  isSelected={false}
                />
              ))}
            </div>
          )}

          {/* CC Cards Grid (when team lead is selected) */}
          {selectedTeamLead && (
            <>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {(showAllCC ? filteredCCAnalytics : filteredCCAnalytics.slice(0, 10)).map((cc) => (
                  <CCCard key={cc.cc_id} cc={cc} period={period} />
                ))}
              </div>

              {filteredCCAnalytics.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No team members match the current filters
                </div>
              )}

              {/* Show More/Less Button */}
              {filteredCCAnalytics.length > 10 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setShowAllCC(!showAllCC)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {showAllCC ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show All ({filteredCCAnalytics.length - 10} more)
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
          </>
        )}

        {/* Returns Tab Content */}
        {activeTab === 'returns' && (
          <ReturnsTabContent />
        )}
      </div>
    </div>
  );
}
