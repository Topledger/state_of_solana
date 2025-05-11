// API endpoints and keys
// Consider moving this to environment variables in production
const API_KEY = 'fJpv71SeTrORlyPx2dVbdTt07HrwuKbUobmb7Uzj';
const API_BASE_URL = 'https://analytics.topledger.xyz/tl/api';

// Define the data structure for issuance data
export interface IssuanceDataPoint {
  date: string;
  gross_sol_issuance: number;
  net_sol_issuance: number;
  sol_burn: number;
  staking_reward: number;
  voting_reward: number;
  jito_labs_commission: number;
  burn_ratio: number;
  block_height?: number;
}

// Define currency type
export type CurrencyType = 'USD' | 'SOL';

// Job status constants
const JOB_STATUS = {
  PENDING: 1,
  PROCESSING: 2,
  COMPLETE: 3,
  FAILED: 4
};

/**
 * Fetch issuance and inflation data from the API
 */
export async function fetchIssuanceData(currency: CurrencyType): Promise<IssuanceDataPoint[]> {
  try {
    console.log(`Fetching issuance data for currency: ${currency}`);
    
    // Try to fetch cached data first to provide immediate response
    const cachedData = await fetchCachedData(currency);
    if (cachedData.length > 0) {
      console.log('Using cached data while fresh data is being fetched in the background');
      // Trigger a background fetch to update cache for next time
      setTimeout(() => refreshDataInBackground(currency), 100);
      return cachedData;
    }
    
    // No cached data, proceed with direct request
    const url = `${API_BASE_URL}/queries/13212/results?api_key=${API_KEY}`;
    console.log(`API URL: ${url}`);
    
    // Create request body
    const requestBody = { 
      parameters: { currency: currency },
      max_age: 86400 // Allow cached data up to 24 hours old to avoid long processing time
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
      cache: 'no-cache'
    });
    
    console.log(`Response status: ${response.status}`);
    
    // Handle non-successful responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Check if this is an async job
    if (data.job) {
      console.log(`Received job response with status: ${data.job.status}`);
      
      // Handle job status
      if (data.job.status === JOB_STATUS.COMPLETE && data.job.query_result_id) {
        // Job is complete, fetch the result
        console.log(`Job complete, fetching results with query_result_id: ${data.job.query_result_id}`);
        return await fetchResultById(data.job.query_result_id);
      } 
      else if (data.job.status === JOB_STATUS.FAILED || data.job.error) {
        // Job failed
        console.error(`Job failed with error: ${data.job.error || 'Unknown error'}`);
        throw new Error(`API job failed: ${data.job.error || 'Unknown error'}`);
      }
      else {
        // Job is still processing - don't use sample data, throw an error
        console.log('Job is still processing');
        
        // Start background polling for the actual data
        refreshDataInBackground(currency, data.job.id);
        
        // Throw error so UI can show refresh button
        throw new Error('Data is still processing. Please try again later.');
      }
    }
    
    // Check for the expected data structure
    if (data.query_result && data.query_result.data && Array.isArray(data.query_result.data.rows)) {
      console.log('Found data in standard query_result.data.rows structure');
      return transformDataPoints(data.query_result.data.rows);
    }
    
    // If we're here, we didn't find the data in the expected format
    console.error('Unable to extract data from API response:', data);
    throw new Error('Invalid data format received from API');
    
  } catch (error) {
    console.error('Error fetching issuance data:', error);
    
    // Don't fall back to generated data, let the error be thrown
    throw error;
  }
}

/**
 * Fetch results using a query result ID
 */
