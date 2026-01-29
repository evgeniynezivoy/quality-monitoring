import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { returnsApi, type ReturnsAnalyticsParams } from '@/lib/api';
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Package,
  ChevronDown,
  ChevronRight,
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
import { StatCard } from './StatCard';
import { ReasonDistributionChart } from './ReasonDistributionChart';
import { TeamDistributionChart } from './TeamDistributionChart';
import { DatePeriodSelector } from './DatePeriodSelector';

interface CCData {
  cc_id: number;
  cc_name: string;
  cc_abbreviation?: string;
  team_lead?: string;
  team_lead_id?: number;
  total_returns: number;
  total_cc_fault: number;
  cc_fault_percent: number;
  blocks?: string[];
}

interface ReturnItem {
  id: number;
  cid: string;
  reasons: Array<{ count: number; reason: string }>;
  cc_fault: number;
  return_date: string;
  block?: string;
}

export function ReturnsTabContent() {
  const [dateParams, setDateParams] = useState<ReturnsAnalyticsParams>({ period: 'month' });
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [expandedCCId, setExpandedCCId] = useState<number | null>(null);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['returns', 'overview'],
    queryFn: returnsApi.overview,
  });

  const { data: trends } = useQuery({
    queryKey: ['returns', 'trends'],
    queryFn: () => returnsApi.trends(30),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['returns', 'analytics', dateParams],
    queryFn: () => returnsApi.analytics(dateParams),
  });

  const { data: ccReturns, isLoading: ccReturnsLoading } = useQuery({
    queryKey: ['returns', 'cc-details', expandedCCId],
    queryFn: () => returnsApi.list({ cc_user_id: expandedCCId!, limit: 50 }),
    enabled: expandedCCId !== null,
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

  // Get period label from analytics response or use default
  const periodLabel = analytics?.period_label || 'This Month';

  const filteredCCs = selectedTeamId
    ? analytics?.by_cc?.filter((cc: CCData) => cc.team_lead_id === selectedTeamId)
    : analytics?.by_cc;

  const handleTeamClick = (teamLeadId: number | null) => {
    setSelectedTeamId(teamLeadId);
    setExpandedCCId(null);
  };

  const toggleExpandedCC = (ccId: number) => {
    setExpandedCCId(expandedCCId === ccId ? null : ccId);
  };

  const groupCCFaultsByReason = (returns: ReturnItem[]) => {
    const grouped: Record<string, { count: number; cids: string[] }> = {};
    returns.forEach((ret) => {
      if (ret.cc_fault > 0 && ret.reasons) {
        ret.reasons.forEach((r) => {
          if (r.reason.startsWith('CC:')) {
            if (!grouped[r.reason]) {
              grouped[r.reason] = { count: 0, cids: [] };
            }
            grouped[r.reason].count += r.count;
            if (!grouped[r.reason].cids.includes(ret.cid)) {
              grouped[r.reason].cids.push(ret.cid);
            }
          }
        });
      }
    });
    return Object.entries(grouped).map(([reason, data]) => ({
      reason,
      count: data.count,
      cids: data.cids,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Date Period Selector */}
      <DatePeriodSelector value={dateParams} onChange={setDateParams} />

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
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{periodLabel}</span>
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

      {/* Visualizations - Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reason Distribution Donut Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Fault Reasons Distribution</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{periodLabel}</span>
          </div>
          <ReasonDistributionChart data={analytics?.by_reason || []} />
        </div>

        {/* Team Distribution Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Team Comparison</h3>
              {selectedTeamId && (
                <button
                  onClick={() => handleTeamClick(null)}
                  className="text-xs text-rose-600 hover:text-rose-700 mt-1"
                >
                  Clear filter
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{periodLabel}</span>
          </div>
          <TeamDistributionChart
            data={analytics?.by_team || []}
            onTeamClick={handleTeamClick}
            selectedTeamId={selectedTeamId}
          />
        </div>
      </div>

      {/* Period Analytics - Reasons Table & Teams List */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CC Fault Reasons Distribution Table */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">CC Fault Distribution</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{periodLabel}</span>
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
                  {analytics.by_reason.map((item: { reason: string; count: number; unique_cids: number }, index: number) => (
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
                      {analytics.by_reason.reduce((sum: number, r: { count: number }) => sum + r.count, 0)}
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
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{periodLabel}</span>
          </div>
          {analytics?.by_team?.length > 0 ? (
            <div className="space-y-3">
              {analytics.by_team.map((team: {
                team_lead_id: number;
                team_lead_name: string;
                cc_count: number;
                total_returns: number;
                total_cc_fault: number;
                cc_fault_percent: number;
                blocks: string[];
              }) => (
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

      {/* CC Details Table with Expandable Rows */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">CC Fault Details</h3>
            {selectedTeamId && (
              <p className="text-xs text-rose-600 mt-1">
                Filtered by team • <button onClick={() => handleTeamClick(null)} className="underline">Show all</button>
              </p>
            )}
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{periodLabel} • Active CCs only</span>
        </div>
        {filteredCCs?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase w-8"></th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">CC</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Team Lead</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Blocks</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">Returns</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">CC Fault</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody>
                {filteredCCs.map((cc: CCData) => (
                  <>
                    <tr
                      key={cc.cc_id}
                      className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${expandedCCId === cc.cc_id ? 'bg-rose-50' : ''}`}
                      onClick={() => toggleExpandedCC(cc.cc_id)}
                    >
                      <td className="py-3 px-2">
                        {expandedCCId === cc.cc_id ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
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
                    {/* Expanded Row - CID Details */}
                    {expandedCCId === cc.cc_id && (
                      <tr key={`${cc.cc_id}-expanded`}>
                        <td colSpan={7} className="bg-gray-50 p-4 border-b border-gray-100">
                          {ccReturnsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-pulse text-sm text-gray-500">Loading CID details...</div>
                            </div>
                          ) : ccReturns?.data?.length > 0 ? (() => {
                            const ccFaultGroups = groupCCFaultsByReason(ccReturns.data);
                            return (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Reasons breakdown for {cc.cc_name}
                              </h4>
                              {ccFaultGroups.length > 0 ? (
                              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {ccFaultGroups.map((group) => (
                                  <div key={group.reason} className="bg-white p-3 rounded-lg border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {group.reason.replace('CC: ', '')}
                                      </span>
                                      <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                        {group.count}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {group.cids.slice(0, 5).map((cid) => (
                                        <span key={cid} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                          {cid}
                                        </span>
                                      ))}
                                      {group.cids.length > 5 && (
                                        <span
                                          className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded cursor-help"
                                          title={group.cids.slice(5).join(', ')}
                                        >
                                          +{group.cids.length - 5} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              ) : (
                                <p className="text-sm text-gray-400">No CC fault returns found</p>
                              )}
                            </div>
                            );
                          })() : (
                            <p className="text-sm text-gray-400 text-center">No return details available</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
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
