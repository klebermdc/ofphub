/**
 * Utility functions for date manipulation
 */

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || '';
}

/**
 * Get current month key in format MM/YYYY
 */
export function getCurrentMonthKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${month}/${year}`;
}

/**
 * Parse date string in format DD/MM/YYYY or DD/MM/YY
 * Returns object with day, month, year
 */
export function parseOrderDate(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;
  
  // Handle ISO format YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return { day: parseInt(isoMatch[3]), month: parseInt(isoMatch[2]), year: parseInt(isoMatch[1]) };
  }
  
  const parts = dateStr.split('/');
  if (parts.length < 2) return null;
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  let year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
  
  // Convert 2-digit year to 4-digit
  if (year < 100) {
    year = 2000 + year;
  }
  
  return { day, month, year };
}

/**
 * Get month key (MM/YYYY) from date string (DD/MM/YYYY or DD/MM/YY)
 */
export function getMonthKeyFromDate(dateStr: string): string | null {
  const parsed = parseOrderDate(dateStr);
  if (!parsed) return null;
  
  const month = String(parsed.month).padStart(2, '0');
  return `${month}/${parsed.year}`;
}

/**
 * Parse month key (MM/YYYY) into month and year numbers
 */
export function parseMonthKey(monthKey: string): { month: number; year: number } | null {
  if (!monthKey || monthKey === 'all') return null;
  
  const [m, y] = monthKey.split('/');
  return {
    month: parseInt(m),
    year: parseInt(y)
  };
}

/**
 * Get number of days in a month
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate proportional ratio of elapsed days in month
 */
export function getMonthProportionalRatio(monthKey: string): number {
  const now = new Date();
  const parsed = parseMonthKey(monthKey);
  
  if (!parsed) {
    // Use current month
    const daysInMonth = getDaysInMonth(now.getMonth() + 1, now.getFullYear());
    return now.getDate() / daysInMonth;
  }
  
  const { month, year } = parsed;
  const daysInMonth = getDaysInMonth(month, year);
  
  // If viewing current month, use current day
  if (now.getMonth() + 1 === month && now.getFullYear() === year) {
    return now.getDate() / daysInMonth;
  }
  
  // If past month, return 1 (full month)
  return 1;
}

/**
 * Check if a date is in the first fortnight (days 1-15)
 */
export function isFirstFortnight(dateStr: string): boolean {
  const parsed = parseOrderDate(dateStr);
  if (!parsed) return false;
  return parsed.day >= 1 && parsed.day <= 15;
}

/**
 * Check if a date is in the second fortnight (days 16-31)
 */
export function isSecondFortnight(dateStr: string): boolean {
  const parsed = parseOrderDate(dateStr);
  if (!parsed) return false;
  return parsed.day >= 16 && parsed.day <= 31;
}
