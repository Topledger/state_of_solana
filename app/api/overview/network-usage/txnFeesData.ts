export interface TxnFeesDataPoint {
  block_date: string;
  Average_Transaction_Fees: number;
}

/**
 * Fetches average transaction fees data from the API
 * Data shows average transaction fees over time
 */
export async function fetchTxnFeesData(): Promise<TxnFeesDataPoint[]> {
  try {
    const url = 'https://analytics.topledger.xyz/tl/api/queries/13249/results.json?api_key=VXYHhXmv3FGJJbtg0W8nxUm7RHWFH1sxVgXJ8Jn2';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction fees data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the rows from the response
    const rows = data.query_result.data.rows.map((row: any) => ({
      block_date: row.block_date,
      Average_Transaction_Fees: row.Average_Transaction_Fees
    }));
    
    // Sort by date (ascending)
    return rows.sort((a: TxnFeesDataPoint, b: TxnFeesDataPoint) => {
      return new Date(a.block_date).getTime() - new Date(b.block_date).getTime();
    });
  } catch (error) {
    console.error('Error fetching transaction fees data:', error);
    throw error;
  }
}

/**
 * Formats a number as a currency value
 */
export function formatFees(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  } else {
    return value.toFixed(2);
  }
} 