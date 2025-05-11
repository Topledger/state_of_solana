export interface TransactionActivityDataPoint {
  month: string;
  mint: string;
  mint_name: string;
  token_supply: number;
  fee_payer: number;
  p2p_fee_payer: number;
  transfers: number;
  p2p_transfers: number;
  volume: number;
  p2p_volume: number;
  avg_transfer_size: number;
  p2p_avg_transfer_size: number;
  velocity: number;
  p2p_velocity: number;
  program_interacted: number;
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

export function getStablecoinColor(mintName: string): string {
  return stablecoinColorMap[mintName] || DEFAULT_COLOR;
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

export async function fetchTransactionActivityData(): Promise<TransactionActivityDataPoint[]> {
  try {
    const response = await fetch('https://analytics.topledger.xyz/tl/api/queries/12792/results.json?api_key=fD12Ml2PxWabxyFbBlzgubpIx91G20rkN6ADNZXs');
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.query_result.data.rows;
    
    // Process and sort the data
    const processedData: TransactionActivityDataPoint[] = rows.map((item: any) => ({
      month: item.month,
      mint: item.mint || '',
      mint_name: item.mint_name || 'Unknown',
      token_supply: Number(item.token_supply) || 0,
      fee_payer: Number(item.fee_payer) || 0,
      p2p_fee_payer: Number(item.p2p_fee_payer) || 0,
      transfers: Number(item.transfers) || 0,
      p2p_transfers: Number(item.p2p_transfers) || 0,
      volume: Number(item.volume) || 0,
      p2p_volume: Number(item.p2p_volume) || 0,
      avg_transfer_size: Number(item.avg_transfer_size) || 0,
      p2p_avg_transfer_size: Number(item.p2p_avg_transfer_size) || 0,
      velocity: Number(item.velocity) || 0,
      p2p_velocity: Number(item.p2p_velocity) || 0,
      program_interacted: Number(item.program_interacted) || 0,
      date: new Date(item.month)
    }));
    
    // Sort by date (ascending) and mint name
    return processedData.sort((a, b) => {
      const dateComparison = new Date(a.month).getTime() - new Date(b.month).getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.mint_name.localeCompare(b.mint_name);
    });
  } catch (error) {
    console.error('Error fetching transaction activity data:', error);
    throw new Error('Failed to fetch stablecoin transaction activity data');
  }
} 