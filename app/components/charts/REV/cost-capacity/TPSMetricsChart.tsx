import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleTime, scaleBand } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import ChartTooltip from '../../../shared/ChartTooltip';
import Loader from '../../../shared/Loader';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import DisplayModeFilter, { DisplayMode } from '../../../shared/filters/DisplayModeFilter';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import { TimeFilter } from '../../../../api/REV/cost-capacity';
import { TransactionDataPoint, fetchTransactionsData } from '../../../../api/REV/cost-capacity/transactionsData';
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
interface TPSMetricsChartProps {
  timeFilter: TimeFilter;
  displayMode?: DisplayMode;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (filter: TimeFilter) => void;
  onDisplayModeChange?: (mode: DisplayMode) => void;
}

// Chart colors
export const tpsMetricsColors = {
  total_tps: colors[0], // blue
  success_tps: colors[2], // green
  failed_tps: colors[4], // red
  real_tps: colors[1], // purple
  grid: grid,
  axisLines: axisLines,
  tickLabels: tickLabels,
};

// Sort TPS metrics by total value and assign colors
const getTpsColorMap = (data: TransactionDataPoint[]) => {
  if (data.length === 0) return tpsMetricsColors;
  
  // Define TPS metrics
  const metrics = ['total_tps', 'success_tps', 'failed_tps', 'real_tps'];
  
  // Calculate total value for each metric
  const totals: { [key: string]: number } = {};
  metrics.forEach(metric => {
    totals[metric] = data.reduce((sum, d) => sum + (Number(d[metric as keyof typeof d]) || 0), 0);
  });
  
  // Sort metrics by total value (highest first)
  const sortedMetrics = [...metrics].sort((a, b) => totals[b] - totals[a]);
  
  // Define available colors
  const availableColors = [
    colors[0], // blue
    colors[2], // green
    colors[4], // red
    colors[1], // purple
  ];
  
  // Assign colors to metrics based on their value
  const colorMap: { [key: string]: string } = {};
  sortedMetrics.forEach((metric, index) => {
    colorMap[metric] = availableColors[index % availableColors.length];
  });
  
  return {
    ...tpsMetricsColors,
    ...colorMap,
    // Preserve grid and axis colors
    grid: tpsMetricsColors.grid,
    axisLines: tpsMetricsColors.axisLines,
    tickLabels: tpsMetricsColors.tickLabels
  };
};

