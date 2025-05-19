import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { prisma } from '@/lib/prisma';
import { getFromS3, saveToS3, deleteFromS3 } from '@/lib/s3';

// Export specific configuration for static export support
export const dynamic = 'force-static';

// GET /api/charts/[id]
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  // For static export, return not found
  return NextResponse.json(
    { error: 'Chart not found in static export' },
    { status: 404 }
  );
}

// PUT /api/charts/[id]
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  // For static export, return not implemented
  return NextResponse.json(
    { error: 'Chart updating not available in static export' },
    { status: 501 }
  );
}

// DELETE /api/charts/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  // For static export, return not implemented
  return NextResponse.json(
    { error: 'Chart deletion not available in static export' },
    { status: 501 }
  );
}
