import { NextResponse } from 'next/server';

// For Next.js static export compatibility
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Generate dates for the last 30 days
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  });

  // Create sample time series data - daily revenue over time
  const data = dates.map((date, index) => {
    // Generate a value that generally increases but with some random variation
    const baseValue = 100000 + (index * 15000);
    const randomVariation = Math.random() * 30000 - 15000; // Random value between -15000 and 15000
    const value = Math.max(10000, baseValue + randomVariation);
    
    return {
      date,
      protocol_revenue: Math.floor(value),
      cumulative_revenue: Math.floor(1000000 + (index * 50000) + (Math.random() * 10000))
    };
  });

  // Return data
  return NextResponse.json(data);
} 