const TPSMetricsChart: React.FC<TPSMetricsChartProps> = ({
  timeFilter,
  displayMode = 'absolute',
  isModalOpen = false,
  onModalClose = () => {},
  onTimeFilterChange,
  onDisplayModeChange,
}) => {
  // Chart data state
  const [data, setData] = useState<TransactionDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<TransactionDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [_displayMode, _setDisplayMode] = useState<DisplayMode>(displayMode);
  
  // Modal specific data
  const [modalData, setModalData] = useState<TransactionDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<TimeFilter>(timeFilter);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<TransactionDataPoint[]>([]);
  const [modalDisplayMode, setModalDisplayMode] = useState<DisplayMode>(_displayMode);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as TransactionDataPoint | null, 
    left: 0, 
    top: 0 
  });

  // Add refs for throttling
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  // Chart container refs for tooltip positioning
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  
  // Create a fetchData function that can be called to refresh data for main chart
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the real API endpoint
      const chartData = await fetchTransactionsData(timeFilter);
      
      if (chartData.length === 0) {
        console.error('No data available for this period');
        setError('No data available for this period.');
        setData([]);
      } else {
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
      const chartData = await fetchTransactionsData(modalTimeFilter);
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
  
  // Sync internal state with props when they change
  useEffect(() => {
    _setDisplayMode(displayMode);
  }, [displayMode]);

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
    
    // Filtering logic is moved to useEffect
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
        canUpdateModalFilteredDataRef.current = true; // Allow immediate update on clear
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
    
    // Filtering logic is moved to useEffect
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
      const itemDate = new Date(d.date).getTime();
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

  }, [brushDomain, data, isBrushActive]);

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
      const itemDate = new Date(d.date).getTime();
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

  }, [modalBrushDomain, modalData, isModalBrushActive]);
  
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

  // Handle modal-related effects
  useEffect(() => {
    if (isModalOpen) {
      // Set modal filters from main chart
      setModalTimeFilter(timeFilter);
      setModalDisplayMode(_displayMode);
      
      // Initialize with current main chart data
      setModalData(data);
      setModalFilteredData(filteredData.length > 0 ? filteredData : data);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      
      // Force fetch new data for modal to ensure it's updated
      fetchModalData();
    }
  }, [isModalOpen, timeFilter, _displayMode, data, filteredData, brushDomain, isBrushActive, fetchModalData]);
  
  // Fetch modal data when time filter changes in modal
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [isModalOpen, modalTimeFilter, fetchModalData]);

  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: TimeFilter) => {
    setModalTimeFilter(newFilter);
  }, []);

  // Handle display mode change
  const handleDisplayModeChange = useCallback((newMode: DisplayMode) => {
    _setDisplayMode(newMode);
    if (onDisplayModeChange) {
      onDisplayModeChange(newMode);
    }
  }, [onDisplayModeChange]);

  // Handle modal display mode change
  const handleModalDisplayModeChange = useCallback((newMode: DisplayMode) => {
    setModalDisplayMode(newMode);
  }, []);

  // Format large numbers with appropriate suffixes
  const formatLargeNumber = (value: number): string => {
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };
  
  // Format TPS values
  const formatTPS = (value: number): string => {
    return value.toFixed(1);
  };
  
  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const margin = { left: 50 };
    const innerWidth = rect.width - margin.left - 20;
    
    if (mouseX < margin.left || mouseX > innerWidth + margin.left) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Use the current displayed data based on whether we're in modal or main view
    const currentData = isModal 
      ? (isModalBrushActive ? modalFilteredData : modalData)
      : (isBrushActive ? filteredData : data);
    
    // Find nearest data point
    const index = Math.floor((mouseX - margin.left) / (innerWidth / currentData.length));
    
    if (index >= 0 && index < currentData.length) {
      const dataPoint = currentData[index];
      if (!tooltip.visible || tooltip.dataPoint?.date !== dataPoint.date) {
        setTooltip({
          visible: true,
          dataPoint,
          left: mouseX,
          top: mouseY
        });
      }
    }
  }, [data, filteredData, modalData, modalFilteredData, isBrushActive, isModalBrushActive, tooltip]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Define a default color map if needed
  const defaultColorMap = {
    total_tps: '#60a5fa',
    success_tps: '#34d399',
    failed_tps: '#f87171',
    real_tps: '#a78bfa',
    grid: 'rgba(229, 231, 235, 0.15)',
    axisLines: 'rgba(229, 231, 235, 0.3)',
    tickLabels: 'rgba(229, 231, 235, 0.6)'
  };

  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    try {
      if (isModal ? modalChartRef.current : chartRef.current) {
        const svg = isModal ? modalChartRef.current : chartRef.current;
        if (svg) {
          // Clear existing content
          while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
          }

          // Get dynamic color map based on data values
          const colorMap = getTpsColorMap(isModal ? modalData : data);
          
          // Use modal data/filters if in modal mode, otherwise use the main data/filters
          const activeTimeFilter = isModal ? modalTimeFilter : timeFilter;
          const activeDisplayMode = isModal ? modalDisplayMode : _displayMode;
          const activeData = isModal ? modalData : data;
          const activeFilteredData = isModal ? (isModalBrushActive ? modalFilteredData : modalData) : (isBrushActive ? filteredData : data);
          const activeLoading = isModal ? modalLoading : loading;
          const activeError = isModal ? modalError : error;
          const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
          const activeIsBrushActive = isModal ? isModalBrushActive : isBrushActive;
          const activeHandleBrushChange = isModal ? handleModalBrushChange : handleBrushChange;
          const activeClearBrush = isModal 
            ? () => { setModalBrushDomain(null); setIsModalBrushActive(false); }
            : () => { setBrushDomain(null); setIsBrushActive(false); };
          
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
          
          return (
            <div className="flex flex-col h-full">
              {tooltip.visible && tooltip.dataPoint && (
                <ChartTooltip
                  title={formatDate(tooltip.dataPoint.date)}
                  items={[
                    {
                      color: colorMap.total_tps,
                      label: 'Total TPS',
                      value: formatTPS(tooltip.dataPoint.total_tps),
                      shape: 'circle'
                    },
                    {
                      color: colorMap.success_tps,
                      label: 'Success TPS',
                      value: formatTPS(tooltip.dataPoint.success_tps),
                      shape: 'circle'
                    },
                    {
                      color: colorMap.failed_tps,
                      label: 'Failed TPS',
                      value: formatTPS(tooltip.dataPoint.failed_tps),
                      shape: 'circle'
                    },
                    {
                      color: colorMap.real_tps,
                      label: 'Real TPS',
                      value: formatTPS(tooltip.dataPoint.real_tps),
                      shape: 'circle'
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
                    
                    const margin = { top: 5, right: 25, bottom: 30, left: 45 };
                    const innerWidth = width - margin.left - margin.right;
                    const innerHeight = height - margin.top - margin.bottom;
                    if (innerWidth <= 0 || innerHeight <= 0) return null;

                    // Get data for chart
                    const displayData = activeFilteredData;
                    
                    // Calculate max value for y-axis scales
                    const maxTpsValue = Math.max(
                      ...displayData.map(d => Math.max(
                        d.total_tps,
                        d.success_tps,
                        d.failed_tps,
                        d.real_tps
                      ))
                    );

                    // Create scales
                    const yScale = scaleLinear({
                      domain: [0, maxTpsValue * 1.1], // Add 10% padding
                      range: [innerHeight, 0],
                      nice: true,
                      round: false // Don't round values to ensure all grid lines show up
                    });
                    
                    // Calculate explicit tick values for better grid line display
                    const yTickValues = Array.from({ length: 8 }, (_, i) => 
                      i * (maxTpsValue * 1.1) / 7
                    );
                                
                    // X scale based on dates
                    const xScale = scaleBand({
                      domain: displayData.map((_, i) => i.toString()),
                      range: [0, innerWidth],
                      padding: 0.2,
                    });
                    
                    // Create map for date lookup
                    const dateMap = displayData.map(d => new Date(d.date));
                    
                    return (
                      <svg width={width} height={height}>
                        <Group left={margin.left} top={margin.top}>
                          {/* Grid lines */}
                          <GridRows
                            scale={yScale}
                            width={innerWidth}
                            height={innerHeight}
                            stroke={colorMap.grid}
                            strokeOpacity={0.6}
                            strokeDasharray="2,3"
                            tickValues={yTickValues}
                          />
                          
                          {/* Line for Total TPS */}
                          <LinePath
                            data={displayData}
                            x={(d, i) => xPosition(i.toString()) + xScale.bandwidth() / 2}
                            y={(d) => yScale(d.total_tps)}
                            stroke={colorMap.total_tps}
                            strokeWidth={1.5}
                            curve={curveMonotoneX}
                          />
                          
                          {/* Line for Success TPS */}
                          <LinePath
                            data={displayData}
                            x={(d, i) => xPosition(i.toString()) + xScale.bandwidth() / 2}
                            y={(d) => yScale(d.success_tps)}
                            stroke={colorMap.success_tps}
                            strokeWidth={1.5}
                            curve={curveMonotoneX}
                          />
                          
                          {/* Line for Failed TPS */}
                          <LinePath
                            data={displayData}
                            x={(d, i) => xPosition(i.toString()) + xScale.bandwidth() / 2}
                            y={(d) => yScale(d.failed_tps)}
                            stroke={colorMap.failed_tps}
                            strokeWidth={1.5}
                            curve={curveMonotoneX}
                          />
                          
                          {/* Line for Real TPS */}
                          <LinePath
                            data={displayData}
                            x={(d, i) => xPosition(i.toString()) + xScale.bandwidth() / 2}
                            y={(d) => yScale(d.real_tps)}
                            stroke={colorMap.real_tps}
                            strokeWidth={1.5}
                            curve={curveMonotoneX}
                          />
                          
                          {/* X-axis */}
                          <AxisBottom 
                            top={innerHeight} 
                            scale={xScale}
                            tickFormat={(index) => {
                              const idx = parseInt(index);
                              if (isNaN(idx) || idx < 0 || idx >= dateMap.length) return '';
                              const date = dateMap[idx];
                              // Custom formatting based on active time filter
                              switch(activeTimeFilter) {
                                case 'Y': return date.getFullYear().toString();
                                case 'Q': return `Q${Math.floor(date.getMonth() / 3) + 1}`;
                                case 'M': return date.toLocaleDateString('en-US', { month: 'short' });
                                case 'W': return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                case 'D':
                                default: return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              }
                            }}
                            stroke={colorMap.axisLines} 
                            strokeWidth={0.5} 
                            tickStroke="transparent" 
                            tickLength={0}
                            hideZero={true}
                            tickLabelProps={() => ({ 
                              fill: colorMap.tickLabels, 
                              fontSize: 11, 
                              fontWeight: 300, 
                              letterSpacing: '0.05em',
                              textAnchor: 'middle', 
                              dy: '0.7em',
                            })}
                            numTicks={Math.min(5, displayData.length)}
                          />
                          
                          {/* Y-axis (TPS values) */}
                          <AxisLeft 
                            scale={yScale}
                            stroke={colorMap.axisLines} 
                            strokeWidth={0.5} 
                            tickStroke="transparent" 
                            tickLength={0} 
                            numTicks={5}
                            tickFormat={(value) => formatTPS(value as number)}
                            tickLabelProps={() => ({ 
                              fill: colorMap.tickLabels, 
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
                    
                    // Helper function to get x position from index
                    function xPosition(index: string): number {
                      return (xScale(index) || 0);
                    }
                  }}
                </ParentSize>
              </div>
              
              {/* Brush component */}
              <div className="h-[15%] w-full mt-1">
                <BrushTimeScale
                  data={isModal ? modalData : data}
                  isModal={isModal}
                  activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
                  onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
                  onClearBrush={isModal 
                    ? () => { setModalBrushDomain(null); setIsModalBrushActive(false); }
                    : () => { setBrushDomain(null); setIsBrushActive(false); }
                  }
                  getDate={(d) => d.date}
                  getValue={(d) => d.total_tps}
                  lineColor={colorMap.total_tps}
                  margin={{ top: 5, right: 25, bottom: 10, left: 45 }}
                />
              </div>
            </div>
          );
        }
      }
    } catch (err) {
      console.error('[Chart] Error rendering chart:', err);
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
  };

  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="TPS Metrics" subtitle="Tracking Transactions Per Second (TPS) metrics in Solana">
        
        <div className="h-[60vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-full pr-3 border-r border-gray-900">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              <div className="text-[10px] text-gray-400 mb-2">METRICS</div>
              
              {/* Legend */}
              <div className="mt-2 flex flex-wrap gap-4 justify-center">
                <div className="flex items-center">
                  <div 
                    className="w-2.5 h-2.5 rounded-full mr-1.5" 
                    style={{ backgroundColor: defaultColorMap.total_tps }}
                  ></div>
                  <span className="text-[11px] text-gray-300">Total TPS</span>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-2.5 h-2.5 rounded-full mr-1.5" 
                    style={{ backgroundColor: defaultColorMap.success_tps }}
                  ></div>
                  <span className="text-[11px] text-gray-300">Success TPS</span>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-2.5 h-2.5 rounded-full mr-1.5" 
                    style={{ backgroundColor: defaultColorMap.failed_tps }}
                  ></div>
                  <span className="text-[11px] text-gray-300">Failed TPS</span>
                </div>
                <div className="flex items-center">
                  <div 
                    className="w-2.5 h-2.5 rounded-full mr-1.5" 
                    style={{ backgroundColor: defaultColorMap.real_tps }}
                  ></div>
                  <span className="text-[11px] text-gray-300">Real TPS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TPSMetricsChart; 