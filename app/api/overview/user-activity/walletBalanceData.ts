export interface WalletBalanceDataPoint {
  Balance_Cohort: string;
  Wallets: number;
}

// Define order for balance cohorts for consistent display
export const balanceCohortOrder = [
  "0 SOL",
  "<1 SOL",
  "1-5 SOL",
  "5-10 SOL",
  "10-100 SOL",
  "100-1K SOL",
  "1K-100K SOL",
  "100k-1M SOL",
  ">1M SOL"
];

// Define colors for balance cohorts for consistent styling
export const balanceCohortColors: Record<string, string> = {
  "0 SOL": "#5f9ea0", // teal/sage
  "<1 SOL": "#8b5a44", // brown
  "1-5 SOL": "#6b486b", // dark purple
  "5-10 SOL": "#262626", // black
  "10-100 SOL": "#8a63a8", // medium purple
  "100-1K SOL": "#7fb2bd", // light blue
  "1K-100K SOL": "#4682b4", // medium blue
  "100k-1M SOL": "#deb887", // beige/light brown
  ">1M SOL": "#cd5c5c" // coral red
};

/**
 * Fetches wallet balance distribution data from the API
 * Data shows number of wallets grouped by SOL balance ranges
 */
export async function fetchWalletBalanceData(): Promise<WalletBalanceDataPoint[]> {
  try {
    const url = 'https://analytics.topledger.xyz/tl/api/queries/13248/results.json?api_key=hkE1WGaM5wcDut9q1Lvq3OFEpeUc3C8kHeAawrRy';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch wallet balance data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the rows from the response
    const rows = data.query_result.data.rows.map((row: any) => ({
      Balance_Cohort: row.Balance_Cohort,
      Wallets: row.Wallets
    }));
    
    // Sort the rows according to our defined order
    return rows.sort((a: WalletBalanceDataPoint, b: WalletBalanceDataPoint) => {
      const indexA = balanceCohortOrder.indexOf(a.Balance_Cohort);
      const indexB = balanceCohortOrder.indexOf(b.Balance_Cohort);
      
      // If both categories are in our order array, sort by that order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in our order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // Otherwise sort alphabetically
      return a.Balance_Cohort.localeCompare(b.Balance_Cohort);
    });
  } catch (error) {
    console.error('Error fetching wallet balance data:', error);
    throw error;
  }
}

// Function with fallback for better error handling
export async function fetchWalletBalanceDataWithFallback(): Promise<WalletBalanceDataPoint[]> {
  try {
    // Try the primary API endpoint
    return await fetchWalletBalanceData();
  } catch (error) {
    console.error("Error in primary API, trying fallback endpoint:", error);
    
    try {
      // Try a different API endpoint as fallback
      const response = await fetch(
        "https://analytics.topledger.xyz/tl/api/queries/13248/results.json?api_key=hkE1WGaM5wcDut9q1Lvq3OFEpeUc3C8kHeAawrRy",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );
      
      if (!response.ok) {
        throw new Error(`Fallback API request failed: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      if (
        responseData &&
        responseData.query_result &&
        responseData.query_result.data &&
        responseData.query_result.data.rows &&
        responseData.query_result.data.rows.length > 0
      ) {
        const apiData = responseData.query_result.data.rows.map((row: any) => ({
          Balance_Cohort: row.Balance_Cohort,
          Wallets: row.Wallets
        }));
        
        return apiData.sort((a: WalletBalanceDataPoint, b: WalletBalanceDataPoint) => {
          const indexA = balanceCohortOrder.indexOf(a.Balance_Cohort);
          const indexB = balanceCohortOrder.indexOf(b.Balance_Cohort);
          
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          
          return a.Balance_Cohort.localeCompare(b.Balance_Cohort);
        });
      }
      
      throw new Error("Invalid data structure from fallback API");
    } catch (fallbackError) {
      console.error("All API endpoints failed:", fallbackError);
      // Let the UI handle the error state
      return [];
    }
  }
} 