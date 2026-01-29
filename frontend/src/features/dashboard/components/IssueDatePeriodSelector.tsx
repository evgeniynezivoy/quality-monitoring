import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { ChevronDown } from 'lucide-react';

export interface IssueFilterParams {
  year?: number;
  month?: number;
}

interface IssueDatePeriodSelectorProps {
  value: IssueFilterParams;
  onChange: (params: IssueFilterParams) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function IssueDatePeriodSelector({ value, onChange }: IssueDatePeriodSelectorProps) {
  const { data: periods, isLoading } = useQuery({
    queryKey: ['dashboard', 'available-periods'],
    queryFn: dashboardApi.availablePeriods,
    staleTime: 5 * 60 * 1000,
  });

  const handleYearChange = (year: number | null) => {
    if (year === null) {
      onChange({});
    } else {
      onChange({ year, month: undefined });
    }
  };

  const handleMonthChange = (month: number | null) => {
    if (!value.year) return;
    if (month === null) {
      onChange({ year: value.year, month: undefined });
    } else {
      onChange({ year: value.year, month });
    }
  };

  const availableYears = periods?.years || [];
  const availableMonths = value.year ? (periods?.months_by_year?.[value.year] || []) : [];

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Period:</span>

        {/* Year Dropdown */}
        <div className="relative">
          <select
            value={value.year || ''}
            onChange={(e) => handleYearChange(e.target.value ? parseInt(e.target.value, 10) : null)}
            disabled={isLoading}
            className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer disabled:opacity-50"
          >
            <option value="">Current</option>
            {availableYears.map((year: number) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Month Dropdown */}
        {value.year && (
          <div className="relative">
            <select
              value={value.month || ''}
              onChange={(e) => handleMonthChange(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
            >
              <option value="">All Year</option>
              {availableMonths.map((month: number) => (
                <option key={month} value={month}>{MONTH_NAMES[month - 1]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Current Selection Label */}
      <div className="ml-auto text-sm text-gray-500">
        {value.year && value.month ? (
          <span className="font-medium text-indigo-600">{MONTH_NAMES[value.month - 1]} {value.year}</span>
        ) : value.year ? (
          <span className="font-medium text-indigo-600">Full Year {value.year}</span>
        ) : (
          <span className="font-medium text-gray-700">Current Period</span>
        )}
      </div>
    </div>
  );
}
