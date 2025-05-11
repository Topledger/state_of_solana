// Types for mint-burn data
export interface MintBurnDataPoint {
  Month: string;
  mint: string;
  Mint_Amount: number;
  Burn_Amount: number;
  date: Date;
}

// Color mapping for different stablecoins
const stablecoinColors: Record<string, string> = {
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

// Function to get color for a stablecoin
export function getStablecoinColor(mint: string): string {
  return stablecoinColors[mint] || DEFAULT_COLOR;
}

// Format date for display
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

// Format currency values for display
export const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
};

/**
 * Fetch mint-burn data from TopLedger API
 */
export async function fetchMintBurnData(): Promise<MintBurnDataPoint[]> {
  try {
    const response = await fetch('https://analytics.topledger.xyz/tl/api/queries/12796/results.json?api_key=FsMRolQsXioS23lMYqhIqoD98nrm2EjkxgeqyPuW');
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.query_result.data.rows;
    
    // Process and sort the data
    const processedData: MintBurnDataPoint[] = rows.map((item: any) => ({
      Month: item.Month,
      mint: item.mint || 'Unknown',
      Mint_Amount: Number(item.Mint_Amount) || 0,
      Burn_Amount: Number(item.Burn_Amount) || 0,
      date: new Date(item.Month)
    }));
    
    // Sort by date (ascending) and mint name
    return processedData.sort((a, b) => {
      const dateComparison = new Date(a.Month).getTime() - new Date(b.Month).getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.mint.localeCompare(b.mint);
    });
  } catch (error) {
    console.error('Error fetching mint-burn data:', error);
    throw new Error('Failed to fetch stablecoin mint-burn data');
  }
} 