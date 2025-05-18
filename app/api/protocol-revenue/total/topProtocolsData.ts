// Interface for platform revenue data
export interface PlatformRevenueDataPoint {
  platform: string;
  protocol_revenue: number;
}

// Fetch top protocols revenue data
export const fetchTopProtocolsRevenueData = async (): Promise<PlatformRevenueDataPoint[]> => {
  try {
    const apiUrl = "https://analytics.topledger.xyz/solana/api/queries/13165/results.json?api_key=KcTuHb64zoaF0agKXEOg8XkK0wuJsxD8GjHMU2J5";
    
    // Fetch data using native fetch
    const response = await fetch(apiUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if we have data
    if (!data.query_result || !data.query_result.data || !data.query_result.data.rows) {
      throw new Error('Invalid data structure in API response');
    }
    
    // Extract rows from the response
    const rows: PlatformRevenueDataPoint[] = data.query_result.data.rows;
    
    return rows;
  } catch (error) {
    console.error('Error fetching top protocols revenue data:', error);
    throw error;
  }
};

// Format currency values
export const formatCurrency = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
};

// Prepare CSV data for top protocols
export const prepareTopProtocolsCSV = async (): Promise<string> => {
  try {
    // Fetch the data from the API
    const data = await fetchTopProtocolsRevenueData();
    
    if (!data || data.length === 0) {
      throw new Error('No top protocols revenue data available');
    }
    
    // Sort platforms by revenue (descending)
    const sortedData = [...data].sort((a, b) => b.protocol_revenue - a.protocol_revenue);
    
    // Create CSV headers
    const headers = ['Platform', 'protocol_revenue_usd'];
    
    // Create rows from the raw data
    const rows = sortedData.map(item => [
      item.platform,
      item.protocol_revenue.toFixed(2)
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  } catch (error) {
    console.error('Error preparing top protocols CSV:', error);
    throw error;
  }
}; 