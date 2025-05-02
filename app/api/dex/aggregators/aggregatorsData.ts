import { formatDate } from '../../../utils/dateUtils';

export interface AggregatorDataPoint {
  date: string;
  aggregator: string;
  volume: number;
  market_share: number;
}

// Extend the interface to match what's being used in the chart component
export interface AggregatorsDataPoint {
  month: string;
  aggregator: string;
  volume: number;
  signers: number; // Adding signers field to match usage in the chart
}

export interface AggregatorsData {
  dataPoints: AggregatorDataPoint[];
}

// Fetch aggregators data from the API
export async function fetchAggregatorsData(): Promise<AggregatorsData> {
  try {
    console.log("Fetching aggregators data from API...");
    const response = await fetch("https://analytics.topledger.xyz/api/v1/dex-aggregators");
    
    if (!response.ok) {
      throw new Error(`Failed to fetch aggregators data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate and process the data
    if (!Array.isArray(data)) {
      console.warn("API response is not an array, using fallback data");
      return { dataPoints: FALLBACK_AGGREGATORS_DATA };
    }
    
    // Transform the data to match our expected format
    const processedData: AggregatorDataPoint[] = data.map((item: any) => ({
      date: item.date || "",
      aggregator: item.aggregator || "Unknown",
      volume: parseFloat(item.volume) || 0,
      market_share: parseFloat(item.market_share) || 0
    }));
    
    console.log(`Processed ${processedData.length} aggregators data points`);
    return { dataPoints: processedData };
  } catch (error) {
    console.error("Error fetching aggregators data:", error);
    console.log("Using fallback data instead");
    return { dataPoints: FALLBACK_AGGREGATORS_DATA };
  }
}

// Fallback data to use when the API is unavailable
const FALLBACK_AGGREGATORS_DATA: AggregatorDataPoint[] = [
  // Jupiter data
  { date: "2023-01-01", aggregator: "Jupiter", volume: 120000000, market_share: 0.45 },
  { date: "2023-02-01", aggregator: "Jupiter", volume: 140000000, market_share: 0.47 },
  { date: "2023-03-01", aggregator: "Jupiter", volume: 160000000, market_share: 0.48 },
  { date: "2023-04-01", aggregator: "Jupiter", volume: 180000000, market_share: 0.50 },
  { date: "2023-05-01", aggregator: "Jupiter", volume: 200000000, market_share: 0.52 },
  { date: "2023-06-01", aggregator: "Jupiter", volume: 220000000, market_share: 0.53 },
  
  // Jito data
  { date: "2023-01-01", aggregator: "Jito", volume: 80000000, market_share: 0.30 },
  { date: "2023-02-01", aggregator: "Jito", volume: 85000000, market_share: 0.28 },
  { date: "2023-03-01", aggregator: "Jito", volume: 90000000, market_share: 0.27 },
  { date: "2023-04-01", aggregator: "Jito", volume: 95000000, market_share: 0.26 },
  { date: "2023-05-01", aggregator: "Jito", volume: 100000000, market_share: 0.26 },
  { date: "2023-06-01", aggregator: "Jito", volume: 105000000, market_share: 0.25 },
  
  // OpenBook data
  { date: "2023-01-01", aggregator: "OpenBook", volume: 40000000, market_share: 0.15 },
  { date: "2023-02-01", aggregator: "OpenBook", volume: 45000000, market_share: 0.15 },
  { date: "2023-03-01", aggregator: "OpenBook", volume: 50000000, market_share: 0.15 },
  { date: "2023-04-01", aggregator: "OpenBook", volume: 55000000, market_share: 0.15 },
  { date: "2023-05-01", aggregator: "OpenBook", volume: 60000000, market_share: 0.16 },
  { date: "2023-06-01", aggregator: "OpenBook", volume: 65000000, market_share: 0.16 },
  
  // Others data
  { date: "2023-01-01", aggregator: "Others", volume: 25000000, market_share: 0.10 },
  { date: "2023-02-01", aggregator: "Others", volume: 30000000, market_share: 0.10 },
  { date: "2023-03-01", aggregator: "Others", volume: 35000000, market_share: 0.10 },
  { date: "2023-04-01", aggregator: "Others", volume: 32000000, market_share: 0.09 },
  { date: "2023-05-01", aggregator: "Others", volume: 28000000, market_share: 0.06 },
  { date: "2023-06-01", aggregator: "Others", volume: 25000000, market_share: 0.06 }
];

// Mock function to convert AggregatorDataPoint to AggregatorsDataPoint
export async function fetchAggregatorsDataWithFallback(): Promise<AggregatorsDataPoint[]> {
  try {
    console.log("Attempting to fetch aggregators data from API...");
    
    // Use the provided API endpoint
    const response = await fetch("https://analytics.topledger.xyz/tl/api/queries/12428/results.json?api_key=M50ElvuV9FtY3XlSVP2GtGfSTefJ13C8z4y742da");
    
    if (!response.ok) {
      throw new Error(`Failed to fetch aggregators data: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // Check if the response has the expected structure
    if (!responseData?.query_result?.data?.rows || !Array.isArray(responseData.query_result.data.rows)) {
      console.warn("API response does not have the expected structure, using fallback data");
      return convertFallbackData();
    }
    
    // Transform the data to match our expected format
    const processedData: AggregatorsDataPoint[] = responseData.query_result.data.rows.map((item: any) => ({
      month: formatMonth(item.month), // Format the date
      aggregator: item.aggregator,
      volume: parseFloat(item.volume) || 0,
      signers: parseInt(item.Traders) || 0 // "Traders" field in API maps to "signers" in our model
    }));
    
    console.log(`Processed ${processedData.length} aggregators data points from API`);
    return processedData;
  } catch (error) {
    console.error("Error fetching aggregators data:", error);
    console.log("Using fallback data due to error");
    return convertFallbackData();
  }
}

// Helper function to convert fallback data
function convertFallbackData(): AggregatorsDataPoint[] {
  console.log("Converting fallback data");
  return FALLBACK_AGGREGATORS_DATA.map(item => ({
    month: formatMonth(item.date),
    aggregator: item.aggregator,
    volume: item.volume,
    signers: Math.round(item.volume / 10000) // Mock signers count based on volume
  }));
}

// Format date for display (e.g., "Jan 2023")
export function formatMonth(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

// Format currency for display (e.g., "$120M")
export function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Format number of traders
export function formatTraders(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

// Extract unique aggregators from data
export function getUniqueAggregators(data: AggregatorsDataPoint[]): string[] {
  return Array.from(new Set(data.map(item => item.aggregator)));
}

// Extract unique months from data
export function getUniqueMonths(data: AggregatorsDataPoint[]): string[] {
  return Array.from(new Set(data.map(item => item.month)));
} 