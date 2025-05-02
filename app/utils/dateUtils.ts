// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Format date to show in a user-friendly way (e.g., "Jan 1, 2023")
export function formatDateForDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Parse string date (YYYY-MM-DD) to Date object
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

// Get date range for the last n days
export function getLastNDays(n: number): Date[] {
  const today = new Date();
  const dates: Date[] = [];
  
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    dates.push(date);
  }
  
  return dates;
}

// Get formatted date range for the last n days
export function getLastNDaysFormatted(n: number): string[] {
  return getLastNDays(n).map(date => formatDate(date));
} 