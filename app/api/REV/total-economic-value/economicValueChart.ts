/**
 * API handler for economic value chart data
 */

export interface EconomicValueChartData {
  year: number;
  real_economic_value: number;
  total_economic_value: number;
  real_economic_value_usd: number;
  total_economic_value_usd: number;
}

export async function fetchEconomicValueChartData(): Promise<EconomicValueChartData[]> {
  try {
    console.log('Fetching economic value chart data');
    
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/12261/results.json?api_key=pwtF5dJZGAA47aSxonN2thOIiO3OssMFxpdcH8B1',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`API request failed with status: ${response.status}`);
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate the response structure
    if (!data.query_result || !data.query_result.data || !data.query_result.data.rows) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }

    // Map the data to our interface
    const chartData: EconomicValueChartData[] = data.query_result.data.rows.map((row: any) => ({
      year: row.year,
      real_economic_value: row.real_economic_value || 0,
      total_economic_value: row.total_economic_value || 0,
      real_economic_value_usd: row.real_economic_value_usd || 0,
      total_economic_value_usd: row.total_economic_value_usd || 0,
    }));

    // Sort by year in ascending order for display
    return chartData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error('Error fetching economic value chart data:', error);
    throw error;
  }
} 