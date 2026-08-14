import { format, addDays, isValid, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export class TimeService {
  /**
   * Get current UTC date
   */
  public static nowUTC(): Date {
    return new Date();
  }

  /**
   * Format date to string based on timezone
   */
  public static format(date: Date | string, formatStr: string, timeZone: string = 'UTC'): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return formatInTimeZone(d, timeZone, formatStr);
  }

  /**
   * Format date to string (local timezone)
   */
  public static formatLocal(date: Date | string, formatStr: string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return format(d, formatStr);
  }

  /**
   * Add days to a date
   */
  public static addDays(date: Date | string, days: number): Date {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return addDays(d, days);
  }
}
