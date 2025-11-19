/**
 * Time utilities for Portugal timezone (Europe/Lisbon)
 * Handles meal time detection and date formatting
 */

const PORTUGAL_TIMEZONE = 'Europe/Lisbon';

/**
 * Get current date and time in Portugal timezone
 */
export function getPortugalTime(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PORTUGAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const dateTime: { [key: string]: string } = {};
  parts.forEach((part) => {
    dateTime[part.type] = part.value;
  });

  // Create a new date object with Portugal timezone values
  return new Date(
    parseInt(dateTime.year!),
    parseInt(dateTime.month!) - 1,
    parseInt(dateTime.day!),
    parseInt(dateTime.hour!),
    parseInt(dateTime.minute!),
    parseInt(dateTime.second!),
  );
}

/**
 * Get current date in DD/MM/YYYY format (Portugal timezone)
 */
export function getCurrentDatePortugal(): string {
  const portugalTime = getPortugalTime();
  const day = String(portugalTime.getDate()).padStart(2, '0');
  const month = String(portugalTime.getMonth() + 1).padStart(2, '0');
  const year = portugalTime.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Get current meal type based on Portugal time
 * Lunch: 12:00 - 14:45 (2:45 PM)
 * Dinner: 14:45 (2:45 PM) - 21:45 (9:45 PM)
 * After dinner: show next day's lunch
 * Before lunch: show today's lunch (if available)
 */
export function getCurrentMealType(): 'lunch' | 'dinner' | null {
  const portugalTime = getPortugalTime();
  const hours = portugalTime.getHours();
  const minutes = portugalTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Lunch: 12:00 (720) - 14:45 (885)
  if (totalMinutes >= 720 && totalMinutes < 885) {
    return 'lunch';
  }

  // Dinner: 14:45 (885) - 21:45 (1305)
  if (totalMinutes >= 885 && totalMinutes <= 1305) {
    return 'dinner';
  }

  // Before lunch (before 12:00) - show lunch menu
  if (totalMinutes < 720) {
    return 'lunch';
  }

  // After dinner (after 21:45) - will show next day's lunch
  return 'lunch';
}

/**
 * Check if we should show a menu (always true now, but keeps compatibility)
 */
export function isMenuTimeActive(): boolean {
  return true; // Always show menu, logic handled by getCurrentMealType
}

/**
 * Get the date for the menu to display
 * Returns today's date, or tomorrow's date if after dinner
 */
export function getMenuDisplayDate(): Date {
  const portugalTime = getPortugalTime();
  const hours = portugalTime.getHours();
  const minutes = portugalTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // After dinner (after 21:45), show next day's menu
  if (totalMinutes > 1305) {
    const tomorrow = new Date(portugalTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Otherwise show today's menu
  return portugalTime;
}

/**
 * Format date string (DD/MM/YYYY) to Date object
 */
export function parseMenuDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format Date object to DD/MM/YYYY string
 */
export function formatMenuDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Check if a date is Saturday (day 6, where 0 = Sunday)
 */
export function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}
