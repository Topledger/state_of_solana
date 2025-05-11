export interface SolChangeDataPoint {
  Sol_change_cohort: string;
  Wallets: number;
}

// Define order for SOL change cohorts for consistent display
export const solChangeCohortOrder = [
  "0 SOL",
  "0-1 SOL",
  "1-5 SOL",
  "5-10 SOL",
  "10-50 SOL",
  "50-100 SOL",
  ">100 SOL"
];

// Define colors for SOL change cohorts based on the image
export const solChangeCohortColors: Record<string, string> = {
  "0 SOL": "#5f9ea0", // teal/sage
  "0-1 SOL": "#cd5c5c", // red
  "1-5 SOL": "#deb887", // light brown
  "5-10 SOL": "#262626", // black
  "10-50 SOL": "#6b486b", // dark purple
  "50-100 SOL": "#4682b4", // blue
  ">100 SOL": "#8a63a8", // purple
};

/**
 * Fetches SOL change cohort data from the API
 * Data shows number of wallets grouped by SOL change ranges
 */
export async function fetchSolChangeData(): Promise<SolChangeDataPoint[]> {
  try {
    const url = 'https://analytics.topledger.xyz/tl/api/queries/13250/results.json?api_key=zZJ4P3HtiaEeLtDAgm7TvTPVHKofWGOpOHpqZPoM';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch SOL change data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the rows from the response
    const rows = data.query_result.data.rows.map((row: any) => ({
      Sol_change_cohort: row.Sol_change_cohort,
      Wallets: row.Wallets
    }));
    
    // Sort the data according to the defined order
    return rows.sort((a: SolChangeDataPoint, b: SolChangeDataPoint) => {
      const indexA = solChangeCohortOrder.indexOf(a.Sol_change_cohort);
      const indexB = solChangeCohortOrder.indexOf(b.Sol_change_cohort);
      
      // If both categories are in our order array, sort by that order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in our order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // Otherwise sort alphabetically
      return a.Sol_change_cohort.localeCompare(b.Sol_change_cohort);
    });
  } catch (error) {
    console.error('Error fetching SOL change data:', error);
    throw error;
  }
} 