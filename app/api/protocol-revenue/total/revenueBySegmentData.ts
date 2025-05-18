import { colors } from '@/app/utils/chartColors';

// Define time filter type
export type TimeFilter = 'W' | 'M' | 'Q' | 'Y';

// Define revenue by segment data point structure
export interface RevenueBySegmentDataPoint {
  block_date: string;
  segment: string;
  protocol_revenue: number;
}

// Define API response structure
interface ApiResponse {
  query_result?: {
    data?: {
      rows?: any[];
    };
  };
}

// Available segments from the API
export const segmentKeys = [
  'Telegram Bot',
  'DePIN',
  'Memecoin Trading App',
  'Memecoin LaunchPad',
  'Wallets',
  'Spot Dex',
  'MEV',
  'Infrastructure',
  'NFT Marketplaces',
  'Payments',
  'Borrow and Lending',
  'Others'
];

// Segment-specific colors mapping using colors from chartColors.ts
export const segmentColors: Record<string, string> = {
  'Telegram Bot': colors[0], // light blue
  'DePIN': colors[1], // light orange
  'Memecoin Trading App': colors[2],
  'Memecoin LaunchPad': colors[3],
  'Wallets': colors[4],
  'Spot Dex': colors[5], // sky blue
  'MEV': colors[6],
  'Infrastructure': colors[7], // dark purple
  'NFT Marketplaces': colors[8],
  'Payments': colors[9], // light red
  'Borrow and Lending': colors[10], // slate
  'Others': colors[11]
};

// Mapping of API segments to our segment categories
const segmentMapping: Record<string, string> = {
  'Spot Dex': 'Spot Dex',
  'Borrow and Lending': 'Borrow and Lending',
  'MEV': 'MEV',
  'Payments': 'Payments',
  'NFT Marketplaces': 'NFT Marketplaces',
  'DePIN': 'DePIN',
  'Infrastructure': 'Infrastructure',
  'Telegram Bot': 'Telegram Bot',
  'Wallets': 'Wallets',
  'Memecoin Trading App': 'Memecoin Trading App',
  'Memecoin LaunchPad': 'Memecoin LaunchPad',
  'Others': 'Others'
};

// Function to fetch revenue by segment data
export const fetchRevenueBySegmentData = async (timeFilter: TimeFilter = 'W'): Promise<RevenueBySegmentDataPoint[]> => {
  try {
    console.log('Fetching protocol revenue by segment data with time filter:', timeFilter);
    
    // Fetch data from the API
    const response = await fetch('https://analytics.topledger.xyz/solana/api/queries/13168/results?api_key=AhoU1Wq4NS9iHdyeJy6VejNkCIZE5PVSsL2Xg0MM', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parameters: {
          "Date Part": timeFilter
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data: ApiResponse = await response.json();
    
    // Check if response has the expected structure
    if (!data?.query_result?.data?.rows || !Array.isArray(data.query_result.data.rows)) {
      console.error('Unexpected API response structure');
      return generateFallbackData(timeFilter);
    }
    
    console.log(`Got ${data.query_result.data.rows.length} rows from API`);
    
    // Process API data to match our format
    const processedData: RevenueBySegmentDataPoint[] = [];
    const apiRows = data.query_result.data.rows;
    
    // Group revenues by date and segment
    const groupedData: Record<string, Record<string, number>> = {};
    
    apiRows.forEach((row: any) => {
      const dateStr = row.block_date;
      const apiSegment = row.Segment;
      const revenue = parseFloat(row.protocol_revenue) || 0;
      
      // Map API segment to our segment categories
      const mappedSegment = segmentMapping[apiSegment] || 'Other';
      
      if (!groupedData[dateStr]) {
        groupedData[dateStr] = {};
      }
      
      if (!groupedData[dateStr][mappedSegment]) {
        groupedData[dateStr][mappedSegment] = 0;
      }
      
      groupedData[dateStr][mappedSegment] += revenue;
    });
    
    // Convert grouped data to array format
    Object.keys(groupedData).forEach(date => {
      segmentKeys.forEach(segment => {
        const revenue = groupedData[date][segment] || 0;
        processedData.push({
          block_date: date,
          segment,
          protocol_revenue: revenue
        });
      });
    });
    
    // Sort by date ascending
    processedData.sort((a, b) => new Date(a.block_date).getTime() - new Date(b.block_date).getTime());
    
    console.log(`Processed ${processedData.length} data points`);
    return processedData;
    
  } catch (error) {
    console.error('Error fetching revenue by segment data:', error);
    return generateFallbackData(timeFilter);
  }
};

// Generate fallback data if API request fails
const generateFallbackData = (timeFilter: TimeFilter): RevenueBySegmentDataPoint[] => {
  console.log('Generating fallback mock data for time filter:', timeFilter);
  
  // Generate dates based on time filter
  const today = new Date();
  const dates: string[] = [];
  
  if (timeFilter === 'W') {
    // Weekly - last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 7));
      dates.push(date.toISOString().split('T')[0]);
    }
  } else if (timeFilter === 'M') {
    // Monthly - last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      dates.push(date.toISOString().split('T')[0]);
    }
  } else if (timeFilter === 'Q') {
    // Quarterly - last 4 quarters
    for (let i = 3; i >= 0; i--) {
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3 - (i * 3);
      const year = today.getFullYear() + Math.floor((today.getMonth() - quarterMonth) / 12);
      const date = new Date(year, quarterMonth, 1);
      dates.push(date.toISOString().split('T')[0]);
    }
  } else {
    // Yearly - last 2 years
    for (let i = 1; i >= 0; i--) {
      const date = new Date(today.getFullYear() - i, 0, 1);
      dates.push(date.toISOString().split('T')[0]);
    }
  }
  
  // Generate data points for each date and segment
  const mockData: RevenueBySegmentDataPoint[] = [];
  
  dates.forEach(date => {
    segmentKeys.forEach(segment => {
      // Base revenue amount with segment-specific multipliers
      let base = 1000000;
      
      // Adjust multipliers for each segment to create realistic data distribution
      switch(segment) {
        case 'Spot Dex':
          base *= 1.8;
          break;
        case 'NFT Marketplaces':
          base *= 1.4;
          break;
        case 'Memecoin Trading App':
          base *= 1.6;
          break;
        case 'Memecoin LaunchPad':
          base *= 1.2;
          break;
        case 'Infrastructure':
          base *= 1.3;
          break;
        case 'MEV':
          base *= 1.5;
          break;
        case 'Wallets':
          base *= 0.9;
          break;
        case 'Telegram Bot':
          base *= 0.6;
          break;
        case 'DePIN':
          base *= 1.1;
          break;
        case 'Payments':
          base *= 0.8;
          break;
        case 'Borrow and Lending':
          base *= 0.7;
          break;
        case 'Others':
          base *= 0.4;
          break;
      }
      
      // Add some randomness
      const random = 0.8 + Math.random() * 0.4;
      
      mockData.push({
        block_date: date,
        segment,
        protocol_revenue: Math.round(base * random)
      });
    });
  });
  
  return mockData;
};

