// API file to fetch DEX traders data
export interface TradersDataPoint {
  date: string;
  active_signer: number;
  new_signer: number;
  new_traders_activation_ratio: number;
  cumulative_signer: number;
}

export type TimeFilter = 'W' | 'M' | 'Q' | 'Y' | 'ALL';

export async function fetchTradersData(): Promise<TradersDataPoint[]> {
  console.log('[TradersData] Starting to fetch traders data');
  try {
    const apiUrl = "https://analytics.topledger.xyz/tl/api/queries/13181/results.json?api_key=fLzwXGF8j4St6XvrckEAe1gjQRHKveWvvCafx2Zz";
    console.log('[TradersData] Fetching from URL:', apiUrl);
    
    // Increase timeout to 20 seconds and implement retry logic
    const maxRetries = 2;
    const timeoutDuration = 20000; // 20 seconds timeout
    
    let lastError: any = null;
    
    // Try up to maxRetries times
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        console.log(`[TradersData] Retry attempt ${attempt}/${maxRetries}...`);
        // Add exponential backoff delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
      
      // Add timeout to the fetch request to avoid hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
      
      try {
        const response = await fetch(apiUrl, {
          signal: controller.signal,
          // Add headers that might help with CORS issues
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        console.log('[TradersData] Received response with status:', response.status);
        
        if (!response.ok) {
          console.error('[TradersData] HTTP error with status:', response.status);
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[TradersData] Successfully parsed JSON response, structure:', 
          Object.keys(data).join(', '));
        
        if (!data) {
          console.error('[TradersData] No data received from API');
          throw new Error('No data received from API');
        }
        
        // More detailed inspection of the response structure
        if (!data.query_result) {
          console.error('[TradersData] No query_result in response:', data);
          throw new Error('Invalid API response format: missing query_result');
        }
        
        if (!data.query_result.data) {
          console.error('[TradersData] No data in query_result:', data.query_result);
          throw new Error('Invalid API response format: missing query_result.data');
        }
        
        if (!data.query_result.data.rows || !Array.isArray(data.query_result.data.rows)) {
          console.error('[TradersData] No rows array in data:', data.query_result.data);
          throw new Error('Invalid API response format: missing rows array');
        }
        
        console.log('[TradersData] Raw rows count:', data.query_result.data.rows.length);
        if (data.query_result.data.rows.length > 0) {
          console.log('[TradersData] Sample raw row:', data.query_result.data.rows[0]);
        }
        
        // Map the data to our internal format with validation
        const tradersData: TradersDataPoint[] = data.query_result.data.rows
          .filter((row: any) => {
            // Check for required fields
            if (!row.partition_0 || 
                typeof row.active_signer !== 'number' || 
                typeof row.new_signer !== 'number' || 
                typeof row.new_traders_activation_ratio !== 'number' || 
                typeof row.cumulative_signer !== 'number') {
              console.warn('[TradersData] Skipping row with missing data:', row);
              return false;
            }
            return true;
          })
          .map((row: any) => {
            // Convert from the API format to our internal format
            return {
              date: row.partition_0,
              active_signer: row.active_signer,
              new_signer: row.new_signer,
              new_traders_activation_ratio: parseFloat(row.new_traders_activation_ratio),
              cumulative_signer: row.cumulative_signer
            };
          });
        
        // Sort by date ascending
        tradersData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        console.log(`[TradersData] Successfully processed ${tradersData.length} data points`);
        if (tradersData.length > 0) {
          console.log('[TradersData] First data point:', tradersData[0]);
          console.log('[TradersData] Last data point:', tradersData[tradersData.length - 1]);
        }
        
        // If we got here, we succeeded - return the data
        return tradersData;
        
      } catch (fetchError: any) {
        // Clear timeout if there was a fetch error
        clearTimeout(timeoutId);
        
        // Handle abort errors (timeouts)
        if (fetchError.name === 'AbortError') {
          console.warn(`[TradersData] Fetch request timed out after ${timeoutDuration/1000} seconds (attempt ${attempt+1}/${maxRetries+1})`);
          
          // If this was the last retry, throw a more detailed error
          if (attempt === maxRetries) {
            throw new Error(`API request timed out after ${maxRetries + 1} attempts`);
          }
          
          // Store the error for potential use if all retries fail
          lastError = fetchError;
          // Continue to the next retry attempt
          continue;
        }
        
        // For other fetch errors, store and throw after all retries
        lastError = fetchError;
        
        // If this wasn't the last retry, continue to the next attempt
        if (attempt < maxRetries) {
          console.warn(`[TradersData] Fetch error (attempt ${attempt+1}/${maxRetries+1}):`, fetchError.message);
          continue;
        }
        
        // If we've exhausted all retries, re-throw the error
        throw fetchError;
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('Failed to fetch traders data after all retries');
    
  } catch (error: any) {
    console.error('[TradersData] Error fetching traders data after all attempts:', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('[TradersData] Network error: Unable to connect to the API');
      throw new Error('Network connectivity issue: Unable to reach the API');
    }
    
    throw error;
  }
}

// Helper function to format large numbers for display
export function formatLargeNumber(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  } else {
    return value.toFixed(0);
  }
}

// Format date for display
export function formatTraderDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get the latest traders statistics
export async function getLatestTradersStats(): Promise<{ 
  cumulativeTraders: number; 
  percentChange: number; 
  isPositive: boolean 
}> {
  try {
    const data = await fetchTradersData();
    
    if (!data || data.length === 0) {
      return { cumulativeTraders: 0, percentChange: 0, isPositive: false };
    }
    
    // Sort by date to get the latest entry
    const sortedData = [...data].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const latestEntry = sortedData[0];
    const cumulativeTraders = latestEntry.cumulative_signer / 1e6; // Convert to millions
    
    // Calculate percent change from the previous month
    let percentChange = 0;
    let isPositive = false;
    
    if (sortedData.length > 1) {
      const oneMonthAgo = new Date(latestEntry.date);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      // Find the closest entry to one month ago
      const previousMonthEntry = sortedData.find(entry => 
        new Date(entry.date) <= oneMonthAgo
      );
      
      if (previousMonthEntry) {
        const previousTraders = previousMonthEntry.cumulative_signer;
        const change = latestEntry.cumulative_signer - previousTraders;
        percentChange = (change / previousTraders) * 100;
        isPositive = percentChange >= 0;
      }
    }
    
    return {
      cumulativeTraders,
      percentChange: Math.abs(percentChange),
      isPositive
    };
  } catch (error) {
    console.error('Error getting latest traders stats:', error);
    return { cumulativeTraders: 0, percentChange: 0, isPositive: false };
  }
} 