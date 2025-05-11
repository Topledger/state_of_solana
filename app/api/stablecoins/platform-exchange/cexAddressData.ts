// Data types and API functions for CEX address data

export interface CexAddressDataPoint {
  blockchain: string;
  address: string;
  cex_name: string;
  distinct_name: string;
  added_date: string;
}

/**
 * Fetch CEX address data from the API
 */
export async function fetchCexAddressData(): Promise<CexAddressDataPoint[]> {
  try {
    // Fetch data from TopLedger API
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/12898/results.json?api_key=zXZLmt8SYVAUnlgfGqIJiF2BAgQGndlspePnHKI5'
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

    // Parse and format data
    const formattedData: CexAddressDataPoint[] = rows;

    return formattedData;
  } catch (error) {
    console.error('Error fetching CEX address data:', error);
    throw error;
  }
} 