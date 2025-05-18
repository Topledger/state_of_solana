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

// Prepare CSV data for dapp revenue
export const prepareDappRevenueCSV = async (): Promise<string> => {
  try {
    // Fetch the data from the API
    const data = await fetchDappRevenueData();
    
    if (!data || data.length === 0) {
      throw new Error('No dapp revenue data available');
    }
    
    // Group by dapp and calculate total revenue
    const dappRevenueMap: Record<string, number> = {};
    const dappSegmentMap: Record<string, string> = {};
    
    data.forEach(item => {
      if (!dappRevenueMap[item.dapp]) {
        dappRevenueMap[item.dapp] = 0;
        dappSegmentMap[item.dapp] = item.segment;
      }
      dappRevenueMap[item.dapp] += item.protocol_revenue;
    });
    
    // Sort dapps by total revenue (descending)
    const sortedDapps = Object.entries(dappRevenueMap)
      .sort((a, b) => b[1] - a[1])
      .map(([dapp]) => dapp);
    
    // Create CSV headers
    const headers = ['Dapp', 'Segment', 'protocol_revenue_usd'];
    
    // Create rows from the sorted data
    const rows = sortedDapps.map(dapp => [
      dapp,
      dappSegmentMap[dapp],
      dappRevenueMap[dapp].toFixed(2)
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  } catch (error) {
    console.error('Error preparing dapp revenue CSV:', error);
    throw error;
  }
}; 