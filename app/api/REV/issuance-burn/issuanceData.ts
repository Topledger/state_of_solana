const API_KEY = 'fJpv71SeTrORlyPx2dVbdTt07HrwuKbUobmb7Uzj';
const API_BASE_URL = 'https://analytics.topledger.xyz/tl/api';
const QUERY_ID = 13212; // Consider making this configurable

const JOB_STATUS = {
  PENDING: 1,
  PROCESSING: 2,
  COMPLETE: 3,
  FAILED: 4
};

const fetchWithTimeout = async (url: string, options: any = {}, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;

  try {
    const response = await fetch(url, options);
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const retryFetch = async (url: string, options: any = {}, retries = 3, delay = 1000): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (err: any) {
      if (i === retries - 1 || err.name === 'AbortError') throw err;
      await new Promise(res => setTimeout(res, delay * (i + 1))); // exponential backoff
    }
  }
  throw new Error("Retry failed after 3 attempts");
};

export async function fetchIssuanceData(currency: CurrencyType): Promise<IssuanceDataPoint[]> {
  try {
    console.log(`Fetching issuance data for currency: ${currency}`);
    const cachedData = await fetchCachedData(currency);
    if (cachedData.length > 0) {
      console.log('Using cached data while triggering background refresh...');
      setTimeout(() => refreshDataInBackground(currency), 100);
      return cachedData;
    }

    const url = `${API_BASE_URL}/queries/${QUERY_ID}/results?api_key=${API_KEY}`;
    const requestBody = {
      parameters: { currency },
      max_age: 86400
    };

    const response = await retryFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    let data: any;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      throw new Error('Invalid JSON returned from API');
    }

    if (data?.job) {
      const job = data.job;
      console.log(`Received job response: ${job.status}`);

      if (job.status === JOB_STATUS.COMPLETE && job.query_result_id) {
        return await fetchResultById(job.query_result_id);
      } else if (job.status === JOB_STATUS.FAILED || job.error) {
        throw new Error(`Job failed: ${job.error || 'Unknown error'}`);
      } else {
        refreshDataInBackground(currency, job.id);
        throw new Error('Data is still processing. Try again shortly.');
      }
    }

    if (data?.query_result?.data?.rows?.length) {
      return transformDataPoints(data.query_result.data.rows);
    }

    console.error('Unexpected response format:', data);
    throw new Error('Unable to process API response');
  } catch (error) {
    console.error('Error in fetchIssuanceData:', error);
    throw error;
  }
}
