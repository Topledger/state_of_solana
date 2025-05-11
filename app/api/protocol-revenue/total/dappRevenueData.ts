// API data interface
export interface DappRevenueDataPoint {
  dapp: string;
  segment: string;
  protocol_revenue: number;
  segment_revenue: number;
}

// Fetch dapp revenue data from the API
export const fetchDappRevenueData = async (): Promise<DappRevenueDataPoint[]> => {
  try {
    console.log('Fetching dapp revenue data');
    
    const response = await fetch('https://analytics.topledger.xyz/solana/api/queries/13241/results.json?api_key=gpgdCtoDOhHa2fc4FPd0NfwiCFfaREWflZ3knXJ3');
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if response has the expected structure
    if (!data?.query_result?.data?.rows || !Array.isArray(data.query_result.data.rows)) {
      throw new Error('Unexpected API response structure');
    }
    
    // Process API data to match our format
    const processedData: DappRevenueDataPoint[] = data.query_result.data.rows.map((row: any) => ({
      dapp: row.Dapp || '',
      segment: row.Segment || '',
      protocol_revenue: parseFloat(row.protocol_revenue) || 0,
      segment_revenue: parseFloat(row.segment_revenue) || 0
    }));
    
    console.log(`Processed ${processedData.length} dapp revenue data points`);
    return processedData;
    
  } catch (error) {
    console.error('Error fetching dapp revenue data:', error);
    
    // Return empty array if API request fails
    return [];
  }
};

// Format currency values
export const formatCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

// Get unique segments from data
export const getUniqueSegments = (data: DappRevenueDataPoint[]): string[] => {
  return [...new Set(data.map(item => item.segment))];
};

// Get unique dapps from data
export const getUniqueDapps = (data: DappRevenueDataPoint[]): string[] => {
  return [...new Set(data.map(item => item.dapp))];
}; 