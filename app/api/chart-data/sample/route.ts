import { NextResponse } from 'next/server';
import { sampleChartData } from '@/lib/staticData';

// Export specific configuration for static export support
export const dynamic = 'force-static';

// Note: We're not using force-dynamic for static export compatibility
// Instead, relying on static data from lib/staticData.ts for GitHub Pages

export async function GET() {
  // Return sample chart data
  return NextResponse.json(sampleChartData);
} 