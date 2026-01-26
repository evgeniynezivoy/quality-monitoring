export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value === 'true' || value === '1';
}

export function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function getDateRange(period: 'today' | 'week' | 'month' | 'quarter' | 'year'): {
  from: string;
  to: string;
} {
  const now = new Date();
  const to = formatDate(now);
  let from: Date;

  switch (period) {
    case 'today':
      from = now;
      break;
    case 'week':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = now;
  }

  return { from: formatDate(from), to };
}
