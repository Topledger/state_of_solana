"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { BarStack } from '@visx/shape';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import Loader from '../../../shared/Loader';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal, { ScrollableLegend } from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import ChartTooltip from '../../../shared/ChartTooltip';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import { TimeFilter, fetchPlatformRevenueData, formatCurrency, getPlatformColor, normalizePlatformName, platformColors } from '../../../../api/protocol-revenue/summary/platformRevenueData';
import { grid, axisLines, tickLabels, colors } from '../../../../utils/chartColors';
import DisplayModeFilter, { DisplayMode } from '../../../shared/filters/DisplayModeFilter';

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface PlatformStackedData {
  date: string;
  [key: string]: string | number;
}

interface PlatformRevenueStackedProps {
  timeFilter?: TimeFilter;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (val: TimeFilter) => void;
  platformsChanged?: (platforms: Array<{platform: string, color: string, revenue: number}>) => void;
  displayMode?: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
}

const PlatformRevenueStacked: React.FC<PlatformRevenueStackedProps> = ({
  timeFilter = 'M',
  isModalOpen = false,
  onModalClose = () => {},
  onTimeFilterChange,
  platformsChanged,
  displayMode: externalDisplayMode,
  onDisplayModeChange,
}) => {
  const [data, setData] = useState<PlatformStackedData[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [filteredData, setFilteredData] = useState<PlatformStackedData[]>([]);
  const [internalDisplayMode, setInternalDisplayMode] = useState<DisplayMode>('absolute');
  
  // Use external or internal display mode
  const displayMode = externalDisplayMode || internalDisplayMode;
  
  // Handle display mode change
  const handleDisplayModeChange = (mode: DisplayMode) => {
    if (onDisplayModeChange) {
      onDisplayModeChange(mode);
    } else {
      setInternalDisplayMode(mode);
    }
  };
  
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: {} as any, 
    platforms: [] as string[],
    left: 0, 
    top: 0 
  });
  
  const chartRef = useRef<HTMLDivElement | null>(null);
  
  const formatDate = (dateString: string) => {
    // Check if this is already a formatted quarterly or yearly string
    if (dateString.startsWith('Q') && dateString.includes(' ')) {
      // For already formatted quarterly strings, extract just the quarter part
      const match = dateString.match(/Q(\d+)\s+(\d{4})/);
      if (match) {
        return `Q${match[1]}`; // Just return "Q1", "Q2", etc.
      }
      return dateString;
    } else if (/^\d{4}$/.test(dateString)) {
      // Year is already compact
      return dateString;
    }

    // Otherwise, parse as date and format
    try {
    const date = new Date(dateString);
      
      // Check for invalid date
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date string: ${dateString}`);
        return dateString; // Return the original string if parsing fails
      }
      
      // Use different formats based on the current time filter
      if (timeFilter === 'Q') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter}`; // Just show quarter, without year
      } else if (timeFilter === 'Y') {
      return date.getFullYear().toString();
      } else if (timeFilter === 'M') {
        // For monthly view, show only month name
        return date.toLocaleDateString('en-US', { month: 'short' });
      } else if (timeFilter === 'W') {
        // For weekly view, show week of month/day
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      
      // Default monthly format with year (fallback)
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error);
      return dateString; // Return the original string if an error occurs
    }
  };

  // Format for tooltip title - should include more details than axis labels
  const formatTooltipDate = (dateString: string) => {
    // Check if this is already a formatted quarterly or yearly string
    if (dateString.startsWith('Q') && dateString.includes(' ')) {
      return dateString; // Keep full "Q1 2024" format for tooltip
    } else if (/^\d{4}$/.test(dateString)) {
      return dateString; // Year is already good for tooltip
    }

    // Otherwise, parse as date and format with appropriate detail
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      if (timeFilter === 'Q') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()}`; // Include year in tooltip
      } else if (timeFilter === 'Y') {
        return date.getFullYear().toString();
      } else if (timeFilter === 'W') {
        // For weekly view, show week of month/day/year
        return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      } else if (timeFilter === 'M') {
        // Always include year in tooltip for better context
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (error) {
    return dateString;
    }
  };

  const processData = (apiData: any[]) => {
    if (!apiData.length) {
      console.warn("No API data to process");
      return { data: [], keys: [] };
    }
    
    console.log("Sample data from API:", apiData.slice(0, 2));
    
    // Group by date and platform - keeping all platforms exactly as they come from API
    const dateGroups = new Map<string, Record<string, number>>();
    const platformSet = new Set<string>();
    
    // Log all original platform names for debugging
    console.log("Original platform names from API:", apiData.map(item => item.platform));
    
    // First pass: collect all data points by original date
    apiData.forEach(item => {
      const { block_date: originalDate, platform, protocol_revenue_usd: revenue } = item;
      if (!originalDate || !platform || revenue === undefined) {
        console.warn("Skipping invalid data point:", item);
        return;
      }
      
      // Process date based on timeFilter for aggregation
      let processedDate = originalDate;
      if (timeFilter === 'Q' || timeFilter === 'Y') {
        try {
          const date = new Date(originalDate);
          
          // Check for invalid date
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date: ${originalDate}, using original string`);
          } else {
            if (timeFilter === 'Q') {
              // Format as "Q1 2024", "Q2 2024", etc.
              const quarter = Math.floor(date.getMonth() / 3) + 1;
              processedDate = `Q${quarter} ${date.getFullYear()}`;
            } else if (timeFilter === 'Y') {
              // Format as just the year "2024"
              processedDate = date.getFullYear().toString();
            }
          }
        } catch (error) {
          console.error(`Error processing date: ${originalDate}`, error);
        }
      }
      
      platformSet.add(platform);
      if (!dateGroups.has(processedDate)) dateGroups.set(processedDate, {});
      const dateData = dateGroups.get(processedDate)!;
      dateData[platform] = (dateData[platform] || 0) + revenue;
    });
    
    if (dateGroups.size === 0) {
      console.warn("No valid data points after processing");
      return { data: [], keys: [] };
    }
    
    console.log(`Grouped data into ${dateGroups.size} dates with ${platformSet.size} platforms`);
    
    // Calculate platform totals for sorting (we'll show all platforms)
    const platformTotals: Record<string, number> = {};
    Array.from(platformSet).forEach(platform => {
      platformTotals[platform] = 0;
      for (const [, dateData] of dateGroups.entries()) {
        platformTotals[platform] += Number(dateData[platform] || 0);
      }
    });
    
    // Sort platforms by total revenue
    const sortedPlatforms = Object.entries(platformTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([platform]) => platform);
    
    // Log sorted platforms and their colors
    console.log("Sorted platforms:", sortedPlatforms);
    sortedPlatforms.forEach(platform => {
      const color = platformColors[platform] || getPlatformColor(platform);
      console.log(`Platform ${platform} color: ${color}`);
    });
    
    // Create stacked data without creating any "Other" category
    const stackedData = Array.from(dateGroups.entries())
      .sort(([a], [b]) => {
        // Sort by date
        if (timeFilter === 'Q') {
          // For quarterly data: Q1 2024, Q2 2024, etc.
          // Extract year and quarter for comparison
          const aMatch = a.match(/Q(\d+)\s+(\d{4})/);
          const bMatch = b.match(/Q(\d+)\s+(\d{4})/);
          
          if (aMatch && bMatch) {
            const [, aQuarter, aYear] = aMatch;
            const [, bQuarter, bYear] = bMatch;
            
            // Compare years first, then quarters
            if (aYear !== bYear) {
              return parseInt(aYear) - parseInt(bYear);
            }
            return parseInt(aQuarter) - parseInt(bQuarter);
          }
        } else if (timeFilter === 'Y') {
          // For yearly data: 2023, 2024, etc.
          // Simple numeric comparison
          return parseInt(a) - parseInt(b);
        }
        
        // Default: compare as dates
        return new Date(a).getTime() - new Date(b).getTime();
      })
      .map(([date, values]) => {
        const result: PlatformStackedData = { date };
        
        // Add all platforms directly
        sortedPlatforms.forEach(platform => {
          result[platform] = values[platform] || 0;
        });
        
        return result;
      });
    
    // Notify parent of platform changes if callback provided
    if (platformsChanged) {
      const platformInfo = sortedPlatforms.map(platform => ({
        platform,
        color: platformColors[platform] || getPlatformColor(platform),
        revenue: platformTotals[platform] || 0
      }));
      platformsChanged(platformInfo);
    }
    
    return { data: stackedData, keys: sortedPlatforms };
  };
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use TimeFilter passed from props
      let apiData = await fetchPlatformRevenueData(timeFilter);
      console.log(`Fetched ${apiData.length} data points for timeFilter: ${timeFilter}`);
      
      // If Q or Y returns no data, fall back to M (monthly)
      if ((timeFilter === 'Q' || timeFilter === 'Y') && (!apiData || apiData.length === 0)) {
        console.log(`No data for ${timeFilter}, falling back to monthly data`);
        apiData = await fetchPlatformRevenueData('M');
        console.log(`Fallback: Fetched ${apiData.length} monthly data points`);
      }
      
      if (!apiData || apiData.length === 0) {
        console.error(`No data returned for timeFilter: ${timeFilter}`);
        setError(`No data available for ${timeFilter === 'Q' ? 'Quarterly' : timeFilter === 'Y' ? 'Yearly' : timeFilter} view`);
        setData([]);
        setKeys([]);
        setFilteredData([]);
      } else {
        const { data: processedData, keys: platformKeys } = processData(apiData);
        console.log(`Processed data has ${processedData.length} points and ${platformKeys.length} platforms`);
        
        // Log the first few data points for debugging
        if (processedData.length > 0) {
          console.log("First data point:", processedData[0]);
        }
        
        // Log the colors being assigned to each platform
        console.log("Platform colors mapping:");
        platformKeys.forEach(platform => {
          const color = platformColors[platform] || getPlatformColor(platform);
          console.log(`${platform}: ${color}`);
        });
        
        setData(processedData);
        setFilteredData(processedData);
        setKeys(platformKeys);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      setData([]);
      setKeys([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, platformsChanged]);
  
  useEffect(() => { 
    // Debug colors array
    console.log("Colors array:", colors);
    console.log("platformColors mapping:", platformColors);
    
    fetchData();
  }, [fetchData]);
  
  // Apply brush filter
  useEffect(() => {
    if (!data.length) return;

    if (!brushDomain) {
        setFilteredData(data);
      return;
    }

    const [start, end] = brushDomain;
    const filtered = data.filter(d => {
      const itemDate = new Date(d.date as string).getTime();
      return itemDate >= start.getTime() && itemDate <= end.getTime();
    });
    
    setFilteredData(filtered.length > 0 ? filtered : data);
  }, [brushDomain, data]);
  
  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      setBrushDomain(null);
      return;
    }

    const { x0, x1 } = domain;
    setBrushDomain([new Date(x0), new Date(x1)]);
  }, []);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Handle mouse move for tooltips with proper positioning
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement | SVGElement>) => {
    // In modal view, chartRef may be null, so we need to find the container differently
    let container: HTMLElement | null = null;
    
    if (isModalOpen) {
      // When in modal, get the chart container by traversing up from the event target
      let element = event.target as HTMLElement;
      while (element && !element.classList.contains('overflow-hidden')) {
        element = element.parentElement as HTMLElement;
      }
      container = element;
    } else {
      // In regular view, use the chartRef
      container = chartRef.current;
    }
    
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Use the same margin as in chart rendering
    const margin = { top: 5, right: 25, bottom: 30, left: 45 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    // Check if mouse is outside chart bounds (only check X for better usability)
    if (mouseX < margin.left || mouseX > rect.width - margin.right) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get bar width and calculate the bar index
    const barStep = innerWidth / filteredData.length;
    let index = Math.floor((mouseX - margin.left) / barStep);
    
    // Clamp index to available data
    if (index < 0) index = 0;
    if (index >= filteredData.length) index = filteredData.length - 1;
    
    // Get data point at this index
    const dataPoint = filteredData[index];
    
    if (dataPoint) {
      // Check if this is a new data point or if tooltip is not yet visible
      const isNewDataPoint = !tooltip.dataPoint?.date || tooltip.dataPoint.date !== dataPoint.date;
      
      if (!tooltip.visible || isNewDataPoint) {
        // Full update when showing new data point
        setTooltip({
          visible: true,
          dataPoint: dataPoint,
          platforms: keys,
          left: mouseX,
          top: mouseY
        });
      } else {
        // Only update position without changing data point
        setTooltip(prev => ({
          ...prev,
          left: mouseX,
          top: mouseY
        }));
      }
    }
  }, [filteredData, keys, tooltip.visible, tooltip.dataPoint?.date, isModalOpen]);
  
  // Process data for percentage view
  const getProcessedData = useCallback(() => {
    if (displayMode === 'absolute') {
      return filteredData;
    }
    
    // For percentage view, convert values to percentages of the total for each date
    return filteredData.map(item => {
      const newItem: PlatformStackedData = { date: item.date };
      
      // Calculate total for this date
      const total = keys.reduce((sum, platform) => sum + (Number(item[platform]) || 0), 0);
      
      // Convert each platform value to percentage
      if (total > 0) {
        // First pass to calculate percentages
        const percentages: Record<string, number> = {};
        let sumPercent = 0;
        
        keys.forEach(platform => {
          const value = Number(item[platform]) || 0;
          const percent = (value / total) * 100;
          percentages[platform] = percent;
          sumPercent += percent;
        });
        
        // Scale factor to ensure total is exactly 100%
        const scaleFactor = sumPercent > 0 ? 100 / sumPercent : 1;
        
        // Apply percentages with scaling if needed
        keys.forEach(platform => {
          newItem[platform] = percentages[platform] * scaleFactor;
        });
      } else {
        // If no data, set all to 0
        keys.forEach(platform => {
          newItem[platform] = 0;
        });
      }
      
      return newItem;
    });
  }, [displayMode, filteredData, keys]);

  // Format value based on display mode
  const formatValue = (value: number): string => {
    if (displayMode === 'absolute') {
      // Modify formatCurrency to remove decimal places for whole numbers
      if (value >= 1e9) return `$${(value / 1e9).toFixed(value % 1e9 === 0 ? 0 : 1)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(value % 1e6 === 0 ? 0 : 1)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(value % 1e3 === 0 ? 0 : 1)}K`;
      return `$${Math.round(value)}`;
    } else {
      // Remove decimal places for whole percentages
      return `${Math.round(value)}%`;
    }
  };
  
  // Render chart content
  const renderChart = () => {
    if (loading) return <div className="flex justify-center items-center h-full w-full"><Loader size="sm" /></div>;
    
    if (error || !filteredData.length) {
      return (
        <div className="flex flex-col justify-center items-center h-full w-full">
          <div className="text-gray-400/80 text-xs mb-2">{error || 'No data available'}</div>
          <ButtonSecondary onClick={fetchData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    const processedData = getProcessedData();
    
    return (
      <div className="h-full w-full relative">
        {/* Only render tooltip here if NOT in modal view to prevent duplicates */}
        {tooltip.visible && tooltip.dataPoint && !isModalOpen && (
          <ChartTooltip
            title={formatTooltipDate(tooltip.dataPoint.date as string)}
            items={
              tooltip.platforms
                .filter(platform => Number(tooltip.dataPoint[platform] || 0) > 0)
                .filter((platform, index, self) => self.indexOf(platform) === index)
                .map((platform: string) => {
                  let color;
                  // Direct match in platformColors
                  if (platformColors[platform]) {
                    color = platformColors[platform];
                    console.log(`Tooltip using platformColors for ${platform}: ${color}`);
                  } 
                  // Case-insensitive match
                  else {
                    const lowerPlatform = platform.toLowerCase();
                    const platformKey = Object.keys(platformColors).find(k => 
                      k.toLowerCase() === lowerPlatform
                    );
                    
                    if (platformKey) {
                      color = platformColors[platformKey];
                      console.log(`Tooltip using platformColors (case-insensitive) for ${platform} via ${platformKey}: ${color}`);
                    } else {
                      color = getPlatformColor(platform);
                      console.log(`Tooltip using getPlatformColor for ${platform}: ${color}`);
                    }
                  }
                  
                  return {
                    color,
                    label: normalizePlatformName(platform),
                    value: formatValue(Number(tooltip.dataPoint[platform] || 0)),
                    shape: 'square' as const
                  };
                })
            }
            top={tooltip.top}
            left={tooltip.left}
          />
        )}
        <div className="h-[85%] w-full overflow-hidden relative" 
          ref={isModalOpen ? null : chartRef} 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              const margin = { top: 5, right: 25, bottom: 30, left: 45 };
              const xMax = width - margin.left - margin.right;
              const yMax = height - margin.top - margin.bottom;
              
              // X scale for dates
              const xScale = scaleBand<string>({
                domain: processedData.map(d => d.date as string),
                padding: 0.2,
                range: [0, xMax]
              });
              
              // Debug axis labels
              console.log("X-axis domain values:", xScale.domain());
              
              // Y scale for values
              const yScale = scaleLinear<number>({
                domain: displayMode === 'percent' 
                  ? [0, 100] // Fixed domain for percentage view
                  : [0, Math.max(...processedData.map(d => 
                      keys.reduce((sum, k) => sum + (Number(d[k]) || 0), 0)
                    ))],
                nice: true,
                range: [yMax, 0]
              });
              
              // Color scale for platforms
              const colorScale = scaleOrdinal<string, string>({
                domain: keys,
                range: keys.map(platform => platformColors[platform] || getPlatformColor(platform))
              });
              
              return (
                <>
                  <svg width={width} height={height}>
                    <Group left={margin.left} top={margin.top}>
                      <GridRows
                        scale={yScale}
                        width={xMax}
                        height={yMax}
                        stroke={grid}
                        strokeOpacity={0.5}
                        strokeDasharray="2,3"
                        numTicks={4}
                      />
                      
                      <BarStack
                        data={processedData}
                        keys={keys}
                        x={d => d.date as string}
                        xScale={xScale}
                        yScale={yScale}
                        color={(key) => {
                          console.log(`Platform in BarStack: ${key}`);
                          // First priority: Use the exact platformColors mapping
                          if (platformColors[key]) {
                            console.log(`Using platformColors for ${key}: ${platformColors[key]}`);
                            return platformColors[key];
                          }
                          
                          // Second priority: Try case-insensitive match in platformColors
                          const lowerKey = key.toLowerCase();
                          const platformKey = Object.keys(platformColors).find(k => 
                            k.toLowerCase() === lowerKey
                          );
                          
                          if (platformKey) {
                            console.log(`Using platformColors (case-insensitive) for ${key} via ${platformKey}: ${platformColors[platformKey]}`);
                            return platformColors[platformKey];
                          }
                          
                          // Last resort: use getPlatformColor function
                          console.log(`Using getPlatformColor for ${key}`);
                          return getPlatformColor(key);
                        }}
                      >
                        {barStacks => {
                          return barStacks.map(barStack => {
                            return barStack.bars.map(bar => {
                              if (bar.height <= 0) return null;
                              
                              return (
                                <rect
                                  key={`bar-stack-${barStack.index}-${bar.index}`}
                                  x={bar.x}
                                  y={bar.y}
                                  height={bar.height}
                                  width={bar.width}
                                  fill={(() => {
                                    const platform = barStack.key;
                                    console.log(`Rendering bar for platform: ${platform}`);
                                    
                                    // Direct match in platformColors
                                    if (platformColors[platform]) {
                                      console.log(`Using platformColors for bar ${platform}: ${platformColors[platform]}`);
                                      return platformColors[platform];
                                    }
                                    
                                    // Case-insensitive match
                                    const lowerPlatform = platform.toLowerCase();
                                    const platformKey = Object.keys(platformColors).find(k => 
                                      k.toLowerCase() === lowerPlatform
                                    );
                                    
                                    if (platformKey) {
                                      console.log(`Using platformColors (case-insensitive) for bar ${platform} via ${platformKey}: ${platformColors[platformKey]}`);
                                      return platformColors[platformKey];
                                    }
                                    
                                    // Fallback to color from BarStack
                                    console.log(`Using bar.color for ${platform}: ${bar.color}`);
                                    return bar.color;
                                  })()}
                                  opacity={tooltip.visible && tooltip.dataPoint?.date === processedData[bar.index].date ? 1 : 0.75}
                                  rx={2}
                                />
                              );
                            }).filter(Boolean);
                          });
                        }}
                      </BarStack>
                      
                      {/* Invisible overlay to capture mouse events across the entire chart area */}
                      <rect
                        x={0}
                        y={0}
                        width={xMax}
                        height={yMax}
                        fill="transparent"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                      />
                      
                      <AxisBottom
                        top={yMax}
                        scale={xScale}
                        tickFormat={formatDate}
                        stroke={axisLines}
                        strokeWidth={0.5}
                        tickStroke="transparent"
                        tickLength={0}
                        hideZero={true}
                        tickLabelProps={() => ({
                          fill: tickLabels,
                          fontSize: 11,
                          fontWeight: 300,
                          letterSpacing: '0.05em',
                          textAnchor: 'middle',
                          dy: '0.5em'
                        })}
                        tickValues={
                          // Use all data points for Q and Y views (typically fewer points)
                          (timeFilter === 'Q' || timeFilter === 'Y') 
                            ? processedData.map(d => d.date as string)
                            // For other views, limit the number of ticks shown
                            : processedData.length > 10 
                              ? processedData.filter((_, i) => 
                                  i % Math.ceil(processedData.length / 10) === 0
                                ).map(d => d.date as string) 
                              : processedData.map(d => d.date as string)
                        }
                      />
                      
                      <AxisLeft
                        scale={yScale}
                        stroke={axisLines}
                        strokeWidth={0.5}
                        tickStroke="transparent"
                        tickLength={0}
                        tickFormat={(value) => formatValue(value as number)}
                        tickLabelProps={() => ({
                          fill: tickLabels,
                          fontSize: 11,
                          fontWeight: 300,
                          letterSpacing: '0.05em',
                          textAnchor: 'end',
                          dx: '-0.6em',
                          dy: '0.25em'
                        })}
                        numTicks={4}
                      />
                    </Group>
                  </svg>
                </>
              );
            }}
          </ParentSize>
        </div>
        
        <div className="h-[15%] w-full mt-1">
          <BrushTimeScale
            data={data}
            activeBrushDomain={brushDomain}
            onBrushChange={handleBrushChange}
            onClearBrush={() => setBrushDomain(null)}
            getDate={d => d.date as string}
            getValue={d => keys.reduce((sum, platform) => sum + (Number(d[platform]) || 0), 0)}
            lineColor={platformColors[keys[0] || ''] || getPlatformColor(keys[0] || '')}
            margin={{ top: 5, right: 25, bottom: 10, left: 45 }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
     
      {renderChart()}
      
      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={onModalClose} 
          title="Protocol Revenue by Platform"
          subtitle="Stacked view of protocol revenue across platforms by time period"
        >
          <div className="flex pl-1 py-0 mb-3">
                <TimeFilterSelector
              value={timeFilter}
              onChange={onTimeFilterChange || (() => {})}
                  options={[
                    { value: 'W', label: 'W' },
                    { value: 'M', label: 'M' },
                    { value: 'Q', label: 'Q' },
                    { value: 'Y', label: 'Y' }
                  ]}
                />
                
              <DisplayModeFilter mode={displayMode} onChange={handleDisplayModeChange} />
                
            </div>
            
            <div className="h-px bg-gray-900 w-full mb-3"></div>
            
            <div className="h-[60vh]">
              <div className="flex h-full">
              <div className="w-[90%] h-full pr-3 border-r border-gray-900 relative">
                {/* Add the tooltip at this level for the modal view */}
                {isModalOpen && tooltip.visible && tooltip.dataPoint && (
                  <ChartTooltip
                    title={formatTooltipDate(tooltip.dataPoint.date as string)}
                    items={
                      tooltip.platforms
                        .filter(platform => Number(tooltip.dataPoint[platform] || 0) > 0)
                        .filter((platform, index, self) => self.indexOf(platform) === index)
                        .map((platform: string) => {
                          let color;
                          if (platformColors[platform]) {
                            color = platformColors[platform];
                          } else {
                            const lowerPlatform = platform.toLowerCase();
                            const platformKey = Object.keys(platformColors).find(k => 
                              k.toLowerCase() === lowerPlatform
                            );
                            
                            if (platformKey) {
                              color = platformColors[platformKey];
                            } else {
                              color = getPlatformColor(platform);
                            }
                          }
                          
                          return {
                            color,
                            label: normalizePlatformName(platform),
                            value: formatValue(Number(tooltip.dataPoint[platform] || 0)),
                            shape: 'square' as const
                          };
                        })
                    }
                    top={tooltip.top}
                    left={tooltip.left}
                    isModal={true}
                  />
                )}
                {renderChart()}
                </div>
                
                <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
                <ScrollableLegend
                  
                  items={keys.map(platform => {
                    // Calculate total revenue for this platform
                    const platformRevenue = filteredData.reduce((sum, d) => 
                      sum + (Number(d[platform]) || 0), 0);
                    
                    // Determine color using the same logic as before
                    let color;
                    if (platformColors[platform]) {
                      color = platformColors[platform];
                    } else {
                      const lowerPlatform = platform.toLowerCase();
                      const platformKey = Object.keys(platformColors).find(k => 
                        k.toLowerCase() === lowerPlatform
                      );
                      
                      if (platformKey) {
                        color = platformColors[platformKey];
                      } else {
                        color = getPlatformColor(platform);
                      }
                    }
                    
                    return {
                      id: platform,
                      label: normalizePlatformName(platform),
                      color: color,
                      
                    };
                  })}
                  maxHeight={600}
                  maxItems={28}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PlatformRevenueStacked; 