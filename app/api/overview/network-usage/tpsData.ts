export interface TPSDataPoint {
  block_date: string;
  Total_TPS: number;
  Success_TPS: number;
  Failed_TPS: number;
  Real_TPS: number;
}

/**
 * Fetches transactions per second (TPS) data from the API
 * Data shows total, successful, failed and real TPS over time
 */
export async function fetchTPSData(): Promise<TPSDataPoint[]> {
  try {
    const url = 'https://analytics.topledger.xyz/tl/api/queries/13335/results.json?api_key=VlQLi6PlkEzNQragwg2wSJ1Pm5fQGn4bKQjxTJ3e';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch TPS data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the rows from the response
    const rows = data.query_result.data.rows.map((row: any) => ({
      block_date: row.block_date,
      Total_TPS: row.Total_TPS,
      Success_TPS: row.Success_TPS,
      Failed_TPS: row.Failed_TPS,
      Real_TPS: row.Real_TPS
    }));
    
    // Sort by date (ascending)
    return rows.sort((a: TPSDataPoint, b: TPSDataPoint) => {
      return new Date(a.block_date).getTime() - new Date(b.block_date).getTime();
    });
  } catch (error) {
    console.error('Error fetching TPS data:', error);
    throw error;
  }
}

/**
 * Formats a number for display
 */
export function formatTPS(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  } else {
    return value.toFixed(0);
  }
} 