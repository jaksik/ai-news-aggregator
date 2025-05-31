/**
 * Format a date string to display in Central Time Zone
 * @param dateString - The date string or Date object to format
 * @returns Formatted date string in MM/DD/YYYY, HH:MM:SS CT format
 */
export const formatLogDate = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    
    // Convert to Central Time Zone using Intl.DateTimeFormat
    const centralTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Use 24-hour format
    }).formatToParts(date);

    // Extract the parts
    const month = centralTime.find(part => part.type === 'month')?.value;
    const day = centralTime.find(part => part.type === 'day')?.value;
    const year = centralTime.find(part => part.type === 'year')?.value;
    const hour = centralTime.find(part => part.type === 'hour')?.value;
    const minute = centralTime.find(part => part.type === 'minute')?.value;
    const second = centralTime.find(part => part.type === 'second')?.value;

    // Determine if we're in CDT (Central Daylight Time) or CST (Central Standard Time)
    const now = new Date();
    const timeZoneAbbr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      timeZoneName: 'short'
    }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || 'CT';

    return `${month}/${day}/${year}, ${hour}:${minute}:${second} ${timeZoneAbbr}`;
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
