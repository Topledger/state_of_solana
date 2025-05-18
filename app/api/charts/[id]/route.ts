import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { prisma } from '@/lib/prisma';

// For Next.js static export compatibility
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/charts/[id] - Get a specific chart
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chartId = params.id;
    console.log(`API: Fetching chart with ID ${chartId}`);
    
    const chart = await prisma.chart.findUnique({
      where: { id: chartId }
    });
    
    if (!chart) {
      console.log(`API: Chart not found with ID ${chartId}`);
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Convert the database format back to ChartConfig format
    try {
      const chartConfig = {
        ...JSON.parse(chart.config as string),
        id: chart.id
      };
      
      return NextResponse.json(chartConfig);
    } catch (parseError) {
      console.error(`API: Error parsing chart config for chart ${chart.id}:`, parseError);
      return NextResponse.json(
        { error: 'Invalid chart configuration in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`API: Error fetching chart ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch chart', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/charts/[id] - Update a chart
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chartId = params.id;
    const chartConfig = await req.json() as ChartConfig;
    
    // Validate the chart config
    if (!chartConfig.title || !chartConfig.page || !chartConfig.chartType) {
      return NextResponse.json(
        { error: 'Invalid chart configuration' },
        { status: 400 }
      );
    }
    
    // Check if chart exists
    const existingChart = await prisma.chart.findUnique({
      where: { id: chartId }
    });
    
    if (!existingChart) {
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Update the chart
    await prisma.chart.update({
      where: { id: chartId },
      data: {
        title: chartConfig.title,
        page: chartConfig.page,
        config: JSON.stringify(chartConfig),
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json({ 
      message: 'Chart updated successfully' 
    });
  } catch (error) {
    console.error(`Error updating chart ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update chart' },
      { status: 500 }
    );
  }
}

// DELETE /api/charts/[id] - Delete a chart
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chartId = params.id;
    
    // Check if chart exists
    const existingChart = await prisma.chart.findUnique({
      where: { id: chartId }
    });
    
    if (!existingChart) {
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Delete the chart
    await prisma.chart.delete({
      where: { id: chartId }
    });
    
    return NextResponse.json({ 
      message: 'Chart deleted successfully' 
    });
  } catch (error) {
    console.error(`Error deleting chart ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete chart' },
      { status: 500 }
    );
  }
} 