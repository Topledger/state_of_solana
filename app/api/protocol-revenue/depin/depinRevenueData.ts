// Types for DePin revenue data
export interface DePinRevenueDataPoint {
  month: string;
  platform: string;
  protocol_revenue: number;
}

// Color mapping for DePin platforms
export const depinColors: Record<string, string> = {
  'Helium': '#06b6d4', // cyan
  'Hivemapper': '#fbbf24', // yellow
  'default': '#6b7280', // gray
};

export const getDePinColor = (platform: string): string => {
  return depinColors[platform] || depinColors.default;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
};

export async function fetchDePinRevenueData(): Promise<DePinRevenueDataPoint[]> {
  try {
    const response = await fetch('https://analytics.topledger.xyz/solana/api/queries/13252/results.json?api_key=TLqCBQoor6alADQbYUfFRNNc3h1KAtbH5xg3GDzh', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (!data?.query_result?.data?.rows) {
      throw new Error('Invalid data structure received from API');
    }
    let rawData: DePinRevenueDataPoint[] = data.query_result.data.rows.map((row: any) => ({
      month: row.month,
      platform: row.platform,
      protocol_revenue: parseFloat(row.protocol_revenue) || 0
    }));
    // Sort data by date for consistent display
    const sortedData = rawData.sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
    return sortedData;
  } catch (error) {
    console.error('Error fetching DePin revenue data:', error);
    throw new Error('Failed to fetch DePin revenue data');
  }
} 