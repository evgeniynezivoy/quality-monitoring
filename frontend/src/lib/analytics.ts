import { SOURCE_BADGE_CLASSES, DEFAULT_SOURCE_BADGE_CLASS, type Status } from './constants';

/**
 * Calculate status based on current vs previous period values
 * For issues/errors: fewer = improving, more = declining
 */
export function calculateStatus(current: number, previous: number): Status {
  if (current < previous) return 'improving';
  if (current > previous) return 'declining';
  return 'stable';
}

/**
 * Calculate trend percentage change
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get CSS class for source badge based on source name
 */
export function getSourceBadgeClass(source: string): string {
  return SOURCE_BADGE_CLASSES[source] || DEFAULT_SOURCE_BADGE_CLASS;
}

/**
 * Get initials from full name (max 2 characters)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format number with locale-specific separators
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Calculate percentage with optional decimal places
 */
export function calculatePercentage(value: number, total: number, decimals: number = 1): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
