import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { prisma } from '@/lib/prisma';

// For Next.js static export compatibility
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/charts - Get all charts
export async function GET(req: NextRequest) {
  try {
    console.log("API: Fetching all charts...");
    const charts = await prisma.chart.findMany();
    console.log(`API: Found ${charts.length} charts`);
    
    // Convert the database format back to ChartConfig format
    const chartConfigs = charts.map(chart => {
      try {
        return {
          ...JSON.parse(chart.config as string),
          id: chart.id
        };
      } catch (parseError) {
        console.error(`API: Error parsing chart config for chart ${chart.id}:`, parseError);
        // Return a basic chart config if parsing fails
        return {
          id: chart.id,
          title: chart.title,
          page: chart.page,
          chartType: 'bar',
          apiEndpoint: '',
          dataMapping: { xAxis: '', yAxis: '' },
          createdAt: chart.createdAt.toISOString(),
          updatedAt: chart.updatedAt.toISOString()
        };
      }
    });
    
    return NextResponse.json({ charts: chartConfigs });
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
    
    // Log the chart config we're trying to save (without the details)
    console.log(`API: Saving chart with ID ${chartConfig.id}, title: ${chartConfig.title}, page: ${chartConfig.page}`);
    
    // Validate the chart config
    if (!chartConfig.title || !chartConfig.page || !chartConfig.chartType) {
      console.log("API: Invalid chart configuration - missing required fields");
      return NextResponse.json(
        { error: 'Invalid chart configuration' },
        { status: 400 }
      );
    }
    
    // Check if the chart already exists
    const existingChart = await prisma.chart.findUnique({
      where: { id: chartConfig.id }
    });
    
    let chart;
    
    if (existingChart) {
      // Update the existing chart
      console.log(`API: Updating existing chart with ID ${chartConfig.id}`);
      chart = await prisma.chart.update({
        where: { id: chartConfig.id },
        data: {
          title: chartConfig.title,
          page: chartConfig.page,
          config: JSON.stringify(chartConfig),
          updatedAt: new Date()
        }
      });
      
      console.log(`API: Chart updated successfully with ID ${chart.id}`);
      return NextResponse.json({ 
        message: 'Chart updated successfully',
        chartId: chart.id
      });
    } else {
      // Create a new chart
      console.log(`API: Creating new chart with ID ${chartConfig.id}`);
      chart = await prisma.chart.create({
        data: {
          id: chartConfig.id,
          title: chartConfig.title,
          page: chartConfig.page,
          config: JSON.stringify(chartConfig),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`API: Chart created successfully with ID ${chart.id}`);
      return NextResponse.json({ 
        message: 'Chart created successfully',
        chartId: chart.id
      });
    }
  } catch (error) {
    console.error('API: Error creating/updating chart:', error);
    return NextResponse.json(
      { error: 'Failed to create/update chart', details: String(error) },
      { status: 500 }
    );
  }
} 