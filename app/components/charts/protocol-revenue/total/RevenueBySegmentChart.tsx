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
import LegendItem from '../../../shared/LegendItem';
import { 
  TimeFilter, 
  fetchRevenueBySegmentData, 
  formatCurrency, 
  formatDate, 
  formatAxisDate,
  getSegmentColor, 
  segmentColors, 
  segmentKeys,
  RevenueBySegmentDataPoint
} from '../../../../api/protocol-revenue/total/revenueBySegmentData';
import { grid, axisLines, tickLabels } from '../../../../utils/chartColors';
import DisplayModeFilter, { DisplayMode } from '../../../shared/filters/DisplayModeFilter';

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );

interface StackedDataPoint {
  date: string;
  [key: string]: string | number;
}

interface RevenueBySegmentChartProps {
  timeFilter?: TimeFilter;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (val: TimeFilter) => void;
  segmentsChanged?: (segments: Array<{segment: string, color: string, revenue: number}>) => void;
  displayMode?: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
}

const RevenueBySegmentChart: React.FC<RevenueBySegmentChartProps> = ({ 
  timeFilter = 'M',
  isModalOpen = false, 
  onModalClose = () => {},
  onTimeFilterChange,
  segmentsChanged,
  displayMode: externalDisplayMode,
  onDisplayModeChange,
}) => {
  const [data, setData] = useState<StackedDataPoint[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [filteredData, setFilteredData] = useState<StackedDataPoint[]>([]);
  const [internalDisplayMode, setInternalDisplayMode] = useState<DisplayMode>('absolute');
  const [modalDisplayMode, setModalDisplayMode] = useState<DisplayMode>('absolute');
  
  // Use external or internal display mode, or modal display mode when in modal
  const displayMode = isModalOpen 
    ? modalDisplayMode 
    : (externalDisplayMode || internalDisplayMode);
  
  // Handle display mode change
  const handleDisplayModeChange = (mode: DisplayMode) => {
    if (isModalOpen) {
      // In modal, use the modal-specific state
      setModalDisplayMode(mode);
      console.log(`Modal display mode changed to: ${mode}`);
    } else if (onDisplayModeChange) {
      // If parent is controlling display mode
      onDisplayModeChange(mode);
      console.log(`External display mode changed to: ${mode}`);
    } else {
      // Otherwise use internal state
      setInternalDisplayMode(mode);
      console.log(`Internal display mode changed to: ${mode}`);
    }
  };
  
  // Initialize modal display mode when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setModalDisplayMode(externalDisplayMode || internalDisplayMode);
    }
  }, [isModalOpen, externalDisplayMode, internalDisplayMode]);
  
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: {} as any, 
    segments: [] as string[],
    left: 0, 
    top: 0 
  });
  
  const chartRef = useRef<HTMLDivElement | null>(null);
  
  // Process data for stacked bar chart
  const processData = (apiData: RevenueBySegmentDataPoint[]) => {
    if (!apiData.length) {
      console.warn("No API data to process");
      return { data: [], keys: [] };
    }
    
    console.log("Sample data from API:", apiData.slice(0, 2));
    
    // Group data by date
    const dateGroups = new Map<string, Record<string, number>>();
    const segmentSet = new Set<string>();
    
    // Log all segments for debugging
    console.log("Segments from API:", [...new Set(apiData.map(item => item.segment))]);
    
    // First pass: collect all data points by date
    apiData.forEach(item => {
      const { block_date: date, segment, protocol_revenue: revenue } = item;
      if (!date || !segment || revenue === undefined) {
        console.warn("Skipping invalid data point:", item);
        return;
      }
      
      segmentSet.add(segment);
      if (!dateGroups.has(date)) dateGroups.set(date, {});
      const dateData = dateGroups.get(date)!;
      dateData[segment] = (dateData[segment] || 0) + revenue;
    });
    
    if (dateGroups.size === 0) {
      console.warn("No valid data points after processing");
      return { data: [], keys: [] };
    }
    
    console.log(`Grouped data into ${dateGroups.size} dates with ${segmentSet.size} segments`);
    
    // Calculate segment totals for sorting
    const segmentTotals: Record<string, number> = {};
    Array.from(segmentSet).forEach(segment => {
      segmentTotals[segment] = 0;
      for (const [, dateData] of dateGroups.entries()) {
        segmentTotals[segment] += Number(dateData[segment] || 0);
      }
    });
    
    // Sort segments by total revenue
    const sortedSegments = Object.entries(segmentTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([segment]) => segment);
    
    // Log sorted segments and their colors
    console.log("Sorted segments:", sortedSegments);
    sortedSegments.forEach(segment => {
      const color = segmentColors[segment] || getSegmentColor(segment);
      console.log(`Segment ${segment} color: ${color}`);
    });
    
    // Create stacked data
    const stackedData = Array.from(dateGroups.entries())
      .sort(([a], [b]) => {
        // Sort by date
        if (timeFilter === 'Q') {
          // Handle quarterly data (Q1 2024, etc.)
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
          // Handle yearly data (2023, 2024, etc.)
          return parseInt(a) - parseInt(b);
        }
        
        // Default: compare as dates
        return new Date(a).getTime() - new Date(b).getTime();
      })
      .map(([date, values]) => {
        const result: StackedDataPoint = { date };
        
        // Add all segments
        sortedSegments.forEach(segment => {
          result[segment] = values[segment] || 0;
        });
        
        return result;
      });
    
    return { data: stackedData, keys: sortedSegments };
  };
  
  // Notify parent of segment changes if callback provided
  useEffect(() => {
    if (segmentsChanged && keys.length > 0 && data.length > 0) {
      // Calculate segment totals for callback
      const segmentTotals: Record<string, number> = {};
      keys.forEach(segment => {
        segmentTotals[segment] = 0;
        data.forEach(d => {
          segmentTotals[segment] += Number(d[segment] || 0);
        });
      });
      
      // Prepare and send segments data to parent
      const segmentInfo = keys.map(segment => ({
        segment,
        color: segmentColors[segment] || getSegmentColor(segment),
        revenue: segmentTotals[segment] || 0
      }));
      
      // Add a console log to debug
      console.log("Sending segment data to parent:", segmentInfo);
      
      segmentsChanged(segmentInfo);
    }
  }, [keys, data, segmentsChanged]);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiData = await fetchRevenueBySegmentData(timeFilter);
      console.log(`Fetched ${apiData.length} data points for timeFilter: ${timeFilter}`);
      
      if (!apiData || apiData.length === 0) {
        console.error(`No data returned for timeFilter: ${timeFilter}`);
        setError(`No data available for ${timeFilter === 'Q' ? 'Quarterly' : timeFilter === 'Y' ? 'Yearly' : timeFilter} view`);
        setData([]);
        setKeys([]);
        setFilteredData([]);
      } else {
        // Modified to remove the segmentsChanged call from processData
        const processedResult = processData(apiData);
        console.log(`Processed data has ${processedResult.data.length} points and ${processedResult.keys.length} segments`);
        
        // Log the first few data points for debugging
        if (processedResult.data.length > 0) {
          console.log("First data point:", processedResult.data[0]);
        }
        
        // Log the colors being assigned to each segment
        console.log("Segment colors mapping:");
        processedResult.keys.forEach(segment => {
          const color = segmentColors[segment] || getSegmentColor(segment);
          console.log(`${segment}: ${color}`);
        });
        
        setData(processedResult.data);
        setFilteredData(processedResult.data);
        setKeys(processedResult.keys);
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
  }, [timeFilter]); // Removed segmentsChanged from dependencies
  
  useEffect(() => {
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
          segments: keys,
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
      const newItem: StackedDataPoint = { date: item.date };
      
      // Calculate total for this date
      const total = keys.reduce((sum, segment) => sum + (Number(item[segment]) || 0), 0);
      
      // Convert each segment value to percentage
      if (total > 0) {
        // First pass to calculate percentages
        const percentages: Record<string, number> = {};
        let sumPercent = 0;
        
        keys.forEach(segment => {
          const value = Number(item[segment]) || 0;
          const percent = (value / total) * 100;
          percentages[segment] = percent;
          sumPercent += percent;
        });
        
        // Scale factor to ensure total is exactly 100%
        const scaleFactor = sumPercent > 0 ? 100 / sumPercent : 1;
        
        // Apply percentages with scaling if needed
        keys.forEach(segment => {
          newItem[segment] = percentages[segment] * scaleFactor;
        });
      } else {
        // If no data, set all to 0
        keys.forEach(segment => {
          newItem[segment] = 0;
        });
      }
      
      return newItem;
    });
  }, [displayMode, filteredData, keys]);

  // Format value based on display mode
  const formatValue = (value: number): string => {
    if (displayMode === 'absolute') {
      // Format currency without decimal places for whole numbers
      if (value >= 1e9) return `$${(value / 1e9).toFixed(value % 1e9 === 0 ? 0 : 1)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(value % 1e6 === 0 ? 0 : 1)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(value % 1e3 === 0 ? 0 : 1)}K`;
      return `$${Math.round(value)}`;
    } else {
      // Remove decimal places for whole percentages
      return `${Math.round(value)}%`;
    }
  };
  
  // Format date for axis labels
  const formatAxisLabel = (dateString: string) => {
    try {
      return formatAxisDate(dateString, timeFilter);
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error);
      return dateString;
    }
  };
  
  // Format date for tooltip
  const formatTooltipDate = (dateString: string) => {
    try {
      return formatDate(dateString, timeFilter);
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error);
      return dateString;
    }
  };
  
  // Process data for brush component
  const processDataForBrush = (dataPoints: StackedDataPoint[]) => {
    return dataPoints.map(point => ({
      date: point.date as string,
      value: keys.reduce((sum, key) => sum + (Number(point[key]) || 0), 0)
    }));
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
    const activeBrushData = processDataForBrush(data);
    
    // Define consistent margins for chart and brush to ensure alignment
    const chartMargin = { top: 10, right: 15, bottom: 30, left: 45 };
    const brushMargin = { top: 5, right: 15, bottom: 10, left: 45 };
    
    return (
      <div className="h-full w-full relative">
        {/* Only render tooltip here if NOT in modal view to prevent duplicates */}
        {tooltip.visible && tooltip.dataPoint && !isModalOpen && (
          <ChartTooltip
            title={formatTooltipDate(tooltip.dataPoint.date as string)}
            items={
              tooltip.segments
                .filter(segment => Number(tooltip.dataPoint[segment] || 0) > 0)
                .filter((segment, index, self) => self.indexOf(segment) === index)
                .map((segment: string) => {
                  const color = segmentColors[segment] || getSegmentColor(segment);
                  
                  return {
                    color,
                    label: segment,
                    value: formatValue(Number(tooltip.dataPoint[segment] || 0)),
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
              const margin = chartMargin;
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
                    )) * 1.1], // Add 10% padding
                nice: true,
                range: [yMax, 0]
              });
              
              // Color scale for segments
              const colorScale = scaleOrdinal<string, string>({
                domain: keys,
                range: keys.map(segment => segmentColors[segment] || getSegmentColor(segment))
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
                        color={segment => segmentColors[segment] || getSegmentColor(segment)}
                      >
                        {barStacks => {
                          return barStacks.map(barStack => {
                            return barStack.bars.map(bar => {
                              if (bar.height <= 0) return null;
                              
                              // Check if this bar's date matches the tooltip date for highlighting
                              const isHighlighted = tooltip.visible && tooltip.dataPoint?.date === processedData[bar.index].date;
                              
                              return (
                            <rect
                              key={`bar-stack-${barStack.index}-${bar.index}`}
                              x={bar.x}
                              y={bar.y}
                              height={bar.height}
                              width={bar.width}
                                  fill={segmentColors[barStack.key] || getSegmentColor(barStack.key)}
                                  opacity={isHighlighted ? 1 : 0.75}
                              rx={2}
                                />
                              );
                            }).filter(Boolean);
                          });
                        }}
                    </BarStack>
                    
                    <AxisBottom 
                        top={yMax}
                      scale={xScale}
                        tickFormat={formatAxisLabel}
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
            data={activeBrushData}
            activeBrushDomain={brushDomain}
            onBrushChange={handleBrushChange}
            onClearBrush={() => setBrushDomain(null)}
            getDate={d => d.date as string}
            getValue={d => d.value as number}
            lineColor={segmentColors.DeFi}
            margin={brushMargin}
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
          title="Protocol Revenue by Segment"
          subtitle="Stacked view of protocol revenue across segments by time period"
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
                      tooltip.segments
                        .filter(segment => Number(tooltip.dataPoint[segment] || 0) > 0)
                        .filter((segment, index, self) => self.indexOf(segment) === index)
                        .map((segment: string) => {
                          const color = segmentColors[segment] || getSegmentColor(segment);
                          
                          return {
                            color,
                            label: segment,
                            value: formatValue(Number(tooltip.dataPoint[segment] || 0)),
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
            
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[500px] pr-1">
                  <ScrollableLegend
                    
                    items={keys.map(segment => ({
                      id: segment,
                      label: segment,
                      color: segmentColors[segment] || getSegmentColor(segment),
                      
                    }))}
                  />
            </div>
          </div>
        </div>
      </Modal>
      )}
    </>
  );
};

export default RevenueBySegmentChart; 