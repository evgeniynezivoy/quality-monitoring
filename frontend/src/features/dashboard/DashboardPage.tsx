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
  critical_count: number;
  avg_rate: number | null;
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

// CC Table Row Component
function CCTableRow({ cc, rank }: { cc: CCAnalytics; rank: number }) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const statusConfig = {
    improving: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: TrendingDown, label: 'Improving' },
    declining: { bg: 'bg-rose-100', text: 'text-rose-700', icon: TrendingUp, label: 'Declining' },
    stable: { bg: 'bg-slate-100', text: 'text-slate-600', icon: Minus, label: 'Stable' },
  };

  const status = statusConfig[cc.status];
  const StatusIcon = status.icon;

  const avatarColors = [
    'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
  ];

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-4">
        <span className="text-sm font-medium text-gray-400">#{rank}</span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${avatarColors[rank % avatarColors.length]} flex items-center justify-center text-white text-sm font-medium shadow-sm`}>
            {getInitials(cc.cc_name)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{cc.cc_name}</p>
            <p className="text-xs text-gray-500">{cc.team} • {cc.team_lead}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <span className="text-lg font-semibold text-gray-900">{cc.total_issues}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-900">{cc.this_week}</span>
          <span className="text-xs text-gray-400">vs {cc.last_week}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {cc.week_trend > 0 ? '+' : ''}{cc.week_trend}%
          </span>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          (cc.avg_rate || 0) >= 2.5 ? 'bg-rose-100 text-rose-700' :
          (cc.avg_rate || 0) >= 1.5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {cc.avg_rate?.toFixed(1) || '-'}
        </span>
      </td>
      <td className="px-4 py-4 text-center">
        <span className={`font-medium ${cc.critical_count > 10 ? 'text-rose-600' : 'text-gray-600'}`}>
          {cc.critical_count}
        </span>
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${status.bg} ${status.text}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </td>
    </tr>
  );
}

export function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
    const matchesStatus = statusFilter === 'all' || cc.status === statusFilter;
    return matchesSearch && matchesTeam && matchesStatus;
  });

  // Summary stats
  const improvingCount = ccAnalytics.filter(cc => cc.status === 'improving').length;
  const decliningCount = ccAnalytics.filter(cc => cc.status === 'declining').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Analytics Dashboard" />

      <div className="p-6 space-y-6">
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

          {/* Quick Stats */}
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
                    <p className="text-sm text-emerald-600">Less issues than last week</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-emerald-600">{improvingCount}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-rose-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-rose-900">Declining</p>
                    <p className="text-sm text-rose-600">More issues than last week</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-rose-600">{decliningCount}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-500 rounded-lg">
                    <Minus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Stable</p>
                    <p className="text-sm text-slate-600">Similar to last week</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-slate-600">
                  {ccAnalytics.filter(cc => cc.status === 'stable').length}
                </span>
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

        {/* CC Analytics Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">CC Performance Analytics</h2>
                <p className="text-sm text-gray-500">Individual performance with trends</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search CC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-48"
                  />
                </div>
                {/* Team Filter */}
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="improving">Improving</option>
                  <option value="stable">Stable</option>
                  <option value="declining">Declining</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">CC Name</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">This Week</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trend</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Rate</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Critical</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCCAnalytics.slice(0, 50).map((cc, index) => (
                  <CCTableRow key={cc.cc_id || index} cc={cc} rank={index + 1} />
                ))}
              </tbody>
            </table>
          </div>

          {filteredCCAnalytics.length > 50 && (
            <div className="p-4 text-center text-sm text-gray-500 border-t border-gray-100">
              Showing 50 of {filteredCCAnalytics.length} CCs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
