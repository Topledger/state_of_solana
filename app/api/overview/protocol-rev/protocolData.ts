"use client";

export interface ProtocolRevDataPoint {
  sol_issuance: number; // SOL issuance in millions
  TEV: number; // Total Economic Value in millions
  REV: number; // Real Economic Value in millions
}

export interface ValidatorDataPoint {
  block_date: string;
  active_validators: number;
  active_stake: number;
  Staking_APY: number;
  Total_APY: number;
}

/**
 * Fetch protocol revenue data from the API
 * @returns Promise with the protocol revenue data
 */
export async function fetchProtocolRevData(): Promise<ProtocolRevDataPoint> {
  try {
    const response = await fetch(
      "https://analytics.topledger.xyz/tl/api/queries/12962/results.json?api_key=EWygUbinU8TCLY6eBOlCFnUlNyWXUs96IIW4TjWM",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    
    // Extract data from the first row
    if (
      result?.query_result?.data?.rows &&
      result.query_result.data.rows.length > 0
    ) {
      return result.query_result.data.rows[0] as ProtocolRevDataPoint;
    }
    
    throw new Error("No data returned from API");
  } catch (error) {
    console.error("Error fetching protocol revenue data:", error);
    // Return default values in case of error
    return {
      sol_issuance: 0,
      TEV: 0,
      REV: 0
    };
  }
}

/**
 * Fetch validator data from the API
 * @returns Promise with the validator data
 */
export async function fetchValidatorData(): Promise<ValidatorDataPoint[]> {
  try {
    const response = await fetch(
      "https://analytics.topledger.xyz/tl/api/queries/13105/results.json?api_key=MSXcC5Efn07wngLKEpgvxiJk9p5MNQhnd5oLm3Eh",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    
    // Extract data from rows
    if (
      result?.query_result?.data?.rows &&
      result.query_result.data.rows.length > 0
    ) {
      return result.query_result.data.rows as ValidatorDataPoint[];
    }
    
    throw new Error("No data returned from API");
  } catch (error) {
    console.error("Error fetching validator data:", error);
    // Return empty array in case of error
    return [];
  }
}

/**
 * Get the latest validator data (first row from the API response)
 * @returns Promise with the latest validator data point
 */
export async function getLatestValidatorData(): Promise<ValidatorDataPoint | null> {
  try {
    const data = await fetchValidatorData();
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error getting latest validator data:", error);
    return null;
  }
}

/**
 * Format a number as currency with B/M/T suffix
 * @param value Number in millions
 * @returns Formatted string with appropriate suffix
 */
export function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}T`; // Convert to trillions
  } else if (value >= 1) {
    return `$${value.toFixed(2)}B`; // Keep as billions
  } else {
    return `$${(value * 1000).toFixed(2)}M`; // Convert to millions
  }
} 