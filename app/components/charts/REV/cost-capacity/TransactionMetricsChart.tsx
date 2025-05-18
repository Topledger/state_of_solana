import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { LinePath } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleTime, scaleBand } from '@visx/scale';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import ChartTooltip from '../../../shared/ChartTooltip';
import Loader from '../../../shared/Loader';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import CurrencyFilter from '../../../shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '../../../shared/filters/DisplayModeFilter';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import { TimeFilter, CurrencyType } from '../../../../api/REV/cost-capacity';
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

// Chart types
export type ChartType = 'volume' | 'success-rate' | 'success-volume' | 'tps' | 'all';

// Props interface
interface TransactionMetricsChartProps {
  timeFilter: TimeFilter;
  displayMode?: DisplayMode;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (filter: TimeFilter) => void;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  chartType?: ChartType;
}

// Define chart colors
export const transactionMetricsColors = {
  total_vote_transactions: colors[0], // blue
  total_non_vote_transactions: colors[1], // purple 
  successful_transactions_perc: colors[2], // green
  successful_non_vote_transactions_perc: colors[3], // orange
  total_tps: colors[0], // blue
  success_tps: colors[2], // green
  failed_tps: colors[4], // red
  real_tps: colors[1], // purple
  grid: grid,
  axisLines: axisLines,
  tickLabels: tickLabels,
};

// Sort metrics by total value and assign colors
const getMetricColorMap = (data: TransactionDataPoint[], chartType: ChartType) => {
  if (data.length === 0) return transactionMetricsColors;
  
  // Define what metrics to include based on chart type
  let metrics: string[] = [];
  
  if (chartType === 'volume' || chartType === 'all' || chartType === 'success-volume') {
    metrics.push('total_vote_transactions', 'total_non_vote_transactions');
  }
  
  if (chartType === 'success-rate' || chartType === 'all' || chartType === 'success-volume') {
    metrics.push('successful_transactions_perc', 'successful_non_vote_transactions_perc');
  }
  
  if (chartType === 'tps') {
    metrics.push('total_tps', 'success_tps', 'failed_tps', 'real_tps');
  }
  
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
    colors[1], // purple
    colors[2], // green
    colors[3], // orange
    colors[4], // red
    colors[5], // yellow
  ];
  
  // Assign colors to metrics based on their value
  const colorMap: { [key: string]: string } = {};
  sortedMetrics.forEach((metric, index) => {
    colorMap[metric] = availableColors[index % availableColors.length];
  });
  
  return {
    ...transactionMetricsColors,
    ...colorMap,
    // Preserve grid and axis colors
    grid: transactionMetricsColors.grid,
    axisLines: transactionMetricsColors.axisLines,
    tickLabels: transactionMetricsColors.tickLabels
  };
};

