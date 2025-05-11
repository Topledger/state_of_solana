import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleBand, scaleTime } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar, BarStack } from '@visx/shape';
import { CostCapacityDataPoint, TimeFilter, CurrencyType, fetchCostCapacityData, formatValue, formatDate, stackKeys } from '../../../../api/REV/cost-capacity';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import CurrencyFilter from '../../../shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '../../../shared/filters/DisplayModeFilter';

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
interface CostCapacityChartProps {
  timeFilter: TimeFilter;
  currencyFilter: CurrencyType;
  displayMode?: DisplayMode;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (filter: TimeFilter) => void;
  onCurrencyChange?: (currency: CurrencyType) => void;
  onDisplayModeChange?: (mode: DisplayMode) => void;
}

// Chart colors
export const costCapacityColors = {
  base_fee: '#60a5fa', // blue
  priority_fee: '#a78bfa', // purple
  jito_total_tips: '#34d399', // green
  vote_fees: '#f97316', // orange
  grid: '#1f2937',
  axisLines: '#374151',
  tickLabels: '#6b7280',
};

// Stack implementation for BarStack
const getStackedData = (
  data: CostCapacityDataPoint[], 
  keys: string[]
) => {
  console.log('Original data dates:', data.slice(0, 3).map(d => d.date));
  
  // Check date format patterns
  const datePatterns = data.slice(0, 5).map(d => {
    const dateStr = d.date;
    return {
      original: dateStr,
      format: dateStr.length,
      containsTime: dateStr.includes('T') || dateStr.includes(':')
    };
  });
  console.log('Date format patterns:', datePatterns);
  
  const result = data.map(d => {
    const dateKey = d.date;
    // Be more explicit about date parsing
    // Try to standardize the date format
    let formattedDate: Date;
    
    // Handle different date formats
    if (dateKey.includes('T')) {
      // ISO format with time
      formattedDate = new Date(dateKey);
    } else if (dateKey.includes('-')) {
      // Date only format (YYYY-MM-DD)
      const [year, month, day] = dateKey.split('-').map(Number);
      formattedDate = new Date(year, month - 1, day);
    } else {
      // Fallback
      formattedDate = new Date(dateKey);
    }
    
    // Using string keys for type safety
    const x = formattedDate;
    
    // Include all keys from keys array
    const result: any = { x };
    keys.forEach(key => {
      // @ts-ignore: We know these keys exist in the data
      result[key] = d[key];
    });
    
    return result;
  });
  
  console.log('First 3 stacked data items:', result.slice(0, 3));
  console.log('Unique dates in stacked data:', new Set(result.map(d => d.x.toString())).size);
  
  return result;
};

// Modified colors function that accepts a string key
const getKeyColor = (key: string) => {
  if (key in costCapacityColors) {
    return costCapacityColors[key as keyof typeof costCapacityColors];
  }
  return '#cccccc'; // fallback
};

