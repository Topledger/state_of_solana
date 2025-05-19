import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { prisma } from '@/lib/prisma';
import { saveToS3, getFromS3, listFromS3 } from '@/lib/s3';

// Export specific configuration for static export support
export const dynamic = 'force-static';

// GET /api/charts - Get all charts
export async function GET(req: NextRequest) {
  // For static export, return empty charts array
  return NextResponse.json({ charts: [] });
}

// POST /api/charts - Create a new chart
export async function POST(req: NextRequest) {
  // For static export, return success (but won't actually work in static export)
  return NextResponse.json({ 
    message: "Static export mode - chart saving not available",
    chartId: "static"
  });
} 