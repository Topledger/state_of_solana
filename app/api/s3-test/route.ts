import { NextRequest, NextResponse } from 'next/server';
import { saveToS3, getFromS3, listFromS3 } from '@/lib/s3';

// Export specific configuration for static export support
export const dynamic = 'force-static';

/**
 * Simple endpoint to test S3 connectivity
 * Note: This won't actually interact with S3 in a static export
 */
export async function GET(req: NextRequest) {
  // For static export, return a mock response
  return NextResponse.json({ 
    message: 'Static export mode - S3 operations not available',
    static: true,
    success: false
  });
} 