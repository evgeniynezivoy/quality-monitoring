import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  color: 'indigo' | 'emerald' | 'amber' | 'rose';
}

const bgColors: Record<string, string> = {
  indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  amber: 'bg-gradient-to-br from-amber-500 to-amber-600',
  rose: 'bg-gradient-to-br from-rose-500 to-rose-600',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
}: StatCardProps) {
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
