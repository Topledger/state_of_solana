import { NextResponse } from 'next/server';

// For Next.js static export compatibility
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Create sample data for charts - platform revenue over time
  const data = [
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

  // Return data
  return NextResponse.json(data);
} 