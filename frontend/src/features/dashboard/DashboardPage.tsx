import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { dashboardApi, returnsApi } from '@/lib/api';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RotateCcw,
  Package,
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

// Types
interface CCAnalytics {
  cc_id: number;
  cc_name: string;
  team: string;
  team_lead: string;
  total_issues: number;
  this_week: number;
  last_week: number;
  week_trend: number;
  this_month: number;
  last_month: number;
  month_trend: number;
  this_quarter: number;
  last_quarter: number;
  quarter_trend: number;
  sources: string[];
  status: 'improving' | 'declining' | 'stable';
}

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

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  color: string;
}) {
  const bgColors: Record<string, string> = {
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600',
    rose: 'bg-gradient-to-br from-rose-500 to-rose-600',
  };

  return (
    <div className={`${bgColors[color]} rounded-2xl p-6 text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {subtitle && <p className="text-white/60 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 bg-white/20 rounded-xl">
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          {trend > 0 ? (
            <ArrowUpRight className="w-4 h-4 text-white/80" />
          ) : trend < 0 ? (
            <ArrowDownRight className="w-4 h-4 text-white/80" />
          ) : (
            <Minus className="w-4 h-4 text-white/80" />
          )}
          <span className="text-sm text-white/80">{Math.abs(trend)}% vs last week</span>
        </div>
      )}
    </div>
  );
}

// Team Lead Card Component (for aggregated team lead stats)
function TeamLeadCard({
  teamLead,
  ccCount,
  currentIssues,
  previousIssues,
  period,
  onClick,
  isSelected
}: {
  teamLead: string;
  ccCount: number;
  currentIssues: number;
  previousIssues: number;
  period: Period;
  onClick: () => void;
  isSelected: boolean;
}) {
  const status = calculateStatus(currentIssues, previousIssues);
  const trend = calculateTrend(currentIssues, previousIssues);

  const statusConfig = {
    improving: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: TrendingDown },
    declining: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: TrendingUp },
    stable: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: Minus },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const periodLabels = {
    week: { current: 'This Week', previous: 'Last Week' },
    month: { current: 'This Month', previous: 'Last Month' },
    quarter: { current: 'This Quarter', previous: 'Last Quarter' },
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left ${config.bg} ${config.border} border rounded-xl p-4 hover:shadow-md transition-all ${
        isSelected ? 'ring-2 ring-indigo-500' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{teamLead}</p>
          <p className="text-xs text-gray-500">{ccCount} team members</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
          <StatusIcon className="w-3 h-3" />
          <span className="text-xs font-medium">
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{currentIssues}</p>
          <p className="text-xs text-gray-500">{periodLabels[period].current}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-400">{previousIssues}</p>
          <p className="text-xs text-gray-400">{periodLabels[period].previous}</p>
        </div>
      </div>
    </button>
  );
}

// Period type
type Period = 'week' | 'month' | 'quarter';

// Helper to calculate status based on current/previous values
function calculateStatus(current: number, previous: number): 'improving' | 'declining' | 'stable' {
  if (current < previous) return 'improving'; // fewer issues = good
  if (current > previous) return 'declining'; // more issues = bad
  return 'stable';
}

// Helper to calculate trend percentage
function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// CC Card Component
function CCCard({ cc, period }: { cc: CCAnalytics; period: Period }) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const statusConfig = {
    improving: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: TrendingDown },
    declining: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: TrendingUp },
    stable: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: Minus },
  };

  const avatarColors = [
    'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
  ];

  // Get values based on period
  const currentValue = period === 'week' ? cc.this_week : period === 'month' ? cc.this_month : cc.this_quarter;
  const previousValue = period === 'week' ? cc.last_week : period === 'month' ? cc.last_month : cc.last_quarter;

  // Calculate status and trend based on selected period values
  const periodStatus = calculateStatus(currentValue, previousValue);
  const trend = calculateTrend(currentValue, previousValue);

  const status = statusConfig[periodStatus];
  const StatusIcon = status.icon;

  const periodLabels = {
    week: { current: 'This Week', previous: 'Last Week' },
    month: { current: 'This Month', previous: 'Last Month' },
    quarter: { current: 'This Quarter', previous: 'Last Quarter' },
  };

  return (
    <div className={`${status.bg} ${status.border} border rounded-xl p-4 hover:shadow-md transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${avatarColors[cc.cc_id % avatarColors.length]} flex items-center justify-center text-white text-xs font-medium`}>
            {getInitials(cc.cc_name)}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm leading-tight">{cc.cc_name}</p>
            <p className="text-xs text-gray-500">{cc.team}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
          <StatusIcon className="w-3 h-3" />
          <span className="text-xs font-medium">
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{currentValue}</p>
          <p className="text-xs text-gray-500">{periodLabels[period].current}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-400">{previousValue}</p>
          <p className="text-xs text-gray-400">{periodLabels[period].previous}</p>
        </div>
      </div>

      {/* Sources */}
      {cc.sources && cc.sources.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-200/50">
          {cc.sources.map(source => (
            <span
              key={source}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                source === 'LV' ? 'bg-blue-100 text-blue-700' :
                source === 'CS' ? 'bg-purple-100 text-purple-700' :
                source === 'Block' ? 'bg-orange-100 text-orange-700' :
                source === 'CDT_CW' ? 'bg-cyan-100 text-cyan-700' :
                source === 'QA' ? 'bg-pink-100 text-pink-700' :
                'bg-gray-100 text-gray-700'
              }`}
            >
              {source}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Returns Tab Content Component
function ReturnsTabContent() {
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['returns', 'overview'],
    queryFn: returnsApi.overview,
  });

  const { data: trends } = useQuery({
    queryKey: ['returns', 'trends'],
    queryFn: () => returnsApi.trends(30),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['returns', 'analytics', analyticsPeriod],
    queryFn: () => returnsApi.analytics(analyticsPeriod),
  });

  if (overviewLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-lg text-gray-500">Loading returns data...</div>
      </div>
    );
  }

  const hasData = overview && (overview.total_returns > 0 || overview.total_cc_fault > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Returns Data Yet</h3>
          <p className="text-gray-500 mb-6">
            Returns data will appear here after synchronization.
          </p>
        </div>
      </div>
    );
  }

  const periodLabels = { week: 'This Week', month: 'This Month', quarter: 'This Quarter' };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="flex flex-wrap gap-6">
        <div className="flex-1 min-w-[200px]">
          <StatCard
            title="Total Returns"
            value={overview?.total_returns?.toLocaleString() || 0}
            subtitle="All returned leads"
            icon={<Package className="w-6 h-6" />}
            color="indigo"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <StatCard
            title="CC Fault"
            value={overview?.total_cc_fault?.toLocaleString() || 0}
            subtitle={`${overview?.cc_fault_percent || 0}% of returns`}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="rose"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <StatCard
            title="This Week"
            value={overview?.cc_fault_this_week || 0}
            subtitle={`of ${overview?.returns_this_week || 0} returns (${overview?.cc_fault_percent_this_week || 0}%)`}
            icon={<Calendar className="w-6 h-6" />}
            color="emerald"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <StatCard
            title="This Month"
            value={overview?.cc_fault_this_month || 0}
            subtitle={`of ${overview?.returns_this_month || 0} returns (${overview?.cc_fault_percent_this_month || 0}%)`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="amber"
          />
        </div>
      </div>

      {/* Trend Chart & Period Analytics Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Returns Trend</h3>
              <p className="text-sm text-gray-500">Last 30 days</p>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends?.trends || []}>
                <defs>
                  <linearGradient id="returnsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
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
                <Area type="monotone" dataKey="cc_fault" name="CC Fault" stroke="#f43f5e" strokeWidth={2.5} fill="url(#returnsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Period Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Period Summary</h3>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['week', 'month', 'quarter'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setAnalyticsPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    analyticsPeriod === p
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {analyticsLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : analytics?.summary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total Returns</p>
                  <p className="text-xl font-bold text-gray-900">{analytics.summary.total_returns?.toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">CC Fault</p>
                  <p className="text-xl font-bold text-rose-600">{analytics.summary.total_cc_fault?.toLocaleString()}</p>
                  <p className="text-xs text-rose-500">{analytics.summary.cc_fault_percent}%</p>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">CCs with faults</span>
                <span className="font-medium">{analytics.summary.cc_with_faults}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Blocks affected</span>
                <span className="font-medium">{analytics.summary.blocks_affected}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No data</p>
          )}
        </div>
      </div>

      {/* Period Analytics - Reasons & Teams */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CC Fault Reasons Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">CC Fault Distribution</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{periodLabels[analyticsPeriod]}</span>
          </div>
          {analytics?.by_reason?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Reason</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500">Count</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500">CIDs</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.by_reason.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-50">
                      <td className="py-2">
                        <span className="text-sm text-gray-700">{item.reason?.replace('CC: ', '')}</span>
                      </td>
                      <td className="py-2 text-right font-semibold text-rose-600">{item.count}</td>
                      <td className="py-2 text-right text-gray-500">{item.unique_cids}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td className="py-2 font-medium text-gray-900">Total</td>
                    <td className="py-2 text-right font-bold text-rose-600">
                      {analytics.by_reason.reduce((sum: number, r: any) => sum + r.count, 0)}
                    </td>
                    <td className="py-2 text-right text-gray-500">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No CC faults in this period</p>
          )}
        </div>

        {/* By Team Lead */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">By Team Lead</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{periodLabels[analyticsPeriod]}</span>
          </div>
          {analytics?.by_team?.length > 0 ? (
            <div className="space-y-3">
              {analytics.by_team.map((team: any) => (
                <div key={team.team_lead_id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{team.team_lead_name}</span>
                    <span className="text-rose-600 font-bold">{team.total_cc_fault} faults</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{team.cc_count} CCs • {team.total_returns} returns</span>
                    <span className="text-rose-500">{team.cc_fault_percent}%</span>
                  </div>
                  {team.blocks?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {team.blocks.slice(0, 5).map((block: string) => (
                        <span key={block} className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          {block}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No CC faults in this period</p>
          )}
        </div>
      </div>

      {/* CC Details Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">CC Fault Details</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{periodLabels[analyticsPeriod]} • Active CCs only</span>
        </div>
        {analytics?.by_cc?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">CC</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Team Lead</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Blocks</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">Returns</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">CC Fault</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody>
                {analytics.by_cc.map((cc: any) => (
                  <tr key={cc.cc_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium text-gray-900">{cc.cc_name}</p>
                        {cc.cc_abbreviation && (
                          <p className="text-xs text-gray-400">{cc.cc_abbreviation}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-600">{cc.team_lead || '-'}</td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-1">
                        {cc.blocks?.slice(0, 3).map((block: string) => (
                          <span key={block} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {block}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700">{cc.total_returns?.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-semibold text-rose-600">{cc.total_cc_fault}</td>
                    <td className="py-3 px-2 text-right text-gray-500">{cc.cc_fault_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No CC faults in this period</p>
        )}
      </div>
    </div>
  );
}

// Tab types
type DashboardTab = 'issues' | 'returns';

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('issues');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamLead, setSelectedTeamLead] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [period, setPeriod] = useState<Period>('week');
  const [showAllCC, setShowAllCC] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.overview,
  });

  const { data: trends } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => dashboardApi.trends(30),
  });

  const { data: ccAnalyticsData } = useQuery({
    queryKey: ['dashboard', 'cc-analytics'],
    queryFn: dashboardApi.ccAnalytics,
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
        {/* KPI Cards */}
        <div className="flex flex-wrap gap-6">
          <div className="flex-1 min-w-[200px]">
            <StatCard
              title="Total Issues"
              value={overview?.total_issues || 0}
              subtitle="All time"
              icon={<AlertCircle className="w-6 h-6" />}
              color="indigo"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <StatCard
              title="This Week"
              value={overview?.issues_this_week || 0}
              subtitle={`${improvingCount} ↓ fewer errors, ${decliningCount} ↑ more errors`}
              icon={<Calendar className="w-6 h-6" />}
              trend={teamAnalytics.reduce((sum, t) => sum + t.week_trend, 0) / (teamAnalytics.length || 1)}
              color="emerald"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <StatCard
              title="This Month"
              value={overview?.issues_this_month || 0}
              subtitle="Current period"
              icon={<TrendingUp className="w-6 h-6" />}
              color="amber"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <StatCard
              title="Critical Issues"
              value={overview?.critical_issues || 0}
              subtitle={`${((overview?.critical_issues || 0) / (overview?.total_issues || 1) * 100).toFixed(1)}% of total`}
              icon={<AlertTriangle className="w-6 h-6" />}
              color="rose"
            />
          </div>
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
                    <p className="text-xs text-emerald-600">↓ fewer errors vs last 7 days</p>
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
                    <p className="text-xs text-rose-600">↑ more errors vs last 7 days</p>
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
                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                          source.source === 'LV' ? 'bg-blue-100 text-blue-700' :
                          source.source === 'CS' ? 'bg-purple-100 text-purple-700' :
                          source.source === 'Block' ? 'bg-orange-100 text-orange-700' :
                          source.source === 'CDT_CW' ? 'bg-cyan-100 text-cyan-700' :
                          source.source === 'QA' ? 'bg-pink-100 text-pink-700' :
                          'bg-gray-100 text-gray-700'
                        }`}
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
                  : `${teamLeadList.length} team leads • click to see team details`
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
                  ← Back to all teams
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
                  <option value="declining">↑ Declining</option>
                  <option value="improving">↓ Improving</option>
                  <option value="stable">→ Stable</option>
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
