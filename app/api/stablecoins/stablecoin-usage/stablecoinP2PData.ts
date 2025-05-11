export interface StablecoinP2PDataPoint {
  Month: string;
  mint: string;
  Volume: number;
  date?: Date;
}

// Color mapping for different stablecoins
const stablecoinColorMap: Record<string, string> = {
  "USDC": "#2775ca", // Blue
  "USDT": "#26a17b", // Green
  "PYUSD": "#8a2be2", // Purple
  "USDe": "#ffa500",  // Orange
  "EURC": "#4169e1", // Royal Blue
  "EUROe": "#007bff", // Bright Blue
  "USDY": "#20b2aa", // Light Sea Green
  "FDUSD": "#ff6347", // Tomato
  "sUSD": "#ff69b4", // Hot Pink
  "USDS": "#4b0082", // Indigo
  "AUSD": "#8b4513", // Saddle Brown
  "USDG": "#708090", // Slate Gray
};

// Default color for any stablecoins not in the map
const DEFAULT_COLOR = "#999999"; // Gray

export function getStablecoinColor(mint: string): string {
  return stablecoinColorMap[mint] || DEFAULT_COLOR;
}

// Format currency values
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
}

// Format number values
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
}

export async function fetchStablecoinP2PData(): Promise<StablecoinP2PDataPoint[]> {
  try {
    const response = await fetch('https://analytics.topledger.xyz/tl/api/queries/12787/results.json?api_key=59jdHPvitneVGvYr6xKNfSm0N1H0tFwYev9xsV2n');
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.query_result.data.rows;
    
    // Process and sort the data
    const processedData: StablecoinP2PDataPoint[] = rows.map((item: any) => ({
      Month: item.Month,
      mint: item.mint || 'Unknown',
      Volume: Number(item.Volume),
      date: new Date(item.Month)
    }));
    
    // Sort by date (ascending) and mint name
    return processedData.sort((a, b) => {
      const dateComparison = new Date(a.Month).getTime() - new Date(b.Month).getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.mint.localeCompare(b.mint);
    });
  } catch (error) {
    console.error('Error fetching stablecoin P2P data:', error);
    throw new Error('Failed to fetch stablecoin P2P transfer data');
  }
} 