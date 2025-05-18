// Types for DePin revenue data
export interface DePinRevenueDataPoint {
  month: string;
  platform: string;
  protocol_revenue: number;
}

// Color mapping for DePin platforms
export const depinColors: Record<string, string> = {
  'Helium': '#06b6d4', // cyan
  'Hivemapper': '#fbbf24', // yellow
  'default': '#6b7280', // gray
};

export const getDePinColor = (platform: string): string => {
  return depinColors[platform] || depinColors.default;
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

export async function fetchDePinRevenueData(): Promise<DePinRevenueDataPoint[]> {
  try {
    const response = await fetch('https://analytics.topledger.xyz/solana/api/queries/13252/results.json?api_key=TLqCBQoor6alADQbYUfFRNNc3h1KAtbH5xg3GDzh', {
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
    const rawData: DePinRevenueDataPoint[] = data.query_result.data.rows.map((row: any) => ({
      month: row.month,
      platform: row.platform,
      protocol_revenue: parseFloat(row.protocol_revenue) || 0
    }));
    // Sort data by date for consistent display
    const sortedData = rawData.sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
    return sortedData;
  } catch (error) {
    console.error('Error fetching DePin revenue data:', error);
    throw new Error('Failed to fetch DePin revenue data');
  }
}

// Prepare DePin revenue data as CSV
export async function prepareDePinRevenueCSV(): Promise<string> {
  try {
    const data = await fetchDePinRevenueData();
    
    if (!data || data.length === 0) {
      console.error('No DePin revenue data available for CSV export');
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
    console.error('Error preparing DePin revenue CSV data:', error);
    return '';
  }
} 