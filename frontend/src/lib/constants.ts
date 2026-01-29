export type Period = 'week' | 'month' | 'quarter';
export type Status = 'improving' | 'declining' | 'stable';

export const STATUS_CONFIG: Record<Status, {
  bg: string;
  border: string;
  text: string;
}> = {
  improving: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  declining: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
  },
  stable: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
  },
};

export const PERIOD_LABELS: Record<Period, { current: string; previous: string }> = {
  week: { current: 'This Week', previous: 'Last Week' },
  month: { current: 'This Month', previous: 'Last Month' },
  quarter: { current: 'This Quarter', previous: 'Last Quarter' },
};

export const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-teal-500',
];

export const SOURCE_BADGE_CLASSES: Record<string, string> = {
  LV: 'bg-blue-100 text-blue-700',
  CS: 'bg-purple-100 text-purple-700',
  Block: 'bg-orange-100 text-orange-700',
  CDT_CW: 'bg-cyan-100 text-cyan-700',
  QA: 'bg-pink-100 text-pink-700',
};

export const DEFAULT_SOURCE_BADGE_CLASS = 'bg-gray-100 text-gray-700';
