"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleBand, scaleOrdinal, scaleTime } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar, BarStack } from '@visx/shape';
import { localPoint } from '@visx/event';
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import ChartTooltip from "@/app/components/shared/ChartTooltip";
import Modal from "@/app/components/shared/Modal";
import TimeFilterSelector from "@/app/components/shared/filters/TimeFilter";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
import LegendItem from "@/app/components/shared/LegendItem";
import DisplayModeFilter, { DisplayMode } from "@/app/components/shared/filters/DisplayModeFilter";

import { 
  fetchRevenueBySegmentData, 
  RevenueBySegmentDataPoint, 
  segmentKeys,
  formatCurrency,
  formatDate,
  TimeFilter
} from "@/app/api/protocol-revenue/total/revenueBySegmentData";
import { TimeFilter as ChartDataTimeFilter } from "@/app/api/protocol-revenue/summary/chartData";

// Define RefreshIcon component
const RefreshIcon = ({ className = "w-4 h-4" }) => {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
      />
    </svg>
  );
};

// Props interface
interface RevenueBySegmentChartProps {
  timeFilter?: TimeFilter;
  displayMode?: DisplayMode;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (filter: TimeFilter) => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

// Chart colors - using a color mapping for different segments
export const segmentColors: Record<string, string> = {
  'DeFi': '#60a5fa', // blue
  'NFT Marketplace': '#a78bfa', // purple
  'Gaming': '#34d399', // green
  'Infrastructure': '#f97316', // orange
  'Wallet': '#fbbf24', // yellow
  'Other': '#94a3b8', // gray
  'default': '#6b7280',
};

// Get color for a segment with fallback to default
const getSegmentColor = (segment: string): string => {
  return segmentColors[segment] || segmentColors.default;
};

// Format the display name for segments
const getSegmentDisplayName = (segment: string): string => {
  return segment;
};

// Process data for stacked bar chart
const processDataForBarStack = (data: RevenueBySegmentDataPoint[]) => {
  // Group data by date
  const groupedByDate = data.reduce<Record<string, any>>((acc, curr) => {
    if (!acc[curr.block_date]) {
      acc[curr.block_date] = { date: curr.block_date };
    }
    
    // Add or update segment revenue
    acc[curr.block_date][curr.segment] = curr.protocol_revenue;
    
    return acc;
  }, {});
  
  // Convert to array
  return Object.values(groupedByDate);
};

// Main chart component
const RevenueBySegmentChart: React.FC<RevenueBySegmentChartProps> = ({ 
  timeFilter = 'W',
  displayMode = 'absolute',
  isModalOpen = false, 
  onModalClose = () => {},
  onTimeFilterChange,
  legendsChanged
}) => {
  // State for chart data
  const [data, setData] = useState<RevenueBySegmentDataPoint[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<RevenueBySegmentDataPoint[]>([]);
  const [processedFilteredData, setProcessedFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  
  // State for tooltip
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    date: '',
    segments: [] as { name: string, value: number, color: string }[],
    left: 0, 
    top: 0 
  });
  
  // Modal state
  const [modalData, setModalData] = useState<RevenueBySegmentDataPoint[]>([]);
  const [modalProcessedData, setModalProcessedData] = useState<any[]>([]);
  const [modalFilteredData, setModalFilteredData] = useState<RevenueBySegmentDataPoint[]>([]);
  const [modalProcessedFilteredData, setModalProcessedFilteredData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<TimeFilter>(timeFilter);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  
  // Available segments in the dataset
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);
  const [modalAvailableSegments, setModalAvailableSegments] = useState<string[]>([]);
  
  // Function to fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const revenueData = await fetchRevenueBySegmentData(timeFilter);
      
      if (revenueData.length === 0) {
        setError('No data available for this period.');
        setData([]);
        setFilteredData([]);
        setProcessedData([]);
        setProcessedFilteredData([]);
        setAvailableSegments([]);
      } else {
        // Extract unique segments
        const segments = [...new Set(revenueData.map(d => d.segment))];
        setAvailableSegments(segments);
        
        // Process data for bar stack
        const processed = processDataForBarStack(revenueData);
        
        setData(revenueData);
        setFilteredData(revenueData);
        setProcessedData(processed);
        setProcessedFilteredData(processed);
        setIsBrushActive(true);
        setBrushDomain(null);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      let message = 'Failed to load data from API.';
      if (error instanceof Error) {
        message = error.message || message;
      }
      setError(message);
      setData([]);
      setFilteredData([]);
      setProcessedData([]);
      setProcessedFilteredData([]);
      setAvailableSegments([]);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);
  
  // Function to fetch modal data
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    
    try {
      const revenueData = await fetchRevenueBySegmentData(modalTimeFilter);
      
      if (revenueData.length === 0) {
        setModalError('No data available for this period.');
        setModalData([]);
        setModalFilteredData([]);
        setModalProcessedData([]);
        setModalProcessedFilteredData([]);
        setModalAvailableSegments([]);
      } else {
        // Extract unique segments
        const segments = [...new Set(revenueData.map(d => d.segment))];
        setModalAvailableSegments(segments);
        
        // Process data for bar stack
        const processed = processDataForBarStack(revenueData);
        
        setModalData(revenueData);
        setModalFilteredData(revenueData);
        setModalProcessedData(processed);
        setModalProcessedFilteredData(processed);
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      }
    } catch (error) {
      console.error('Error loading modal chart data:', error);
      let message = 'Failed to load data.';
      if (error instanceof Error) {
        message = error.message || message;
      }
      setModalError(message);
      setModalData([]);
      setModalFilteredData([]);
      setModalProcessedData([]);
      setModalProcessedFilteredData([]);
      setModalAvailableSegments([]);
    } finally {
      setModalLoading(false);
    }
  }, [modalTimeFilter]);
  
  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Create and send legend data to parent component
  useEffect(() => {
    if (legendsChanged && availableSegments.length > 0) {
      const legendsData = availableSegments.map(segment => ({
        label: getSegmentDisplayName(segment),
        color: getSegmentColor(segment),
        value: data
          .filter(d => d.segment === segment)
          .reduce((sum, d) => sum + d.protocol_revenue, 0)
      }));
      
      // Send to parent component
      legendsChanged(legendsData);
    }
  }, [data, availableSegments, legendsChanged]);
  
  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    setBrushDomain([startDate, endDate]);
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive]);
  
  // Handle modal brush change
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    setModalBrushDomain([startDate, endDate]);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive]);
  
  // Apply brush domain to filter data
  useEffect(() => {
    if (data.length === 0) {
      if (filteredData.length > 0) {
        setFilteredData([]);
        setProcessedFilteredData([]);
      }
      return;
    }
    
    // If brush domain is null but filter is active, use full date range
    if (!brushDomain && isBrushActive) {
      setFilteredData(data);
      setProcessedFilteredData(processedData);
      return;
    }
    
    // If no brush domain is set or full range is selected, show all data
    if (!brushDomain || !isBrushActive) {
      if (filteredData.length !== data.length) {
        setFilteredData(data);
        setProcessedFilteredData(processedData);
      }
      return;
    }
    
    const [start, end] = brushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = data.filter(d => {
      const itemDate = new Date(d.block_date).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Process filtered data for bar stack
    const processedFiltered = processDataForBarStack(filtered);
    
    setFilteredData(filtered.length > 0 ? filtered : data);
    setProcessedFilteredData(processedFiltered.length > 0 ? processedFiltered : processedData);
  }, [brushDomain, data, isBrushActive, filteredData.length, processedData]);
  
  // Apply brush domain to filter modal data
  useEffect(() => {
    if (modalData.length === 0) {
      if (modalFilteredData.length > 0) {
        setModalFilteredData([]);
        setModalProcessedFilteredData([]);
      }
      return;
    }
    
    // If brush domain is null but filter is active, use full date range
    if (!modalBrushDomain && isModalBrushActive) {
      setModalFilteredData(modalData);
      setModalProcessedFilteredData(modalProcessedData);
      return;
    }
    
    // If no brush domain is set or full range is selected, show all data
    if (!modalBrushDomain || !isModalBrushActive) {
      if (modalFilteredData.length !== modalData.length) {
        setModalFilteredData(modalData);
        setModalProcessedFilteredData(modalProcessedData);
      }
      return;
    }
    
    const [start, end] = modalBrushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = modalData.filter(d => {
      const itemDate = new Date(d.block_date).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Process filtered data for bar stack
    const processedFiltered = processDataForBarStack(filtered);
    
    setModalFilteredData(filtered.length > 0 ? filtered : modalData);
    setModalProcessedFilteredData(processedFiltered.length > 0 ? processedFiltered : modalProcessedData);
  }, [modalBrushDomain, modalData, isModalBrushActive, modalFilteredData.length, modalProcessedData]);
  
  // Handle modal-related effects
  useEffect(() => {
    if (isModalOpen) {
      setModalTimeFilter(timeFilter);
      setModalData(data);
      setModalFilteredData(filteredData.length > 0 ? filteredData : data);
      setModalProcessedData(processedData);
      setModalProcessedFilteredData(processedFilteredData.length > 0 ? processedFilteredData : processedData);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      setModalAvailableSegments(availableSegments);
      fetchModalData();
    }
  }, [
    isModalOpen, timeFilter, data, filteredData, processedData, processedFilteredData,
    brushDomain, isBrushActive, availableSegments, fetchModalData
  ]);
  
  // Fetch modal data when time filter changes in modal
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [isModalOpen, modalTimeFilter, fetchModalData]);
  
  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: TimeFilter) => {
    setModalTimeFilter(newFilter);
    if (onTimeFilterChange) {
      onTimeFilterChange(newFilter);
    }
  }, [onTimeFilterChange]);
  
  // Handle tooltip hover
  const handleBarHover = useCallback((event: React.MouseEvent<SVGRectElement>, barData: any, date: string, segment: string) => {
    // Get coordinates
    const coords = localPoint(event) || { x: 0, y: 0 };
    
    // Create tooltip segments data
    const segments = availableSegments.map(seg => ({
      name: seg,
      value: barData[seg] || 0,
      color: getSegmentColor(seg)
    }));
    
    setTooltip({
      visible: true,
      date,
      segments,
      left: coords.x,
      top: coords.y
    });
  }, [availableSegments]);
  
  // Handle modal tooltip hover
  const handleModalBarHover = useCallback((event: React.MouseEvent<SVGRectElement>, barData: any, date: string, segment: string) => {
    // Get coordinates
    const coords = localPoint(event) || { x: 0, y: 0 };
    
    // Create tooltip segments data
    const segments = modalAvailableSegments.map(seg => ({
      name: seg,
      value: barData[seg] || 0,
      color: getSegmentColor(seg)
    }));
    
    setTooltip({
      visible: true,
      date,
      segments,
      left: coords.x,
      top: coords.y
    });
  }, [modalAvailableSegments]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modal data/filters if in modal mode, otherwise use the main data/filters
    const activeTimeFilter = isModal ? modalTimeFilter : timeFilter;
    const activeAvailableSegments = isModal ? modalAvailableSegments : availableSegments;
    const activeData = isModal ? modalData : data;
    const activeFilteredData = isModal ? modalFilteredData : filteredData;
    const activeProcessedData = isModal ? modalProcessedData : processedData;
    const activeProcessedFilteredData = isModal ? modalProcessedFilteredData : processedFilteredData;
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const activeIsBrushActive = isModal ? isModalBrushActive : isBrushActive;
    const activeHandleBrushChange = isModal ? handleModalBrushChange : handleBrushChange;
    const activeHandleBarHover = isModal ? handleModalBarHover : handleBarHover;
    
    // Show loading state
    if (activeLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state with refresh button
    if (activeError || activeData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{activeError || 'No data available'}</div>
          <ButtonSecondary onClick={isModal ? fetchModalData : fetchData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    // Get displayed data with filter
    const displayData = activeIsBrushActive ? activeProcessedFilteredData : activeProcessedData;
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && tooltip.date && (
          <ChartTooltip
            title={formatDate(tooltip.date, activeTimeFilter)}
            items={tooltip.segments.map(segment => ({
              color: segment.color,
              label: getSegmentDisplayName(segment.name),
              value: formatCurrency(segment.value),
              shape: 'square'
            }))}
            top={tooltip.top}
            left={tooltip.left}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div className="h-[85%] w-full overflow-hidden relative"
          ref={isModal ? modalChartRef : chartRef}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null; 
              
              const margin = { top: 10, right: 45, bottom: 30, left: 60 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              // Create date scale for x-axis
              const xScale = scaleBand<string>({
                domain: displayData.map(d => d.date),
                range: [0, innerWidth],
                padding: 0.2
              });
              
              // Get keys for stacked bars
              const keys = activeAvailableSegments;
              
              // Create color scale for segments
              const colorScale = scaleOrdinal<string, string>({
                domain: keys,
                range: keys.map(getSegmentColor)
              });
              
              // Find max value for y-axis scale
              const maxValue = Math.max(
                ...displayData.map(d => 
                  keys.reduce((sum, key) => sum + (Number(d[key]) || 0), 0)
                )
              );
              
              // Create y-scale
              const yScale = scaleLinear<number>({
                domain: [0, maxValue * 1.1], // Add 10% padding
                range: [innerHeight, 0],
                nice: true
              });
              
              return (
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid lines */}
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      height={innerHeight}
                      stroke="#1f2937"
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                      numTicks={5}
                    />
                    
                    {/* Bar Stack */}
                    <BarStack
                      data={displayData}
                      keys={keys}
                      x={(d) => d.date}
                      xScale={xScale}
                      yScale={yScale}
                      color={colorScale}
                    >
                      {(barStacks) => 
                        barStacks.map((barStack) => 
                          barStack.bars.map((bar) => (
                            <rect
                              key={`bar-stack-${barStack.index}-${bar.index}`}
                              x={bar.x}
                              y={bar.y}
                              height={bar.height}
                              width={bar.width}
                              fill={bar.color}
                              opacity={0.9}
                              rx={2}
                              onMouseMove={(event) => {
                                if (barStack.index >= 0 && barStack.index < displayData.length) {
                                  activeHandleBarHover(
                                    event, 
                                    displayData[barStack.index], 
                                    displayData[barStack.index].date, 
                                    bar.key
                                  );
                                }
                              }}
                              onMouseLeave={handleMouseLeave}
                            />
                          ))
                        )
                      }
                    </BarStack>
                    
                    {/* X-axis */}
                    <AxisBottom 
                      top={innerHeight}
                      scale={xScale}
                      tickFormat={(date) => {
                        const d = new Date(date as string);
                        // Custom formatting based on active time filter
                        switch(activeTimeFilter) {
                          case 'Y': return d.getFullYear().toString();
                          case 'Q': return `Q${Math.floor(d.getMonth() / 3) + 1}`;
                          case 'M': return d.toLocaleDateString('en-US', { month: 'short' });
                          case 'W': 
                          default: return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                      }}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideZero={true}
                      numTicks={Math.min(10, displayData.length)}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'middle',
                        dy: '0.5em'
                      })}
                    />
                    
                    {/* Y-axis */}
                    <AxisLeft 
                      scale={yScale}
                      stroke="#374151" 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => formatCurrency(value as number)}
                      tickLabelProps={() => ({ 
                        fill: '#6b7280', 
                        fontSize: 11, 
                        fontWeight: 300, 
                        letterSpacing: '0.05em',
                        textAnchor: 'end', 
                        dx: '-0.6em', 
                        dy: '0.25em' 
                      })}
                    />
                  </Group>
                </svg>
              );
            }}
          </ParentSize>
        </div>
        
        {/* Brush component */}
        <div className="h-[15%] w-full mt-1">
          <BrushTimeScale
            data={activeData}
            isModal={isModal}
            activeBrushDomain={activeBrushDomain}
            onBrushChange={activeHandleBrushChange}
            onClearBrush={() => {
              if (isModal) {
                setModalBrushDomain(null);
                setIsModalBrushActive(false);
              } else {
                setBrushDomain(null);
                setIsBrushActive(false);
              }
            }}
            getDate={(d) => d.block_date}
            getValue={(d) => d.protocol_revenue}
            lineColor={segmentColors.DeFi}
            margin={{ top: 5, right: 45, bottom: 10, left: 60 }}
          />
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full w-full relative">
      {/* Add time filter at top right corner */}
      {!isModalOpen && (
        <div className="absolute right-0 top-0 z-10">
          <TimeFilterSelector
            value={timeFilter}
            onChange={(val) => {
              if (onTimeFilterChange) {
                onTimeFilterChange(val as TimeFilter);
              }
            }}
            options={[
              { value: 'W', label: 'W' },
              { value: 'M', label: 'M' },
              { value: 'Q', label: 'Q' },
              { value: 'Y', label: 'Y' }
            ]}
          />
        </div>
      )}
      
      {renderChartContent(0, 0)}
      
      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="Revenue by Segment"
        subtitle="Protocol revenue breakdown by segment over time"
      >
        {/* Filters */}
        <div className="flex items-center justify-between pl-1 py-0 mb-3">
          <div className="flex space-x-4 items-center">
            <TimeFilterSelector
              value={modalTimeFilter}
              onChange={(val) => handleModalTimeFilterChange(val as TimeFilter)}
              options={[
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' },
                { value: 'Y', label: 'Y' }
              ]}
            />
            <DisplayModeFilter 
              mode={displayMode} 
              onChange={(newMode: DisplayMode) => {
                // Handle display mode change if needed
              }}
            />
          </div>
        </div>
        
        {/* Horizontal line */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        <div className="h-[60vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-full pr-3 border-r border-gray-900">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              <div className="text-[10px] text-gray-400 mb-2">SEGMENTS</div>
              {modalLoading ? (
                // Show loading state
                <>
                  <LegendItem label="Loading..." color="#60a5fa" isLoading={true} />
                  <LegendItem label="Loading..." color="#a78bfa" isLoading={true} />
                  <LegendItem label="Loading..." color="#34d399" isLoading={true} />
                </>
              ) : (
                // Create legend items array
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[500px] pr-1">
                  {modalAvailableSegments.map((segment) => (
                    <LegendItem
                      key={segment}
                      label={getSegmentDisplayName(segment)}
                      color={getSegmentColor(segment)}
                      shape="square"
                      tooltipText={formatCurrency(
                        modalData
                          .filter(d => d.segment === segment)
                          .reduce((sum, d) => sum + d.protocol_revenue, 0)
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RevenueBySegmentChart; 