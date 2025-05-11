export interface TxnStatsDataPoint {
  block_date: string;
  Total_Transactions: number;
  Total_Vote_Transactions: number;
  Total_Non_Vote_Transactions: number;
  Succeesful_Transactions_perc: number;
  Successful_Non_Vote_Transactiosn_perc: number;
}

/**
 * Fetches transactions statistics data from the API
 * Shows vote vs non-vote transactions and success rates
 */
export async function fetchTxnStatsData(datePart: 'M' | 'Q' | 'Y' = 'M'): Promise<TxnStatsDataPoint[]> {
  try {
    const url = 'https://analytics.topledger.xyz/tl/api/queries/12976/results?api_key=0pzEmBGojQAV7yWcJEbd0VhJ6FGpKAk04jztTwSp';
    
    // Fetch with POST request including parameter for date part
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parameters: {
          "Date Part": datePart
        }
      }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction stats data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the rows from the response
    const rows = data.query_result.data.rows.map((row: any) => ({
      block_date: row.block_date,
      Total_Transactions: row.Total_Transactions,
      Total_Vote_Transactions: row.Total_Vote_Transactions,
      Total_Non_Vote_Transactions: row.Total_Non_Vote_Transactions,
      Succeesful_Transactions_perc: row.Succeesful_Transactions_perc,
      Successful_Non_Vote_Transactiosn_perc: row.Successful_Non_Vote_Transactiosn_perc
    }));
    
    // Sort by date (ascending)
    return rows.sort((a: TxnStatsDataPoint, b: TxnStatsDataPoint) => {
      return new Date(a.block_date).getTime() - new Date(b.block_date).getTime();
    });
  } catch (error) {
    console.error('Error fetching transaction stats data:', error);
    throw error;
  }
}

/**
 * Formats a percentage value
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '0.00%';
  }
  return `${value.toFixed(2)}%`;
}

/**
 * Formats a large number for display
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '0';
  }
  
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  } else {
    return value.toFixed(0);
  }
} 