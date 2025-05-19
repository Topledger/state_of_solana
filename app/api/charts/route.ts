import { NextRequest, NextResponse } from 'next/server';
import { ChartConfig } from '@/app/admin/types';
import { prisma } from '@/lib/prisma';
import { saveToS3, getFromS3, listFromS3 } from '@/lib/s3';

// For Next.js static export compatibility
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/charts - Get all charts
export async function GET(req: NextRequest) {
  try {
    console.log("API: Fetching all charts from S3...");
    
    // Try to get charts from S3 first
    const chartKeys = await listFromS3('charts/');
    if (chartKeys.length > 0) {
      const chartPromises = chartKeys.map(key => getFromS3<ChartConfig>(key));
      const charts = await Promise.all(chartPromises);
      const validCharts = charts.filter(chart => chart !== null) as ChartConfig[];
      
      console.log(`API: Found ${validCharts.length} charts in S3`);
      return NextResponse.json({ charts: validCharts });
    }
    
    // Fall back to database if no charts in S3
    console.log("API: No charts found in S3, falling back to database...");
    const charts = await prisma.chart.findMany();
    console.log(`API: Found ${charts.length} charts in database`);
    
    // Convert the database format back to ChartConfig format
    const chartConfigs = charts.map(chart => {
      try {
        const config = {
          ...JSON.parse(chart.config as string),
          id: chart.id
        };
        
        // Save to S3 for future requests
        saveToS3(`charts/${chart.id}.json`, config);
        
        return config;
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
    
    // Save to S3
    const s3Result = await saveToS3(`charts/${chartConfig.id}.json`, chartConfig);
    if (!s3Result) {
      console.log(`API: Failed to save chart to S3, falling back to database`);
    }
    
    // Check if the chart already exists in database as backup
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
    }
    
    return NextResponse.json({ 
      message: s3Result ? 'Chart saved to S3 and database' : 'Chart saved to database only',
      chartId: chartConfig.id
    });
  } catch (error) {
    console.error('API: Error creating/updating chart:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error 
      ? error.message
      : 'Unknown database error';
      
    // Check for specific database connection errors
    const isConnectionError = 
      errorMessage.includes('connection') || 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('prisma') ||
      errorMessage.includes('database');
    
    return NextResponse.json(
      { 
        error: 'Failed to create/update chart', 
        details: errorMessage,
        type: isConnectionError ? 'database_connection' : 'general_error'
      },
      { status: 500 }
    );
  }
} 