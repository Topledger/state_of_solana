// Types for TradingApp revenue data
export interface TradingAppRevenueDataPoint {
  month: string;
  platform: string;
  protocol_revenue: number;
}

// Color mapping for TradingApp platforms
export const tradingAppColors: Record<string, string> = {
  'Photon': '#38bdf8', // blue
  'GMGN': '#a855f7', // purple
  'DexScreener': '#f97316', // orange
  'Moonshot.money': '#10b981', // green
  'default': '#6b7280', // gray
};

// Get color for a platform with fallback to default
export const getTradingAppColor = (platform: string): string => {
  return tradingAppColors[platform] || tradingAppColors.default;
};

// Format currency values
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
};

// Fetch TradingApp revenue data from API
export async function fetchTradingAppRevenueData(): Promise<TradingAppRevenueDataPoint[]> {
  try {
    console.log("Fetching Memecoin Trading App revenue data from API...");
    const response = await fetch('https://analytics.topledger.xyz/solana/api/queries/13182/results.json?api_key=TKHcPPIIfclxuUcvLvQ43vVAw6OKglHDf469m5py', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    console.log("API response received, processing data...");
    const data = await response.json();
    
    if (!data?.query_result?.data?.rows) {
      throw new Error('Invalid data structure received from API');
    }

    // Extract raw data from API response
    let rawData: TradingAppRevenueDataPoint[] = data.query_result.data.rows.map((row: any) => ({
      month: row.month,
      platform: row.platform,
      protocol_revenue: parseFloat(row.protocol_revenue) || 0
    }));

    console.log(`Received ${rawData.length} data points from API`);
    
    // Sort data by date for consistent display
    const sortedData = rawData.sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
    
    console.log(`Returning ${sortedData.length} data points`);
    
    return sortedData;
  } catch (error) {
    console.error('Error fetching Trading App revenue data:', error);
    throw new Error('Failed to fetch Trading App revenue data');
  }
} 