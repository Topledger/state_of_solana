// Time filter types
export type TimeFilter = 'D' | 'W' | 'M' | 'Q' | 'Y';

// Data point structure based on the API response
export interface ProtocolRevenueDataPoint {
  month: string;
  protocol_revenue: number;
  cumulative_protocol_revenue: number;
  Solana_Rev: number;
  Cumulative_Solana_Rev: number;
}

// Interface for the API response
interface ApiResponse {
  query_result: {
    data: {
      rows: any[]; // Use any[] for flexibility since structure might vary
      columns: { name: string; friendly_name: string; type: string }[];
    };
  };
}

// Function to fetch protocol revenue data
export const fetchProtocolRevenueData = async (timeFilter: TimeFilter): Promise<ProtocolRevenueDataPoint[]> => {
  try {
    const apiUrl = "https://analytics.topledger.xyz/solana/api/queries/13163/results.json?api_key=S8KkuOqLoYqCIPGstMYVC7zxl84uW7c16KT4nNLH";
    
    // Fetch data using native fetch
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data: ApiResponse = await response.json();
    
    // Check if we have data
    if (!data.query_result || !data.query_result.data || !data.query_result.data.rows) {
      throw new Error('Invalid data structure in API response');
    }
    
    // Debug - log the data structure
    console.log("API Response Columns:", data.query_result.data.columns);
    
    if (data.query_result.data.rows.length > 0) {
      console.log("First Row Sample:", data.query_result.data.rows[0]);
    }
    
    // Extract rows from the response and ensure proper field names
    const rows: ProtocolRevenueDataPoint[] = data.query_result.data.rows.map(row => {
      // Convert all values to numbers and handle missing values
      // Make sure to log any field name issues to help with debugging
      const dataPoint: ProtocolRevenueDataPoint = {
        month: String(row.month || ''),
        protocol_revenue: typeof row.protocol_revenue === 'number' ? row.protocol_revenue : 
                         parseFloat(row.protocol_revenue || '0'),
        cumulative_protocol_revenue: typeof row.cumulative_protocol_revenue === 'number' ? row.cumulative_protocol_revenue : 
                                    parseFloat(row.cumulative_protocol_revenue || '0'),
        Solana_Rev: typeof row.Solana_Rev === 'number' ? row.Solana_Rev : 
                   parseFloat(row.Solana_Rev || '0'),
        Cumulative_Solana_Rev: typeof row.Cumulative_Solana_Rev === 'number' ? row.Cumulative_Solana_Rev : 
                              parseFloat(row.Cumulative_Solana_Rev || '0')
      };
      
      // Debug null values
      if (!row.protocol_revenue) console.log("Null protocol_revenue for month:", row.month);
      if (!row.Solana_Rev) console.log("Null Solana_Rev for month:", row.month);
      
      return dataPoint;
    });
    
    // Filter based on time period if needed
    const filteredRows = filterDataByTimeFilter(rows, timeFilter);
    
    // Log the filtered data
    console.log(`Filtered data (${timeFilter}):`, filteredRows.length, "rows");
    
    // Sort by date (ascending - oldest first)
    const sortedData = filteredRows.sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
    
    return sortedData;
  } catch (error) {
    console.error('Error fetching protocol revenue data:', error);
    throw error;
  }
};

// Helper function to filter data based on time filter
const filterDataByTimeFilter = (data: ProtocolRevenueDataPoint[], timeFilter: TimeFilter): ProtocolRevenueDataPoint[] => {
  // If data is empty, return empty array
  if (!data || data.length === 0) return [];
  
  // Sort data by month (ascending)
  const sortedData = [...data].sort((a, b) => {
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  });
  
  // Use January 2024 as our fixed start date (regardless of time filter)
  const startDate = new Date('2024-01-01');
  
  // Filter data based on calculated start date
  return sortedData.filter(item => new Date(item.month) >= startDate);
};

