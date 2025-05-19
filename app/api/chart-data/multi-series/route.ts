import { NextResponse } from 'next/server';
import { multiSeriesData } from '@/lib/staticData';

// Export specific configuration for static export support
export const dynamic = 'force-static';

/**
 * Generate sample data for multi-series charts
 * This endpoint provides data with multiple metrics for the same entities
 */
export async function GET() {
  // Return multi-series chart data
  return NextResponse.json(multiSeriesData);
}