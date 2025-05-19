import { NextResponse } from 'next/server';
import { barStackData } from '@/lib/staticData';

// Export specific configuration for static export support
export const dynamic = 'force-static';

/**
 * Generate sample data for stacked bar chart
 * This endpoint provides platform revenue segmented by category
 */
export async function GET() {
  // Transform bar stack data to the expected format
  const result = barStackData.flatMap(platformData => {
    const platform = platformData.platform;
    
    // Map categories to segments
    const categorySegmentMap = {
      'Trading Fees': 'DEX',
      'Staking Rewards': 'Liquid Staking',
      'Liquidations': 'Lending',
      'Other Revenue': 'Other'
    };
    
    // Extract revenue values for each category
    return Object.entries(platformData)
      .filter(([key]) => 
        key !== 'platform' && 
        key !== 'total' && 
        typeof platformData[key] === 'number'
      )
      .map(([category, value]) => ({
        platform,
        segment: categorySegmentMap[category as keyof typeof categorySegmentMap] || 'Other',
        protocol_revenue: value as number
      }));
  });
  
  return NextResponse.json(result);
} 