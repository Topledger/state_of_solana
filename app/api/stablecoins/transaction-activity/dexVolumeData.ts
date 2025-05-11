export interface DexVolumeDataPoint {
  month: string;
  mint: string;
  Dex_Volume: number;
  date?: Date;
}

// Define mapping of stablecoin names to colors for visualization
export const stablecoinColors: Record<string, string> = {
  "USDC": "#2775ca", // Blue
  "USDT": "#26a17b", // Green
  "USDe": "#8a2be2", // Purple
  "USDY": "#f5ac37", // Amber
  "EURC": "#0052ff", // Coinbase blue
  "EUROe": "#3b82f6", // Light blue
  "PYUSD": "#0070ba", // PayPal blue
  "FDUSD": "#00a3e0", // First Digital blue
  "AUSD": "#f43f5e", // Rose/Red
  "USDS": "#10b981", // Emerald
  "sUSD": "#64748b", // Slate
  "USDG": "#fbbf24", // Amber
};

// Function to get color for a stablecoin
export const getStablecoinColor = (mint: string): string => {
  return stablecoinColors[mint] || "#6b7280"; // Return a default gray if not found
};

// Utility to format numbers
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
};

// Utility to format currency
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
};

/**
 * Fetches DEX volume data from the TopLedger API
 * @returns Array of data points containing month, mint, and DEX volume
 */
export async function fetchDexVolumeData(): Promise<DexVolumeDataPoint[]> {
  try {
    const response = await fetch('https://analytics.topledger.xyz/tl/api/queries/12795/results.json?api_key=xIeiFus6bymtdn5zq2EGXVHr9XcapwmMXoLdvW7R');
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.query_result.data.rows;
    
    // Process the data to ensure it's in the expected format
    const processedData = rows.map((row: any) => {
      // Add a JavaScript Date object for easier processing
      return {
        month: row.month,
        mint: row.mint,
        Dex_Volume: row.Dex_Volume || 0, // Use 0 if null
        date: new Date(row.month)
      };
    });
    
    // Sort by date and then mint for consistent display
    return processedData.sort((a: DexVolumeDataPoint, b: DexVolumeDataPoint) => {
      if (a.date && b.date) {
        const dateCompare = a.date.getTime() - b.date.getTime();
        if (dateCompare !== 0) return dateCompare;
      }
      return a.mint.localeCompare(b.mint);
    });
  } catch (error) {
    console.error('Error fetching DEX volume data:', error);
    throw error;
  }
} 