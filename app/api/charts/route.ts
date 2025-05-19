import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { saveToS3, getFromS3, listFromS3 } from '@/lib/s3';

// For Next.js static export compatibility
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/charts - Get all charts
export async function GET(req: NextRequest) {
  try {
    console.log("API: Fetching all charts from S3...");
    
    // Get all charts from S3
    const chartKeys = await listFromS3('charts/');
    if (chartKeys.length > 0) {
      const chartPromises = chartKeys.map(key => getFromS3<ChartConfig>(key));
      const charts = await Promise.all(chartPromises);
      const validCharts = charts.filter(chart => chart !== null) as ChartConfig[];
      
      console.log(`API: Found ${validCharts.length} charts in S3`);
      return NextResponse.json({ charts: validCharts });
    }
    
    // No charts found
    console.log("API: No charts found in S3");
    return NextResponse.json({ charts: [] });
  } catch (error) {
    console.error('API: Error fetching charts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch charts', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/charts - Create a new chart
export async function POST(req: NextRequest) {
  try {
    console.log("API: Creating new chart...");
    const chartConfig = await req.json() as ChartConfig;
    
    // Log the chart config we're trying to save
    console.log(`API: Saving chart with ID ${chartConfig.id}, title: ${chartConfig.title}`);
    
    // Validate the chart config
    if (!chartConfig.title || !chartConfig.page || !chartConfig.chartType) {
      console.log("API: Invalid chart configuration - missing required fields");
      return NextResponse.json(
        { error: 'Invalid chart configuration' },
        { status: 400 }
      );
    }
    
    // Update timestamps if not already set
    chartConfig.updatedAt = new Date().toISOString();
    if (!chartConfig.createdAt) {
      chartConfig.createdAt = chartConfig.updatedAt;
    }
    
    // Save to S3
    const s3Result = await saveToS3(`charts/${chartConfig.id}.json`, chartConfig);
    if (!s3Result) {
      console.log(`API: Failed to save chart to S3`);
      return NextResponse.json(
        { error: 'Failed to save chart to S3' },
        { status: 500 }
      );
    }
    
    console.log(`API: Chart saved successfully to S3 with ID ${chartConfig.id}`);
    return NextResponse.json({ 
      message: 'Chart saved to S3 successfully',
      chartId: chartConfig.id
    });
  } catch (error) {
    console.error('API: Error creating/updating chart:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error 
      ? error.message
      : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create/update chart', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
} 