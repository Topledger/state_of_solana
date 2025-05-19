import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { getFromS3, saveToS3, deleteFromS3 } from '@/lib/s3';

// For Next.js static export compatibility
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/charts/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: chartId } = await params;

  console.log(`API: Fetching chart with ID ${chartId}`);
  try {
    // Get chart from S3
    const chart = await getFromS3<ChartConfig>(`charts/${chartId}.json`);
    if (!chart) {
      console.log(`API: Chart not found in S3 with ID ${chartId}`);
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    console.log(`API: Found chart in S3 with ID ${chartId}`);
    return NextResponse.json(chart);
  } catch (error) {
    console.error(`API: Error fetching chart ${chartId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch chart', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/charts/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: chartId } = await params;
  try {
    const chartConfig = (await req.json()) as ChartConfig;

    // Basic validation
    if (!chartConfig.title || !chartConfig.page || !chartConfig.chartType) {
      return NextResponse.json(
        { error: 'Invalid chart configuration' },
        { status: 400 }
      );
    }
    
    // Check if chart exists first
    const existingChart = await getFromS3<ChartConfig>(`charts/${chartId}.json`);
    if (!existingChart) {
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Update timestamp
    chartConfig.updatedAt = new Date().toISOString();
    
    // Preserve creation timestamp from existing chart
    chartConfig.createdAt = existingChart.createdAt;

    // Update in S3
    const s3Result = await saveToS3(`charts/${chartId}.json`, chartConfig);
    
    if (!s3Result) {
      return NextResponse.json(
        { error: 'Failed to update chart in S3' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Chart updated in S3 successfully'
    });
  } catch (error) {
    console.error(`API: Error updating chart ${chartId}:`, error);
    return NextResponse.json(
      { error: 'Failed to update chart', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/charts/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: chartId } = await params;
  try {
    // Check if chart exists first
    const existingChart = await getFromS3<ChartConfig>(`charts/${chartId}.json`);
    if (!existingChart) {
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Delete from S3
    const deleteResult = await deleteFromS3(`charts/${chartId}.json`);
    
    if (!deleteResult) {
      return NextResponse.json(
        { error: 'Failed to delete chart from S3' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ message: 'Chart deleted successfully' });
  } catch (error) {
    console.error(`API: Error deleting chart ${chartId}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete chart', details: String(error) },
      { status: 500 }
    );
  }
}
