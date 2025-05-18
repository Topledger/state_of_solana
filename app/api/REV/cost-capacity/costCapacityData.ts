// API endpoints and keys
const API_KEY = '9zbkGgIfDrhCnAhfd5OMJe4z4JxJiB0d4SuO3ynF';
const API_BASE_URL = 'https://analytics.topledger.xyz/tl/api';
const QUERY_ID = '13207';

// Define types
export type TimeFilter = 'D' | 'W' | 'M' | 'Q' | 'Y';
export type CurrencyType = 'USD' | 'SOL';

// Define the shape of the data coming from the API
export interface CostCapacityDataPoint {
  date: string;
  base_fee: number;
  priority_fee: number;
  jito_total_tips: number;
  vote_fees: number;
}

/**
 * Function to fetch cost capacity data from the API.
 */
export async function fetchCostCapacityData(
  timeFilter: TimeFilter,
  currency: CurrencyType
): Promise<CostCapacityDataPoint[]> {
  try {
    console.log('fetchCostCapacityData called with:', { timeFilter, currency });
    
    const response = await fetch(`${API_BASE_URL}/queries/${QUERY_ID}/results?api_key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        parameters: { 
          "Date Part": timeFilter,
          "currency": currency 
        } 
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.query_result?.data?.rows || [];
    
    if (!rows || rows.length === 0) {
      console.warn('No cost capacity rows returned from API for filter:', { timeFilter, currency });
      return [];
    }
    
    // Transform data to match CostCapacityDataPoint interface
    // Adjust field names based on actual API response
    const transformedData = rows.map((row: any, index: number) => {
      // Log the first few items to debug
      if (index < 3) {
        console.log('Raw data row:', row);
      }
      
      const date = row.block_date || '';
      const base_fee = parseFloat(row.base_fee || 0);
      const priority_fee = parseFloat(row.priority_fee || 0);
      const jito_total_tips = parseFloat(row.jito_total_tips || 0);
      const vote_fees = parseFloat(row.vote_fees || 0);

      // Log if any value becomes NaN after parseFloat
      if (isNaN(base_fee) || isNaN(priority_fee) || isNaN(jito_total_tips) || isNaN(vote_fees)) {
        console.warn(`[Data Transform] Invalid numeric value encountered at row index ${index}:`, row);
      }

      return {
        date,
        base_fee,
        priority_fee,
        jito_total_tips,
        vote_fees
      };
    }).filter((item: CostCapacityDataPoint) => {
      // Also filter out items with NaN values just in case
      const isValid = item.date && 
                      !isNaN(item.base_fee) && 
                      !isNaN(item.priority_fee) && 
                      !isNaN(item.jito_total_tips) && 
                      !isNaN(item.vote_fees);
      if (!isValid) {
          console.warn('[Data Transform] Filtering out invalid data point:', item);
      }
      return isValid;
    });
    
    // Sort data by date (oldest first) for charting
    transformedData.sort((a: CostCapacityDataPoint, b: CostCapacityDataPoint) => 
      new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`Transformed ${transformedData.length} data points`);
    return transformedData;
    
  } catch (error) {
    console.error('Error fetching cost capacity data:', error);
    return []; // Return empty array on error
  }
}

// Utility function to format currency values
export const formatValue = (value: number, currency: CurrencyType): string => {
  console.log('Formatting value:', value, 'Type:', typeof value, 'Currency:', currency); // Debug log
  
  // Add check for invalid input
  if (value === undefined || value === null || isNaN(value)) {
     console.warn('formatValue received invalid input:', value);
     // Return a placeholder like '--' or 'N/A'
     return currency === 'USD' ? '$--' : '-- SOL'; 
  }
  
  if (currency === 'USD') {
    // Format as USD with appropriate suffixes
    if (value >= 1e9) {
      return `$${Math.round(value / 1e9)}B`;
    } else if (value >= 1e6) {
      return `$${Math.round(value / 1e6)}M`;
    } else if (value >= 1e3) {
      return `$${Math.round(value / 1e3)}K`;
    }
    return `$${Math.round(value)}`;
  } else {
    // Format as SOL with appropriate suffixes - without "SOL" text
    if (value >= 1e9) {
      return `${Math.round(value / 1e9)}B`;
    } else if (value >= 1e6) {
      return `${Math.round(value / 1e6)}M`;
    } else if (value >= 1e3) {
      return `${Math.round(value / 1e3)}K`;
    }
    return `${Math.round(value)}`;
  }
};

// Format date based on time filter
export const formatDate = (dateString: string, timeFilter: TimeFilter): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  switch (timeFilter) {
    case 'Y':
      return date.getFullYear().toString();
    case 'Q':
      return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    case 'M':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'W':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'D':
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

// Define stack keys for accessing data - updated to match API
export const stackKeys = ['base_fee', 'priority_fee', 'jito_total_tips', 'vote_fees'];

// Generate mock data for fees (kept for potential fallback/testing)
const generateMockData = (timeFilter: TimeFilter, currency: CurrencyType): CostCapacityDataPoint[] => {
  let startDate = new Date();
  const endDate = new Date();
  let interval: number;
  
  // Adjust date range based on the time filter
  switch (timeFilter) {
    case 'Y':
      startDate = new Date(endDate.getFullYear() - 4, 0, 1);
      interval = 3; // Quarterly data points for yearly view
      break;
    case 'Q':
      startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);
      interval = 1; // Monthly data points for quarterly view
      break;
    case 'M':
      startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
      interval = 1; // Daily data points but fewer for monthly view
      break;
    case 'W':
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 7);
      interval = 1; // Daily data points for weekly view
      break;
    case 'D':
    default:
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 1);
      interval = 1; // Hourly data points for daily view
      break;
  }

  // Generate data points
  const data: CostCapacityDataPoint[] = [];
  const dataPoints = timeFilter === 'Y' ? 16 : timeFilter === 'Q' ? 12 : timeFilter === 'M' ? 30 : timeFilter === 'W' ? 7 : 24;
  
  // Multiplier for SOL values (if currency is SOL)
  const currencyMultiplier = currency === 'SOL' ? 1 : 50; // USD values are ~50x SOL values for realism
  
  // Base values for each fee type (in SOL)
  const baseFeeBase = 0.15;
  const priorityFeeBase = 0.08;
  const jitoTipsBase = 0.12;
  const voteFeeBase = 0.05;
  
  // Trend factors for each fee type (to simulate realistic growth/patterns)
  const baseFeeGrowth = 1.002;
  const priorityFeeGrowth = 1.005; // Priority fees growing faster
  const jitoTipsGrowth = 1.003;
  const voteFeeGrowth = 1.001;

  for (let i = 0; i < dataPoints; i++) {
    // Create date based on time filter
    let currentDate: Date;
    switch (timeFilter) {
      case 'Y':
        currentDate = new Date(startDate.getFullYear() + Math.floor(i / 4), (i % 4) * 3, 1);
        break;
      case 'Q':
        currentDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        break;
      case 'M':
        currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        break;
      case 'W':
        currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        break;
      case 'D':
      default:
        currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), i);
        break;
    }

    // Apply trend and some randomness for each fee type
    const timeProgress = i / dataPoints;
    
    // Random variations for more realistic data
    const baseFeeRand = 0.90 + Math.random() * 0.20;
    const priorityFeeRand = 0.85 + Math.random() * 0.30;
    const jitoTipsRand = 0.80 + Math.random() * 0.40;
    const voteFeeRand = 0.95 + Math.random() * 0.10;
    
    // Apply growth trends
    const baseFeeGrowthFactor = Math.pow(baseFeeGrowth, i);
    const priorityFeeGrowthFactor = Math.pow(priorityFeeGrowth, i);
    const jitoTipsGrowthFactor = Math.pow(jitoTipsGrowth, i);
    const voteFeeGrowthFactor = Math.pow(voteFeeGrowth, i);
    
    // Calculate fee values
    const base_fee = baseFeeBase * baseFeeRand * baseFeeGrowthFactor * currencyMultiplier;
    const priority_fee = priorityFeeBase * priorityFeeRand * priorityFeeGrowthFactor * currencyMultiplier;
    const jito_total_tips = jitoTipsBase * jitoTipsRand * jitoTipsGrowthFactor * currencyMultiplier;
    const vote_fees = voteFeeBase * voteFeeRand * voteFeeGrowthFactor * currencyMultiplier;

    data.push({
      date: currentDate.toISOString(),
      base_fee,
      priority_fee,
      jito_total_tips,
      vote_fees
    });
  }

  return data;
};

// Mock API function (renamed to avoid conflict, kept for testing)
export const fetchCostCapacityDataMock = async (
  timeFilter: TimeFilter = 'M',
  currency: CurrencyType = 'USD'
): Promise<CostCapacityDataPoint[]> => {
  // Simulate API delay
  return new Promise((resolve) => {
    setTimeout(() => {
      const data = generateMockData(timeFilter, currency);
      resolve(data);
    }, 800); // Simulate network delay
  });
};