import { useQuery } from '@tanstack/react-query';
import { returnsApi, type ReturnsAnalyticsParams } from '@/lib/api';
import { ChevronDown } from 'lucide-react';

type QuickPeriod = 'week' | 'month' | 'quarter';

interface DatePeriodSelectorProps {
  value: ReturnsAnalyticsParams;
  onChange: (params: ReturnsAnalyticsParams) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DatePeriodSelector({ value, onChange }: DatePeriodSelectorProps) {
  const { data: periods, isLoading } = useQuery({
    queryKey: ['returns', 'available-periods'],
    queryFn: returnsApi.availablePeriods,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleYearChange = (year: number | null) => {
    if (year === null) {
      // Reset to current month
      onChange({ period: 'month' });
    } else {
      // Select full year, clear month/quarter
      onChange({ year, month: undefined, quarter: undefined });
    }
  };

  const handleMonthChange = (month: number | null) => {
    if (!value.year) return;
    if (month === null) {
      // Full year selected
      onChange({ year: value.year, month: undefined, quarter: undefined });
    } else {
      onChange({ year: value.year, month, quarter: undefined });
    }
  };

  const handleQuickPeriod = (period: QuickPeriod) => {
    onChange({ period, year: undefined, month: undefined, quarter: undefined });
  };

  const isQuickPeriodActive = (period: QuickPeriod) => {
    return !value.year && value.period === period;
  };

  const availableYears = periods?.years || [];
  const availableMonths = value.year ? (periods?.months_by_year?.[value.year] || []) : [];

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Year/Month Selectors */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Period:</span>

        {/* Year Dropdown */}
        <div className="relative">
          <select
            value={value.year || ''}
            onChange={(e) => handleYearChange(e.target.value ? parseInt(e.target.value, 10) : null)}
            disabled={isLoading}
            className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent cursor-pointer disabled:opacity-50"
          >
            <option value="">Current</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Month Dropdown - Only shown when year is selected */}
        {value.year && (
          <div className="relative">
            <select
              value={value.month || ''}
              onChange={(e) => handleMonthChange(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent cursor-pointer"
            >
              <option value="">All Year</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>{MONTH_NAMES[month - 1]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Quick Period Buttons */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500 mr-2">Quick:</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['week', 'month', 'quarter'] as const).map((period) => (
            <button
              key={period}
              onClick={() => handleQuickPeriod(period)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                isQuickPeriodActive(period)
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {period === 'week' ? 'W' : period === 'month' ? 'M' : 'Q'}
            </button>
          ))}
        </div>
      </div>

      {/* Current Selection Label */}
      <div className="ml-auto text-sm text-gray-500">
        {value.year && value.month ? (
          <span className="font-medium text-rose-600">{MONTH_NAMES[value.month - 1]} {value.year}</span>
        ) : value.year ? (
          <span className="font-medium text-rose-600">Full Year {value.year}</span>
        ) : (
          <span className="font-medium text-gray-700">
            {value.period === 'week' ? 'This Week' : value.period === 'quarter' ? 'This Quarter' : 'This Month'}
          </span>
        )}
      </div>
    </div>
  );
}
