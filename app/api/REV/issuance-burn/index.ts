// Export all from issuanceData.ts file
export * from './issuanceData'; 

// API Key and URL
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'demo-key';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com/solana/issuance-inflation';

// Currency type for USD/SOL toggle
export type CurrencyType = 'USD' | 'SOL';

// Time periods - weekly for this data
export type TimeFilterType = 'weekly';

// Data structure for issuance and inflation metrics
export interface IssuanceInflationDataPoint {
  date: string;
  
  // Issuance metrics
  gross_issuance_sol: number;
  gross_issuance_usd: number;
  net_issuance_sol: number;
  net_issuance_usd: number;
  
  // Rewards metrics
  staking_rewards_sol: number;
  staking_rewards_usd: number;
  voting_rewards_sol: number;
  voting_rewards_usd: number;
  
  // Burn metrics
  burn_amount_sol: number;
  burn_amount_usd: number;
  burn_ratio: number; // Percentage of gross issuance that was burned
  
  // Jito commission metrics
  jito_commission_sol: number;
  jito_commission_usd: number;
}

/**
 * Format value based on currency type
 */
export const formatValue = (value: number, currency: CurrencyType): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  } else {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(value) + ' SOL';
  }
};

/**
 * Fetch issuance and inflation data from the API
 */
export const fetchIssuanceInflationData = async (
  currency: CurrencyType = 'USD'
): Promise<IssuanceInflationDataPoint[]> => {
  try {
    // Construct the API URL with parameters
    const url = new URL(`${API_URL}/data`);
    url.searchParams.append('api_key', API_KEY);
    url.searchParams.append('currency', currency);
    // Always use weekly timeframe for now
    url.searchParams.append('timeframe', 'weekly');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform API response to match our data structure
    const transformedData: IssuanceInflationDataPoint[] = data.map((item: any) => ({
      date: item.date,
      
      gross_issuance_sol: item.gross_issuance_sol || 0,
      gross_issuance_usd: item.gross_issuance_usd || 0,
      net_issuance_sol: item.net_issuance_sol || 0,
      net_issuance_usd: item.net_issuance_usd || 0,
      
      staking_rewards_sol: item.staking_rewards_sol || 0,
      staking_rewards_usd: item.staking_rewards_usd || 0,
      voting_rewards_sol: item.voting_rewards_sol || 0,
      voting_rewards_usd: item.voting_rewards_usd || 0,
      
      burn_amount_sol: item.burn_amount_sol || 0,
      burn_amount_usd: item.burn_amount_usd || 0,
      burn_ratio: item.burn_ratio || 0,
      
      jito_commission_sol: item.jito_commission_sol || 0,
      jito_commission_usd: item.jito_commission_usd || 0
    }));
    
    // Sort by date
    return transformedData.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  } catch (error) {
    console.error('Error fetching issuance inflation data:', error);
    return generateMockIssuanceInflationData();
  }
};

/**
 * Generate mock issuance and inflation data for testing
 */
export const generateMockIssuanceInflationData = (
  timeFilter: TimeFilterType = 'weekly'
): IssuanceInflationDataPoint[] => {
  const data: IssuanceInflationDataPoint[] = [];
  const now = new Date();
  const numberOfPoints = 12; // 12 weeks of data
  
  // Generate sample SOL price for converting between SOL and USD
  const solPrices = Array(numberOfPoints).fill(0).map(() => 
    Math.random() * 50 + 150 // SOL price between $150-$200
  );
  
  for (let i = 0; i < numberOfPoints; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 7)); // Weekly data
    
    // Generate random gross issuance in SOL
    const grossIssuanceSol = Math.random() * 20000 + 30000; // 30k-50k SOL
    const solPrice = solPrices[i];
    
    // Calculate USD value
    const grossIssuanceUsd = grossIssuanceSol * solPrice;
    
    // Staking rewards (60-70% of gross issuance)
    const stakingRewardsSol = grossIssuanceSol * (0.6 + Math.random() * 0.1);
    const stakingRewardsUsd = stakingRewardsSol * solPrice;
    
    // Voting rewards (10-15% of gross issuance)
    const votingRewardsSol = grossIssuanceSol * (0.1 + Math.random() * 0.05);
    const votingRewardsUsd = votingRewardsSol * solPrice;
    
    // Burn amount (20-30% of gross issuance)
    const burnRatio = 0.2 + Math.random() * 0.1;
    const burnAmountSol = grossIssuanceSol * burnRatio;
    const burnAmountUsd = burnAmountSol * solPrice;
    
    // Net issuance = gross - burn
    const netIssuanceSol = grossIssuanceSol - burnAmountSol;
    const netIssuanceUsd = grossIssuanceUsd - burnAmountUsd;
    
    // Jito commission (2-5% of gross issuance)
    const jitoCommissionSol = grossIssuanceSol * (0.02 + Math.random() * 0.03);
    const jitoCommissionUsd = jitoCommissionSol * solPrice;
    
    data.push({
      date: date.toISOString().split('T')[0],
      
      gross_issuance_sol: grossIssuanceSol,
      gross_issuance_usd: grossIssuanceUsd,
      net_issuance_sol: netIssuanceSol,
      net_issuance_usd: netIssuanceUsd,
      
      staking_rewards_sol: stakingRewardsSol,
      staking_rewards_usd: stakingRewardsUsd,
      voting_rewards_sol: votingRewardsSol,
      voting_rewards_usd: votingRewardsUsd,
      
      burn_amount_sol: burnAmountSol,
      burn_amount_usd: burnAmountUsd,
      burn_ratio: burnRatio,
      
      jito_commission_sol: jitoCommissionSol,
      jito_commission_usd: jitoCommissionUsd
    });
  }
  
  // Sort by date
  return data.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

/**
 * Mock fetch function with delay for testing
 */
export const fetchIssuanceInflationDataMock = async (
  timeFilter: TimeFilterType = 'weekly'
): Promise<IssuanceInflationDataPoint[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return generateMockIssuanceInflationData(timeFilter);
}; 