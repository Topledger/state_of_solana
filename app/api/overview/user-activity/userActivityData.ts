export interface UserActivityDataPoint {
  block_date: string;
  Active_Wallets: number;
  New_Wallets: number;
}

/**
 * Fetches user activity data from the API
 * @param datePart Time granularity (W: weekly, M: monthly, Q: quarterly, Y: yearly)
 * @returns Array of user activity data points
 */
export async function fetchUserActivityData(datePart: 'W' | 'M' | 'Q' | 'Y' = 'M'): Promise<UserActivityDataPoint[]> {
  try {
    const apiEndpoint = 'https://analytics.topledger.xyz/tl/api/queries/12973/results?api_key=W0uxPWzEpwdowSGrlFGjUmFBxF4pR6bDVoVfBMDr';
    
    const response = await fetch(apiEndpoint, {
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
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.query_result || !data.query_result.data || !data.query_result.data.rows) {
      throw new Error('Invalid API response structure');
    }

    const rows = data.query_result.data.rows;
    
    // Check if data is still processing
    if (rows.length === 0) {
      throw new Error('Data is still processing. Please try again later.');
    }
    
    // Transform the data
    return rows.map((row: any) => ({
      block_date: row.block_date,
      Active_Wallets: parseInt(row.Active_Wallets, 10) || 0,
      New_Wallets: parseInt(row.New_Wallets, 10) || 0
    }));
  } catch (error) {
    console.error('Error fetching user activity data:', error);
    throw error;
  }
} 