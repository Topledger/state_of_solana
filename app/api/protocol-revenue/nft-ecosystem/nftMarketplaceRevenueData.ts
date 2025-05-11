// Types for NFT Marketplace revenue data
export interface NFTMarketplaceRevenueDataPoint {
  month: string;
  platform: string;
  protocol_revenue: number;
}

// Color mapping for NFT Marketplaces
export const nftMarketplaceColors: Record<string, string> = {
  'magiceden': '#6366f1', // indigo
  'tensorswap': '#f59e42', // orange
  'default': '#6b7280', // gray
};

export const getNFTMarketplaceColor = (platform: string): string => {
  return nftMarketplaceColors[platform] || nftMarketplaceColors.default;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
};

export async function fetchNFTMarketplaceRevenueData(): Promise<NFTMarketplaceRevenueDataPoint[]> {
  try {
    const response = await fetch('https://analytics.topledger.xyz/solana/api/queries/13172/results.json?api_key=ALdIglv0PhFtf1or3jLzYlqaSlbjndx3wZzRlnhx', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (!data?.query_result?.data?.rows) {
      throw new Error('Invalid data structure received from API');
    }
    let rawData: NFTMarketplaceRevenueDataPoint[] = data.query_result.data.rows.map((row: any) => ({
      month: row.month,
      platform: row.platform,
      protocol_revenue: parseFloat(row.protocol_revenue) || 0
    }));
    // Sort data by date for consistent display
    const sortedData = rawData.sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
    return sortedData;
  } catch (error) {
    console.error('Error fetching NFT Marketplace revenue data:', error);
    throw new Error('Failed to fetch NFT Marketplace revenue data');
  }
} 