import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { dashboardApi } from '@/lib/api';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const GRADIENT_COLORS = [
  { start: '#6366f1', end: '#818cf8' },
  { start: '#22c55e', end: '#4ade80' },
  { start: '#f59e0b', end: '#fbbf24' },
  { start: '#ef4444', end: '#f87171' },
];

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color: 'indigo' | 'green' | 'amber' | 'red';
}

function StatCard({ title, value, icon, trend, trendLabel, color }: StatCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  const trendUp = trend !== undefined && trend >= 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        {trendLabel && (
          <p className="text-xs text-gray-400">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}

function PerformanceTable({ data }: { data: any[] }) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarColors = [
    'bg-indigo-500',
    'bg-green-500',
    'bg-amber-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-teal-500',
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">CC Performance Overview</h3>
        <span className="text-sm text-gray-500">Top 10 by issues</span>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide pb-2 border-b">
          <div className="col-span-5">CC Name</div>
          <div className="col-span-2 text-center">Issues</div>
          <div className="col-span-2 text-center">Avg Rate</div>
          <div className="col-span-3 text-center">Severity</div>
        </div>
        {data.slice(0, 8).map((cc, index) => (
          <div key={cc.cc_id || index} className="grid grid-cols-12 gap-4 items-center py-2 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="col-span-5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white text-sm font-medium`}>
                {getInitials(cc.cc_name || 'Unknown')}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{cc.cc_name || 'Unknown'}</p>
                <p className="text-xs text-gray-400">{cc.team || 'N/A'}</p>
              </div>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-sm font-semibold text-gray-900">{cc.count}</span>
            </div>
            <div className="col-span-2 text-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                cc.rate_avg >= 2.5 ? 'bg-red-100 text-red-700' :
                cc.rate_avg >= 1.5 ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {cc.rate_avg?.toFixed(1) || '-'}
              </span>
            </div>
            <div className="col-span-3">
              <div className="flex gap-1 justify-center">
                <div className="h-2 bg-green-400 rounded-full" style={{ width: `${Math.min(cc.count * 0.3, 40)}px` }} title="Minor" />
                <div className="h-2 bg-amber-400 rounded-full" style={{ width: `${Math.min(cc.count * 0.2, 30)}px` }} title="Medium" />
                <div className="h-2 bg-red-400 rounded-full" style={{ width: `${Math.min(cc.count * 0.1, 20)}px` }} title="Critical" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.overview,
  });

  const { data: trends } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => dashboardApi.trends(30),
  });

  const { data: bySource } = useQuery({
    queryKey: ['dashboard', 'bySource'],
    queryFn: dashboardApi.bySource,
  });

  const { data: byCC } = useQuery({
    queryKey: ['dashboard', 'byCC'],
    queryFn: () => dashboardApi.byCC(10),
  });

  if (overviewLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-lg text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  // Calculate week-over-week trend (mock for now)
  const weekTrend = overview?.issues_this_week ?
    Math.round((overview.issues_this_week / (overview.issues_this_month / 4) - 1) * 100) : 0;

  // Prepare pie chart data with better formatting
  const pieData = (bySource?.by_source || []).map((item: any, index: number) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  const totalBySource = pieData.reduce((sum: number, item: any) => sum + item.count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Issues"
            value={overview?.total_issues || 0}
            icon={<AlertCircle className="w-6 h-6" />}
            color="indigo"
            trendLabel="All time"
          />
          <StatCard
            title="Today"
            value={overview?.issues_today || 0}
            icon={<Calendar className="w-6 h-6" />}
            trend={overview?.issues_today ? 12 : 0}
            color="green"
            trendLabel="vs yesterday"
          />
          <StatCard
            title="This Week"
            value={overview?.issues_this_week || 0}
            icon={<TrendingUp className="w-6 h-6" />}
            trend={weekTrend}
            color="amber"
            trendLabel="vs last week"
          />
          <StatCard
            title="Critical Issues"
            value={overview?.critical_issues || 0}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="red"
            trendLabel={`${((overview?.critical_issues || 0) / (overview?.total_issues || 1) * 100).toFixed(1)}% of total`}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Trends Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Issues Trend</h3>
                <p className="text-sm text-gray-500">Last 30 days activity</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-xs text-gray-500">Issues</span>
                </div>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends?.trends || []}>
                  <defs>
                    <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      padding: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#colorIssues)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* By Source Donut */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Issues by Source</h3>
              <p className="text-sm text-gray-500">Distribution overview</p>
            </div>
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalBySource.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {pieData.slice(0, 5).map((item: any, index: number) => (
                <div key={item.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-sm text-gray-600">{item.source}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {((item.count / totalBySource) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Performance Table */}
          <PerformanceTable data={byCC?.by_cc || []} />

          {/* Top Issues Bar Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top CCs by Issue Count</h3>
                <p className="text-sm text-gray-500">Highest issue volume</p>
              </div>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(byCC?.by_cc || []).slice(0, 8)} layout="vertical" barCategoryGap="20%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="cc_name"
                    type="category"
                    width={110}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar
                    dataKey="count"
                    fill="url(#barGradient)"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
