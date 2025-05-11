// Types for TelegramBot revenue data
export interface TelegramBotRevenueDataPoint {
  month: string;
  platform: string;
  protocol_revenue: number;
}

// Color mapping for TelegramBot platforms
export const telegramBotColors: Record<string, string> = {
  'BullX': '#38bdf8', // blue
  'Trojan': '#a855f7', // purple
  'bloom trading bot': '#f97316', // orange
  'Maestro': '#10b981', // green
  'Sol Trading Bot': '#eab308', // yellow
  'Banana Gun': '#ec4899', // pink
  'Raybot': '#6366f1', // indigo
  'Bonkbot': '#f43f5e', // rose
  'Tradewiz': '#8b5cf6', // violet
  'blazing bot': '#14b8a6', // teal
  'finder bot': '#ef4444', // red
  'falcon bot': '#a78bfa', // purple-400
  'default': '#6b7280', // gray
};

// Get color for a platform with fallback to default
export const getTelegramBotColor = (platform: string): string => {
  return telegramBotColors[platform] || telegramBotColors.default;
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

// Fetch TelegramBot revenue data from API
export async function fetchTelegramBotRevenueData(): Promise<TelegramBotRevenueDataPoint[]> {
  try {
    console.log("Fetching Telegram Bot revenue data from API...");
    const response = await fetch('https://analytics.topledger.xyz/solana/api/queries/13170/results.json?api_key=oL930Rxt1WLfufIUXUyz6QRfjXTUInkqS5foPV0j', {
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
    let rawData: TelegramBotRevenueDataPoint[] = data.query_result.data.rows.map((row: any) => ({
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
    console.error('Error fetching Telegram Bot revenue data:', error);
    throw new Error('Failed to fetch Telegram Bot revenue data');
  }
} 