async function fetchResultById(queryResultId: string): Promise<IssuanceDataPoint[]> {
  try {
    const url = `${API_BASE_URL}/query_results/${queryResultId}?api_key=${API_KEY}`;
    console.log(`Fetching result by ID: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`No data available for this period. ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Query result data:', data);
    
    if (data.query_result && data.query_result.data && Array.isArray(data.query_result.data.rows)) {
      return transformDataPoints(data.query_result.data.rows);
    }
    
    throw new Error('Invalid query result format');
  } catch (error) {
    console.error('Error fetching query result:', error);
    throw error;
  }
}

/**
 * Transform API data points to our internal format
 */
function transformDataPoints(rows: any[]): IssuanceDataPoint[] {
  // Filter out rows with null/missing dates
  const validRows = rows.filter(row => row.backfilling_epoch_date);
  
  console.log(`Processing ${validRows.length} valid data points`);
  
  // Transform to the required format
  const transformedData = validRows.map(row => ({
    date: row.backfilling_epoch_date || '',
    gross_sol_issuance: parseFloat(row.gross_sol_issuance || 0),
    net_sol_issuance: parseFloat(row.net_sol_issuance || 0),
    sol_burn: parseFloat(row.sol_burn || 0),
    staking_reward: parseFloat(row.staking_reward || 0),
    voting_reward: parseFloat(row.voting_reward || 0),
    jito_labs_commission: parseFloat(row.jito_labs_commission || 0),
    burn_ratio: parseFloat(row.burn_ratio || 0),
    block_height: row.block_height ? parseInt(row.block_height) : undefined
  }));
  
  // Sort by date (oldest first - chronological order)
  transformedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  console.log(`Transformed ${transformedData.length} data points`);
  console.log(`Date range: ${transformedData[0].date} to ${transformedData[transformedData.length-1].date}`);
  
  return transformedData;
}

// Format functions for display values
export function formatSolAmount(value: number, currency: CurrencyType) {
  if (currency === 'USD') {
    return `$${Math.abs(value).toLocaleString(undefined, {maximumFractionDigits: 2})}`;
  } else {
    return `${Math.abs(value).toLocaleString(undefined, {maximumFractionDigits: 2})} SOL`;
  }
}

export const formatPercentage = (value: number) => {
  return `${(value * 100).toFixed(2)}%`;
};

export const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

/**
 * Try to fetch cached data
 */
async function fetchCachedData(currency: CurrencyType): Promise<IssuanceDataPoint[]> {
  try {
    console.log('Attempting to fetch cached data');
    const url = `${API_BASE_URL}/queries/13212/results?api_key=${API_KEY}`;
    
    const cachedRequestBody = {
      parameters: { currency },
      max_age: 86400 // Use cached data up to 24 hours old
    };
    
    const cachedResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(cachedRequestBody)
    });
    
    if (!cachedResponse.ok) {
      return [];
    }
    
    const cachedData = await cachedResponse.json();
    
    if (cachedData.query_result && cachedData.query_result.data && Array.isArray(cachedData.query_result.data.rows)) {
      console.log('Found cached data');
      return transformDataPoints(cachedData.query_result.data.rows);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching cached data:', error);
    return [];
  }
}

/**
 * Refresh data in background without blocking UI
 */
async function refreshDataInBackground(currency: CurrencyType, jobId?: string): Promise<void> {
  try {
    console.log('Starting background data refresh');
    
    if (jobId) {
      // If we have a job ID, poll for completion
      try {
        const url = `${API_BASE_URL}/jobs/${jobId}?api_key=${API_KEY}`;
        let attempts = 0;
        const maxAttempts = 60; // Try for up to 10 minutes
        const interval = 10000; // 10 seconds
        
        while (attempts < maxAttempts) {
          attempts++;
          console.log(`Background poll attempt ${attempts}/${maxAttempts}`);
          
          const response = await fetch(url);
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (data.job && data.job.status === JOB_STATUS.COMPLETE && data.job.query_result_id) {
            console.log('Background job completed successfully');
            await fetchResultById(data.job.query_result_id);
            return;
          }
          
          if (data.job && (data.job.status === JOB_STATUS.FAILED || data.job.error)) {
            console.error('Background job failed:', data.job.error || 'Unknown error');
            return;
          }
          
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        console.log('Background polling reached max attempts without completion');
      } catch (error) {
        console.error('Error during background polling:', error);
      }
    } else {
      // No job ID, try a new request
      console.log('Initiating new background data fetch request');
      try {
        const url = `${API_BASE_URL}/queries/13212/results?api_key=${API_KEY}`;
        
        const requestBody = { 
          parameters: { currency: currency },
          max_age: 0 // Force fresh data
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.query_result && data.query_result.data && Array.isArray(data.query_result.data.rows)) {
          console.log('Background fetch completed successfully');
        } else if (data.job && data.job.id) {
          // Got a job, recurse to start polling
          refreshDataInBackground(currency, data.job.id);
        }
      } catch (error) {
        console.error('Error during background fetch:', error);
      }
    }
  } catch (error) {
    console.error('Error in background refresh:', error);
  }
} 