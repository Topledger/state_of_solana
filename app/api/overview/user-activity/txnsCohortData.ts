export interface TxnsCohortDataPoint {
  Txns_Cohort: string;
  Wallet_Count: number;
}

/**
 * Fetches transaction cohort data from the API
 * Data shows number of wallets grouped by transaction count ranges
 */
export async function fetchTxnsCohortData(): Promise<TxnsCohortDataPoint[]> {
  try {
    const url = 'https://analytics.topledger.xyz/tl/api/queries/12929/results.json?api_key=qMWNTHb9k4p9UjvmT5omRmJghhGlJh5V9XH9Zet9';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction cohort data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the rows from the response
    return data.query_result.data.rows.map((row: TxnsCohortDataPoint) => ({
      Txns_Cohort: row.Txns_Cohort,
      Wallet_Count: row.Wallet_Count
    }));
  } catch (error) {
    console.error('Error fetching transaction cohort data:', error);
    throw error;
  }
}

// Order of cohorts for consistent display
export const cohortOrder = [
  'Only 1 Txns',
  '2-5 Txns',
  '6-10 Txns',
  '11-100 Txns',
  '101-500 Txns',
  '501-1000 Txns',
  '>1000 Txns'
];

// Define colors for each cohort
export const cohortColors: Record<string, string> = {
  'Only 1 Txns': '#3b82f6',      // blue
  '2-5 Txns': '#10b981',         // green
  '6-10 Txns': '#f59e0b',        // amber
  '11-100 Txns': '#8b5cf6',      // purple
  '101-500 Txns': '#ec4899',     // pink
  '501-1000 Txns': '#ef4444',    // red
  '>1000 Txns': '#6366f1'        // indigo
}; 