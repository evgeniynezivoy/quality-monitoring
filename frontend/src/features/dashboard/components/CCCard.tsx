import {
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { calculateStatus, calculateTrend, getSourceBadgeClass } from '@/lib/analytics';
import { STATUS_CONFIG, PERIOD_LABELS, AVATAR_COLORS, type Period } from '@/lib/constants';

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

interface CCCardProps {
  cc: CCAnalytics;
  period: Period;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function CCCard({ cc, period }: CCCardProps) {
  const statusIcons = {
    improving: TrendingDown,
    declining: TrendingUp,
    stable: Minus,
  };

  // Get values based on period
  const currentValue = period === 'week' ? cc.this_week : period === 'month' ? cc.this_month : cc.this_quarter;
  const previousValue = period === 'week' ? cc.last_week : period === 'month' ? cc.last_month : cc.last_quarter;

  // Calculate status and trend based on selected period values
  const periodStatus = calculateStatus(currentValue, previousValue);
  const trend = calculateTrend(currentValue, previousValue);

  const config = STATUS_CONFIG[periodStatus];
  const StatusIcon = statusIcons[periodStatus];
  const labels = PERIOD_LABELS[period];

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl p-4 hover:shadow-md transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[cc.cc_id % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-medium`}>
            {getInitials(cc.cc_name)}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm leading-tight">{cc.cc_name}</p>
            <p className="text-xs text-gray-500">{cc.team}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
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
          <p className="text-xs text-gray-500">{labels.current}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-400">{previousValue}</p>
          <p className="text-xs text-gray-400">{labels.previous}</p>
        </div>
      </div>

      {/* Sources */}
      {cc.sources && cc.sources.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-200/50">
          {cc.sources.map(source => (
            <span
              key={source}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getSourceBadgeClass(source)}`}
            >
              {source}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export type { CCAnalytics };
