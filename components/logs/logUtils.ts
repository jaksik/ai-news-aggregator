/**
 * Format a date string to display in UTC format as stored in database
 * @param dateString - The date string or Date object to format
 * @returns Formatted date string in MM/DD/YYYY, HH:MM:SS UTC format
 */
export const formatLogDate = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    // Use UTC methods to display date as stored in database (UTC format)
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds} UTC`;
  } catch {
    return String(dateString);
  }
};

/**
 * Calculate duration between two dates
 * @param startTime - Start time string or Date object
 * @param endTime - End time string or Date object
 * @returns Duration string in seconds with 1 decimal place
 */
export const calculateDuration = (startTime?: string | Date, endTime?: string | Date): string => {
  if (!startTime || !endTime) return 'N/A';
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationSeconds = (end.getTime() - start.getTime()) / 1000;
    return durationSeconds.toFixed(1) + 's';
  } catch {
    return 'N/A';
  }
};
