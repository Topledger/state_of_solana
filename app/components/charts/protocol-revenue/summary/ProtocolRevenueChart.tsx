import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { LinePath } from '@visx/shape';
import { ProtocolRevenueDataPoint, TimeFilter, fetchProtocolRevenueData, formatValue, formatDate } from '../../../../api/protocol-revenue/summary/chartData';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal, { ScrollableLegend } from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import { colors, grid, axisLines, tickLabels } from '../../../../utils/chartColors';

// Define RefreshIcon component directly in this file
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
interface ProtocolRevenueChartProps {
  timeFilter?: TimeFilter;
  displayMode?: string;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (filter: TimeFilter) => void;
  onDisplayModeChange?: (mode: any) => void;
}

// Chart colors
export const protocolRevenueChartColors = {
  protocolRevenue: colors[0], // blue (1st color)
  solanaRevenue: colors[2], // green (3rd color)
  grid: grid,
  axisLines: axisLines,
  tickLabels: tickLabels,
};

// Process data for brush component - ensure one data point per month
const processDataForBrush = (data: ProtocolRevenueDataPoint[]) => {
  if (!data || data.length === 0) return [];
  
  // Group data by month to ensure one data point per month
  const revenueByMonth = data.reduce<Record<string, number>>((acc, curr) => {
    if (!acc[curr.month]) {
      acc[curr.month] = 0;
    }
    acc[curr.month] += curr.protocol_revenue;
    return acc;
  }, {});
  
  // Convert to array of { month, value } objects for the brush
  return Object.entries(revenueByMonth).map(([month, value]) => ({
    month,
    date: new Date(month),
    value
  }));
};

// Format currency values more concisely (no decimal places for millions)
const formatCurrency = (value: number): string => {
  if (value >= 1e9) {
    return `$${Math.round(value / 1e9)}B`;
  }
  if (value >= 1e6) {
    return `$${Math.round(value / 1e6)}M`;
  }
  if (value >= 1e3) {
    return `$${Math.round(value / 1e3)}K`;
  }
  return `$${Math.round(value)}`;
};