// Helper functions for formatting
export const formatValue = (value: number): string => {
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

export const formatDate = (dateString: string, timeFilter: TimeFilter): string => {
  const date = new Date(dateString);
  
  switch (timeFilter) {
    case 'D':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'W':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'M':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'Q':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    case 'Y':
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
};

// Function to get latest stats for counters
export const getLatestProtocolRevenueStats = async (): Promise<{
  totalProtocolRevenue: number;
  totalSolanaRevenue: number;
  protocolRevenuePercentChange: number;
  solanaRevenuePercentChange: number;
  isProtocolRevenueIncreasing: boolean;
  isSolanaRevenueIncreasing: boolean;
}> => {
  try {
    // Fetch all monthly data
    const data = await fetchProtocolRevenueData('Y');
    
    if (data.length === 0) {
      return { 
        totalProtocolRevenue: 0, 
        totalSolanaRevenue: 0,
        protocolRevenuePercentChange: 0,
        solanaRevenuePercentChange: 0,
        isProtocolRevenueIncreasing: false,
        isSolanaRevenueIncreasing: false
      };
    }
    
    // Sort data by date in descending order (newest first)
    const sortedData = [...data].sort((a, b) => 
      new Date(b.month).getTime() - new Date(a.month).getTime()
    );
    
    // Get most recent month and previous month
    const currentMonth = sortedData[0];
    const previousMonth = sortedData[1] || currentMonth; // Fallback to current if no previous
    
    console.log("Current month data:", currentMonth);
    console.log("Previous month data:", previousMonth);
    
    // We should use the exact values shown in the API for the counters
    const totalProtocolRevenue = currentMonth.cumulative_protocol_revenue;
    const totalSolanaRevenue = currentMonth.Cumulative_Solana_Rev;
    
    // Calculate percentage changes for cumulative values
    // For month-over-month change in cumulative values
    const protocolRevenuePercentChange = calculatePercentChange(
      currentMonth.cumulative_protocol_revenue, 
      previousMonth.cumulative_protocol_revenue
    );
    
    const solanaRevenuePercentChange = calculatePercentChange(
      currentMonth.Cumulative_Solana_Rev, 
      previousMonth.Cumulative_Solana_Rev
    );
    
    console.log("Protocol cumulative revenue % change:", protocolRevenuePercentChange);
    console.log("Solana cumulative revenue % change:", solanaRevenuePercentChange);
    
    return {
      totalProtocolRevenue,
      totalSolanaRevenue,
      protocolRevenuePercentChange: Math.abs(protocolRevenuePercentChange),
      solanaRevenuePercentChange: Math.abs(solanaRevenuePercentChange),
      isProtocolRevenueIncreasing: protocolRevenuePercentChange >= 0,
      isSolanaRevenueIncreasing: solanaRevenuePercentChange >= 0
    };
  } catch (error) {
    console.error('Error fetching latest stats:', error);
    return { 
      totalProtocolRevenue: 0, 
      totalSolanaRevenue: 0,
      protocolRevenuePercentChange: 0,
      solanaRevenuePercentChange: 0,
      isProtocolRevenueIncreasing: false,
      isSolanaRevenueIncreasing: false
    };
  }
};

// Helper function to calculate percentage change
const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return 0; // Avoid division by zero
  
  // Calculate the change as a percentage
  const change = ((current - previous) / previous) * 100;
  
  // Round to 1 decimal place
  return parseFloat(change.toFixed(1));
};

// Function to prepare protocol revenue data for CSV export
export const prepareProtocolRevenueCSV = async (timeFilter: TimeFilter): Promise<string> => {
  try {
    const data = await fetchProtocolRevenueData(timeFilter);
    
    // If no data, return empty string
    if (!data.length) return '';
    
    // Define the CSV header
    const headers = ["Date", "Protocol Revenue ($)", "Solana Revenue ($)"];
    
    // Convert data to CSV format
    const rows = data.map(point => [
      formatDate(point.month, timeFilter),
      point.protocol_revenue.toFixed(2),
      point.Solana_Rev.toFixed(2)
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  } catch (error) {
    console.error('Error preparing CSV data:', error);
    return '';
  }
};

// Function to prepare cumulative protocol revenue data for CSV export
export const prepareCumulativeRevenueCSV = async (timeFilter: TimeFilter): Promise<string> => {
  try {
    const data = await fetchProtocolRevenueData(timeFilter);
    
    // If no data, return empty string
    if (!data.length) return '';
    
    // Define the CSV header
    const headers = ["Date", "Cumulative Protocol Revenue ($)", "Cumulative Solana Revenue ($)"];
    
    // Convert data to CSV format
    const rows = data.map(point => [
      formatDate(point.month, timeFilter),
      point.cumulative_protocol_revenue.toFixed(2),
      point.Cumulative_Solana_Rev.toFixed(2)
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  } catch (error) {
    console.error('Error preparing cumulative CSV data:', error);
    return '';
  }
}; 