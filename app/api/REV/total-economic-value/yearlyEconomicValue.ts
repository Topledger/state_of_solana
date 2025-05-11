import { CurrencyType } from './economicValue';

export interface YearlyEconomicValueDataPoint {
  year: number;
  base_fee: number;
  priority_fee: number;
  vote_fees: number;
  total_jito_tips: number;
  real_economic_value: number;
  sol_issuance: number;
  total_economic_value: number;
  base_fee_usd: number;
  priority_fee_usd: number;
  vote_fees_usd: number;
  total_jito_tips_usd: number;
  sol_issuance_usd: number;
  real_economic_value_usd: number;
  total_economic_value_usd: number;
}

/**
 * Fetches yearly total economic value data from the API
 */
export async function fetchYearlyEconomicValueData(): Promise<YearlyEconomicValueDataPoint[]> {
  try {
    const endpoint = 'https://analytics.topledger.xyz/tl/api/queries/12261/results.json';
    const apiKey = 'pwtF5dJZGAA47aSxonN2thOIiO3OssMFxpdcH8B1';
    
    console.log('Fetching yearly economic value data...');
    
    const response = await fetch(`${endpoint}?api_key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`API request failed with status ${response.status}`);
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the response has the expected structure
    if (!data.query_result || !data.query_result.data || !data.query_result.data.rows) {
      console.error('Unexpected API response structure');
      throw new Error('API response missing expected data structure');
    }
    
    const rows = data.query_result.data.rows;
    console.log(`Received ${rows.length} rows of yearly data`);
    
    if (rows.length === 0) {
      console.warn('No yearly data returned from API');
      return [];
    }
    
    // Process the data to ensure it has the right structure
    const processedData = rows.map((row: any): YearlyEconomicValueDataPoint => {
      return {
        year: row.year || 0,
        base_fee: Number(row.base_fee || 0),
        priority_fee: Number(row.priority_fee || 0),
        vote_fees: Number(row.vote_fees || 0),
        total_jito_tips: Number(row.total_jito_tips || 0),
        real_economic_value: Number(row.real_economic_value || 0),
        sol_issuance: Number(row.sol_issuance || 0),
        total_economic_value: Number(row.total_economic_value || 0),
        base_fee_usd: Number(row.base_fee_usd || 0),
        priority_fee_usd: Number(row.priority_fee_usd || 0),
        vote_fees_usd: Number(row.vote_fees_usd || 0),
        total_jito_tips_usd: Number(row.total_jito_tips_usd || 0),
        sol_issuance_usd: Number(row.sol_issuance_usd || 0),
        real_economic_value_usd: Number(row.real_economic_value_usd || 0),
        total_economic_value_usd: Number(row.total_economic_value_usd || 0)
      };
    });
    
    // Sort by year in descending order
    const sortedData = processedData.sort((a: YearlyEconomicValueDataPoint, b: YearlyEconomicValueDataPoint) => {
      return b.year - a.year; // Descending by year
    });
    
    return sortedData;
    
  } catch (error) {
    console.error('Error fetching yearly economic value data:', error);
    return [];
  }
} 