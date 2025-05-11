// Types for stablecoin usage data
export interface StablecoinUsageDataPoint {
  block_date: string;
  mint: string;
  holders: number;
  token_supply: number;
  mint_name: string;
}

// Color mapping for stablecoin platforms
export const stablecoinColors: Record<string, string> = {
  'USDC': '#2775ca', // USDC blue
  'USDT': '#26a17b', // USDT green
  'PYUSD': '#fa7a35', // orange
  'USDe': '#1c94f4', // blue
  'FDUSD': '#01964c', // green
  'USDY': '#8a5fb9', // purple
  'USDS': '#f7b84b', // yellow
  'EURC': '#0066cf', // blue
  'sUSD': '#1e1e1e', // black
  'EUROe': '#0d47a1', // dark blue
  'AUSD': '#c78f42', // bronze/gold
  'USDG': '#5a5a5a', // gray
  'default': '#6b7280', // gray
};

export const getStablecoinColor = (mintName: string): string => {
  return stablecoinColors[mintName] || stablecoinColors.default;
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

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
};

export async function fetchStablecoinUsageData(): Promise<StablecoinUsageDataPoint[]> {
  try {
    const response = await fetch('https://analytics.topledger.xyz/tl/api/queries/12781/results.json?api_key=i1EMrmekV6vqSiyxWx3o8ncTbKqEIBBJ6Me3mwRu', {
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
    
    let rawData: StablecoinUsageDataPoint[] = data.query_result.data.rows.map((row: any) => ({
      block_date: row.block_date,
      mint: row.mint,
      holders: parseInt(row.holders) || 0,
      token_supply: parseFloat(row.token_supply) || 0,
      mint_name: row.mint_name
    }));
    
    // Sort data by date for consistent display
    const sortedData = rawData.sort((a, b) => {
      return new Date(a.block_date).getTime() - new Date(b.block_date).getTime();
    });
    
    return sortedData;
  } catch (error) {
    console.error('Error fetching stablecoin usage data:', error);
    throw new Error('Failed to fetch stablecoin usage data');
  }
} 