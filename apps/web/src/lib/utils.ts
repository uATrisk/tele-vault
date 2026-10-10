import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Middle-ellipsis truncation for file names so the extension always stays visible.
 * Example: "super-important-contract-final-signed-2026.pdf" -> "super-importan...2026.pdf"
 */
export function truncateMiddle(filename: string, maxLength = 28): string {
  if (!filename || filename.length <= maxLength) return filename;
  
  const extIndex = filename.lastIndexOf('.');
  const ext = extIndex !== -1 ? filename.slice(extIndex) : '';
  const name = extIndex !== -1 ? filename.slice(0, extIndex) : filename;
  
  const charsToShow = maxLength - ext.length - 3;
  if (charsToShow <= 3) {
    return `${name.slice(0, 3)}...${ext}`;
  }
  
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  
  return `${name.slice(0, frontChars)}...${name.slice(-backChars)}${ext}`;
}

/**
 * Locale-aware relative time formatting
 */
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatRelativeTime(date: Date | number): string {
  const now = Date.now();
  const then = typeof date === 'number' ? date : date.getTime();
  const diffSec = Math.round((then - now) / 1000);

  if (Math.abs(diffSec) < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHours = Math.round(diffMin / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month');
  const diffYears = Math.round(diffDays / 365);
  return rtf.format(diffYears, 'year');
}

/**
 * Format bytes with tabular units
 */
export function formatBytesTabular(bytes: number): { value: string; unit: string } {
  if (bytes === 0) return { value: '0', unit: 'B' };
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1));
  return { value: val.toString(), unit: sizes[i] };
}