const ProtocolRevenueChart: React.FC<ProtocolRevenueChartProps> = ({ 
  timeFilter = 'M', // Default to monthly if not provided
  displayMode,
  isModalOpen = false, 
  onModalClose = () => {},
  onTimeFilterChange,
  onDisplayModeChange
}) => {
  // Main chart data
  const [data, setData] = useState<ProtocolRevenueDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<ProtocolRevenueDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific data
  const [modalData, setModalData] = useState<ProtocolRevenueDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<TimeFilter>(timeFilter);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<ProtocolRevenueDataPoint[]>([]);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as ProtocolRevenueDataPoint | null, 
    left: 0, 
    top: 0 
  });

  // Add refs for throttling
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  // Add chart container refs
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  
  // Create a fetchData function that can be called to refresh data for main chart
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the API endpoint
      const chartData = await fetchProtocolRevenueData(timeFilter);
      
      if (chartData.length === 0) {
        console.error('No data available for this period');
        setError('No data available for this period.');
        setData([]);
      } else {
        console.log('Fetched data:', chartData);
        setData(chartData);
        setFilteredData(chartData);
        
        // Set brush as active but don't set a specific domain
        // This will result in the full range being selected
        setIsBrushActive(true);
        setBrushDomain(null);
      }
    } catch (err) {
      console.error('[Chart] Error loading chart data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setError(message);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const chartData = await fetchProtocolRevenueData(modalTimeFilter);
      if (chartData.length === 0) {
        setModalError('No data available for this period.');
        setModalData([]);
        setModalFilteredData([]);
      } else {
        setModalData(chartData);
        setModalFilteredData(chartData);
        
        // Set brush as active but don't set a specific domain
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      }
    } catch (err) {
      console.error('[Chart] Error loading modal chart data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setModalError(message);
      setModalData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  }, [modalTimeFilter]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle brush change with throttling
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
      }
      
      // Clear any pending throttle timeout
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
        canUpdateFilteredDataRef.current = true; // Allow immediate update on clear
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    // Update immediate brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setBrushDomain(newDomain);
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive]);

  // Handle modal brush change with throttling
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
      }
      
      // Clear any pending throttle timeout
      if (modalThrottleTimeoutRef.current) {
        clearTimeout(modalThrottleTimeoutRef.current);
        modalThrottleTimeoutRef.current = null;
        canUpdateModalFilteredDataRef.current = true;
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    // Update immediate brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setModalBrushDomain(newDomain);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive]);

  // Apply throttled brush domain to filter data
  useEffect(() => {
    if (data.length === 0) {
      if (filteredData.length > 0) setFilteredData([]);
      return;
    }

    // If brush domain is null but filter is active, use full date range
    if (!brushDomain && isBrushActive) {
      setFilteredData(data);
      return;
    }

    // If no brush domain is set or full range is selected, show all data
    if (!brushDomain || !isBrushActive) {
      if (filteredData.length !== data.length) {
        setFilteredData(data);
      }
      return;
    }
    
    // Throttle the actual filtering logic
    if (!canUpdateFilteredDataRef.current) {
      // Skip update if throttled
      return;
    }

    const [start, end] = brushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = data.filter(d => {
      const itemDate = new Date(d.month).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Apply filter and start throttle period
    setFilteredData(filtered.length > 0 ? filtered : data);
    canUpdateFilteredDataRef.current = false; // Prevent updates during throttle period

    // Clear previous timeout just in case
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    // Set timeout to allow updates again after interval
    throttleTimeoutRef.current = setTimeout(() => {
      canUpdateFilteredDataRef.current = true;
    }, 100); // 100ms throttle interval

  }, [brushDomain, data, isBrushActive, filteredData.length]);

  // Apply throttled brush domain to filter modal data
  useEffect(() => {
    if (modalData.length === 0) {
      if (modalFilteredData.length > 0) setModalFilteredData([]);
      return;
    }

    // If brush domain is null but filter is active, use full date range
    if (!modalBrushDomain && isModalBrushActive) {
      setModalFilteredData(modalData);
      return;
    }

    // If no brush domain is set or full range is selected, show all data
    if (!modalBrushDomain || !isModalBrushActive) {
      if (modalFilteredData.length !== modalData.length) {
        setModalFilteredData(modalData);
      }
      return;
    }
    
    // Throttle the actual filtering logic
    if (!canUpdateModalFilteredDataRef.current) {
      // Skip update if throttled
      return;
    }

    const [start, end] = modalBrushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = modalData.filter(d => {
      const itemDate = new Date(d.month).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Apply filter and start throttle period
    setModalFilteredData(filtered.length > 0 ? filtered : modalData);
    canUpdateModalFilteredDataRef.current = false; // Prevent updates during throttle period

    // Clear previous timeout just in case
    if (modalThrottleTimeoutRef.current) {
      clearTimeout(modalThrottleTimeoutRef.current);
    }

    // Set timeout to allow updates again after interval
    modalThrottleTimeoutRef.current = setTimeout(() => {
      canUpdateModalFilteredDataRef.current = true;
    }, 100); // 100ms throttle interval

  }, [modalBrushDomain, modalData, isModalBrushActive, modalFilteredData.length]);
  
  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      if (modalThrottleTimeoutRef.current) {
        clearTimeout(modalThrottleTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array runs only on mount/unmount

  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: TimeFilter) => {
    setModalTimeFilter(newFilter);
    if (onTimeFilterChange) {
      onTimeFilterChange(newFilter);
    }
  }, [onTimeFilterChange]);

  // Format the date based on the time filter
  const formatDate = useCallback((dateStr: string, filter: TimeFilter) => {
    const date = new Date(dateStr);
    if (filter === 'W') {
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (filter === 'M') {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else if (filter === 'Q') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    } else { // 'Y'
      return date.getFullYear().toString();
    }
  }, []);
  
  // Find the closest data point based on mouse x position
  const getClosestPointFromX = useCallback((
    currentData: ProtocolRevenueDataPoint[], 
    mouseX: number, 
    leftMargin: number, 
    chartWidth: number
  ) => {
    if (currentData.length === 0) return -1;
    
    // Calculate approximate index based on mouse position
    const itemWidth = chartWidth / currentData.length;
    const index = Math.floor((mouseX - leftMargin) / itemWidth);
    
    // Return the closest valid index
    if (index < 0) return 0;
    if (index >= currentData.length) return currentData.length - 1;
    return index;
  }, []);
  
  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Use the same margin values as in chart rendering
    const margin = { left: 60, right: 45 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    if (mouseX < margin.left || mouseX > innerWidth + margin.left) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Use current data based on brush state
    const currentData = isModal 
      ? (isModalBrushActive ? modalFilteredData : modalData)
      : (isBrushActive ? filteredData : data);
    
    if (currentData.length === 0) {
      return; // Don't show tooltip if no data is available
    }
    
    // Find the closest data point based on x position
    const closestIndex = getClosestPointFromX(currentData, mouseX, margin.left, innerWidth);
    
    if (closestIndex !== -1) {
      const closestPoint = currentData[closestIndex];
      // Check if this is a new data point or if tooltip is not yet visible
      const isNewDataPoint = !tooltip.dataPoint || tooltip.dataPoint.month !== closestPoint.month;
      
      if (!tooltip.visible || isNewDataPoint) {
        // Full update when showing new data point
        setTooltip({
          visible: true,
          dataPoint: closestPoint,
          left: mouseX,
          top: mouseY
        });
      } else {
        // Only update dataPoint without changing position
        setTooltip(prev => ({
          ...prev,
          dataPoint: closestPoint
        }));
      }
    }
  }, [data, filteredData, modalData, modalFilteredData, isBrushActive, isModalBrushActive, tooltip, getClosestPointFromX]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Handle modal-related effects
  useEffect(() => {
    if (isModalOpen) {
      // Set modal filters from main chart
      setModalTimeFilter(timeFilter);
      
      // Initialize with current main chart data
      setModalData(data);
      setModalFilteredData(filteredData.length > 0 ? filteredData : data);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      
      // Force fetch new data for modal to ensure it's updated
      fetchModalData();
    }
  }, [isModalOpen, timeFilter, data, filteredData, brushDomain, isBrushActive, fetchModalData]);
  
  // Fetch modal data when time filter changes in modal
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [isModalOpen, modalTimeFilter, fetchModalData]);
  
  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modal data/filters if in modal mode, otherwise use the main data/filters
    const activeTimeFilter = isModal ? modalTimeFilter : timeFilter;
    const activeData = isModal ? modalData : data;
    const activeFilteredData = isModal ? (isModalBrushActive ? modalFilteredData : modalData) : (isBrushActive ? filteredData : data);
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const activeIsBrushActive = isModal ? isModalBrushActive : isBrushActive;
    const activeHandleBrushChange = isModal ? handleModalBrushChange : handleBrushChange;
    
    // Show loading state
    if (activeLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state with refresh button
    if (activeError || activeData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{activeError || 'No data available'}</div>
          <ButtonSecondary onClick={isModal ? fetchModalData : () => fetchData()}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    // Define consistent margins for chart and brush to ensure alignment
    const chartMargin = { top: 10, right: 15, bottom: 30, left: 45 };
    const brushMargin = { top: 5, right: chartMargin.right, bottom: 10, left: chartMargin.left };
    
    // Process data for brush
    const brushData = processDataForBrush(activeData);
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && tooltip.dataPoint && (
          <ChartTooltip
            title={formatDate(tooltip.dataPoint.month, activeTimeFilter)}
            items={[
              {
                color: protocolRevenueChartColors.protocolRevenue,
                label: 'Protocol Revenue',
                value: formatCurrency(tooltip.dataPoint.protocol_revenue),
                shape: 'square'
              },
              {
                color: protocolRevenueChartColors.solanaRevenue,
                label: 'Solana Revenue',
                value: formatCurrency(tooltip.dataPoint.Solana_Rev),
                shape: 'square'
              }
            ]}
            top={tooltip.top}
            left={tooltip.left}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div className="h-[85%] w-full overflow-hidden relative"
          ref={isModal ? modalChartRef : chartRef}
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null; 
              
              const margin = chartMargin;
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;

              // Get data for chart
              const displayData = activeFilteredData;
              
              if (displayData.length === 0) return null;
              
              // Create x and y scales
              const xScale = scaleTime({
                domain: [
                  // Add some padding (5%) to the start date to prevent bars from being at the origin
                  new Date(new Date(displayData[0].month).getTime() - (new Date(displayData[displayData.length - 1].month).getTime() - new Date(displayData[0].month).getTime()) * 0.05),
                  // Add some padding (5%) to the end date to prevent bars from being cut off at the right edge
                  new Date(new Date(displayData[displayData.length - 1].month).getTime() + (new Date(displayData[displayData.length - 1].month).getTime() - new Date(displayData[0].month).getTime()) * 0.05)
                ],
                range: [0, innerWidth]
              });
              
              // Find max values for protocol revenue and Solana revenue
              const maxProtocolRevenue = Math.max(
                ...displayData.map(d => d.protocol_revenue)
              );
              
              const maxSolanaRevenue = Math.max(
                ...displayData.map(d => d.Solana_Rev)
              );
              
              // Use the larger of the two max values to set the y-axis scale
              const maxValue = Math.max(maxProtocolRevenue, maxSolanaRevenue);
              
              const yScale = scaleLinear({
                domain: [0, maxValue * 1.25], // Add 25% padding to ensure bars don't extend beyond the chart
                range: [innerHeight, 0],
                nice: true
              });
              
              // Calculate bar width to ensure proper spacing
              const barWidth = Math.max(
                (innerWidth / displayData.length / 2.5), // Divide by 2.5 to leave space between groups
                2 // Minimum bar width
              );
              
              // Gap between bars in the same group
              const barGap = 1;
              
              return (
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid lines */}
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      height={innerHeight}
                      stroke={protocolRevenueChartColors.grid}
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                      numTicks={5}
                    />
                    
                    {/* Protocol Revenue and Solana Revenue Bars */}
                    {displayData.map((d, i) => {
                      const tickX = xScale(new Date(d.month));
                      
                      // Protocol Revenue bar (left side)
                      const protocolY = yScale(d.protocol_revenue);
                      const protocolBarHeight = innerHeight - protocolY;
                      
                      // Solana Revenue bar (right side)
                      const solanaY = yScale(d.Solana_Rev);
                      const solanaBarHeight = innerHeight - solanaY;
                      
                      return (
                        <g key={`bar-group-${i}`}>
                          {/* Protocol Revenue Bar */}
                          <Bar
                            key={`protocol-rev-bar-${i}`}
                            x={tickX - barWidth - barGap/2}
                            y={protocolY}
                            width={barWidth}
                            height={protocolBarHeight}
                            fill={protocolRevenueChartColors.protocolRevenue}
                            opacity={tooltip.dataPoint?.month === d.month ? 1 : 0.75}
                            rx={2}
                          />
                          
                          {/* Solana Revenue Bar */}
                          <Bar
                            key={`solana-rev-bar-${i}`}
                            x={tickX + barGap/2}
                            y={solanaY}
                            width={barWidth}
                            height={solanaBarHeight}
                            fill={protocolRevenueChartColors.solanaRevenue}
                            opacity={tooltip.dataPoint?.month === d.month ? 1 : 0.75}
                            rx={2}
                          />
                        </g>
                      );
                    })}
                    
                    {/* Y-axis */}
                    <AxisLeft 
                      scale={yScale}
                      stroke={protocolRevenueChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => formatCurrency(value as number)}
                      tickLabelProps={() => ({ 
                        fill: protocolRevenueChartColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300, 
                        letterSpacing: '0.05em',
                        textAnchor: 'end', 
                        dx: '-0.6em', 
                        dy: '0.25em' 
                      })}
                    />

                    {/* X-axis (date axis) */}
                    <AxisBottom 
                      top={innerHeight}
                      scale={xScale}
                      tickFormat={(date) => {
                        const d = date as Date;
                        // Simpler date formatting - just show month name
                        return d.toLocaleDateString('en-US', { month: 'short' });
                      }}
                      stroke={protocolRevenueChartColors.axisLines}
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideZero={true}
                      numTicks={Math.min(5, displayData.length)}
                      tickLabelProps={(value, index) => ({
                        fill: protocolRevenueChartColors.tickLabels,
                        fontSize: 11,
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'middle',
                        dy: '0.5em'
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
            data={brushData}
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
            getDate={(d) => d.date.toISOString()}
            getValue={(d) => d.value}
            lineColor={protocolRevenueChartColors.protocolRevenue}
            margin={brushMargin}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal - removing time filter UI in the modal version */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="Protocol Revenue" subtitle="Protocol revenue vs Solana revenue over time">
        <div className="h-[60vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-full pr-3 border-r border-gray-900">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              <ScrollableLegend
          
                items={[
                  {
                    id: 'protocol-revenue',
                    label: 'Protocol Revenue',
                    color: protocolRevenueChartColors.protocolRevenue,
                    
                  },
                  {
                    id: 'solana-revenue',
                    label: 'Solana Revenue',
                    color: protocolRevenueChartColors.solanaRevenue,
                    
                  }
                ]}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProtocolRevenueChart; 