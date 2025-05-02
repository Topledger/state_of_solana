"use client";

// Interfaces for the data returned from the API
export interface RawTraderDataPoint {
  month: string;
  monthly_transactions: string;
  volume: number;
  Signers: number;
}

export interface ProcessedTraderDataPoint {
  month: string;
  date: Date;
  category: string;
  volume: number;
  signers: number;
}

export interface StackedBarDataPoint {
  month: string;
  date: Date;
  [key: string]: any; // For dynamic category keys
}

// Transaction categories in order (for consistent stacking)
export const transactionCategories = [
  "1-3 transactions",
  "4-5 transactions",
  "6-10 transactions",
  "11-100 transactions",
  "101-1000 transactions",
  ">1000 transactions"
];

// API endpoint URL
const API_URL = "https://analytics.topledger.xyz/tl/api/queries/12392/results.json?api_key=aSgz8ztgBg46FAoarkY8JGS5K0jxqm9t60sF3CDQ";

/**
 * Fetches trader data from the API and processes it for chart consumption
 */
export async function fetchTradersStackedData(): Promise<{
  rawData: RawTraderDataPoint[];
  volumeData: StackedBarDataPoint[];
  signersData: StackedBarDataPoint[];
}> {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const rows: RawTraderDataPoint[] = data.query_result.data.rows;

    // Process the data into a format suitable for charts
    const processedData: ProcessedTraderDataPoint[] = rows.map(row => ({
      month: row.month,
      date: new Date(row.month),
      category: row.monthly_transactions,
      volume: row.volume,
      signers: row.Signers
    }));

    // Group data by month for stacked bar chart
    const volumeData = processDataForStackedBarChart(processedData, 'volume');
    const signersData = processDataForStackedBarChart(processedData, 'signers');

    return {
      rawData: rows,
      volumeData,
      signersData
    };
  } catch (error) {
    console.error("Error fetching traders stacked data:", error);
    throw error;
  }
}

/**
 * Process data for stacked bar chart format
 */
function processDataForStackedBarChart(
  data: ProcessedTraderDataPoint[],
  metric: 'volume' | 'signers'
): StackedBarDataPoint[] {
  // Group by month
  const groupedByMonth: { [key: string]: { [category: string]: number } } = {};

  // Initialize with all months and categories
  const uniqueMonths = Array.from(new Set(data.map(item => item.month))).sort();
  
  uniqueMonths.forEach(month => {
    groupedByMonth[month] = {};
    transactionCategories.forEach(category => {
      groupedByMonth[month][category] = 0;
    });
  });

  // Fill in actual values
  data.forEach(item => {
    groupedByMonth[item.month][item.category] = item[metric];
  });

  // Convert to array format for chart
  return uniqueMonths.map(month => {
    const result: StackedBarDataPoint = {
      month,
      date: new Date(month),
      ...groupedByMonth[month]
    };
    return result;
  });
}

/**
 * Format large numbers to more readable format
 */
export function formatLargeNumber(value: number): string {
  // Handle undefined, null or NaN values
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  } else {
    return value.toFixed(0);
  }
}

/**
 * Format volume to USD
 */
export function formatVolume(value: number): string {
  return `$${formatLargeNumber(value)}`;
}

/**
 * Format month for display
 */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
} 