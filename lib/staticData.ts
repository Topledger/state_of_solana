/**
 * This file contains static data fallbacks for API routes.
 * These are used when the app is built as a static export for GitHub Pages.
 */

// Type definitions for chart data
export interface SampleData {
  platform: string;
  protocol_revenue: number;
}

export interface MultiSeriesData {
  platform: string;
  volume: number;
  tvl: number;
  revenue: number;
  users: number;
  avg_tx_size: number;
  tx_count: number;
}

export interface TimeSeriesData {
  date: string;
  platform: string;
  volume: number;
  users: number;
  transactions: number;
}

export interface StackedData {
  date: string;
  [category: string]: string | number;
}

export interface BarStackData {
  platform: string;
  [category: string]: string | number;
  total: number;
}

// Sample data for basic charts
export const sampleChartData: SampleData[] = [
  { platform: "Photon", protocol_revenue: 397377544.78 },
  { platform: "Raydium", protocol_revenue: 198422344.45 },
  { platform: "Jupiter", protocol_revenue: 162341234.89 },
  { platform: "Orca", protocol_revenue: 127345678.23 },
  { platform: "Tensor", protocol_revenue: 98765432.12 },
  { platform: "Meteora", protocol_revenue: 76543217.65 },
  { platform: "Solend", protocol_revenue: 65432198.45 },
  { platform: "Drift", protocol_revenue: 54321098.76 },
  { platform: "Zeta", protocol_revenue: 43219876.54 },
  { platform: "Kamino", protocol_revenue: 32109654.32 }
];

// Multi-series chart data
export const multiSeriesData: MultiSeriesData[] = [
  {
    platform: "Raydium",
    volume: 12345678,
    tvl: 45678912,
    revenue: 2345678,
    users: 87654,
    avg_tx_size: 3456,
    tx_count: 45678
  },
  {
    platform: "Orca",
    volume: 11345678,
    tvl: 35678912,
    revenue: 1945678,
    users: 76543,
    avg_tx_size: 3256,
    tx_count: 41278
  },
  {
    platform: "Meteora",
    volume: 10245678,
    tvl: 33678912,
    revenue: 1845678,
    users: 71432,
    avg_tx_size: 3106,
    tx_count: 39278
  },
  {
    platform: "Drift",
    volume: 9845678,
    tvl: 31678912,
    revenue: 1745678,
    users: 65432,
    avg_tx_size: 2956,
    tx_count: 36578
  },
  {
    platform: "Mango Markets",
    volume: 9145678,
    tvl: 29678912,
    revenue: 1645678,
    users: 62345,
    avg_tx_size: 2756,
    tx_count: 34578
  },
  {
    platform: "Marinade",
    volume: 8945678,
    tvl: 27678912,
    revenue: 1545678,
    users: 59812,
    avg_tx_size: 2656,
    tx_count: 32578
  },
  {
    platform: "Jito",
    volume: 8645678,
    tvl: 25678912,
    revenue: 1445678,
    users: 57812,
    avg_tx_size: 2556,
    tx_count: 30578
  },
  {
    platform: "Solend",
    volume: 8245678,
    tvl: 23678912,
    revenue: 1345678,
    users: 54321,
    avg_tx_size: 2456,
    tx_count: 28578
  },
  {
    platform: "Zeta",
    volume: 7845678,
    tvl: 21678912,
    revenue: 1245678,
    users: 51234,
    avg_tx_size: 2356,
    tx_count: 26578
  },
  {
    platform: "Tensor",
    volume: 7345678,
    tvl: 19678912,
    revenue: 1145678,
    users: 48123,
    avg_tx_size: 2256,
    tx_count: 24578
  }
];

// Time series data for charts
export const timeSeriesData: TimeSeriesData[] = (() => {
  const data: TimeSeriesData[] = [];
  const startDate = new Date('2023-01-01');
  const platforms = ['Raydium', 'Orca', 'Jupiter', 'Tensor', 'Meteora'];
  
  for (let i = 0; i < 365; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    platforms.forEach(platform => {
      // Base values that grow over time with some randomness
      const daysFactor = i / 10;
      const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
      
      data.push({
        date: date.toISOString().split('T')[0],
        platform,
        volume: Math.round((10000000 + daysFactor * 30000) * randomFactor),
        users: Math.round((50000 + daysFactor * 100) * randomFactor),
        transactions: Math.round((200000 + daysFactor * 500) * randomFactor),
      });
    });
  }
  
  return data;
})();

// Stacked chart data
export const stackedData: StackedData[] = (() => {
  const data: StackedData[] = [];
  const startDate = new Date('2023-01-01');
  const categories = ['Swaps', 'Liquidity', 'Staking', 'Lending', 'Options'];
  
  for (let i = 0; i < 52; i++) { // Weekly data for a year
    const date = new Date(startDate);
    date.setDate(date.getDate() + i * 7);
    
    const entry: StackedData = {
      date: date.toISOString().split('T')[0],
    };
    
    // Add values for each category with growth trend + randomness
    categories.forEach(category => {
      const baseFactor = 1 + (i / 52); // Growth factor
      const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 random multiplier
      
      // Different base values for different categories
      const baseValue = 
        category === 'Swaps' ? 1000000 :
        category === 'Liquidity' ? 800000 :
        category === 'Staking' ? 600000 :
        category === 'Lending' ? 400000 : 200000;
      
      entry[category] = Math.round(baseValue * baseFactor * randomFactor);
    });
    
    data.push(entry);
  }
  
  return data;
})();

// Bar stack data
export const barStackData: BarStackData[] = (() => {
  const platforms = ['Raydium', 'Orca', 'Jupiter', 'Drift', 'Meteora', 'Mango', 'Kamino', 'Tensor'];
  const categories = ['Trading Fees', 'Staking Rewards', 'Liquidations', 'Other Revenue'];
  
  return platforms.map(platform => {
    const result: BarStackData = { platform, total: 0 };
    
    // Generate semi-random values for each category
    categories.forEach(category => {
      // Different base values for different categories
      const baseValue = 
        category === 'Trading Fees' ? 1000000 :
        category === 'Staking Rewards' ? 500000 :
        category === 'Liquidations' ? 200000 : 100000;
      
      // Random factor to add variation
      const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
      
      // Set the value
      result[category] = Math.round(baseValue * randomFactor);
    });
    
    // Calculate total
    result.total = Object.entries(result)
      .filter(([key, value]) => key !== 'platform' && key !== 'total' && typeof value === 'number')
      .reduce((sum, [_, value]) => sum + (value as number), 0);
    
    return result;
  });
})(); 