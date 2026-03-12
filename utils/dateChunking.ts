/**
 * Date Chunking Utility
 * Splits date ranges into smaller chunks for sequential processing
 */

export interface DateChunk {
  start: string; // YYYY-MM-DD format
  end: string;   // YYYY-MM-DD format
  index: number; // 0-based chunk index
}

/**
 * Split a date range into chunks of specified size (in days)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param chunkSizeDays - Size of each chunk in days (default: 30)
 * @returns Array of date chunks
 * 
 * @example
 * splitDateRangeIntoChunks('2026-03-01', '2026-06-30', 30)
 * // Returns 4 chunks: Mar 1-30, Mar 31-Apr 29, Apr 30-May 29, May 30-Jun 30
 */
export function splitDateRangeIntoChunks(
  startDate: string,
  endDate: string,
  chunkSizeDays: number = 30
): DateChunk[] {
  // Validate inputs
  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required');
  }

  // Parse dates - use noon to avoid timezone issues
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');

  // Validate date parsing
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD format');
  }

  // Validate date range
  if (start > end) {
    throw new Error('Start date must be before or equal to end date');
  }

  const chunks: DateChunk[] = [];
  let currentStart = new Date(start);
  let chunkIndex = 0;

  while (currentStart <= end) {
    // Calculate chunk end date
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + chunkSizeDays - 1);

    // Don't exceed the overall end date
    if (currentEnd > end) {
      currentEnd.setTime(end.getTime());
    }

    // Format dates as YYYY-MM-DD
    const chunkStart = formatDateToYYYYMMDD(currentStart);
    const chunkEnd = formatDateToYYYYMMDD(currentEnd);

    chunks.push({
      start: chunkStart,
      end: chunkEnd,
      index: chunkIndex,
    });

    // Move to next chunk (day after current chunk end)
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
    chunkIndex++;
  }

  return chunks;
}

/**
 * Format a Date object to YYYY-MM-DD string
 * @param date - Date object
 * @returns Formatted date string
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the number of days between two dates
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Number of days (inclusive)
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to make it inclusive
  
  return Math.max(0, diffDays);
}

/**
 * Validate if a date range is valid
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Object with isValid flag and error message
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): { isValid: boolean; error?: string } {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Both start date and end date are required' };
  }

  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');

  if (isNaN(start.getTime())) {
    return { isValid: false, error: 'Invalid start date format' };
  }

  if (isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid end date format' };
  }

  if (start > end) {
    return { isValid: false, error: 'Start date must be before or equal to end date' };
  }

  return { isValid: true };
}
