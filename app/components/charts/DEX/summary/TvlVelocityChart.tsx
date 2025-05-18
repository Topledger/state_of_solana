import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleBand, scaleTime } from '@visx/scale';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { LinePath, Bar } from '@visx/shape';
import { fetchTvlVelocityData, TimeFilter, TvlVelocityDataPoint } from '../../../../api/dex/summary/chartData';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
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

interface TvlVelocityChartProps {
  timeFilter: TimeFilter;
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

// Helper functions
const formatTvl = (value: number) => `$${Math.round(value / 1e9)}B`;
const formatVelocity = (value: number) => Number.isInteger(value) ? value.toString() : value.toFixed(1);
const formatDate = (dateStr: string, timeFilter?: TimeFilter) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    switch(timeFilter) {
      case 'Y': return date.getFullYear().toString();
      case 'Q': return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      case 'M': return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'D':
      default: return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (e) {
    return dateStr;
  }
};

// Determine colors based on the metrics' values
const determineMetricColors = (data: TvlVelocityDataPoint[]): { tvl: string, velocity: string } => {
  if (!data || data.length === 0) {
    return { tvl: colors[0], velocity: colors[1] }; // Default colors
  }
  
  // Calculate total values for each metric
  const totalTvl = data.reduce((sum, point) => sum + point.tvl, 0);
  const totalVelocity = data.reduce((sum, point) => sum + point.velocity, 0);
  
  // Create array of metrics with their totals
  const metrics = [
    { name: 'tvl', value: totalTvl },
    { name: 'velocity', value: totalVelocity }
  ].sort((a, b) => b.value - a.value); // Sort by value, highest first
  
  // Assign colors based on sorted order
  const metricColors: Record<string, string> = {};
  metrics.forEach((metric, index) => {
    metricColors[metric.name] = colors[index % colors.length];
  });
  
  return {
    tvl: metricColors['tvl'],
    velocity: metricColors['velocity']
  };
};

export const tvlVelocityColors = {
  axisLines: axisLines,
  tickLabels: tickLabels,
  grid: grid,
};

// Export a function to get chart colors for external use
export const getTvlVelocityChartColors = () => {
  // Default fallback colors
  return {
    tvl: colors[0],
    velocity: colors[1]
  };
};

// Helper function to get available metrics from the data
const getAvailableChartMetrics = (data: TvlVelocityDataPoint[], colors: { tvl: string, velocity: string }) => {
  if (!data || data.length === 0) return [];
  
  // Get the first data point to extract property names
  const samplePoint = data[0];
  
  // Filter out date and any other non-metric properties
  return Object.keys(samplePoint)
    .filter(key => key !== 'date')
    .map(key => {
      // Use proper display names for metrics
      const displayNames: Record<string, string> = {
        tvl: 'TVL',
        velocity: 'Velocity'
      };
      
      // Use the mapped display name or fallback to capitalized key
      const displayName = displayNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
      
      // Determine shape and color based on metric name
      const isLine = key === 'velocity';
      return {
        key,
        displayName,
        shape: isLine ? 'circle' : 'square',
        color: isLine ? colors.velocity : colors.tvl
      };
    });
};

const TvlVelocityChart: React.FC<TvlVelocityChartProps> = ({ 
  timeFilter, 
  isModalOpen = false, 
  onModalClose = () => {} 
}) => {
  // Main chart data
  const [data, setData] = useState<TvlVelocityDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<TvlVelocityDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Store metric colors based on data values
  const [metricColors, setMetricColors] = useState<{ tvl: string, velocity: string }>({ 
    tvl: colors[0], 
    velocity: colors[1] 
  });
  
  // Modal specific data
  const [modalData, setModalData] = useState<TvlVelocityDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<TimeFilter>(timeFilter);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<TvlVelocityDataPoint[]>([]);
  const [modalMetricColors, setModalMetricColors] = useState<{ tvl: string, velocity: string }>({
    tvl: colors[0],
    velocity: colors[1]
  });
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ visible: false, dataPoint: null as TvlVelocityDataPoint | null, left: 0, top: 0 });

  // Add refs for chart containers
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // Add refs for throttling
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  // Create a fetchData function that can be called to refresh data for main chart
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chartData = await fetchTvlVelocityData(timeFilter);
      if (chartData.length === 0) {
        setError('No data available for this period.');
        setData([]);
      } else {
        // Determine colors based on value magnitude
        const colors = determineMetricColors(chartData);
        setMetricColors(colors);
        
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
      const chartData = await fetchTvlVelocityData(modalTimeFilter);
      if (chartData.length === 0) {
        setModalError('No data available for this period.');
        setModalData([]);
        setModalFilteredData([]);
      } else {
        // Determine colors based on value magnitude for modal
        const colors = determineMetricColors(chartData);
        setModalMetricColors(colors);
        
        setModalData(chartData);
        setModalFilteredData(chartData);
        
        // Set brush as active but don't set a specific domain
        // This will result in the full range being selected
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

  // Fetch data for main chart on mount and when timeFilter changes
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

    // Filtering update is handled by the useEffect based on brushDomain,
    // but throttled via canUpdateFilteredDataRef

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

    // Filtering update is handled by the useEffect based on modalBrushDomain

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

  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    console.log('TvlVelocity - Mouse move event', { isModal, clientX: e.clientX, clientY: e.clientY });
    
    const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
    if (!chartEl) return;
    
    const rect = chartEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const margin = { left: 45 };
    const innerWidth = rect.width - margin.left - 20;
    
    if (mouseX < margin.left || mouseX > innerWidth + margin.left) {
      if (tooltip.visible) {
        console.log('TvlVelocity - Mouse outside chart area, hiding tooltip');
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
        console.log('TvlVelocity - Setting tooltip data', { 
          dataPoint,
          left: mouseX,
          top: mouseY
        });
        
        setTooltip({
          visible: true,
          dataPoint,
          left: mouseX,
          top: mouseY
        });
      }
    }
  }, [data, filteredData, modalData, modalFilteredData, isBrushActive, isModalBrushActive, tooltip.visible, tooltip.dataPoint?.date]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      console.log('TvlVelocity - Mouse leave, hiding tooltip');
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

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

  // Update modalTimeFilter when timeFilter changes
  useEffect(() => {
    // Only update modalTimeFilter from timeFilter when the modal isn't open
    // This prevents overriding user selections in the modal
    if (!isModalOpen) {
      setModalTimeFilter(timeFilter);
    }
  }, [timeFilter, isModalOpen]);

  // Initialize modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      // Initialize modal time filter with main time filter only on initial open
      // not on every render while modal is open
      setModalTimeFilter(timeFilter);
      
      // If we already have data loaded for the main chart with the same filter,
      // we can just use that data for the modal initially
      if (data.length > 0) {
        setModalData(data);
        setModalFilteredData(data);
        setModalLoading(false);
        setModalError(null);
        
        // Set brush as active but don't set a specific domain
        // This will result in the full range being selected
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      } else {
        // Otherwise fetch data specifically for the modal
        fetchModalData();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, timeFilter, data]); // Include necessary dependencies but not fetchModalData
  
  // Fetch modal data when modalTimeFilter changes and modal is open
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [modalTimeFilter, isModalOpen, fetchModalData]);

  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: TimeFilter) => {
    console.log('Time filter changed to:', newFilter);
    setModalTimeFilter(newFilter);
  }, []);

  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modalTimeFilter and modalData if in modal mode, otherwise use the main timeFilter and data
    const activeTimeFilter = isModal ? modalTimeFilter : timeFilter;
    const activeData = isModal ? modalData : data;
    const activeFilteredData = isModal ? (isModalBrushActive ? modalFilteredData : modalData) : (isBrushActive ? filteredData : data);
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const activeIsBrushActive = isModal ? isModalBrushActive : isBrushActive;
    const activeHandleBrushChange = isModal ? handleModalBrushChange : handleBrushChange;
    const activeColors = isModal ? modalMetricColors : metricColors;
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
            title={formatDate(tooltip.dataPoint.date, activeTimeFilter)}
            items={[
              { color: activeColors.tvl, label: 'TVL', value: formatTvl(tooltip.dataPoint.tvl), shape: 'square' },
              { color: activeColors.velocity, label: 'Velocity', value: formatVelocity(tooltip.dataPoint.velocity), shape: 'circle' }
            ]}
            top={tooltip.top}
            left={tooltip.left}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div className="h-[85%] w-full overflow-hidden relative"
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
          ref={isModal ? modalChartRef : chartContainerRef}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null; 
              
              const margin = { top: 5, right: 25, bottom: 30, left: 45 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;

              // Use displayed data for this chart (modal or main)
              const displayData = activeFilteredData;
              
              // Create a time domain from the current data
              const dateDomain = displayData.map(d => new Date(d.date));
              
              // Use consistent scaleTime for both chart and brush
              const dateScale = scaleBand<Date>({
                domain: dateDomain,
                range: [0, innerWidth],
                padding: 0.3,
              });

              const tvlScale = scaleLinear<number>({
                domain: [0, Math.max(...displayData.map(d => d.tvl)) * 1.1],
                range: [innerHeight, 0],
                nice: true,
              });

              const velocityScale = scaleLinear<number>({
                domain: [0, Math.max(...displayData.map(d => d.velocity)) * 1.1],
                range: [innerHeight, 0],
                nice: true,
              });
              
              return (
                  <svg width={width} height={height} className="overflow-visible">
                    <Group left={margin.left} top={margin.top}>
                    <GridRows scale={tvlScale} width={innerWidth} stroke={tvlVelocityColors.grid} strokeDasharray="2,3" strokeOpacity={0.5} numTicks={5} />
                    
                    {/* Display active brush status */}
                    {activeIsBrushActive && (
                      <text x={0} y={-8} fontSize={8} fill={activeColors.velocity} textAnchor="start">
                        {`Filtered: ${displayData.length} item${displayData.length !== 1 ? 's' : ''}`}
                      </text>
                    )}
                    
                    {displayData.map((d) => {
                      const date = new Date(d.date);
                      const barX = dateScale(date);
                        const barWidth = dateScale.bandwidth();
                      const barHeight = Math.max(0, innerHeight - tvlScale(d.tvl));
                        if (barX === undefined || barHeight < 0) return null;
                        return (
                        <Bar key={`bar-${d.date}`} x={barX} y={innerHeight - barHeight} width={barWidth} height={barHeight}
                          fill={activeColors.tvl} opacity={tooltip.dataPoint?.date === d.date ? 1 : 0.7} />
                        );
                      })}
                    
                    <LinePath data={displayData}
                      x={(d) => (dateScale(new Date(d.date)) ?? 0) + dateScale.bandwidth() / 2}
                      y={(d) => velocityScale(d.velocity)}
                      stroke={activeColors.velocity} strokeWidth={1.5} curve={curveMonotoneX} />
                    
                    <AxisBottom top={innerHeight} scale={dateScale}
                      tickFormat={(date) => {
                        const d = date as Date;
                        // Custom formatting to exclude year
                        switch(activeTimeFilter) {
                          case 'Y': return d.getFullYear().toString();
                          case 'Q': return `Q${Math.floor(d.getMonth() / 3) + 1}`;
                          case 'M': return d.toLocaleDateString('en-US', { month: 'short' });
                          case 'D':
                          default: return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                      }}
                      stroke={tvlVelocityColors.axisLines} strokeWidth={0.5} tickStroke="transparent" tickLength={0}
                      hideZero={true}
                      tickLabelProps={(value, index) => ({ 
                        fill: tvlVelocityColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: index === 0 ? 'start' : 'middle', 
                        dy: '0.5em',
                        dx: index === 0 ? '0.5em' : 0
                      })}
                      numTicks={activeTimeFilter === 'Y' ? data.length : Math.min(5, data.length)} />
                    
                    <AxisLeft scale={tvlScale} stroke={tvlVelocityColors.axisLines} strokeWidth={0.5} tickStroke="transparent" tickLength={0} numTicks={5}
                      tickFormat={(value) => formatTvl(Number(value))}
                      tickLabelProps={() => ({ 
                        fill: tvlVelocityColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'end', 
                        dx: '-0.6em', 
                        dy: '0.25em' 
                      })} />
                    
                    <AxisRight left={innerWidth} scale={velocityScale} stroke={tvlVelocityColors.axisLines} strokeWidth={0.5}
                      tickStroke="transparent" tickLength={0} numTicks={5}
                      tickFormat={(value) => formatVelocity(Number(value))}
                      tickLabelProps={() => ({ 
                        fill: tvlVelocityColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'start', 
                        dx: '0.5em', 
                        dy: '0.25em' 
                      })} />
                  </Group>
                </svg>
              );
            }}
          </ParentSize>
        </div>
        
        {/* Brush component - now shown for both main chart and modal */}
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
            getValue={(d) => d.tvl}
            lineColor={activeColors.tvl}
            margin={{ top: 5, right: 25, bottom: 10, left: 45 }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="TVL and Velocity Trends" subtitle="Tracking value locked and market velocity across the ecosystem">
        
        {/* Time filter */}
        <div className="flex items-center justify-start pl-1 py-0 mb-3">
          <TimeFilterSelector value={modalTimeFilter} onChange={handleModalTimeFilterChange} />
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
            <div className="w-[10%] pl-3">
              <div className="flex flex-col gap-4 pt-4">
                {!modalLoading && modalData.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {getAvailableChartMetrics(modalData, modalMetricColors).map(metric => (
                      <div key={metric.key} className="flex items-start">
                        <div 
                          className={`w-2.5 h-2.5 mr-2 ${metric.shape === 'circle' ? 'rounded-full' : 'rounded-sm'} mt-0.5`}
                          style={{ background: metric.color }}
                        ></div>
                        <span className="text-[11px] text-gray-300">{metric.displayName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Loading states */}
                    <div className="flex items-start">
                      <div className="w-2.5 h-2.5 bg-blue-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                      <span className="text-[11px] text-gray-300">Loading...</span>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-2.5 h-2.5 bg-purple-500 mr-2 rounded-full mt-0.5 animate-pulse"></div>
                      <span className="text-[11px] text-gray-300">Loading...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TvlVelocityChart; 