const CostCapacityChart: React.FC<CostCapacityChartProps> = ({ 
  timeFilter, 
  currencyFilter,
  displayMode = 'absolute',
  isModalOpen = false, 
  onModalClose = () => {},
  onTimeFilterChange,
  onCurrencyChange,
  onDisplayModeChange
}) => {
  // Main chart data
  const [data, setData] = useState<CostCapacityDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<CostCapacityDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [_displayMode, _setDisplayMode] = useState<DisplayMode>(displayMode);
  
  // Modal specific data
  const [modalData, setModalData] = useState<CostCapacityDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<TimeFilter>(timeFilter);
  const [modalCurrencyFilter, setModalCurrencyFilter] = useState<CurrencyType>(currencyFilter);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<CostCapacityDataPoint[]>([]);
  const [modalDisplayMode, setModalDisplayMode] = useState<DisplayMode>(_displayMode);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as CostCapacityDataPoint | null, 
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
      console.log('Calling fetchCostCapacityData with:', timeFilter, currencyFilter);
      // Use the real API endpoint
      const chartData = await fetchCostCapacityData(timeFilter, currencyFilter);
      
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
  }, [timeFilter, currencyFilter]);

  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const chartData = await fetchCostCapacityData(modalTimeFilter, modalCurrencyFilter);
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
  }, [modalTimeFilter, modalCurrencyFilter]);

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

  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const margin = { left: 45 };
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
        console.log('Tooltip data point:', dataPoint);
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
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Handle modal-related effects
  useEffect(() => {
    if (isModalOpen) {
      // Set modal filters from main chart
      setModalTimeFilter(timeFilter);
      setModalCurrencyFilter(currencyFilter);
      setModalDisplayMode(_displayMode);
      
      // Initialize with current main chart data
      setModalData(data);
      setModalFilteredData(filteredData.length > 0 ? filteredData : data);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      
      // Force fetch new data for modal to ensure it's updated
      fetchModalData();
    }
  }, [isModalOpen, timeFilter, currencyFilter, _displayMode, data, filteredData, brushDomain, isBrushActive, fetchModalData]);
  
  // Fetch modal data when time filter or currency changes in modal
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [isModalOpen, modalTimeFilter, modalCurrencyFilter, fetchModalData]);
  
  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: TimeFilter) => {
    setModalTimeFilter(newFilter);
  }, []);

  // Handle modal currency filter change
  const handleModalCurrencyFilterChange = useCallback((newCurrency: CurrencyType) => {
    setModalCurrencyFilter(newCurrency);
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

  // Format the display name for fee types
  const getFeeTypeDisplayName = (feeType: string) => {
    switch (feeType) {
      case 'base_fee':
        return 'Base Fee';
      case 'priority_fee':
        return 'Priority Fee';
      case 'jito_total_tips':
        return 'Jito total tips';
      case 'vote_fees':
        return 'Vote Fees';
      default:
        return feeType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };
  
  // Format percentage values
  const formatPercentage = (value: number): string => {
    return `${Math.round(value)}%`;
  };
  
  // Format value specifically for tooltips to include SOL text
  const formatTooltipValue = (value: number, currency: CurrencyType, isPercentMode: boolean = false, total: number = 0): string => {
    // For percentage mode
    if (isPercentMode) {
      const percentage = total > 0 ? (value / total) * 100 : 0;
      return formatPercentage(percentage);
    }
    
    // For absolute values
    // First get the basic formatted value
    let formattedValue = formatValue(value, currency);
    
    // For SOL currency, append " SOL" if it's not already there
    if (currency === 'SOL' && !formattedValue.includes('SOL')) {
      formattedValue += ' SOL';
    }
    
    return formattedValue;
  };

  // Helper function to render a stacked bar
  const renderStackedBar = (
    dataPoint: CostCapacityDataPoint, 
    xPosition: number, 
    barWidth: number, 
    yScale: any, 
    innerHeight: number,
    isHighlighted: boolean = false,
    isPercentMode: boolean = false
  ) => {
    let yOffset = innerHeight;
    
    // For percentage mode, calculate total for this data point
    const total = isPercentMode
      ? stackKeys.reduce((sum: number, key: string) => sum + (Number(dataPoint[key as keyof typeof dataPoint]) || 0), 0)
      : 0;
    
    return (
      <g key={`bar-${dataPoint.date}`}>
        {stackKeys.map((key: string, keyIndex: number) => {
          const rawValue = Number(dataPoint[key as keyof typeof dataPoint]) || 0;
          
          // Calculate the value to use for rendering (absolute or percentage)
          const value = isPercentMode 
            ? (total > 0 ? (rawValue / total) * 100 : 0) // Convert to percentage when in percent mode
            : rawValue;
          
          const barHeight = innerHeight - yScale(value);
          
          // Update y-offset for stacking
          yOffset -= barHeight;
          
          return (
            <rect
              key={`bar-segment-${dataPoint.date}-${key}`}
              x={xPosition}
              y={yOffset}
              width={barWidth}
              height={barHeight}
              fill={costCapacityColors[key as keyof typeof costCapacityColors]}
              opacity={isHighlighted ? 1 : 0.75}
              rx={2}
              onMouseEnter={() => {
                // Could add mouse handling here if needed
              }}
            />
          );
        })}
      </g>
    );
  };

  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modal data/filters if in modal mode, otherwise use the main data/filters
    const activeTimeFilter = isModal ? modalTimeFilter : timeFilter;
    const activeCurrencyFilter = isModal ? modalCurrencyFilter : currencyFilter;
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
            title={formatDate(tooltip.dataPoint.date, activeTimeFilter)}
            items={stackKeys.map((key: string) => {
              const value = (tooltip.dataPoint as any)[key] || 0;
              
              // For percentage mode, calculate the total of all values for this data point
              let tooltipValue = value;
              let total = 0;
              
              if (activeDisplayMode === 'percent') {
                total = stackKeys.reduce((sum: number, k: string) => sum + (Number((tooltip.dataPoint as any)[k]) || 0), 0);
              }
              
              return {
                color: costCapacityColors[key as keyof typeof costCapacityColors],
                label: getFeeTypeDisplayName(key),
                value: formatTooltipValue(value, activeCurrencyFilter, activeDisplayMode === 'percent', total),
                shape: 'square'
              };
            })}
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
              
              // SIMPLE APPROACH: Render each data point as a separate bar
              // Create evenly-spaced positions on the x-axis
              const totalBarWidth = innerWidth / displayData.length;
              const barWidth = totalBarWidth * 0.8; // Leave 20% gap between bars
              
              // Calculate max value for y-axis scale
              const maxValue = activeDisplayMode === 'percent'
                ? 100 // For percentage mode, max is always 100%
                : Math.max(
                    ...displayData.map(d => 
                      stackKeys.reduce((sum: number, key: string) => sum + (Number(d[key as keyof typeof d]) || 0), 0)
                    )
                  );
              
              // Create y-scale
              const yScale = scaleLinear({
                domain: [0, activeDisplayMode === 'percent' ? 100 : maxValue * 1.1], // Add 10% padding for absolute mode
                range: [innerHeight, 0],
                nice: true
              });
              
              // Debug what we're plotting
              console.log('Bar rendering info:', {
                dataPoints: displayData.length,
                innerWidth,
                totalBarWidth,
                barWidth,
                maxValue,
                isPercentMode: activeDisplayMode === 'percent'
              });
              
              // Render all bars directly instead of using BarStack
              return (
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid lines */}
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      height={innerHeight}
                      stroke={costCapacityColors.grid}
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                      numTicks={5}
                    />
                    
                    {/* Render bars for each data point */}
                    {displayData.map((dataPoint, index) => {
                      // Calculate the left position for this group of stacked bars
                      const xPosition = index * totalBarWidth;
                      
                      // Draw date labels for debug
                      if (index % Math.max(1, Math.floor(displayData.length / 6)) === 0) {
                        return (
                          <g key={`bar-group-${index}`}>
                            {/* Render the stacked bar segments */}
                            {renderStackedBar(
                              dataPoint, 
                              xPosition, 
                              barWidth, 
                              yScale, 
                              innerHeight,
                              tooltip.dataPoint?.date === dataPoint.date,
                              activeDisplayMode === 'percent'
                            )}
                          </g>
                        );
                      }
                      
                      return renderStackedBar(
                        dataPoint, 
                        xPosition, 
                        barWidth, 
                        yScale, 
                        innerHeight,
                        tooltip.dataPoint?.date === dataPoint.date,
                        activeDisplayMode === 'percent'
                      );
                    })}
                    
                    {/* Y-axis */}
                    <AxisLeft 
                      scale={yScale}
                      stroke={costCapacityColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => 
                        activeDisplayMode === 'percent' 
                          ? formatPercentage(value as number)
                          : formatValue(value as number, activeCurrencyFilter)
                      }
                      tickLabelProps={() => ({ 
                        fill: costCapacityColors.tickLabels, 
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
                      scale={scaleTime({
                        domain: [
                          new Date(displayData[0]?.date || new Date()),
                          new Date(displayData[displayData.length - 1]?.date || new Date())
                        ],
                        range: [0, innerWidth]
                      })}
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
                      stroke={costCapacityColors.axisLines}
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideZero={true}
                      numTicks={Math.min(5, displayData.length)}
                      tickLabelProps={(value, index) => ({
                        fill: costCapacityColors.tickLabels,
                        fontSize: 11,
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: index === 0 ? 'start' : 'middle',
                        dy: '0.5em',
                        dx: index === 0 ? '0.5em' : 0
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
            data={isModal ? modalData : data}
            isModal={isModal}
            activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
            onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
            onClearBrush={isModal 
              ? () => { setModalBrushDomain(null); setIsModalBrushActive(false); }
              : () => { setBrushDomain(null); setIsBrushActive(false); }
            }
            getDate={(d) => d.date}
            getValue={(d) => {
              // Sum all fee types for the brush value
              return stackKeys.reduce((sum: number, key: string) => sum + (Number((d as any)[key]) || 0), 0);
            }}
            lineColor={costCapacityColors.base_fee}
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
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="Transaction Fees" subtitle="Tracking different fee components in Solana ecosystem">
        
        {/* Filters */}
        <div className="flex items-center justify-between pl-1 py-0 mb-3">
          <div className="flex space-x-4 items-center">
            <TimeFilterSelector 
              value={modalTimeFilter} 
              onChange={(val) => {
                handleModalTimeFilterChange(val as TimeFilter);
                if (onTimeFilterChange) onTimeFilterChange(val as TimeFilter);
              }}
              options={[
                { value: 'D', label: 'D' },
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' },
                { value: 'Y', label: 'Y' }
              ]}
            />
            <CurrencyFilter 
              currency={modalCurrencyFilter} 
              onChange={(val) => {
                handleModalCurrencyFilterChange(val as CurrencyType);
                if (onCurrencyChange) onCurrencyChange(val as CurrencyType);
              }}
            />
            <DisplayModeFilter 
              mode={modalDisplayMode} 
              onChange={(val) => {
                handleModalDisplayModeChange(val);
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
              <div className="text-[10px] text-gray-400 mb-2">FEE TYPES</div>
              {stackKeys.map((key: string) => (
                <div key={key} className="flex items-center mb-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-sm mr-1.5" 
                    style={{ backgroundColor: costCapacityColors[key as keyof typeof costCapacityColors] }}
                  ></div>
                  <span className="text-[11px] text-gray-300">{getFeeTypeDisplayName(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CostCapacityChart; 