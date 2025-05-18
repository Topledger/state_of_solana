import { NextResponse } from 'next/server';

/**
 * Generate sample data for stacked bar chart
 * This endpoint provides platform revenue segmented by category
 */
export async function GET() {
  // Generate sample data
  const platforms = ['Raydium', 'Orca', 'Meteora', 'Drift', 'Mango Markets', 'Marinade', 'Jito', 'Solend', 'Zeta', 'Tensor'];
  const segments = ['DEX', 'Lending', 'NFT', 'Liquid Staking'];
  
  const data = platforms.flatMap(platform => {
    return segments.map(segment => {
      // Generate a semi-random revenue value, higher for DEX and popular platforms
      let baseValue = 0;
      
      if (segment === 'DEX') {
        baseValue = Math.random() * 1000000 + 500000; // DEX revenue tends to be higher
      } else if (segment === 'NFT' && platform === 'Tensor') {
        baseValue = Math.random() * 800000 + 400000; // Tensor is strong in NFT
      } else if (segment === 'Liquid Staking' && (platform === 'Marinade' || platform === 'Jito')) {
        baseValue = Math.random() * 700000 + 300000; // Marinade and Jito are liquid staking protocols
      } else if (segment === 'Lending' && (platform === 'Solend' || platform === 'Mango Markets')) {
        baseValue = Math.random() * 600000 + 200000; // Lending protocols
      } else {
        baseValue = Math.random() * 200000 + 50000; // Other combinations
      }
      
      return {
        platform,
        segment,
        protocol_revenue: Math.round(baseValue),
      };
    });
  });
  
  return NextResponse.json(data);
} 