// Function to get color for a segment
export const getSegmentColor = (segment: string): string => {
  return segmentColors[segment] || colors[9]; // Default to gray color (colors[9]) if segment not found
};

// Format currency values
export const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${Math.round(value)}`;
};

// Format date based on time filter
export const formatDate = (dateStr: string, timeFilter: TimeFilter): string => {
  const date = new Date(dateStr);
  
  if (timeFilter === 'W') {
    return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else if (timeFilter === 'M') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } else if (timeFilter === 'Q') {
    return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
  } else if (timeFilter === 'Y') {
    return date.getFullYear().toString();
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format for axis labels - more compact
export const formatAxisDate = (dateStr: string, timeFilter: TimeFilter): string => {
  const date = new Date(dateStr);
  
  if (timeFilter === 'W') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (timeFilter === 'M') {
    return date.toLocaleDateString('en-US', { month: 'short' });
  } else if (timeFilter === 'Q') {
    return `Q${Math.floor(date.getMonth() / 3) + 1}`;
  } else if (timeFilter === 'Y') {
    return date.getFullYear().toString();
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Function to prepare revenue by segment data for CSV export
export const prepareRevenueBySegmentCSV = async (timeFilter: TimeFilter): Promise<string> => {
  try {
    // Fetch the data from the API
    const data = await fetchRevenueBySegmentData(timeFilter);
    
    if (!data || data.length === 0) {
      throw new Error('No revenue by segment data available');
    }
    
    // Get all dates and segments
    const allDates = [...new Set(data.map(item => item.block_date))].sort();
    const allSegments = [...new Set(data.map(item => item.segment))].sort();
    
    // Create a mapping of date -> segment -> revenue
    const dataMap: Record<string, Record<string, number>> = {};
    
    // Initialize the map structure
    allDates.forEach(date => {
      dataMap[date] = {};
      allSegments.forEach(segment => {
        dataMap[date][segment] = 0;
      });
    });
    
    // Fill in the data
    data.forEach(item => {
      if (dataMap[item.block_date] && item.segment) {
        dataMap[item.block_date][item.segment] = item.protocol_revenue;
      }
    });
    
    // Create CSV headers: Date, Segment1, Segment2, ...
    const headers = ['Date', ...allSegments];
    
    // Create rows
    const rows = allDates.map(date => {
      const rowData = [date];
      
      allSegments.forEach(segment => {
        rowData.push(dataMap[date][segment].toFixed(2));
      });
      
      return rowData;
    });
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  } catch (error) {
    console.error('Error preparing revenue by segment CSV:', error);
    throw error;
  }
}; 