import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { dashboardApi } from '@/lib/api';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RotateCcw,
  Package,
  ChevronDown,
  ChevronUp,
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

// Team Card Component
function TeamCard({ team }: { team: TeamAnalytics }) {
  const statusColors = {
    improving: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    declining: 'bg-rose-100 text-rose-700 border-rose-200',
    stable: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const trendColors = {
    improving: 'text-emerald-600',
    declining: 'text-rose-600',
    stable: 'text-slate-500',
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{team.team}</h3>
          <p className="text-sm text-gray-500">{team.team_lead}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[team.status]}`}>
          {team.status === 'improving' ? '↓ Improving' : team.status === 'declining' ? '↑ Declining' : '→ Stable'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">{team.this_week}</p>
          <p className="text-xs text-gray-500">This Week</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-400">{team.last_week}</p>
          <p className="text-xs text-gray-500">Last Week</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${trendColors[team.status]}`}>
            {team.week_trend > 0 ? '+' : ''}{team.week_trend}%
          </p>
          <p className="text-xs text-gray-500">Trend</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{team.cc_count} CCs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-gray-600">{team.critical_count} critical</span>
          </div>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Avg: </span>
          <span className={`font-medium ${
            (team.avg_rate || 0) >= 2.5 ? 'text-rose-600' :
            (team.avg_rate || 0) >= 1.5 ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {team.avg_rate?.toFixed(1) || '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Period type
type Period = 'week' | 'month' | 'quarter';

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

  const status = statusConfig[cc.status];
  const StatusIcon = status.icon;

  // Get values based on period
  const currentValue = period === 'week' ? cc.this_week : cc.this_month;
  const previousValue = period === 'week' ? cc.last_week : cc.last_month;
  const trend = period === 'week' ? cc.week_trend : cc.month_trend;

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
  const [teamFilter, setTeamFilter] = useState<string>('all');
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

  if (overviewLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-lg text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  const ccAnalytics: CCAnalytics[] = ccAnalyticsData?.cc_analytics || [];
  const teamAnalytics: TeamAnalytics[] = teamAnalyticsData?.team_analytics || [];

  // Get unique teams for filter
  const teams = [...new Set(ccAnalytics.map(cc => cc.team))].filter(t => t !== 'Unknown');

  // Filter CC analytics
  const filteredCCAnalytics = ccAnalytics.filter(cc => {
    const matchesSearch = cc.cc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          cc.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = teamFilter === 'all' || cc.team === teamFilter;
    let matchesStatus = true;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'active') {
      matchesStatus = cc.status === 'improving' || cc.status === 'declining';
    } else {
      matchesStatus = cc.status === statusFilter;
    }
    return matchesSearch && matchesTeam && matchesStatus;
  });

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            subtitle={`${improvingCount} ↓ fewer errors, ${decliningCount} ↑ more errors`}
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

        {/* Team Performance */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Team Performance</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teamAnalytics.filter(t => t.team !== 'Unknown').map((team) => (
              <TeamCard key={team.team} team={team} />
            ))}
          </div>
        </div>

        {/* CC Performance Cards */}
        <div className="space-y-4">
          {/* Header with filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">CC Performance</h2>
              <p className="text-sm text-gray-500">
                {filteredCCAnalytics.length} people • sorted by issues count
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
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-40"
                />
              </div>
              {/* Team Filter */}
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">All Teams</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
              {/* Status Filter */}
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
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {(showAllCC ? filteredCCAnalytics : filteredCCAnalytics.slice(0, 10)).map((cc) => (
              <CCCard key={cc.cc_id} cc={cc} period={period} />
            ))}
          </div>

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
        </div>
          </>
        )}

        {/* Returns Tab Content */}
        {activeTab === 'returns' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Returns Analytics</h3>
              <p className="text-gray-500 mb-6">
                This section will display returns data from the external platform.
                Data integration is pending database access configuration.
              </p>
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-500 mb-1">Coming Soon:</p>
                <ul className="space-y-1 text-left">
                  <li>- Returns by date</li>
                  <li>- Returns by team/agent</li>
                  <li>- Return reasons analytics</li>
                  <li>- Trend analysis</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