const TransactionMetricsChart: React.FC<TransactionMetricsChartProps> = ({
  timeFilter,
  displayMode = 'absolute',
  isModalOpen = false,
  onModalClose = () => {},
  onTimeFilterChange,
  onDisplayModeChange,
  chartType = 'all',
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
      console.log('Calling fetchTransactionsData with:', timeFilter);
      // Use the real API endpoint
      const chartData = await fetchTransactionsData(timeFilter);
      
      if (chartData.length === 0) {
        console.error('No data available for this period');
        setError('No data available for this period.');
        setData([]);
      } else {
        console.log('Fetched transaction data:', chartData);
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
    canUpdateModalFilteredDataRef.current = false;

    // Clear previous timeout just in case
    if (modalThrottleTimeoutRef.current) {
      clearTimeout(modalThrottleTimeoutRef.current);
    }

    // Set timeout to allow updates again after interval
    modalThrottleTimeoutRef.current = setTimeout(() => {
      canUpdateModalFilteredDataRef.current = true;
    }, 100); // 100ms throttle interval

  }, [modalBrushDomain, modalData, isModalBrushActive]);

  // Tooltip event handlers
  const handleMouseMove = (event: React.MouseEvent, isModal = false) => {
    try {
      if (!data || data.length === 0 || !chartRef.current) return;
      
      const chartElement = isModal ? modalChartRef.current : chartRef.current;
      if (!chartElement) return;
      
      const chartRect = chartElement.getBoundingClientRect();
      const mouseX = event.clientX - chartRect.left;
      const mouseY = event.clientY - chartRect.top;
      
      // Use active filtered data for interactive elements
      const activeData = isModal 
        ? (isModalBrushActive ? modalFilteredData : modalData) 
        : (isBrushActive ? filteredData : data);
      
      if (activeData.length === 0) return;
      
      // Calculate position within chart
      const margin = { top: 5, right: 25, bottom: 30, left: 45 };
      const innerWidth = chartRect.width - margin.left - margin.right;
      
      // Number of data points visible
      const dataPointWidth = innerWidth / activeData.length;
      
      // Find closest data point to mouse position
      const dataIndex = Math.min(
        Math.max(0, Math.floor((mouseX - margin.left) / dataPointWidth)),
        activeData.length - 1
      );
      
      if (dataIndex < 0 || dataIndex >= activeData.length) return;
      
      // Get data point at this index
      const dataPoint = activeData[dataIndex];
      
      // Set tooltip data and position
      setTooltip({
        visible: true,
        dataPoint: dataPoint,
        top: mouseY,
        left: mouseX + 20 // Offset to the right of cursor
      });
    } catch (error) {
      console.error('Error handling mouse movement:', error);
    }
  };
  
  // Handle mouse leave event for tooltip
  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // Function to format tooltip items based on chart type
  const getTooltipItems = (dataPoint: TransactionDataPoint) => {
    const items: Array<{
      color: string;
      label: string;
      value: string;
      shape: 'square' | 'circle';
    }> = [];
    
    // Add appropriate metrics based on chart type
    if (chartType === 'volume') {
      items.push(
        {
          color: transactionMetricsColors.total_vote_transactions,
          label: 'Vote Transactions',
          value: formatLargeNumber(dataPoint.total_vote_transactions),
          shape: 'square' as const
        },
        {
          color: transactionMetricsColors.total_non_vote_transactions,
          label: 'Non-Vote Transactions',
          value: formatLargeNumber(dataPoint.total_non_vote_transactions),
          shape: 'square' as const
        }
      );
    } else if (chartType === 'success-rate') {
      items.push(
        {
          color: transactionMetricsColors.successful_transactions_perc,
          label: 'Success Rate',
          value: formatPercentage(dataPoint.successful_transactions_perc),
          shape: 'circle' as const
        },
        {
          color: transactionMetricsColors.successful_non_vote_transactions_perc,
          label: 'Non-Vote Success Rate',
          value: formatPercentage(dataPoint.successful_non_vote_transactions_perc),
          shape: 'circle' as const
        }
      );
    } else if (chartType === 'success-volume') {
      items.push(
        {
          color: transactionMetricsColors.successful_transactions_perc,
          label: 'Success Rate',
          value: formatPercentage(dataPoint.successful_transactions_perc),
          shape: 'circle' as const
        },
        {
          color: transactionMetricsColors.successful_non_vote_transactions_perc,
          label: 'Non-Vote Success Rate',
          value: formatPercentage(dataPoint.successful_non_vote_transactions_perc),
          shape: 'circle' as const
        },
        {
          color: transactionMetricsColors.total_vote_transactions,
          label: 'Vote Transactions',
          value: formatLargeNumber(dataPoint.total_vote_transactions),
          shape: 'square' as const
        },
        {
          color: transactionMetricsColors.total_non_vote_transactions,
          label: 'Non-Vote Transactions',
          value: formatLargeNumber(dataPoint.total_non_vote_transactions),
          shape: 'square' as const
        }
      );
    } else if (chartType === 'tps') {
      items.push(
        {
          color: transactionMetricsColors.total_tps,
          label: 'Total TPS',
          value: formatLargeNumber(dataPoint.total_tps),
          shape: 'square' as const
        },
        {
          color: transactionMetricsColors.success_tps,
          label: 'Success TPS',
          value: formatLargeNumber(dataPoint.success_tps),
          shape: 'square' as const
        },
        {
          color: transactionMetricsColors.failed_tps,
          label: 'Failed TPS',
          value: formatLargeNumber(dataPoint.failed_tps),
          shape: 'square' as const
        },
        {
          color: transactionMetricsColors.real_tps,
          label: 'Real TPS',
          value: formatLargeNumber(dataPoint.real_tps),
          shape: 'square' as const
        }
      );
    }
    
    return items;
  };

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
  
  // Format percentage values
  const formatPercentage = (value: number): string => {
    return `${Math.round(value)}%`;
  };
  
  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle time filter change in modal
  const handleModalTimeFilterChange = (newTimeFilter: TimeFilter) => {
    setModalTimeFilter(newTimeFilter);
    // If there's a parent callback, call it too
    if (onTimeFilterChange) {
      onTimeFilterChange(newTimeFilter);
    }
  };

  // Handle display mode change in modal
  const handleModalDisplayModeChange = (newMode: DisplayMode) => {
    setModalDisplayMode(newMode);
  };

  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
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
    
    // Get dynamic color map based on data values
    const colorMap = getMetricColorMap(activeFilteredData, chartType);
    
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
            items={getTooltipItems(tooltip.dataPoint)}
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
              console.log('Display data length:', displayData.length);
              
              // For line charts
              const dateScale = scaleTime({
                domain: [
                  new Date(displayData[0]?.date || new Date()),
                  new Date(displayData[displayData.length - 1]?.date || new Date())
                ],
                range: [0, innerWidth]
              });
              
              // Determine which metrics to display based on chartType
              const showVolumeMetrics = chartType === 'volume' || chartType === 'all' || chartType === 'success-volume';
              const showSuccessRateMetrics = chartType === 'success-rate' || chartType === 'all' || chartType === 'success-volume';
              const showTpsMetrics = chartType === 'tps';
              
              // Volume metrics scale
              const volumeMax = showVolumeMetrics ? Math.max(
                ...displayData.map(d => Math.max(d.total_vote_transactions, d.total_non_vote_transactions))
              ) : 0;
              
              const volumeScale = scaleLinear({
                domain: [0, volumeMax * 1.1], // Add 10% padding
                range: [innerHeight, 0],
                nice: true,
                round: false // Don't round values to ensure all grid lines show up
              });
              
              // Calculate explicit tick values for volume grid lines
              const volumeTickValues = Array.from({ length: 8 }, (_, i) => 
                i * (volumeMax * 1.1) / 7
              );
              
              // Success rate scale (always 0-100%)
              const percentScale = scaleLinear({
                domain: [0, 100],
                range: [innerHeight, 0],
                nice: true,
                round: false // Don't round values to ensure all grid lines show up
              });
              
              // Calculate explicit tick values for percent grid lines (0-100%)
              const percentTickValues = Array.from({ length: 8 }, (_, i) => 
                i * 100 / 7
              );
              
              // TPS metrics scale
              const tpsMax = showTpsMetrics ? Math.max(
                ...displayData.map(d => Math.max(d.total_tps, d.success_tps, d.failed_tps, d.real_tps))
              ) : 0;
              
              const tpsScale = scaleLinear({
                domain: [0, tpsMax * 1.1], // Add 10% padding
                range: [innerHeight, 0],
                nice: true,
                round: false // Don't round values to ensure all grid lines show up
              });
              
              // Calculate explicit tick values for TPS grid lines
              const tpsTickValues = Array.from({ length: 8 }, (_, i) => 
                i * (tpsMax * 1.1) / 7
              );
              
              return (
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid lines - use appropriate tick values based on chart type */}
                    <GridRows
                      scale={volumeScale}
                      width={innerWidth}
                      height={innerHeight}
                      stroke={colorMap.grid}
                      strokeOpacity={0.6}
                      strokeDasharray="2,3"
                      tickValues={showVolumeMetrics ? volumeTickValues : 
                                 showTpsMetrics ? tpsTickValues : 
                                 percentTickValues}
                    />

                    {/* Volume line charts */}
                    {showVolumeMetrics && (
                      <>
                        {/* Vote Transactions Line */}
                        <LinePath
                          data={displayData}
                          x={d => dateScale(new Date(d.date))}
                          y={d => volumeScale(d.total_vote_transactions)}
                          stroke={colorMap.total_vote_transactions}
                          strokeWidth={1.5}
                          curve={curveMonotoneX}
                        />
                        
                        {/* Non-Vote Transactions Line */}
                        <LinePath
                          data={displayData}
                          x={d => dateScale(new Date(d.date))}
                          y={d => volumeScale(d.total_non_vote_transactions)}
                          stroke={colorMap.total_non_vote_transactions}
                          strokeWidth={1.5}
                          curve={curveMonotoneX}
                        />
                      </>
                    )}
                    
                    {/* Success rate line charts */}
                    {showSuccessRateMetrics && (
                      <>
                        {/* Success Rate Line */}
                        <LinePath
                          data={displayData}
                          x={d => dateScale(new Date(d.date))}
                          y={d => percentScale(d.successful_transactions_perc)}
                          stroke={colorMap.successful_transactions_perc}
                          strokeWidth={1.5}
                          curve={curveMonotoneX}
                        />
                        
                        {/* Non-Vote Success Rate Line */}
                        <LinePath
                          data={displayData}
                          x={d => dateScale(new Date(d.date))}
                          y={d => percentScale(d.successful_non_vote_transactions_perc)}
                          stroke={colorMap.successful_non_vote_transactions_perc}
                          strokeWidth={1.5}
                          curve={curveMonotoneX}
                        />
                      </>
                    )}
                    
                    {/* TPS line charts */}
                    {showTpsMetrics && (
                      <>
                        {/* Total TPS Line */}
                        <LinePath
                          data={displayData}
                          x={d => dateScale(new Date(d.date))}
                          y={d => tpsScale(d.total_tps)}
                          stroke={colorMap.total_tps}
                          strokeWidth={1.5}
                          curve={curveMonotoneX}
                        />
                        
                        {/* Success TPS Line */}
                        <LinePath
                          data={displayData}
                          x={d => dateScale(new Date(d.date))}
                          y={d => tpsScale(d.success_tps)}
                          stroke={colorMap.success_tps}
                          strokeWidth={1.5}
                          curve={curveMonotoneX}
                        />
                        
                        {/* Failed TPS Line */}
                        <LinePath
                          data={displayData}
                          x={d => dateScale(new Date(d.date))}
                          y={d => tpsScale(d.failed_tps)}
                          stroke={colorMap.failed_tps}
                          strokeWidth={1.5}
                          curve={curveMonotoneX}
                        />
                        
                        {/* Real TPS Line */}
                        <LinePath
                          data={displayData}
                          x={d => dateScale(new Date(d.date))}
                          y={d => tpsScale(d.real_tps)}
                          stroke={colorMap.real_tps}
                          strokeWidth={1.5}
                          curve={curveMonotoneX}
                        />
                      </>
                    )}
                    
                    {/* Left y-axis for volume */}
                    {showVolumeMetrics && (
                      <AxisLeft
                        scale={volumeScale}
                        left={0}
                        tickFormat={(value) => formatLargeNumber(value as number)}
                        stroke={colorMap.axisLines}
                        strokeWidth={0.5}
                        tickStroke="transparent"
                        tickLength={0}
                        numTicks={5}
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
                    )}
                    
                    {/* Right y-axis for percentages */}
                    {showSuccessRateMetrics && (
                      <AxisRight
                        scale={percentScale}
                        left={innerWidth}
                        tickFormat={(value) => `${value as number}%`}
                        stroke={colorMap.axisLines}
                        strokeWidth={0.5}
                        tickStroke="transparent"
                        tickLength={0}
                        numTicks={5}
                        tickLabelProps={() => ({
                          fill: colorMap.tickLabels,
                          fontSize: 11,
                          fontWeight: 300,
                          letterSpacing: '0.05em',
                          textAnchor: 'start',
                          dx: '0.5em',
                          dy: '0.25em'
                        })}
                      />
                    )}
                    
                    {/* Left y-axis for TPS */}
                    {showTpsMetrics && (
                      <AxisLeft
                        scale={tpsScale}
                        left={0}
                        tickFormat={(value) => formatLargeNumber(value as number)}
                        stroke={colorMap.axisLines}
                        strokeWidth={0.5}
                        tickStroke="transparent"
                        tickLength={0}
                        numTicks={5}
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
                    )}

                    {/* Add X-axis (date axis) */}
                    <AxisBottom 
                      top={innerHeight}
                      scale={dateScale}
                      tickFormat={(date) => {
                        const d = date as Date;
                        // Custom formatting based on active time filter
                        switch(activeTimeFilter) {
                          case 'Y': return d.getFullYear().toString();
                          case 'Q': return `Q${Math.floor(d.getMonth() / 3) + 1}`;
                          case 'M': return d.toLocaleDateString('en-US', { month: 'short' });
                          case 'W': return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          case 'D':
                          default: return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                      }}
                      stroke={colorMap.axisLines}
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideZero={true}
                      numTicks={Math.min(5, displayData.length)}
                      tickLabelProps={(value, index) => ({
                        fill: colorMap.tickLabels,
                        fontSize: 11,
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'middle',
                        dy: '0.7em'
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
            onClearBrush={activeClearBrush}
            getDate={(d) => d.date}
            getValue={(d) => {
              // Use an appropriate metric based on chart type
              if (chartType === 'tps') return d.total_tps;
              if (chartType === 'success-rate') return d.successful_transactions_perc;
              // Default to total transactions for volume
              return d.total_vote_transactions + d.total_non_vote_transactions;
            }}
            lineColor={colorMap.total_vote_transactions}
            margin={{ top: 5, right: 25, bottom: 10, left: 45 }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full">
      {renderChartContent(0, 0)}
      
      {/* Modal with expanded chart */}
      <Modal
        isOpen={isModalOpen}
        onClose={onModalClose}
        title="Transaction Metrics"
        subtitle={`${chartType === 'volume' ? 'Volume Metrics' : chartType === 'success-rate' ? 'Success Rate Metrics' : chartType === 'success-volume' ? 'Success Rate and Volume Metrics' : chartType === 'tps' ? 'TPS Metrics' : 'Transaction Metrics'}`}
      >
        <div className="h-[60vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-full pr-3 border-r border-gray-900">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              
              {getTooltipItems({
                date: '',
                total_transactions: 0,
                successful_transactions: 0,
                failed_transactions: 0,
                total_vote_transactions: 0,
                total_non_vote_transactions: 0,
                successful_vote_transactions: 0,
                successful_non_vote_transactions: 0,
                failed_vote_transactions: 0,
                failed_non_vote_transactions: 0,
                successful_transactions_perc: 0,
                non_vote_transactions_perc: 0,
                successful_non_vote_transactions_perc: 0,
                total_tps: 0,
                success_tps: 0,
                failed_tps: 0,
                real_tps: 0,
                total_fees: 0,
                non_vote_transactions_fees: 0,
                vote_transactions_fees: 0,
                priority_fees: 0,
              }).map((item, index) => (
                <div key={index} className="flex items-center mb-1.5">
                  <div 
                    className={`w-2.5 h-2.5 mr-1.5 ${item.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`} 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-[11px] text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TransactionMetricsChart; 