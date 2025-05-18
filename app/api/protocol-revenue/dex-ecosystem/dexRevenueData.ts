// Types for DEX revenue data
export interface DexRevenueDataPoint {
  month: string;
  platform: string;
  protocol_revenue: number;
  originalMonth?: string; // Optional original month from API
}

// Color mapping for DEX platforms
export const dexColors: Record<string, string> = {
  'Raydium': '#f97316', // orange
  'Orca': '#60a5fa',   // blue
  'Axiom': '#a78bfa',  // purple
  'Lifinity': '#34d399', // green
  'default': '#6b7280', // gray
};

// Get color for a platform with fallback to default
export const getDexColor = (platform: string): string => {
  return dexColors[platform] || dexColors.default;
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

// Fetch DEX revenue data from API
export async function fetchDexRevenueData(): Promise<DexRevenueDataPoint[]> {
  try {
    console.log("Fetching DEX revenue data from API...");
    const response = await fetch('https://analytics.topledger.xyz/solana/api/queries/13171/results.json?api_key=rEzuwlk0RAE0NejUfX3vVcKmiO6ocehFgsBjq5qK', {
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

    // Extract raw data from API response, keeping original dates (no normalization)
    const rawData: DexRevenueDataPoint[] = data.query_result.data.rows.map((row: any) => ({
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
    
    // Filter to only include data from Jan 2024 to May 2025
    const filteredData = sortedData.filter(d => {
      const date = new Date(d.month);
      const year = date.getFullYear();
      return (year === 2024 || year === 2025);
    });
    
    console.log(`Filtered to ${filteredData.length} data points from Jan 2024 to May 2025`);
    
    // If we still have data after filtering, return it; otherwise return all data
    return filteredData.length > 0 ? filteredData : sortedData;
  } catch (error) {
    console.error('Error fetching DEX revenue data:', error);
    throw new Error('Failed to fetch DEX revenue data');
  }
}

// Generate mock data with a full year of data to ensure all months are visible
function generateMockData(): Promise<DexRevenueDataPoint[]> {
  console.log("Generating mock data as fallback");
  const mockData: DexRevenueDataPoint[] = [];
  const platforms = ['Raydium', 'Orca', 'Axiom', 'Lifinity'];
  const currentDate = new Date();
  
  // Create 12 months of data points (full year view)
  const startDate = new Date();
  startDate.setMonth(currentDate.getMonth() - 11); // Full year of data
  
  // Create monthly data points
  const currentMonth = new Date(startDate);
  while (currentMonth <= currentDate) {
    platforms.forEach(platform => {
      // Base revenue that increases over time with some randomness
      const baseRevenue = platform === 'Raydium' ? 5000000 : 
                        platform === 'Orca' ? 2000000 : 
                        platform === 'Axiom' ? 1500000 : 1000000;
      
      const monthProgress = (currentMonth.getTime() - startDate.getTime()) / 
                          (currentDate.getTime() - startDate.getTime());
      
      const trendFactor = 1 + monthProgress * 1.5; // Increasing trend
      const randomFactor = 0.7 + Math.random() * 0.6; // Random variation
      
      mockData.push({
        month: currentMonth.toISOString().substring(0, 10), // YYYY-MM-DD format
        platform,
        protocol_revenue: baseRevenue * trendFactor * randomFactor
      });
    });
    
    // Move to next month
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
  
  return Promise.resolve(mockData);
}

// Prepare DEX revenue data as CSV
export async function prepareDexRevenueCSV(): Promise<string> {
  try {
    const data = await fetchDexRevenueData();
    
    if (!data || data.length === 0) {
      console.error('No DEX revenue data available for CSV export');
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
    console.error('Error preparing DEX revenue CSV data:', error);
    return '';
  }
} 