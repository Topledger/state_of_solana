import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { prisma } from '@/lib/prisma';

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

    // Parse config back to ChartConfig
    try {
      const chartConfig = {
        ...JSON.parse(chart.config as string),
        id: chart.id
      } as ChartConfig & { id: string };

      return NextResponse.json(chartConfig);
    } catch (parseError) {
      console.error(`API: Error parsing chart config for chart ${chart.id}:`, parseError);
      return NextResponse.json(
        { error: 'Invalid chart configuration in database' },
        { status: 500 }
      );
    }
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

    const existing = await prisma.chart.findUnique({ where: { id: chartId } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }

    await prisma.chart.update({
      where: { id: chartId },
      data: {
        title: chartConfig.title,
        page: chartConfig.page,
        config: JSON.stringify(chartConfig),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ message: 'Chart updated successfully' });
  } catch (error) {
    console.error(`API: Error updating chart ${chartId}:`, error);
    return NextResponse.json(
      { error: 'Failed to update chart' },
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
    const existing = await prisma.chart.findUnique({ where: { id: chartId } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }

    await prisma.chart.delete({ where: { id: chartId } });
    return NextResponse.json({ message: 'Chart deleted successfully' });
  } catch (error) {
    console.error(`API: Error deleting chart ${chartId}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete chart' },
      { status: 500 }
    );
  }
}
