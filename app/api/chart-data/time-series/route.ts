import { NextResponse } from 'next/server';
import { timeSeriesData } from '@/lib/staticData';

// Export specific configuration for static export support
export const dynamic = 'force-static';

export async function GET() {
  // Sample the data to return 30 days worth for basic time series
  const result = timeSeriesData
    .filter(item => item.platform === 'Raydium') // Filter to just one platform for simplicity
    .slice(-30); // Get the last 30 days
  
  // Transform to match expected format
  const formattedData = result.map(item => ({
    date: item.date,
    protocol_revenue: Math.floor(item.volume * 0.0015), // Estimate revenue as 0.15% of volume
    cumulative_revenue: Math.floor(1000000 + (item.volume * 0.000025)) // Some arbitrary cumulative value
  }));

  // Return data
  return NextResponse.json(formattedData);
} 