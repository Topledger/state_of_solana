import { TimeFilter } from './chartData';

// Re-export TimeFilter to be used by components
export type { TimeFilter };

// Define platform revenue data point structure
export interface PlatformRevenueDataPoint {
  platform: string;
  revenue_usd: number;
  percentage: number;
}

// Define API response structure
interface ApiResponse {
  query_result?: {
    data?: {
      rows?: any[];
      columns?: { name: string; friendly_name: string; type: string }[];
    };
  };
}

// Function to fetch platform revenue data
export const fetchPlatformRevenueData = async (timeFilter: TimeFilter): Promise<PlatformRevenueDataPoint[]> => {
  try {
    // Set up the request options
    const apiUrl = "https://analytics.topledger.xyz/solana/api/queries/12589/results?api_key=oiGI7qFLlC7o3etCqCywaqnYbY2Z2bGFxOOKdJwO";
    const datePartMapping: Record<TimeFilter, string> = {
      'D': 'D',
      'W': 'W',
      'M': 'M',
      'Q': 'Q',
      'Y': 'Y'
    };
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parameters: {
          "Date Part": datePartMapping[timeFilter]
        }
      })
    };
    
    // Fetch data
    const response = await fetch(apiUrl, requestOptions);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data: ApiResponse = await response.json();
    
    // Check if we have data
    if (!data.query_result || !data.query_result.data || !data.query_result.data.rows) {
      throw new Error('Invalid data structure in API response');
    }
    
    // Log the first row to see the structure
    if (data.query_result.data.rows.length > 0) {
      console.log("First row sample:", data.query_result.data.rows[0]);
    }
    
    // Normalize platform names (some might be lowercase)
    const normalizeData = data.query_result.data.rows.map(row => ({
      block_date: row.block_date,
      platform: normalizePlatformName(row.platform),
      protocol_revenue_usd: typeof row.protocol_revenue_usd === 'number' ? 
        row.protocol_revenue_usd : parseFloat(row.protocol_revenue_usd || '0')
    }));
    
    // Aggregate by platform (summing revenue across all dates)
    const platformMap = new Map<string, number>();
    let totalRevenue = 0;
    
    normalizeData.forEach(item => {
      const currentValue = platformMap.get(item.platform) || 0;
      const newValue = currentValue + item.protocol_revenue_usd;
      platformMap.set(item.platform, newValue);
      totalRevenue += item.protocol_revenue_usd;
    });
    
    // Convert to array and calculate percentages
    const platformData: PlatformRevenueDataPoint[] = Array.from(platformMap.entries())
      .map(([platform, revenue_usd]) => ({
        platform,
        revenue_usd,
        percentage: (revenue_usd / totalRevenue) * 100
      }));
    
    // Sort data by revenue (descending)
    const sortedData = platformData.sort((a, b) => b.revenue_usd - a.revenue_usd);
    
    return sortedData;
  } catch (error) {
    console.error('Error fetching platform revenue data:', error);
    throw error;
  }
};

// Helper function to normalize platform names
export function normalizePlatformName(name: string): string {
  if (!name) return 'Unknown';
  
  // Handle specific platform name normalizations
  const nameMapping: Record<string, string> = {
    'magiceden': 'Magic Eden',
    'tensorswap': 'Tensor',
    'looter': 'Looter',
    'jito': 'Jito',
    'metaplex': 'Metaplex',
    'raydium': 'Raydium',
    'orca': 'Orca',
    'phantom': 'Phantom',
    'bloxroute': 'Bloxroute',
    'pump fun': 'Pump Fun',
    'photon': 'Photon',
    'lifinity': 'Lifinity'
  };
  
  // First check if we have an exact match in our mapping
  if (nameMapping[name.toLowerCase()]) {
    return nameMapping[name.toLowerCase()];
  }
  
  // Otherwise capitalize first letter of each word
  return name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Format functions
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

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Define chart colors for platforms (will use consistent colors for platforms)
export const platformColors: { [key: string]: string } = {
  'Magic Eden': '#f97316', // orange
  'Jupiter': '#60a5fa', // blue
  'Metaplex': '#a78bfa', // purple
  'Raydium': '#34d399', // green
  'Orca': '#fb7185', // pink
  'Phantom': '#fbbf24', // yellow
  'Marinade Finance': '#94a3b8', // slate
  'Tensor': '#ec4899', // pink
  'Lifinity': '#38bdf8', // sky
  'Pump Fun': '#a3e635', // lime
  'Drift': '#8b5cf6', // violet
  'Mango Markets': '#f43f5e', // rose
  'Zeta Markets': '#64748b', // slate
  'Jito': '#60a5fa', // blue
  'Photon': '#d946ef', // fuchsia
  'Bloxroute': '#ec4899', // pink
  'Trojan': '#f97316', // orange
  'BullX': '#f59e0b', // amber
  // Fallback color for any other platforms
  'default': '#9ca3af' // gray
};

// Function to get color for a platform
export const getPlatformColor = (platform: string): string => {
  return platformColors[platform] || platformColors['default'];
}; 