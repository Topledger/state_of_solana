"use client";

// API endpoint URL
const API_URL = "https://analytics.topledger.xyz/tl/api/queries/12422/results.json?api_key=pOuD9xaxsmquzZGOnUcR9disUQI3EeXNQKuKpO6l";

// Categories in the order they should appear (small to large)
export const traderCategories = [
  "<1k USD ",
  "1k-10k USD",
  "10k-50k USD",
  "50k-500k USD", 
  "500k-2.5M USD",
  ">2.5M USD"
];

// Interfaces
export interface RawTraderCategoryDataPoint {
  Month: string;
  Signer_Lifetime_Trade_Vol: string;
  active_wallet: number;
  Volume: number;
}

export interface ProcessedTraderCategoryPoint {
  month: string;
  date: Date;
  category: string;
  signers: number;
  volume: number;
}

export interface TradersCategoryChartPoint {
  month: string;
  date: Date;
  [key: string]: any; // For dynamic category keys
}

/**
 * Fetches trader data by category from the API and processes it for chart consumption
 */
export async function fetchTradersCategoryData(): Promise<{
  rawData: RawTraderCategoryDataPoint[];
  volumeData: TradersCategoryChartPoint[];
  signersData: TradersCategoryChartPoint[];
}> {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const rows: RawTraderCategoryDataPoint[] = data.query_result.data.rows;

    // Process the data into a format suitable for charts
    const processedData: ProcessedTraderCategoryPoint[] = rows.map(row => ({
      month: row.Month,
      date: new Date(row.Month),
      category: row.Signer_Lifetime_Trade_Vol,
      signers: row.active_wallet,
      volume: row.Volume
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
    console.error("Error fetching traders category data:", error);
    throw error;
  }
}

/**
 * Process data for stacked bar chart format
 */
function processDataForStackedBarChart(
  data: ProcessedTraderCategoryPoint[],
  metric: 'volume' | 'signers'
): TradersCategoryChartPoint[] {
  // Group by month
  const groupedByMonth: { [key: string]: { [category: string]: number } } = {};

  // Initialize with all months and categories
  const uniqueMonths = Array.from(new Set(data.map(item => item.month))).sort();
  
  uniqueMonths.forEach(month => {
    groupedByMonth[month] = {};
    traderCategories.forEach(category => {
      groupedByMonth[month][category] = 0;
    });
  });

  // Fill in actual values
  data.forEach(item => {
    if (groupedByMonth[item.month]) {
      groupedByMonth[item.month][item.category] = item[metric];
    }
  });

  // Convert to array format for chart
  return uniqueMonths.map(month => {
    const result: TradersCategoryChartPoint = {
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