"use client";

// API endpoint URL for DEX volume data by medium
const API_URL = "https://analytics.topledger.xyz/tl/api/queries/13234/results.json?api_key=jes4jbtggmsezoHwIxltmSjmQxmExPOgnQNhFzZm";

// Interfaces
export interface RawDexVolumeDataPoint {
  year: string;
  dex: string;
  medium: string;
  Volume: number;
  rn1: number;
}

export interface ProcessedDexVolumePoint {
  dex: string;
  volume: number;
  medium: string;
}

export interface DexVolumeChartPoint {
  dex: string;
  Direct: number;
  Aggregator: number;
  total: number;
  [key: string]: string | number;
}

/**
 * Fetches DEX volume data by medium from the API and processes it for chart consumption
 */
export async function fetchDexVolumeData(): Promise<{
  rawData: RawDexVolumeDataPoint[];
  chartData: DexVolumeChartPoint[];
}> {
  console.log('[DexVolumeData] Starting to fetch DEX volume by medium data');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const rows: RawDexVolumeDataPoint[] = data.query_result.data.rows;
    console.log('[DexVolumeData] Fetched raw data:', rows.length, 'rows');

    // Process the data into a format suitable for charts
    const processedData: ProcessedDexVolumePoint[] = rows.map(row => ({
      dex: row.dex,
      volume: row.Volume,
      medium: row.medium
    }));

    // Group data by DEX for stacked bar chart
    const chartData = processDataForStackedBarChart(processedData);
    console.log('[DexVolumeData] Processed data for chart:', chartData.length, 'dexes');

    return {
      rawData: rows,
      chartData
    };
  } catch (error) {
    console.error("[DexVolumeData] Error fetching DEX volume data:", error);
    throw error;
  }
}

/**
 * Process data for stacked bar chart format
 */
function processDataForStackedBarChart(
  data: ProcessedDexVolumePoint[]
): DexVolumeChartPoint[] {
  // Group by DEX
  const groupedByDex: { [key: string]: { [medium: string]: number } } = {};

  // Initialize with all DEXes and mediums
  const uniqueDexes = Array.from(new Set(data.map(item => item.dex))).sort();
  const mediums = ['Direct', 'Aggregator'];
  
  uniqueDexes.forEach(dex => {
    groupedByDex[dex] = {
      Direct: 0,
      Aggregator: 0
    };
  });

  // Fill in actual values
  data.forEach(item => {
    if (groupedByDex[item.dex] && (item.medium === 'Direct' || item.medium === 'Aggregator')) {
      groupedByDex[item.dex][item.medium] += item.volume;
    }
  });

  // Convert to array format for chart and calculate totals
  return uniqueDexes.map(dex => {
    const direct = groupedByDex[dex].Direct || 0;
    const aggregator = groupedByDex[dex].Aggregator || 0;
    
    return {
      dex,
      Direct: direct,
      Aggregator: aggregator,
      total: direct + aggregator
    };
  }).sort((a, b) => b.total - a.total); // Sort by total volume descending
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