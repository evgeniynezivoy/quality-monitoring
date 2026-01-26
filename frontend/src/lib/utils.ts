import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRateColor(rate: number | null): string {
  switch (rate) {
    case 1:
      return 'bg-yellow-100 text-yellow-800';
    case 2:
      return 'bg-orange-100 text-orange-800';
    case 3:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getRateLabel(rate: number | null): string {
  switch (rate) {
    case 1:
      return 'Minor';
    case 2:
      return 'Medium';
    case 3:
      return 'Critical';
    default:
      return 'N/A';
  }
}
