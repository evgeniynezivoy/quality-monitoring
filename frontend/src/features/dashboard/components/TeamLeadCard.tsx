import {
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { calculateStatus, calculateTrend } from '@/lib/analytics';
import { STATUS_CONFIG, PERIOD_LABELS, type Period } from '@/lib/constants';

interface TeamLeadCardProps {
  teamLead: string;
  ccCount: number;
  currentIssues: number;
  previousIssues: number;
  period: Period;
  onClick: () => void;
  isSelected: boolean;
}

export function TeamLeadCard({
  teamLead,
  ccCount,
  currentIssues,
  previousIssues,
  period,
  onClick,
  isSelected
}: TeamLeadCardProps) {
  const status = calculateStatus(currentIssues, previousIssues);
  const trend = calculateTrend(currentIssues, previousIssues);

  const statusIcons = {
    improving: TrendingDown,
    declining: TrendingUp,
    stable: Minus,
  };

  const config = STATUS_CONFIG[status];
  const StatusIcon = statusIcons[status];
  const labels = PERIOD_LABELS[period];

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
          <p className="text-xs text-gray-500">{labels.current}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-400">{previousIssues}</p>
          <p className="text-xs text-gray-400">{labels.previous}</p>
        </div>
      </div>
    </button>
  );
}
