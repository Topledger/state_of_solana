// Types for Launchpad revenue data
export interface LaunchpadRevenueDataPoint {
  month: string;
  platform: string;
  protocol_revenue: number;
}

// Color mapping for Launchpad platforms
export const launchpadColors: Record<string, string> = {
  'Pump Fun': '#ff6b6b', // red
  'Moonshot': '#6c5ce7', // purple
  'makenow.meme': '#00b894', // green
  'default': '#6b7280', // gray
};

// Get color for a platform with fallback to default
export const getLaunchpadColor = (platform: string): string => {
  return launchpadColors[platform] || launchpadColors.default;
};

// Format currency values
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
};

// Fetch Launchpad revenue data from API
export async function fetchLaunchpadRevenueData(): Promise<LaunchpadRevenueDataPoint[]> {
  try {
    console.log("Fetching Memecoin LaunchPad revenue data from API...");
    const response = await fetch('https://analytics.topledger.xyz/solana/api/queries/13169/results.json?api_key=5csRuDS90HOdVaNWFua3wRc8e5gYyePNuHGcshkv', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    console.log("API response received, processing data...");
    const data = await response.json();
    
    if (!data?.query_result?.data?.rows) {
      throw new Error('Invalid data structure received from API');
    }

    // Extract raw data from API response
    const rawData: LaunchpadRevenueDataPoint[] = data.query_result.data.rows.map((row: any) => ({
      month: row.month,
      platform: row.platform,
      protocol_revenue: parseFloat(row.protocol_revenue) || 0
    }));

    console.log(`Received ${rawData.length} data points from API`);
    
    // Sort data by date for consistent display
    const sortedData = rawData.sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
    
    console.log(`Returning ${sortedData.length} data points`);
    
    return sortedData;
  } catch (error) {
    console.error('Error fetching Launchpad revenue data:', error);
    throw new Error('Failed to fetch Launchpad revenue data');
  }
}

// Prepare Launchpad revenue data as CSV
export async function prepareLaunchpadRevenueCSV(): Promise<string> {
  try {
    const data = await fetchLaunchpadRevenueData();
    
    if (!data || data.length === 0) {
      console.error('No Launchpad revenue data available for CSV export');
      return '';
    }
    
    // Sort data by platform (alphabetically) and date
    const sortedData = [...data].sort((a, b) => {
      // First sort by platform name
      if (a.platform < b.platform) return -1;
      if (a.platform > b.platform) return 1;
      
      // Then by date
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
    
    // Create CSV header
    const header = ['block_date', 'Platform', 'protocol_revenue_usd'];
    
    // Create CSV rows
    const rows = sortedData.map(item => {
      return [
        item.month,
        item.platform,
        item.protocol_revenue.toFixed(2)
      ].join(',');
    });
    
    // Combine header and rows
    return [header.join(','), ...rows].join('\n');
  } catch (error) {
    console.error('Error preparing Launchpad revenue CSV data:', error);
    return '';
  }
} 