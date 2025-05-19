"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getChartConfigsByPage } from '../utils';
import ChartCard from '../../components/shared/ChartCard';
import LegendItem from '../../components/shared/LegendItem';
import { ChartConfig, YAxisConfig } from '../types';
import dynamic from 'next/dynamic';
import { getColorByIndex } from '../../utils/chartColors';
import { formatNumber } from '../../utils/formatters';
import Modal from '../../components/shared/Modal';
import TimeFilterSelector from '../../components/shared/filters/TimeFilter';
import CurrencyFilter from '../../components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';

// Helper function to extract field name from YAxisConfig or use string directly
function getFieldName(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

// Format currency for display
const formatCurrency = (value: number): string => {
  return formatNumber(value);
};

// Dynamic import for the ChartRenderer to avoid SSR issues
const ChartRenderer = dynamic(() => import('./ChartRenderer'), {
  ssr: false,
});

interface DashboardRendererProps {
  pageId: string;
  overrideCharts?: ChartConfig[]; // Add optional prop to override charts
}

interface Legend {
  label: string;
  color: string;
  value?: number;
}

// Add a helper function to check if a chart is a stacked bar chart
function isStackedBarChart(chart: ChartConfig): boolean {
  return chart.chartType === 'stacked-bar' || 
         (chart.chartType === 'bar' && chart.isStacked === true);
}

export default function DashboardRenderer({ pageId, overrideCharts }: DashboardRendererProps) {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  const [downloadingCharts, setDownloadingCharts] = useState<Record<string, boolean>>({});
  const [legends, setLegends] = useState<Record<string, Legend[]>>({});
  
  // Add state for loading charts
  const [loadingCharts, setLoadingCharts] = useState<Record<string, boolean>>({});
  
  // Add state for filter values
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string>>>({});
  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  // Add state to track legend colors and order
  const [legendColorMaps, setLegendColorMaps] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    setIsClient(true);
    
    async function loadCharts() {
      try {
        // If overrideCharts is provided, use it instead of loading from the pageId
        if (overrideCharts) {
          setCharts(overrideCharts);
          
          // Initialize states for the override charts
          const expandedState: Record<string, boolean> = {};
          const downloadingState: Record<string, boolean> = {};
          const initialFilterValues: Record<string, Record<string, string>> = {};
          const initialLoadingState: Record<string, boolean> = {};
          
          overrideCharts.forEach(chart => {
            expandedState[chart.id] = false;
            downloadingState[chart.id] = false;
            initialLoadingState[chart.id] = true; // Start with loading state
            
            // Initialize filter values for each chart
            if (chart.additionalOptions?.filters) {
              initialFilterValues[chart.id] = {};
              
              // Set initial time filter
              if (chart.additionalOptions.filters.timeFilter && 
                  Array.isArray(chart.additionalOptions.filters.timeFilter.options) && 
                  chart.additionalOptions.filters.timeFilter.options.length > 0) {
                initialFilterValues[chart.id]['timeFilter'] = chart.additionalOptions.filters.timeFilter.options[0];
              }
              
              // Set initial currency filter
              if (chart.additionalOptions.filters.currencyFilter && 
                  Array.isArray(chart.additionalOptions.filters.currencyFilter.options) && 
                  chart.additionalOptions.filters.currencyFilter.options.length > 0) {
                initialFilterValues[chart.id]['currencyFilter'] = chart.additionalOptions.filters.currencyFilter.options[0];
              }
              
              // Set initial display mode filter
              if (chart.additionalOptions.filters.displayModeFilter && 
                  Array.isArray(chart.additionalOptions.filters.displayModeFilter.options) && 
                  chart.additionalOptions.filters.displayModeFilter.options.length > 0) {
                initialFilterValues[chart.id]['displayModeFilter'] = chart.additionalOptions.filters.displayModeFilter.options[0];
              }
            }
          });
          
          setExpandedCharts(expandedState);
          setDownloadingCharts(downloadingState);
          setLoadingCharts(initialLoadingState);
          setFilterValues(initialFilterValues);
          
          return;
        }
      
        // Default behavior: load charts based on pageId
        const pageCharts = await getChartConfigsByPage(pageId);
        setCharts(pageCharts);
        
        // Initialize expanded and downloading states for each chart
        const expandedState: Record<string, boolean> = {};
        const downloadingState: Record<string, boolean> = {};
        const initialFilterValues: Record<string, Record<string, string>> = {};
        const initialLoadingState: Record<string, boolean> = {};
        
        pageCharts.forEach(chart => {
          expandedState[chart.id] = false;
          downloadingState[chart.id] = false;
          initialLoadingState[chart.id] = true; // Start with loading state
          
          // Initialize filter values for each chart
          if (chart.additionalOptions?.filters) {
            initialFilterValues[chart.id] = {};
            
            // Set initial time filter
            if (chart.additionalOptions.filters.timeFilter && 
                Array.isArray(chart.additionalOptions.filters.timeFilter.options) && 
                chart.additionalOptions.filters.timeFilter.options.length > 0) {
              initialFilterValues[chart.id]['timeFilter'] = chart.additionalOptions.filters.timeFilter.options[0];
            }
            
            // Set initial currency filter
            if (chart.additionalOptions.filters.currencyFilter && 
                Array.isArray(chart.additionalOptions.filters.currencyFilter.options) && 
                chart.additionalOptions.filters.currencyFilter.options.length > 0) {
              initialFilterValues[chart.id]['currencyFilter'] = chart.additionalOptions.filters.currencyFilter.options[0];
            }
            
            // Set initial display mode filter
            if (chart.additionalOptions.filters.displayModeFilter && 
                Array.isArray(chart.additionalOptions.filters.displayModeFilter.options) && 
                chart.additionalOptions.filters.displayModeFilter.options.length > 0) {
              initialFilterValues[chart.id]['displayModeFilter'] = chart.additionalOptions.filters.displayModeFilter.options[0];
            }
          }
        });
        
        setExpandedCharts(expandedState);
        setDownloadingCharts(downloadingState);
        setLoadingCharts(initialLoadingState);
        setFilterValues(initialFilterValues);
      } catch (error) {
        console.error(`Error loading charts for page ${pageId}:`, error);
      }
    }
    
    loadCharts();
  }, [pageId, overrideCharts]);

  const toggleChartExpanded = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  // Handle filter changes
  const handleFilterChange = async (chartId: string, filterType: string, value: string) => {
    console.log(`Filter changed for chart ${chartId}: ${filterType} = ${value}`);
    
    // Use a function reference to prevent infinite loops
    if (filterValues[chartId]?.[filterType] === value) {
      // Skip update if the value hasn't changed
      return;
    }
    
    // Set loading state when filter changes
    setLoadingCharts(prev => ({
      ...prev,
      [chartId]: true
    }));
    
    // Update filter value
    setFilterValues(prev => ({
      ...prev,
      [chartId]: {
        ...prev[chartId],
        [filterType]: value
      }
    }));
    
    // Find the chart
    const chart = charts.find(c => c.id === chartId);
    if (!chart) return;
    
    // Fetch updated data with the new filter
    await fetchChartDataWithFilters(chart);
    
    // Reset loading state after fetch
    setLoadingCharts(prev => ({
      ...prev,
      [chartId]: false
    }));
  };
  
  // Fetch chart data with current filters
  const fetchChartDataWithFilters = async (chart: ChartConfig) => {
    try {
      // Set loading state
      setLoadingCharts(prev => ({
        ...prev,
        [chart.id]: true
      }));
      
      // Get current filter values for this chart
      const chartFilters = filterValues[chart.id] || {};
      
      // Create URL with API key
      const url = new URL(chart.apiEndpoint);
      if (chart.apiKey) {
        url.searchParams.append('api_key', chart.apiKey);
      }
      
      // Check if the API supports direct CSV format output
      // Some APIs can return data directly in CSV format
      const supportsCsvFormat = url.pathname.includes('_csv');
      if (supportsCsvFormat) {
        url.searchParams.append('format', 'csv');
        console.log(`Adding CSV format parameter to URL`);
      }
      
      // Build parameters object for POST request
      const parameters: Record<string, any> = {};
      const filterConfig = chart.additionalOptions?.filters;
      
      if (filterConfig) {
        // Add time filter parameter
        if (filterConfig.timeFilter && chartFilters['timeFilter']) {
          parameters[filterConfig.timeFilter.paramName] = chartFilters['timeFilter'];
        }
        
        // Add currency filter parameter
        if (filterConfig.currencyFilter && chartFilters['currencyFilter']) {
          parameters[filterConfig.currencyFilter.paramName] = chartFilters['currencyFilter'];
        }
        
        // Add display mode filter parameter
        if (filterConfig.displayModeFilter && chartFilters['displayModeFilter']) {
          parameters[filterConfig.displayModeFilter.paramName] = chartFilters['displayModeFilter'];
        }
      }
      
      // Set up request options
      const hasParameters = Object.keys(parameters).length > 0;
      const options: RequestInit = {
        method: hasParameters ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      };
      
      // Add body with parameters for POST request
      if (hasParameters) {
        options.body = JSON.stringify({ parameters });
        console.log(`Fetching data with parameters:`, parameters);
      }
      
      console.log(`Fetching data from: ${url.toString()} with method: ${options.method}`);
      
      // Fetch data from API
      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Process different API response formats
      let parsedData: any[] = [];
      
      // Redash format
      if (result?.query_result?.data?.rows) {
        parsedData = result.query_result.data.rows;
      } 
      // Direct array
      else if (Array.isArray(result)) {
        parsedData = result;
      } 
      // Data property
      else if (result?.data && Array.isArray(result.data)) {
        parsedData = result.data;
      }
      // Rows property
      else if (result?.rows && Array.isArray(result.rows)) {
        parsedData = result.rows;
      }
      // Results property
      else if (result?.results && Array.isArray(result.results)) {
        parsedData = result.results;
      }
      else if (result?.error) {
        throw new Error(`API returned an error: ${result.error}`);
      }
      else {
        console.error('Unrecognized API response structure:', result);
        throw new Error('API response does not have a recognized structure');
      }
      
      // Update chart data
      setChartData(prev => ({
        ...prev,
        [chart.id]: parsedData
      }));
      
      // Update legends
      updateLegends(chart.id, parsedData);
      
      // Reset loading state
      setLoadingCharts(prev => ({
        ...prev,
        [chart.id]: false
      }));
      
      return parsedData;
    } catch (error) {
      console.error('Error fetching chart data:', error);
      
      // Reset loading state even on error
      setLoadingCharts(prev => ({
        ...prev,
        [chart.id]: false
      }));
      
      return null;
    }
  };

  const downloadCSV = async (chart: ChartConfig) => {
    // Set loading state
    setDownloadingCharts(prev => ({ ...prev, [chart.id]: true }));
    
    try {
      // Get the current data for this chart from our state
      const currentData = chartData[chart.id];
      
      // Get current filter values for this chart
      const chartFilters = filterValues[chart.id] || {};
      const timeFilter = chartFilters['timeFilter'];
      const displayMode = chartFilters['displayMode']; // Get display mode from filters
      
      console.log(`Downloading CSV for chart "${chart.title}" (${chart.id}):`, {
        chartType: chart.chartType,
        timeFilter,
        displayMode,
        allFilters: chartFilters,
        apiEndpoint: chart.apiEndpoint,
        dataCount: currentData?.length || 0
      });
      
      // Determine time period text for filename
      let timePeriodText = '';
      if (timeFilter) {
        switch (timeFilter.toUpperCase()) {
          case 'D': timePeriodText = 'daily'; break;
          case 'W': timePeriodText = 'weekly'; break;
          case 'M': timePeriodText = 'monthly'; break;
          case 'Q': timePeriodText = 'quarterly'; break;
          case 'Y': timePeriodText = 'yearly'; break;
          default: timePeriodText = timeFilter.toLowerCase();
        }
      }
      
      // Always use a fresh API call to fetch the CSV data with the current filters
      // This ensures we get the right data for the current time filter
      console.log(`Performing fresh API call for CSV download with time filter: ${timeFilter}`);
      
      // Create URL with API key if provided
      const url = new URL(chart.apiEndpoint);
      if (chart.apiKey) {
        url.searchParams.append('api_key', chart.apiKey);
      }
      
      // Build parameters for API request to match current filters
      const parameters: Record<string, any> = {};
      const filterConfig = chart.additionalOptions?.filters;
      
      if (filterConfig) {
        // Add time filter parameter
        if (filterConfig.timeFilter && chartFilters['timeFilter']) {
          // Important: Use the exact parameter name from the filter config
          const paramName = filterConfig.timeFilter.paramName;
          parameters[paramName] = chartFilters['timeFilter'];
          console.log(`Setting time filter for CSV: ${paramName}=${chartFilters['timeFilter']}`);
        }
        
        // Add currency filter parameter
        if (filterConfig.currencyFilter && chartFilters['currencyFilter']) {
          const paramName = filterConfig.currencyFilter.paramName;
          parameters[paramName] = chartFilters['currencyFilter'];
          console.log(`Setting currency filter for CSV: ${paramName}=${chartFilters['currencyFilter']}`);
        }
        
        // Add display mode filter parameter
        if (filterConfig.displayModeFilter && chartFilters['displayModeFilter']) {
          const paramName = filterConfig.displayModeFilter.paramName;
          parameters[paramName] = chartFilters['displayModeFilter'];
          console.log(`Setting display mode filter for CSV: ${paramName}=${chartFilters['displayModeFilter']}`);
        }
      }
      
      // Set up request options
      const hasParameters = Object.keys(parameters).length > 0;
      const options: RequestInit = {
        method: hasParameters ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      };
      
      // Add body with parameters for POST request
      if (hasParameters) {
        // Important: Ensure we're using the exact same format that the API expects
        // Most APIs expect: { "parameters": { "key1": "value1", ... } }
        options.body = JSON.stringify({ parameters });
        console.log(`Fetching CSV data with request body:`, options.body);
      }
      
      console.log(`Fetching data from: ${url.toString()} with method: ${options.method}`);
      
      // Fetch data with filters applied
      const response = await fetch(url.toString(), options);
      if (!response.ok) {
        throw new Error(`Failed to download CSV: ${response.statusText}`);
      }
      
      // Get data from response
      const responseData = await response.text();
      
      // Check if the response is already CSV data or needs conversion
      let csvData = responseData;
      let rawData: any[] = [];
      
      // If the response starts with quotes or letters followed by commas, it's likely CSV already
      const looksLikeCSV = responseData.trim().startsWith('"') || 
                           /^[a-zA-Z]+,/.test(responseData.trim()) ||
                           responseData.includes('\n') && responseData.includes(',');
      
      // If the response looks like JSON, try to parse and convert it
      if (!looksLikeCSV && (responseData.trim().startsWith('{') || responseData.trim().startsWith('['))) {
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(responseData);
          
          // Handle different API response formats
          // Redash format
          if (jsonData?.query_result?.data?.rows) {
            rawData = jsonData.query_result.data.rows;
          } 
          // Direct array
          else if (Array.isArray(jsonData)) {
            rawData = jsonData;
          } 
          // Data property
          else if (jsonData?.data && Array.isArray(jsonData.data)) {
            rawData = jsonData.data;
          }
          // Rows property
          else if (jsonData?.rows && Array.isArray(jsonData.rows)) {
            rawData = jsonData.rows;
          }
          // Results property
          else if (jsonData?.results && Array.isArray(jsonData.results)) {
            rawData = jsonData.results;
          }
          
          console.log(`API returned ${rawData.length} rows of data for time filter: ${timeFilter}`);
          
          // Check if we need to convert values to percentages for stacked bar chart in percent mode
          const isStackedBar = chart.chartType === 'stacked-bar' || 
                              (chart.chartType === 'bar' && chart.isStacked === true);
          const isPercentMode = displayMode === 'percent';
          
          if (isStackedBar && isPercentMode && rawData.length > 0) {
            console.log('Converting stacked bar chart data to percentages for CSV download');
            
            // Apply percentage conversion similar to how StackedBarChart.tsx does it
            if (chart.dataMapping.groupBy) {
              // For stacked charts with groupBy field
              const groupByField = chart.dataMapping.groupBy;
              const xField = typeof chart.dataMapping.xAxis === 'string' ? 
                chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
              const yField = typeof chart.dataMapping.yAxis === 'string' ? 
                chart.dataMapping.yAxis : getFieldName(Array.isArray(chart.dataMapping.yAxis) ? 
                  chart.dataMapping.yAxis[0] : chart.dataMapping.yAxis);
              
              // Get unique x-values
              const xValues = Array.from(new Set(rawData.map(item => item[xField])));
              
              // For each x value, convert the y values to percentages
              xValues.forEach(xValue => {
                // Get all items with this x value
                const items = rawData.filter(item => item[xField] === xValue);
                
                // Calculate total for this x value
                const total = items.reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
                
                if (total > 0) {
                  // Update each item with percentage value
                  items.forEach(item => {
                    const value = Number(item[yField]) || 0;
                    item[yField] = (value / total) * 100;
                  });
                }
              });
              
              console.log('Converted values to percentages for CSV download');
            } else if (Array.isArray(chart.dataMapping.yAxis) && chart.dataMapping.yAxis.length > 1) {
              // For multi-y-field stacked charts
              const xField = typeof chart.dataMapping.xAxis === 'string' ? 
                chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
                
              const yFields = chart.dataMapping.yAxis.map(field => 
                typeof field === 'string' ? field : field.field);
              
              // Get unique x-values
              const xValues = Array.from(new Set(rawData.map(item => item[xField])));
              
              // For each x value, convert the y values to percentages
              xValues.forEach(xValue => {
                // Get all items with this x value
                const items = rawData.filter(item => item[xField] === xValue);
                
                // Calculate total for this x value across all y fields
                const total = items.reduce((sum, item) => {
                  return sum + yFields.reduce((fieldSum, field) => 
                    fieldSum + (Number(item[field]) || 0), 0);
                }, 0);
                
                if (total > 0) {
                  // Update each item with percentage values for all y fields
                  items.forEach(item => {
                    yFields.forEach(field => {
                      const value = Number(item[field]) || 0;
                      item[field] = (value / total) * 100;
                    });
                  });
                }
              });
              
              console.log('Converted multi-field values to percentages for CSV download');
            }
          }
          
          if (rawData.length > 0) {
            // Extract headers from first row
            const headers = Object.keys(rawData[0]);
            
            // Generate CSV content
            csvData = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
            
            // Add data rows
            rawData.forEach(row => {
              const rowValues = headers.map(header => {
                const value = row[header];
                
                // Handle different value types
                if (value === null || value === undefined) {
                  return '';
                } else if (typeof value === 'string') {
                  // Escape double quotes by doubling them
                  return `"${value.replace(/"/g, '""')}"`;
                } else if (typeof value === 'number') {
                  // Format percentage values with % symbol if needed
                  if (isPercentMode && isStackedBar) {
                    return `${value.toFixed(2)}%`;
                  }
                  return value;
                } else {
                  // For complex objects or arrays, stringify
                  return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
              });
              
              csvData += rowValues.join(',') + '\n';
            });
          }
        } catch (e) {
          console.error('Error parsing JSON response:', e);
          // If parsing fails, use the original response (might be CSV)
        }
      }
      
      // Create a blob from the CSV data
      const blob = new Blob([csvData], { type: 'text/csv' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      // Get current date for filename
      const dateStr = new Date().toISOString().split('T')[0];
      // Include display mode in filename if it's percentage mode
      const displayModeText = displayMode === 'percent' ? '_percentage' : '';
      // Include time period in filename if available
      const filename = timePeriodText 
        ? `${chart.title.replace(/\s+/g, '_').toLowerCase()}${displayModeText}_${timePeriodText}_${dateStr}.csv`
        : `${chart.title.replace(/\s+/g, '_').toLowerCase()}${displayModeText}_${dateStr}.csv`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV. Please try again.');
    } finally {
      // Clear loading state
      setDownloadingCharts(prev => ({ ...prev, [chart.id]: false }));
    }
  };

  // Generate legends for a chart based on its data and configuration
  const updateLegends = (chartId: string, data: any[]) => {
    const chart = charts.find(c => c.id === chartId);
    if (!chart || !data || data.length === 0) return;
    
    console.log("Updating legends for chart:", {
      id: chartId,
      title: chart.title,
      chartType: chart.chartType,
      isStacked: chart.isStacked,
      groupBy: chart.dataMapping.groupBy,
      dataLength: data.length,
      sampleData: data.slice(0, 2)
    });
    
    // Get or initialize the legend color map for this chart
    let colorMap = legendColorMaps[chartId] || {};
    const isNewColorMap = Object.keys(colorMap).length === 0;
    
    // Different legend generation based on chart type
    let chartLegends: Legend[] = [];
    // Track new labels to ensure we keep consistent order
    const newLabels: string[] = [];
    
    // First, check if this is a dual-axis chart
    const isDualAxis = chart.chartType === 'dual-axis' && chart.dualAxisConfig;

    // Define variables needed for stacked chart logic
    const isStackedConfig = chart.chartType.includes('stacked') || chart.isStacked === true;
    const hasGroupByField = !!chart.dataMapping.groupBy;
    const groupField = chart.dataMapping.groupBy || '';

    // Check if the groupBy field actually exists in the data
    const groupByFieldExists = data.length > 0 && groupField && data[0][groupField] !== undefined;

    // A chart is a valid stacked chart if it's configured as stacked AND has a groupBy field that exists in the data
    const isValidStackedChart = isStackedConfig && hasGroupByField && groupByFieldExists;

    if (isDualAxis && chart.dualAxisConfig) {
      console.log("Processing as dual axis chart");
      
      // For dual axis charts, create separate legends for left and right axes
      const leftAxisFields = chart.dualAxisConfig.leftAxisFields;
      const rightAxisFields = chart.dualAxisConfig.rightAxisFields;
      
      // Process all fields from both axes
      const allFields = [...leftAxisFields, ...rightAxisFields];
      
      // Calculate totals for each field for tooltips
      const fieldTotals: Record<string, number> = {};
      
      allFields.forEach(field => {
        fieldTotals[field] = data.reduce((sum, item) => 
          sum + (Number(item[field]) || 0), 0);
        
        newLabels.push(field);
        
        // Assign colors if creating a new color map
        if (isNewColorMap && !colorMap[field]) {
          // Left axis fields get blue-ish colors, right axis fields get purple-ish colors
          const isRightAxis = rightAxisFields.includes(field);
          const index = isRightAxis 
            ? rightAxisFields.indexOf(field)
            : leftAxisFields.indexOf(field);
          
          colorMap[field] = isRightAxis 
            ? getColorByIndex(index + leftAxisFields.length) // Offset to avoid color conflicts
            : getColorByIndex(index);
        }
      });
      
      // Create legend items for all fields
      chartLegends = allFields.map(field => {
        const isRightAxis = rightAxisFields.includes(field);
        const fieldName = field.replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        return {
          label: `${fieldName}`,
          color: colorMap[field] || getColorByIndex(allFields.indexOf(field)),
          value: fieldTotals[field] || 0
        };
      });
    }
    // First, we need to determine if this is truly a stacked chart with valid data
    else if (isValidStackedChart) {
      console.log("Processing as valid stacked chart with group by:", groupField);
      
      // For stacked charts, always use the group by field values for legends
      // Get unique groups from the data
      const uniqueGroups = Array.from(new Set(data.map(item => item[groupField])));
      console.log("Unique groups found:", uniqueGroups);
      
      // Calculate total for each group for sorting and tooltips
      const yField = typeof chart.dataMapping.yAxis === 'string' ? 
        chart.dataMapping.yAxis : 
        Array.isArray(chart.dataMapping.yAxis) ? 
          getFieldName(chart.dataMapping.yAxis[0]) : 
          getFieldName(chart.dataMapping.yAxis);
      
      // Group totals for proper sorting
      const groupTotals: Record<string, number> = {};
      uniqueGroups.forEach(group => {
        if (group !== null && group !== undefined) {
          const groupStr = String(group);
          newLabels.push(groupStr);
          
          // Get the actual field name if yField is a YAxisConfig
          const yFieldName = typeof chart.dataMapping.yAxis === 'string' ? 
            chart.dataMapping.yAxis : 
            (Array.isArray(chart.dataMapping.yAxis) ? 
              getFieldName(chart.dataMapping.yAxis[0]) : 
              getFieldName(chart.dataMapping.yAxis));
          
          groupTotals[groupStr] = data
            .filter(item => item[groupField] === group)
            .reduce((sum, item) => sum + (Number(item[yFieldName]) || 0), 0);
        }
      });
      console.log("Group totals:", groupTotals);
      
      // Create legend items, maintaining consistent color assignment
      // Sort by totals first (highest to lowest) if assigning colors for the first time
      if (isNewColorMap) {
        // Get sorted groups by their total value (highest first)
        const sortedGroups = Object.entries(groupTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([group]) => group);
        
        // Assign colors to groups in order of their totals
        sortedGroups.forEach((group, index) => {
          if (!colorMap[group]) {
            colorMap[group] = getColorByIndex(index);
          }
        });
      }
      
      // Now create legend items using the color map
      chartLegends = uniqueGroups
        .filter(group => group !== null && group !== undefined)
        .map((group) => {
          const groupStr = String(group);
          return {
            label: groupStr,
            color: colorMap[groupStr] || getColorByIndex(Object.keys(colorMap).length),
            value: groupTotals[groupStr] || 0
          };
        });
    }
    // Handle pie charts
    else if (chart.chartType === 'pie') {
      console.log("Processing as pie chart");
      
      // For pie charts, use the category field (usually xAxis) for labels
      // and the value field (usually yAxis) for values
      const categoryField = typeof chart.dataMapping.xAxis === 'string' ? 
        chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
        
      // Get the value field name
      const valueField = typeof chart.dataMapping.yAxis === 'string' ? 
        chart.dataMapping.yAxis : 
        Array.isArray(chart.dataMapping.yAxis) ? 
          getFieldName(chart.dataMapping.yAxis[0]) : 
          getFieldName(chart.dataMapping.yAxis);
      
      // Create legends for each pie segment
      let pieItems = data
        .filter(item => item[categoryField] !== null && item[categoryField] !== undefined)
        .map((item, index) => {
          const label = String(item[categoryField]);
          const value = Number(item[valueField]) || 0;
          
          return { label, value, index };
        });
      
      // Sort by value (highest first) for better readability
      pieItems.sort((a, b) => b.value - a.value);
      
      // Limit to top 10 segments if there are many categories
      const MAX_PIE_SEGMENTS = 30;
      if (pieItems.length > MAX_PIE_SEGMENTS) {
        console.log(`Limiting pie chart to top ${MAX_PIE_SEGMENTS} segments (from ${pieItems.length} total)`);
        pieItems = pieItems.slice(0, MAX_PIE_SEGMENTS);
      }
      
      // Generate legends with appropriate colors
      chartLegends = pieItems.map((item, index) => {
        const { label, value } = item;
        newLabels.push(label);
        
        // Assign colors if creating a new color map
        if (isNewColorMap && !colorMap[label]) {
          colorMap[label] = getColorByIndex(index);
        }
        
        return {
          label,
          color: colorMap[label] || getColorByIndex(index),
          value
        };
      });
      
      console.log(`Generated ${chartLegends.length} legend items for pie chart`);
    }
    // Then handle regular bar/line charts
    else if (chart.chartType === 'bar' || chart.chartType === 'line') {
      console.log("Processing as regular bar/line chart");
      // Check if this is a date-based chart (typically time series)
      const xField = typeof chart.dataMapping.xAxis === 'string' ? 
        chart.dataMapping.xAxis : chart.dataMapping.xAxis[0];
      
      // Get field names from yAxis which could be strings or YAxisConfig objects
      let yAxisFields: string[] = [];
      if (Array.isArray(chart.dataMapping.yAxis)) {
        yAxisFields = chart.dataMapping.yAxis.map(field => getFieldName(field));
      } else {
        yAxisFields = [getFieldName(chart.dataMapping.yAxis)];
      }
      
      const isDateBased = data.length > 0 && 
        (xField.toLowerCase().includes('date') || 
         xField.toLowerCase().includes('time') || 
         typeof data[0][xField] === 'string' && 
         data[0][xField].match(/^\d{4}-\d{2}-\d{2}/));
      
      if (isDateBased) {
        // For date-based charts, don't use dates as legend labels
        // Instead, use series names or y-axis field names
        
        // Check if we have multiple y-axis fields (multi-series)
        if (Array.isArray(chart.dataMapping.yAxis) && chart.dataMapping.yAxis.length > 1) {
          // For multi-series charts, use the y-axis field names as legends
          // Format the field names and assign colors
          chartLegends = yAxisFields.map((field, index) => {
            // Calculate the total for this field across all data points
            const total = data.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
            
            // Format the field name to be more readable
            const label = field.replace(/_/g, ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            newLabels.push(label);
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[label] && isNewColorMap) {
              colorMap[label] = getColorByIndex(index);
            }
            
            return {
              label,
              color: colorMap[label] || getColorByIndex(index),
              value: total
            };
          });
        } else {
          // For single-series time charts, use a single legend entry with the chart title or y-axis name
          const yFieldName = getFieldName(yAxisFields[0]);
          const total = data.reduce((sum, item) => sum + (Number(item[yFieldName]) || 0), 0);
          const label = yFieldName.replace(/_/g, ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          
          newLabels.push(label);
          
          // Use consistent color from our map, or generate a new one if needed
          if (!colorMap[label] && isNewColorMap) {
            colorMap[label] = getColorByIndex(0);
          }
          
          chartLegends = [{
            label,
            color: colorMap[label] || getColorByIndex(0),
            value: total
          }];
        }
      } else {
        // For non-date based charts, use data points as legend entries
        // Don't limit to just 5 items, show all of them for consistency with BarChart
        chartLegends = data
          .map((item, index) => {
            const label = String(item[xField]);
            newLabels.push(label);
            
            // Use consistent color from our map, or generate a new one if needed
            if (!colorMap[label] && isNewColorMap) {
              colorMap[label] = getColorByIndex(index);
            }
            
            return {
              label,
              color: colorMap[label] || getColorByIndex(index),
              value: Number(item[yAxisFields[0]]) || 0
            };
          });
      }
    }
    
    console.log("Generated legend items:", chartLegends);
    
    // Keep track of sorted order for consistent rendering
    if (isNewColorMap && chartLegends.length > 0) {
      // If this is the first time, remember the order of labels and their colors
      const newColorMap: Record<string, string> = {};
      chartLegends.forEach((legend, index) => {
        newColorMap[legend.label] = colorMap[legend.label] || getColorByIndex(index);
      });
      
      setLegendColorMaps(prev => ({
        ...prev,
        [chartId]: newColorMap
      }));
      
      console.log("Created new color map:", newColorMap);
    } else if (!isNewColorMap) {
      // If we already have a color map, maintain order from previous legend set
      const existingLegends = legends[chartId] || [];
      const existingLabels = existingLegends.map(l => l.label);
      
      // Sort the new legends to match the previous order as much as possible
      const oldLabels = existingLabels.filter(label => newLabels.includes(label));
      const newOnlyLabels = newLabels.filter(label => !existingLabels.includes(label));
      
      // Combine old labels (in original order) with new labels
      const orderedLabels = [...oldLabels, ...newOnlyLabels];
      
      // Sort the legends to match this order
      chartLegends.sort((a, b) => {
        const indexA = orderedLabels.indexOf(a.label);
        const indexB = orderedLabels.indexOf(b.label);
        return indexA - indexB;
      });
    }
    
    // No longer limiting the number of legend items
    // Update legends state
    setLegends(prev => ({
      ...prev,
      [chartId]: chartLegends
    }));
  };

  // Add a function to directly pass chart colors to ChartRenderer
  const syncLegendColors = useCallback((chartId: string, chartColorMap: Record<string, string>) => {
    if (!chartColorMap || Object.keys(chartColorMap).length === 0) return;
    
    // Find the chart
    const chart = charts.find(c => c.id === chartId);
    
    console.log(`Received colors for chart ${chartId}:`, {
      chartType: chart?.chartType,
      colorMapSize: Object.keys(chartColorMap).length,
      colorMap: chartColorMap
    });
    
    // Compare with existing color map to prevent unnecessary updates
    const existingColorMap = legendColorMaps[chartId] || {};
    if (JSON.stringify(existingColorMap) === JSON.stringify(chartColorMap)) {
      return;
    }
    
    setLegendColorMaps(prev => ({
      ...prev,
      [chartId]: chartColorMap
    }));
  }, [legendColorMaps, charts]);

  // Inside the render method, after setting state, we need to prepare charts with filter callbacks
  // The existing charts array will be updated to include the onFilterChange callback for each chart
  useEffect(() => {
    if (charts.length > 0) {
      // Create a new array with the onFilterChange callback added to each chart
      const updatedCharts = charts.map(chart => ({
        ...chart,
        // Add the onFilterChange callback that will be called when filters change in the modal
        onFilterChange: (updatedFilters: Record<string, string>) => {
          console.log(`Filter changed from modal for chart ${chart.id}:`, updatedFilters);
          
          // Update our filter state with the new values from the modal
          setFilterValues(prev => ({
            ...prev,
            [chart.id]: {
              ...prev[chart.id],
              ...updatedFilters
            }
          }));
          
          // Fetch updated data with the new filters
          fetchChartDataWithFilters({
            ...chart,
            additionalOptions: {
              ...chart.additionalOptions,
              filters: {
                ...chart.additionalOptions?.filters,
                // Update active values to match the filters from the modal
                timeFilter: chart.additionalOptions?.filters?.timeFilter ? {
                  ...chart.additionalOptions.filters.timeFilter,
                  activeValue: updatedFilters.timeFilter || chart.additionalOptions.filters.timeFilter.activeValue
                } : undefined,
                currencyFilter: chart.additionalOptions?.filters?.currencyFilter ? {
                  ...chart.additionalOptions.filters.currencyFilter,
                  activeValue: updatedFilters.currencyFilter || chart.additionalOptions.filters.currencyFilter.activeValue
                } : undefined,
                displayModeFilter: chart.additionalOptions?.filters?.displayModeFilter ? {
                  ...chart.additionalOptions.filters.displayModeFilter,
                  activeValue: updatedFilters.displayMode || chart.additionalOptions.filters.displayModeFilter.activeValue
                } : undefined
              }
            }
          });
        }
      }));
      
      // Update the charts state with the new callback-enabled charts
      setCharts(updatedCharts);
    }
  }, [charts.length]); // Only run when charts array length changes (initial load)

  // When chart data changes, ensure legends are updated for all charts
  useEffect(() => {
    Object.entries(chartData).forEach(([chartId, data]) => {
      if (data && data.length > 0) {
        // Find the chart
        const chart = charts.find(c => c.id === chartId);
        if (chart) {
          console.log(`Updating legends for ${chart.chartType} chart ${chartId} with ${data.length} data points`);
          updateLegends(chartId, data);
        }
      }
    });
  }, [chartData, charts]);

  if (!isClient) {
    return null; // Return nothing during SSR
  }

  if (charts.length === 0) {
    return null; // Don't render anything if there are no charts
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      {charts.map((chart) => (
        <ChartCard 
          key={chart.id}
          title={chart.title}
          description={chart.subtitle}
          accentColor="blue"
          onExpandClick={() => toggleChartExpanded(chart.id)}
          onDownloadClick={() => downloadCSV(chart)}
          isDownloading={downloadingCharts[chart.id]}
          isLoading={loadingCharts[chart.id]}
          legendWidth="1/5"
          
          // Add filter bar for regular chart view using ChartRenderer's filter props
          filterBar={
            // Show filter bar if there are filters OR if this is a stacked chart
            (chart.additionalOptions?.filters || isStackedBarChart(chart)) && (
            <div className="flex flex-wrap gap-3 items-center">
              {/* Time Filter */}
              {chart.additionalOptions?.filters?.timeFilter && (
                <TimeFilterSelector
                  value={filterValues[chart.id]?.['timeFilter'] || chart.additionalOptions.filters.timeFilter.options[0]}
                  onChange={(value) => handleFilterChange(chart.id, 'timeFilter', value)}
                  options={chart.additionalOptions.filters.timeFilter.options.map((value: string) => ({ 
                    value, 
                    label: value 
                  }))}
                />
              )}
              
              {/* Currency Filter */}
              {chart.additionalOptions?.filters?.currencyFilter && (
                <CurrencyFilter
                  currency={filterValues[chart.id]?.['currencyFilter'] || chart.additionalOptions.filters.currencyFilter.options[0]}
                  options={chart.additionalOptions.filters.currencyFilter.options}
                  onChange={(value) => handleFilterChange(chart.id, 'currencyFilter', value)}
                />
              )}
              
              {/* Display Mode Filter - always show for stacked charts, or when explicitly configured */}
              {(isStackedBarChart(chart) || chart.additionalOptions?.filters?.displayModeFilter) && (
                <DisplayModeFilter
                  mode={filterValues[chart.id]?.['displayMode'] as DisplayMode || 'absolute'}
                  onChange={(value) => handleFilterChange(chart.id, 'displayMode', value)}
                />
              )}
            </div>
          )}
          
          legend={
            <>
              {legends[chart.id] && legends[chart.id].length > 0 ? (
                <div className="space-y-2 w-full overflow-y-auto max-h-[500px]
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {legends[chart.id].map(legend => (
                    <LegendItem 
                      key={legend.label}
                      label={legend.label} 
                      color={legend.color} 
                      shape="square"
                      tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <LegendItem label="Loading..." color="#cccccc" isLoading={true} />
              )}
            </>
          }
        >
          <div className="h-95">
            <ChartRenderer 
              chartConfig={chart} 
              onDataLoaded={(data: any[]) => {
                // Store initial data and update legends
                if (!chartData[chart.id]) {
                  setChartData(prev => ({
                    ...prev,
                    [chart.id]: data
                  }));
                }
                updateLegends(chart.id, data);
                
                // Set loading to false when data is loaded
                setLoadingCharts(prev => ({
                  ...prev,
                  [chart.id]: false
                }));
              }}
              isExpanded={expandedCharts[chart.id]}
              onCloseExpanded={() => toggleChartExpanded(chart.id)}
              // Pass filter values and handlers to ChartRenderer
              filterValues={filterValues[chart.id]}
              onFilterChange={(filterType, value) => handleFilterChange(chart.id, filterType, value)}
              // Pass the color map to ensure consistent colors
              colorMap={legendColorMaps[chart.id]}
              // Add a callback to receive colors from BarChart
              onColorsGenerated={(colorMap) => syncLegendColors(chart.id, colorMap)}
              // Pass loading state
              isLoading={loadingCharts[chart.id]}
            />
          </div>
        </ChartCard>
      ))}
    </div>
  );
} 