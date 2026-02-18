import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const HAWAII_TZ = 'Pacific/Honolulu';

/**
 * Formats a Date object as YYYY-MM-DD without timezone conversion
 * This preserves the intended date regardless of timezone
 */
export const formatDateForHawaii = (date: Date): string => {
  // Use local date parts to avoid timezone conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string as a Date object
 * Creates date at local midnight to avoid timezone shifts
 */
export const parseHawaiiDate = (dateString: string | Date | null | undefined): Date | null => {
  if (!dateString) return null;
  
  // If it's already a Date object, return it
  if (dateString instanceof Date) return dateString;
  
  // If it's not a string, try to convert it
  if (typeof dateString !== 'string') {
    // Try to convert to string first
    const stringValue = String(dateString);
    if (stringValue === 'null' || stringValue === 'undefined') return null;
    dateString = stringValue;
  }
  
  // Parse YYYY-MM-DD format
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Validate the parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  
  return new Date(year, month - 1, day);
};

/**
 * Gets the current date as YYYY-MM-DD string
 */
export const getCurrentHawaiiDate = (): string => {
  return formatDateForHawaii(new Date());
};