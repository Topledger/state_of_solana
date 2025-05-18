import { NextResponse } from 'next/server';

export async function GET() {
  // Generate sample data for stacked bar chart - platform revenue by segments
  const data = [
    { platform: "DEX", segment: "Raydium", protocol_revenue: 197654321.45 },
    { platform: "DEX", segment: "Orca", protocol_revenue: 156789012.34 },
    { platform: "DEX", segment: "Meteora", protocol_revenue: 87654321.98 },
    { platform: "DEX", segment: "Jupiter", protocol_revenue: 76543210.87 },
    
    { platform: "Lending", segment: "Solend", protocol_revenue: 123456789.01 },
    { platform: "Lending", segment: "Mango", protocol_revenue: 98765432.10 },
    { platform: "Lending", segment: "Kamino", protocol_revenue: 87654321.09 },
    
    { platform: "NFT", segment: "Tensor", protocol_revenue: 143215678.90 },
    { platform: "NFT", segment: "Magic Eden", protocol_revenue: 132456789.01 },
    { platform: "NFT", segment: "Formfunction", protocol_revenue: 54321098.76 },
    
    { platform: "Liquid Staking", segment: "Marinade", protocol_revenue: 112345678.90 },
    { platform: "Liquid Staking", segment: "Jito", protocol_revenue: 98765432.10 },
    { platform: "Liquid Staking", segment: "Lido", protocol_revenue: 87654321.09 },
    
    { platform: "Other", segment: "DePIN", protocol_revenue: 65432109.87 },
    { platform: "Other", segment: "Bots", protocol_revenue: 54321098.76 },
    { platform: "Other", segment: "Launchpad", protocol_revenue: 43210987.65 }
  ];

  // Return data
  return NextResponse.json(data);
} 