// Data types and API functions for platform exchange data
export interface PlatformExchangeDataPoint {
  month: string;
  name: string;
  volume: number;
  date?: Date;
}

// Color mapping for exchanges
const exchangeColors: Record<string, string> = {
  "Binance": "#F0B90B",  // Yellow
  "Coinbase": "#0052FF", // Blue
  "KuCoin": "#24AE8F",   // Green
  "OKX": "#121212",      // Black
  "Bybit": "#FCCF2F",    // Gold
  "Kraken": "#5741D9",   // Purple
  "Gate.io": "#F5455C",  // Red
  "Crypto.com": "#1199FA", // Light Blue
  "MEXC": "#2BACF5",     // Teal
  "Bitfinex": "#16B157", // Green
  "Bitget": "#E6007A",   // Pink
  "HTX": "#009D8D",      // Dark Teal
  "Backpack": "#FF5C00", // Orange
  "Swissborg": "#8760FF", // Lavender
};

// Default color for exchanges not in the mapping
const defaultExchangeColor = "#6B7280"; // Gray

/**
 * Get the color for a specific exchange
 */
export function getExchangeColor(exchange: string): string {
  return exchangeColors[exchange] || defaultExchangeColor;
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short'
  });
}

/**
 * Format a currency value for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

/**
 * Fetch platform exchange data from the API (inbound transfers)
 */
export async function fetchPlatformExchangeData(): Promise<PlatformExchangeDataPoint[]> {
  try {
    // Fetch data from TopLedger API
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/12789/results.json?api_key=BxiXraSaVxbbTXg5pArmhmirBiErX2qiKogxOgAo'
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const responseData = await response.json();
    
    // Access the rows of data
    const rows = responseData.query_result?.data?.rows;
    
    if (!rows || !Array.isArray(rows)) {
      throw new Error('Invalid data format received from API');
    }

    // Parse and format data for our chart
    const formattedData: PlatformExchangeDataPoint[] = rows.map(row => ({
      month: row.month,
      name: row.name,
      volume: Number(row.volume),
      date: new Date(row.month)
    }));

    // Sort data by date
    return formattedData.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date.getTime() - b.date.getTime();
    });
  } catch (error) {
    console.error('Error fetching platform exchange data:', error);
    throw error;
  }
}

/**
 * Fetch outbound transfers data from the API (transfers from exchanges)
 */
export async function fetchExchangeTransfersData(): Promise<PlatformExchangeDataPoint[]> {
  try {
    // Fetch data from TopLedger API
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/12788/results.json?api_key=qtmqsLMWCpEH4EhFbgB8BYKBi8IcFJ47i1JKACaq'
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const responseData = await response.json();
    
    // Access the rows of data
    const rows = responseData.query_result?.data?.rows;
    
    if (!rows || !Array.isArray(rows)) {
      throw new Error('Invalid data format received from API');
    }

    // Parse and format data for our chart
    const formattedData: PlatformExchangeDataPoint[] = rows.map(row => ({
      month: row.month,
      name: row.name,
      volume: Number(row.volume),
      date: new Date(row.month)
    }));

    // Sort data by date
    return formattedData.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date.getTime() - b.date.getTime();
    });
  } catch (error) {
    console.error('Error fetching exchange transfers data:', error);
    throw error;
  }
} 