import { NextRequest, NextResponse } from 'next/server';
import { saveToS3, getFromS3, listFromS3 } from '@/lib/s3';

// For Next.js static export compatibility
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Simple endpoint to test S3 connectivity
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'test';
  const key = url.searchParams.get('key') || 'test.json';
  
  try {
    let result;
    
    switch (action) {
      case 'list':
        const prefix = url.searchParams.get('prefix') || '';
        result = await listFromS3(prefix);
        return NextResponse.json({ 
          success: true, 
          action: 'list', 
          result 
        });
        
      case 'get':
        result = await getFromS3(key);
        return NextResponse.json({ 
          success: true, 
          action: 'get', 
          result 
        });
        
      case 'test':
      default:
        // Test both save and get
        const testData = { 
          test: true, 
          timestamp: new Date().toISOString(), 
          message: 'S3 connection test successful' 
        };
        
        const saveResult = await saveToS3(key, testData);
        
        if (saveResult) {
          const getResult = await getFromS3(key);
          return NextResponse.json({ 
            success: true, 
            action: 'test', 
            saveResult, 
            getResult,
            message: 'S3 connection test successful' 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            action: 'test', 
            message: 'Failed to save data to S3' 
          }, { status: 500 });
        }
    }
  } catch (error) {
    console.error('S3 test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      message: 'S3 connection test failed'
    }, { status: 500 });
  }
} 