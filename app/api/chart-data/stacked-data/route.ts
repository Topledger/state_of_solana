import { NextResponse } from 'next/server';
import { stackedData } from '@/lib/staticData';

// Export specific configuration for static export support
export const dynamic = 'force-static';

export async function GET() {
  // Format the data to match expected structure
  const platformMap = {
    'Swaps': 'DEX',
    'Liquidity': 'DEX',
    'Staking': 'Liquid Staking',
    'Lending': 'Lending',
    'Options': 'Other'
  };
  
  const segmentMap = {
    'Swaps': ['Raydium', 'Orca', 'Jupiter', 'Meteora'],
    'Liquidity': ['Raydium', 'Orca', 'Meteora'],
    'Staking': ['Marinade', 'Jito', 'Lido'],
    'Lending': ['Solend', 'Mango', 'Kamino'],
    'Options': ['Zeta', 'PsyOptions']
  };
  
  // Get the most recent data point
  const latestData = stackedData[stackedData.length - 1];
  
  // Transform to expected format
  const result = Object.entries(latestData)
    .filter(([key]) => key !== 'date')
    .flatMap(([category, value]) => {
      const platform = platformMap[category as keyof typeof platformMap] || 'Other';
      const segments = segmentMap[category as keyof typeof segmentMap] || ['Other'];
      
      // Distribute the value across segments
      return segments.map((segment, index) => {
        // Distribute values with some variation
        const share = 1 / segments.length;
        const variance = 0.2 * (Math.random() - 0.5); // -0.1 to +0.1
        const adjustedShare = Math.max(0.1, share + variance);
        
        return {
          platform,
          segment,
          protocol_revenue: Math.floor((value as number) * adjustedShare)
        };
      });
    });

  // Return data
  return NextResponse.json(result);
} 