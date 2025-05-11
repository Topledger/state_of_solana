// Data types and API functions for TVL data
export interface TvlDataPoint {
  block_date: string;
  Amount_in_Pool: number;
  date?: Date;
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a currency value for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

/**
 * Fetch TVL data from the API
 */
export async function fetchTvlData(): Promise<TvlDataPoint[]> {
  try {
    // Fetch data from TopLedger API
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/12905/results.json?api_key=5zstW6keBAxELlhfMpi2qvRUAykA5usVpkhOyFmI'
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const responseData = await response.json();
    
    // Access the rows of data
    const rows = responseData.query_result?.data?.rows;
    
    if (!rows || !Array.isArray(rows)) {
      throw new Error('Invalid data format received from API');
    }

    // Parse and format data for our chart
    const formattedData: TvlDataPoint[] = rows.map(row => ({
      block_date: row.block_date,
      Amount_in_Pool: Number(row.Amount_in_Pool),
      date: new Date(row.block_date)
    }));

    // Sort data by date
    return formattedData.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date.getTime() - b.date.getTime();
    });
  } catch (error) {
    console.error('Error fetching TVL data:', error);
    throw error;
  }
} 