// Define the structure of P2P transfer size data
export interface P2PTransferSizeDataPoint {
  block_date: string;
  mint_name: string;
  Avg_P2P_Transfer_Size: number;
  Median_P2P_Transfer_Size: number;
  date?: Date; // Converted date field for easier manipulation
}

// Available stablecoin types
export type StablecoinType = 
  | 'USDC'
  | 'USDT'
  | 'PYUSD'
  | 'EURC'
  | 'EUROe'
  | 'USDe'
  | 'USDY'
  | 'sUSD'
  | 'USDS'
  | 'FDUSD'
  | 'AUSD'
  | 'USDG';

// Color mapping for stablecoins
export const getStablecoinColor = (stablecoin: string): string => {
  const colorMap: Record<string, string> = {
    'USDC': '#2775ca',  // USDC blue
    'USDT': '#26a17b',  // USDT green
    'PYUSD': '#0f4af0', // PYUSD blue
    'EURC': '#0258fc',  // EURC blue
    'EUROe': '#1e3da0', // EUROe dark blue
    'USDe': '#8c8c8c',  // USDe gray
    'USDY': '#fa7a35',  // USDY orange
    'sUSD': '#6b7280',  // sUSD gray
    'USDS': '#34d399',  // USDS green
    'FDUSD': '#10b981', // FDUSD green
    'AUSD': '#f97316',  // AUSD orange
    'USDG': '#f59e0b',  // USDG yellow
  };

  return colorMap[stablecoin] || '#6b7280'; // Default gray if not found
};

// Format numbers for display
export const formatNumber = (value: number): string => {
  // For values >= 1M, show in millions with 1 decimal place
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  // For values >= 1K, show in thousands with 1 decimal place
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  // For values < 1, show up to 4 decimal places
  if (value < 1) {
    return value.toFixed(4);
  }
  
  // For other values, show up to 2 decimal places
  return value.toFixed(2);
};

// Format date for tooltips and display
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Fetch P2P transfer size data from TopLedger API
 * @param stablecoin The stablecoin to fetch data for
 * @returns Promise containing the P2P transfer size data
 */
export const fetchP2PTransferSizeData = async (stablecoin: StablecoinType = 'USDC'): Promise<P2PTransferSizeDataPoint[]> => {
  try {
    // API endpoint for transfer size data
    const endpoint = 'https://analytics.topledger.xyz/tl/api/queries/12899/results?api_key=PDO9L8zUfu9YfUaqvNXTW13Zwz9jJiYYB2HmjAyN';
    
    // Construct request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parameters: {
          mint_name: stablecoin
        }
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log the structure of the response for debugging
    console.log('API Response structure:', JSON.stringify(Object.keys(data || {})));
    
    // Check for multiple possible response formats
    let rows = [];
    if (data?.query_result?.data?.rows && Array.isArray(data.query_result.data.rows)) {
      rows = data.query_result.data.rows;
    } else if (data?.rows && Array.isArray(data.rows)) {
      rows = data.rows;
    } else if (data?.data?.rows && Array.isArray(data.data.rows)) {
      rows = data.data.rows;
    } else {
      console.error('Unexpected API response format:', data);
      return []; // Return empty array instead of throwing to allow graceful degradation
    }

    // Process and sort the data
    const processedData: P2PTransferSizeDataPoint[] = rows.map((row: any) => ({
      block_date: row.block_date || '',
      mint_name: row.mint_name || stablecoin,
      Avg_P2P_Transfer_Size: Number(row.Avg_P2P_Transfer_Size) || 0,
      Median_P2P_Transfer_Size: Number(row.Median_P2P_Transfer_Size) || 0,
      date: row.block_date ? new Date(row.block_date) : new Date()
    }));

    // Sort by date (ascending)
    return processedData.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  } catch (error) {
    console.error('[P2PTransferSizeData] Error fetching data:', error);
    console.error('[P2PTransferSizeData] Error details:', error instanceof Error ? error.message : String(error));
    return []; // Return empty array instead of throwing to allow graceful degradation
  }
}; 