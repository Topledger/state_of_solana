import React, { useEffect, useState } from 'react';
import { ChartConfig, YAxisConfig } from '../types';
import BarChart from './charts/BarChart';
import SimpleBarChart from './charts/SimpleBarChart';
import StackedBarChart from './charts/StackedBarChart';
import DualAxisChart from './charts/DualAxisChart';
import MultiSeriesLineBarChart from './charts/MultiSeriesLineBarChart';
import PieChart from './charts/PieChart';
import Modal from '../../components/shared/Modal';
//import LineChart from './charts/LineChart';
// import AreaChart from './charts/AreaChart';
// Import filter components
import TimeFilterSelector from '../../components/shared/filters/TimeFilter';
import CurrencyFilter from '../../components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';

interface ChartRendererProps {
  chartConfig: ChartConfig;
  onDataLoaded?: (data: any[]) => void;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  // New props for filter handling
  onFilterChange?: (filterType: string, value: string) => void;
  filterValues?: Record<string, string>;
  // Add colorMap prop for legend color consistency
  colorMap?: Record<string, string>;
  // Add callback to report generated colors back to parent
  onColorsGenerated?: (colorMap: Record<string, string>) => void;
  // Add loading state prop
  isLoading?: boolean;
}

// Add helper function at the top of the file
function getFieldFromYAxisConfig(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  chartConfig, 
  onDataLoaded,
  isExpanded = false, 
  onCloseExpanded,
  onFilterChange,
  filterValues: externalFilterValues,
  colorMap: externalColorMap,
  onColorsGenerated,
  isLoading = false
}) => {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Use internal or external filter values based on what's provided
  const [internalFilterValues, setInternalFilterValues] = useState<Record<string, string>>({});
  const [isFilterChanged, setIsFilterChanged] = useState(false);
  // Add state to track legend colors, use external if provided
  const [legendColorMap, setLegendColorMap] = useState<Record<string, string>>(externalColorMap || {});
  
  // Update legendColorMap when externalColorMap changes
  useEffect(() => {
    if (externalColorMap) {
      setLegendColorMap(externalColorMap);
    }
  }, [externalColorMap]);

  // Add effect to forward legend colors to parent component
  useEffect(() => {
    if (onColorsGenerated && Object.keys(legendColorMap).length > 0) {
      // Check if this is actually a new color map from what we got externally
      const externalMapStr = JSON.stringify(externalColorMap || {});
      const currentMapStr = JSON.stringify(legendColorMap);
      
      // Only trigger the callback if the maps are different
      if (externalMapStr !== currentMapStr) {
        onColorsGenerated(legendColorMap);
      }
    }
  }, [legendColorMap, onColorsGenerated, externalColorMap]);

  // Determine whether to use internal or external filter values
  const filterValues = externalFilterValues || internalFilterValues;

  // Helper function to find a matching field with flexible matching
  const findMatchingField = (obj: any, fieldName: string): string | null => {
    // Direct match
    if (fieldName in obj) return fieldName;
    
    // Case insensitive match
    const lowerField = fieldName.toLowerCase();
    const keys = Object.keys(obj);
    
    // First try exact match with lowercase
    for (const key of keys) {
      if (key.toLowerCase() === lowerField) return key;
    }
    
    // Then try replacing spaces with underscores and vice versa
    const spaceToUnderscore = lowerField.replace(/ /g, '_');
    const underscoreToSpace = lowerField.replace(/_/g, ' ');
    
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === spaceToUnderscore || lowerKey === underscoreToSpace) {
        return key;
      }
    }
    
    return null;
  };

  // Initialize filter values from chart config
  useEffect(() => {
    // Only initialize internal filters if external ones aren't provided
    if (externalFilterValues) return;
    
    const initialFilters: Record<string, string> = {};
    
    // Extract initial filter values from chart config
    if (chartConfig.additionalOptions?.filters) {
      // Set time filter
      if (chartConfig.additionalOptions.filters.timeFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.timeFilter.options) &&
          chartConfig.additionalOptions.filters.timeFilter.options.length > 0) {
        initialFilters['timeFilter'] = chartConfig.additionalOptions.filters.timeFilter.options[0];
      }
      
      // Set currency filter
      if (chartConfig.additionalOptions.filters.currencyFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.currencyFilter.options) &&
          chartConfig.additionalOptions.filters.currencyFilter.options.length > 0) {
        initialFilters['currencyFilter'] = chartConfig.additionalOptions.filters.currencyFilter.options[0];
      }
      
      // Set display mode filter
      if (chartConfig.additionalOptions.filters.displayModeFilter &&
          Array.isArray(chartConfig.additionalOptions.filters.displayModeFilter.options) &&
          chartConfig.additionalOptions.filters.displayModeFilter.options.length > 0) {
        initialFilters['displayModeFilter'] = chartConfig.additionalOptions.filters.displayModeFilter.options[0];
      }
    }
    
    setInternalFilterValues(initialFilters);
  }, [chartConfig.id, externalFilterValues]);

  // Handle filter change
  const handleFilterChange = (filterType: string, value: string) => {
    console.log(`Filter changed: ${filterType} = ${value}`);
    
    // If external handler is provided, use it
    if (onFilterChange) {
      onFilterChange(filterType, value);
    } else {
      // Otherwise update internal state
      setInternalFilterValues(prev => ({
        ...prev,
        [filterType]: value
      }));
      setIsFilterChanged(true);
    }
  };

  // Sample data to use when API fails
  const getSampleData = (chartType: string, groupByField?: string) => {
    // Basic sample data for bar charts
    if (chartType.includes('bar')) {
      if (chartType.includes('stacked') && groupByField) {
        // Sample data for stacked bar charts
        return [
          { platform: 'Raydium', segment: 'DEX', protocol_revenue: 1250000 },
          { platform: 'Raydium', segment: 'Lending', protocol_revenue: 350000 },
          { platform: 'Raydium', segment: 'NFT', protocol_revenue: 75000 },
          { platform: 'Orca', segment: 'DEX', protocol_revenue: 980000 },
          { platform: 'Orca', segment: 'Lending', protocol_revenue: 120000 },
          { platform: 'Orca', segment: 'Liquid Staking', protocol_revenue: 420000 },
          { platform: 'Drift', segment: 'DEX', protocol_revenue: 750000 },
          { platform: 'Drift', segment: 'Perpetuals', protocol_revenue: 890000 },
          { platform: 'Marinade', segment: 'Liquid Staking', protocol_revenue: 1100000 },
          { platform: 'Marinade', segment: 'Lending', protocol_revenue: 120000 }
        ];
      }
      
      // Regular bar chart
      return [
        { platform: 'Raydium', protocol_revenue: 1750000, volume: 12500000, users: 45000 },
        { platform: 'Orca', protocol_revenue: 1380000, volume: 9800000, users: 32000 },
        { platform: 'Drift', protocol_revenue: 1640000, volume: 11200000, users: 28000 },
        { platform: 'Marinade', protocol_revenue: 1220000, volume: 5400000, users: 56000 },
        { platform: 'Jupiter', protocol_revenue: 2100000, volume: 18600000, users: 78000 },
        { platform: 'Solend', protocol_revenue: 840000, volume: 4200000, users: 22000 }
      ];
    }
    
    // Time series data (previously for line charts, now as a fallback)
    if (chartType === 'line' || chartType.includes('time')) {
      return [
        { date: '2023-01-01', protocol_revenue: 980000, cumulative_revenue: 980000 },
        { date: '2023-02-01', protocol_revenue: 1250000, cumulative_revenue: 2230000 },
        { date: '2023-03-01', protocol_revenue: 1420000, cumulative_revenue: 3650000 },
        { date: '2023-04-01', protocol_revenue: 1650000, cumulative_revenue: 5300000 },
        { date: '2023-05-01', protocol_revenue: 2100000, cumulative_revenue: 7400000 },
        { date: '2023-06-01', protocol_revenue: 1850000, cumulative_revenue: 9250000 }
      ];
    }
    
    // Default data
    return [
      { x: 'A', y: 100 },
      { x: 'B', y: 200 },
      { x: 'C', y: 150 },
      { x: 'D', y: 300 },
      { x: 'E', y: 250 }
    ];
  };

  // Fetch data from API when component mounts or filters change
  useEffect(() => {
    // Create a stringified version of the data mapping for dependency comparison
    const dataMappingKey = JSON.stringify({
      xAxis: chartConfig.dataMapping.xAxis,
      yAxis: chartConfig.dataMapping.yAxis,
      groupBy: chartConfig.dataMapping.groupBy
    });
    
    // Create an AbortController to cancel fetch requests when component unmounts
    const controller = new AbortController();
    const signal = controller.signal;
    
    const fetchData = async () => {
      setError(null);
      
      // Variable to hold our parsed data
      let parsedData: any[] = [];
      
      try {
        // Skip API call if using the same endpoint with the same mapping and no filter changes
        const cacheKey = `${chartConfig.apiEndpoint}-${dataMappingKey}-${JSON.stringify(filterValues)}`;
        const cachedData = !isFilterChanged ? sessionStorage.getItem(cacheKey) : null;
        
        if (cachedData) {
          console.log('Using cached data for', chartConfig.title);
          parsedData = JSON.parse(cachedData);
        } else {
          // Create URL with API key if provided
          let apiUrl;
          try {
            apiUrl = new URL(chartConfig.apiEndpoint);
            // Add API key to URL for both GET and POST requests
            if (chartConfig.apiKey) {
              apiUrl.searchParams.append('api_key', chartConfig.apiKey);
            }
          } catch (error) {
            throw new Error(`Invalid URL: ${chartConfig.apiEndpoint}`);
          }
          
          // Build parameters object for POST request based on filters
          const parameters: Record<string, any> = {};
          const filterConfig = chartConfig.additionalOptions?.filters;
          const hasFilters = filterConfig !== undefined;
          
          if (hasFilters) {
            // Add time filter parameter
            if (filterConfig.timeFilter && filterValues['timeFilter']) {
              parameters[filterConfig.timeFilter.paramName] = filterValues['timeFilter'];
              console.log(`Setting time filter: ${filterConfig.timeFilter.paramName}=${filterValues['timeFilter']}`);
            } else if (filterConfig.timeFilter && 
                     Array.isArray(filterConfig.timeFilter.options) && 
                     filterConfig.timeFilter.options.length > 0) {
              parameters[filterConfig.timeFilter.paramName] = filterConfig.timeFilter.options[0];
              console.log(`Setting default time filter: ${filterConfig.timeFilter.paramName}=${filterConfig.timeFilter.options[0]}`);
            }
            
            // Add currency filter parameter
            if (filterConfig.currencyFilter && filterValues['currencyFilter']) {
              parameters[filterConfig.currencyFilter.paramName] = filterValues['currencyFilter'];
              console.log(`Setting currency filter: ${filterConfig.currencyFilter.paramName}=${filterValues['currencyFilter']}`);
            } else if (filterConfig.currencyFilter && 
                     Array.isArray(filterConfig.currencyFilter.options) && 
                     filterConfig.currencyFilter.options.length > 0) {
              parameters[filterConfig.currencyFilter.paramName] = filterConfig.currencyFilter.options[0];
              console.log(`Setting default currency filter: ${filterConfig.currencyFilter.paramName}=${filterConfig.currencyFilter.options[0]}`);
            }
            
            // Add display mode filter parameter
            if (filterConfig.displayModeFilter && filterValues['displayModeFilter']) {
              parameters[filterConfig.displayModeFilter.paramName] = filterValues['displayModeFilter'];
              console.log(`Setting display mode filter: ${filterConfig.displayModeFilter.paramName}=${filterValues['displayModeFilter']}`);
            } else if (filterConfig.displayModeFilter && 
                     Array.isArray(filterConfig.displayModeFilter.options) && 
                     filterConfig.displayModeFilter.options.length > 0) {
              parameters[filterConfig.displayModeFilter.paramName] = filterConfig.displayModeFilter.options[0];
              console.log(`Setting default display mode filter: ${filterConfig.displayModeFilter.paramName}=${filterConfig.displayModeFilter.options[0]}`);
            }
          }
          
          const hasParameters = Object.keys(parameters).length > 0;
          
          // Set up fetch options
          const options: RequestInit = {
            method: hasParameters ? 'POST' : 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store', // Use no-store to ensure we always get fresh data
            signal, // Add abort signal
            // Add a longer timeout for slow connections
            ...{ timeout: 15000 }
          };
          
          // Add body with parameters for POST request
          if (hasParameters) {
            // Format exactly as in the cURL example: {"parameters":{"Date Part":"W"}}
            options.body = JSON.stringify({ parameters });
            console.log(`Fetching data with request body:`, options.body);
          }
          
          console.log(`Fetching data from: ${apiUrl.toString()} with method: ${options.method}`);
          
          // Fetch data from API with timeout and proper error handling
          const response = await fetch(apiUrl.toString(), options);
          
          console.log(`API response status: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
          }
          
          const result = await response.json();
          
          console.log(`API response structure:`, Object.keys(result));
          
          // Handle different API response formats
          
          // Format 1: Standard Redash format with query_result.data.rows
          if (result?.query_result?.data?.rows) {
            parsedData = result.query_result.data.rows;
            console.log(`Found ${parsedData.length} rows in Redash format`);
          } 
          // Format 2: Direct array response
          else if (Array.isArray(result)) {
            parsedData = result;
            console.log(`Found ${parsedData.length} rows in direct array format`);
          } 
          // Format 3: Data property containing array
          else if (result?.data && Array.isArray(result.data)) {
            parsedData = result.data;
            console.log(`Found ${parsedData.length} rows in data array format`);
          }
          // Format 4: Rows property containing array
          else if (result?.rows && Array.isArray(result.rows)) {
            parsedData = result.rows;
            console.log(`Found ${parsedData.length} rows in rows array format`);
          }
          // Format 5: Results property containing array
          else if (result?.results && Array.isArray(result.results)) {
            parsedData = result.results;
            console.log(`Found ${parsedData.length} rows in results array format`);
          }
          // Format 6: Check for error property
          else if (result?.error) {
            throw new Error(`API returned an error: ${result.error}`);
          }
          else {
            console.error('Unrecognized API response structure:', result);
            throw new Error('API response does not have a recognized structure');
          }
          
          // Cache the result to prevent unnecessary fetches
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(parsedData));
          } catch (e) {
            console.warn('Failed to cache data:', e);
          }
          
          // Reset filter changed flag
          setIsFilterChanged(false);
        }
        
        // Process the data if we have any (either from API or fallback)
        if (parsedData.length > 0 && !signal.aborted) {
          // Log the data for debugging purposes
          console.log('Chart data successfully loaded:', parsedData.slice(0, 2));
          
          // Validate that we can access the required data fields
          try {
            const { xAxis, yAxis, groupBy } = chartConfig.dataMapping;
            const sampleItem = parsedData[0];

            // Normalize arrays and strings for processing
            const xAxisFields = Array.isArray(xAxis) ? xAxis : [xAxis];
            let yAxisFields: string[] = [];
            
            // Extract field names from yAxis which could be strings or YAxisConfig objects
            if (Array.isArray(yAxis)) {
              yAxisFields = yAxis.map(field => getFieldFromYAxisConfig(field));
            } else {
              yAxisFields = [getFieldFromYAxisConfig(yAxis)];
            }
            
            // Check and normalize fields if needed
            let needsNormalization = false;
            
            // Check if the required fields exist
            const fieldExists = (item: any, field: string) => {
              return !!findMatchingField(item, field);
            };
            
            // Check x-axis fields
            for (const field of xAxisFields) {
              if (!fieldExists(sampleItem, field)) {
                throw new Error(`X-axis field "${field}" not found in data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              }
              if (findMatchingField(sampleItem, field) !== field) {
                needsNormalization = true;
              }
            }
            
            // Check y-axis fields
            for (const field of yAxisFields) {
              if (!fieldExists(sampleItem, field)) {
                throw new Error(`Y-axis field "${field}" not found in data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              }
              if (findMatchingField(sampleItem, field) !== field) {
                needsNormalization = true;
              }
            }
            
            // Check for group by field if this is a stacked chart
            if (groupBy && (chartConfig.chartType.includes('stacked') || chartConfig.isStacked)) {
              if (!fieldExists(sampleItem, groupBy)) {
                throw new Error(`Group By field "${groupBy}" not found in data. Available fields: ${Object.keys(sampleItem).join(', ')}`);
              }
              if (findMatchingField(sampleItem, groupBy) !== groupBy) {
                needsNormalization = true;
              }
            }
            
            // Normalize the data if needed
            if (needsNormalization) {
              parsedData = parsedData.map(item => {
                const normalizedItem = { ...item };
                
                // Normalize x-axis fields
                for (const field of xAxisFields) {
                  const matchingField = findMatchingField(item, field);
                  if (matchingField && matchingField !== field) {
                    normalizedItem[field] = item[matchingField];
                  }
                }
                
                // Normalize y-axis fields
                for (const field of yAxisFields) {
                  const matchingField = findMatchingField(item, field);
                  if (matchingField && matchingField !== field) {
                    normalizedItem[field] = item[matchingField];
                  }
                }
                
                // Normalize group by field if needed
                if (groupBy && (chartConfig.chartType.includes('stacked') || chartConfig.isStacked)) {
                  const matchingGroupField = findMatchingField(item, groupBy);
                  if (matchingGroupField && matchingGroupField !== groupBy) {
                    normalizedItem[groupBy] = item[matchingGroupField];
                  }
                }
                
                return normalizedItem;
              });
            }
            
            // Call onDataLoaded callback if provided and component is still mounted
            if (onDataLoaded && !signal.aborted) {
              onDataLoaded(parsedData);
            }
            
            // Set data only if component is still mounted
            if (!signal.aborted) {
              setData(parsedData);
            }
          } catch (error) {
            if (!signal.aborted) {
              console.error('Error processing data:', error);
              setError(`Error processing data: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      } catch (error) {
        // Only set error if the request wasn't cancelled and component is still mounted
        if (!signal.aborted) {
          console.error('Error fetching chart data:', error);
          
          // More detailed error messages based on error type
          let errorMessage: string;
          
          if (error instanceof Error) {
            // Network errors
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
              errorMessage = `Network error: Unable to reach the API. Check if the endpoint is accessible.`;
            }
            // CORS issues
            else if (error.message.includes('CORS')) {
              errorMessage = `CORS error: The API doesn't allow requests from this origin.`;
            } 
            // API validation errors (like 404, 500, etc.)
            else if (error.message.includes('API request failed with status')) {
              errorMessage = error.message;
            }
            // Default error message
            else {
              errorMessage = error.message;
            }
          } else {
            errorMessage = String(error);
          }
          
          // Use sample data as fallback
          parsedData = getSampleData(
            chartConfig.chartType, 
            chartConfig.dataMapping.groupBy
          );
          
          // Show a warning message but continue with fallback data
          setError(`Using fallback data: ${errorMessage}`);
          console.log('Using fallback data:', parsedData);
          
          // Set the data with the fallback
          if (!signal.aborted) {
            setData(parsedData);
          }
        }
      }
    };
    
    // Only fetch if we have a valid endpoint
    if (chartConfig.apiEndpoint) {
      fetchData();
    } else {
      setError("No API endpoint provided");
    }
    
    // Cleanup function to cancel pending requests when component unmounts
    return () => {
      controller.abort();
    };
  }, [chartConfig.apiEndpoint, chartConfig.apiKey, chartConfig.title, JSON.stringify(chartConfig.dataMapping), filterValues, isFilterChanged]);

  // Memoize the chart rendering to prevent unnecessary re-renders
  const renderChart = React.useCallback(() => {
    console.log("Rendering chart with config:", {
      chartType: chartConfig.chartType,
      isStacked: chartConfig.isStacked,
      title: chartConfig.title,
      xAxis: chartConfig.dataMapping.xAxis,
      yAxis: chartConfig.dataMapping.yAxis,
      groupBy: chartConfig.dataMapping.groupBy
    });
    
    // Get the unit from the chart config for use with all chart types
    const yAxisUnit = getYAxisUnit(chartConfig.dataMapping.yAxis);
    
    switch (chartConfig.chartType) {
      case 'bar':
        // Check if we should use MultiSeriesLineBarChart (multiple Y fields with mixed line/bar types)
        // OR if we have a single field of type 'line'
        if ((Array.isArray(chartConfig.dataMapping.yAxis) && 
            chartConfig.dataMapping.yAxis.length > 0 && 
            (chartConfig.dataMapping.yAxis.some(field => 
              typeof field !== 'string' && field.type === 'line') ||
             // Single field case where the field type is 'line'
             (chartConfig.dataMapping.yAxis.length === 1 && 
              typeof chartConfig.dataMapping.yAxis[0] !== 'string' && 
              chartConfig.dataMapping.yAxis[0].type === 'line')))) {
          
          console.log("Using MultiSeriesLineBarChart for mixed bar/line series or single line type");
          return <MultiSeriesLineBarChart 
            chartConfig={{
              ...chartConfig,
              onFilterChange: (newFilters) => {
                // Apply the filter changes
                Object.entries(newFilters).forEach(([key, value]) => {
                  handleFilterChange(key, value);
                });
              }
            }} 
            data={data} 
            isExpanded={isExpanded} 
            onCloseExpanded={onCloseExpanded}
            colorMap={legendColorMap}
            filterValues={filterValues}
            yAxisUnit={yAxisUnit}
          />;
        }
        
        // Use SimpleBarChart for simple bar charts (non-stacked)
        if (!chartConfig.isStacked) {
          return <SimpleBarChart 
            chartConfig={{
              ...chartConfig,
              onFilterChange: (newFilters) => {
                // Apply the filter changes
                Object.entries(newFilters).forEach(([key, value]) => {
                  handleFilterChange(key, value);
                });
              }
            }} 
            data={data} 
            isExpanded={isExpanded} 
            onCloseExpanded={onCloseExpanded}
            colorMap={legendColorMap}
            filterValues={filterValues}
            yAxisUnit={yAxisUnit}
          />;
        }
        
        // Use StackedBarChart for stacked charts with groupBy field or multiple Y fields
        if (chartConfig.isStacked && (chartConfig.dataMapping.groupBy || 
            (Array.isArray(chartConfig.dataMapping.yAxis) && chartConfig.dataMapping.yAxis.length > 1))) {
          console.log("Using StackedBarChart for stacked mode with multiple Y fields or groupBy");
          return <StackedBarChart 
            chartConfig={{
              ...chartConfig,
              onFilterChange: (newFilters) => {
                // Apply the filter changes
                Object.entries(newFilters).forEach(([key, value]) => {
                  handleFilterChange(key, value);
                });
              }
            }} 
            data={data} 
            isExpanded={isExpanded} 
            onCloseExpanded={onCloseExpanded}
            colorMap={legendColorMap}
            filterValues={filterValues}
            yAxisUnit={yAxisUnit}
          />;
        }
        
        // Fall back to SimpleBarChart for other bar chart cases
        return <SimpleBarChart 
          chartConfig={{
            ...chartConfig,
            onFilterChange: (newFilters) => {
              // Apply the filter changes
              Object.entries(newFilters).forEach(([key, value]) => {
                handleFilterChange(key, value);
              });
            }
          }} 
          data={data} 
          isExpanded={isExpanded} 
          onCloseExpanded={onCloseExpanded}
          colorMap={legendColorMap}
          filterValues={filterValues}
          yAxisUnit={yAxisUnit}
        />;

      case 'stacked-bar':
        // Use StackedBarChart for stacked bar charts with groupBy or multiple Y fields
        if (chartConfig.dataMapping.groupBy || 
            (Array.isArray(chartConfig.dataMapping.yAxis) && chartConfig.dataMapping.yAxis.length > 1)) {
          console.log("Using StackedBarChart for stacked-bar type with groupBy or multiple Y fields");
          return <StackedBarChart 
            chartConfig={{
              ...chartConfig,
              isStacked: true, // Ensure it's marked as stacked
              onFilterChange: (newFilters) => {
                // Apply the filter changes
                Object.entries(newFilters).forEach(([key, value]) => {
                  handleFilterChange(key, value);
                });
              }
            }} 
            data={data} 
            isExpanded={isExpanded} 
            onCloseExpanded={onCloseExpanded}
            colorMap={legendColorMap}
            filterValues={filterValues}
            yAxisUnit={yAxisUnit}
          />;
        }
        
      case 'dual-axis': // Handle dual-axis with the enhanced BarChart
        return <DualAxisChart 
          chartConfig={{
            ...chartConfig,
            onFilterChange: (newFilters) => {
              // Apply the filter changes
              Object.entries(newFilters).forEach(([key, value]) => {
                handleFilterChange(key, value);
              });
            }
          }} 
          data={data} 
          isExpanded={isExpanded} 
          onCloseExpanded={onCloseExpanded}
          colorMap={legendColorMap}
          filterValues={filterValues}
          yAxisUnit={yAxisUnit}
        />;
        
      case 'pie':
        return <PieChart 
          chartConfig={{
            ...chartConfig,
            onFilterChange: (newFilters) => {
              // Apply the filter changes
              Object.entries(newFilters).forEach(([key, value]) => {
                handleFilterChange(key, value);
              });
            }
          }} 
          data={data} 
          isExpanded={isExpanded} 
          onCloseExpanded={onCloseExpanded}
          colorMap={legendColorMap}
          filterValues={filterValues}
          yAxisUnit={yAxisUnit}
        />;
        
      /* Temporarily commented out until AreaChart is implemented
      case 'area':
      case 'stacked-area':
        return <AreaChart chartConfig={chartConfig} data={data} />;
      */
        
      // For other chart types, show a placeholder message
      default:
        return (
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">{chartConfig.title}</h3>
              {chartConfig.subtitle && <p className="text-sm text-gray-500">{chartConfig.subtitle}</p>}
            </div>
            
            <div className="bg-gray-50 p-4 rounded border border-gray-200 h-64 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-indigo-600 mb-2">Chart Preview</p>
                <p className="text-sm text-gray-500 mb-4">Type: {chartConfig.chartType}</p>
                <p className="text-sm text-gray-500 mb-4">
                  This chart type is not yet implemented. Please select bar or stacked-bar chart.
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <div className="bg-white p-2 rounded border">
                    X-Axis: {typeof chartConfig.dataMapping.xAxis === 'string' ? chartConfig.dataMapping.xAxis : Array.isArray(chartConfig.dataMapping.xAxis) ? chartConfig.dataMapping.xAxis.join(', ') : 'Complex type'}
                  </div>
                  <div className="bg-white p-2 rounded border">
                    Y-Axis: {
                      typeof chartConfig.dataMapping.yAxis === 'string' ? chartConfig.dataMapping.yAxis : 
                      Array.isArray(chartConfig.dataMapping.yAxis) ? 
                        chartConfig.dataMapping.yAxis.map(f => getFieldFromYAxisConfig(f)).join(', ') : 
                        'Complex type'
                    }
                  </div>
                  {chartConfig.dataMapping.groupBy && (
                    <div className="bg-white p-2 rounded border">
                      Group By: {chartConfig.dataMapping.groupBy}
                    </div>
                  )}
                </div>
                <div className="mt-4 bg-white p-2 rounded border text-xs text-left">
                  <p className="font-medium mb-1">Sample Data ({Math.min(3, data.length)} of {data.length} rows):</p>
                  <pre className="overflow-auto max-h-16">
                    {JSON.stringify(data.slice(0, 3), null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        );
    }
  }, [chartConfig, data, isExpanded, onCloseExpanded, legendColorMap, filterValues]);

  // Implement logic to extract the unit from yAxis when necessary
  const getYAxisUnit = (yAxis: string | YAxisConfig | (string | YAxisConfig)[]): string | undefined => {
    // Check if we're using a dataMapping.yAxisUnit field (single field mode)
    if (chartConfig.dataMapping.yAxisUnit) {
      return chartConfig.dataMapping.yAxisUnit;
    }
    
    // Otherwise try to get unit from YAxisConfig objects if available
    if (Array.isArray(yAxis) && yAxis.length > 0 && typeof yAxis[0] !== 'string') {
      return (yAxis[0] as YAxisConfig).unit;
    }
    
    // Handle single YAxisConfig
    if (typeof yAxis !== 'string' && !Array.isArray(yAxis)) {
      return yAxis.unit;
    }
    
    // No unit specified
    return undefined;
  };

  if (error) {
    return (
      <div className= "p-4 rounded-md">
        <div className="flex">
          
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800">Error Loading Chart</h3>
            <div className="mt-2 text-sm text-gray-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className=" p-4 rounded-md">
        <p className="text-gray-800">No data available for this chart. API returned empty dataset.</p>
      </div>
    );
  }

  // Render expanded modal view if isExpanded is true
  if (isExpanded) {
    return (
      <Modal 
        isOpen={isExpanded} 
        onClose={onCloseExpanded || (() => {})} 
        title={chartConfig.title}
        subtitle={chartConfig.subtitle}
        isLoading={isLoading}
      >
        <div className="h-[70vh] w-full overflow-hidden">
          {/* Add filter controls in modal */}
          {chartConfig.additionalOptions?.filters && (
            <div className="flex flex-wrap gap-3 items-center mb-4 px-2">
              {/* Time Filter */}
              {chartConfig.additionalOptions.filters.timeFilter && (
                <TimeFilterSelector
                  value={filterValues['timeFilter'] || chartConfig.additionalOptions.filters.timeFilter.options[0]}
                  onChange={(value) => handleFilterChange('timeFilter', value)}
                  options={chartConfig.additionalOptions.filters.timeFilter.options.map((value: string) => ({ 
                    value, 
                    label: value 
                  }))}
                />
              )}
              
              {/* Currency Filter */}
              {chartConfig.additionalOptions.filters.currencyFilter && (
                <CurrencyFilter
                  currency={filterValues['currencyFilter'] || chartConfig.additionalOptions.filters.currencyFilter.options[0]}
                  options={chartConfig.additionalOptions.filters.currencyFilter.options}
                  onChange={(value) => handleFilterChange('currencyFilter', value)}
                />
              )}
              
              {/* Display Mode Filter */}
              {chartConfig.additionalOptions.filters.displayModeFilter && (
                <DisplayModeFilter
                  mode={filterValues['displayModeFilter'] as DisplayMode || chartConfig.additionalOptions.filters.displayModeFilter.options[0] as DisplayMode}
                  onChange={(value) => handleFilterChange('displayModeFilter', value)}
                />
              )}
            </div>
          )}
          
          {/* Pass consistent color mappings in props to BarChart */}
          {renderChart()}
        </div>
      </Modal>
    );
  }

  // Render the regular chart
  return renderChart();
};

export default ChartRenderer; 