import { NextResponse } from 'next/server';

/**
 * Generate sample data for multi-series charts
 * This endpoint provides data with multiple metrics for the same entities
 */
export async function GET() {
  const platforms = ['Raydium', 'Orca', 'Meteora', 'Drift', 'Mango Markets', 'Marinade', 'Jito', 'Solend', 'Zeta', 'Tensor'];
  
  // Generate sample data with multiple metrics per platform
  const data = platforms.map(platform => {
    // Generate semi-random values for each metric
    const volume = Math.round(Math.random() * 10000000 + 5000000);
    const tvl = Math.round(Math.random() * 50000000 + 10000000);
    const revenue = Math.round(Math.random() * 2000000 + 500000);
    const users = Math.round(Math.random() * 100000 + 10000);
    
    return {
      platform,
      volume,         // Trading volume in USD
      tvl,            // Total value locked in USD
      revenue,        // Protocol revenue in USD
      users,          // Active users
      avg_tx_size: Math.round(volume / (users * (Math.random() * 5 + 2))), // Average transaction size
      tx_count: Math.round(users * (Math.random() * 5 + 2))                // Transaction count
    };
  });
  
  return NextResponse.json(data);
}