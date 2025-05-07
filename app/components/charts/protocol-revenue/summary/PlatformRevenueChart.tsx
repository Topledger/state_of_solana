import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows, GridColumns } from '@visx/grid';
import { scaleLinear, scaleBand, scaleOrdinal, scaleTime } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar } from '@visx/shape';
import { BarStack } from '@visx/shape';
import { localPoint } from '@visx/event';
import { PlatformRevenueDataPoint, TimeFilter, fetchPlatformRevenueData, formatCurrency, formatPercentage, getPlatformColor, platformColors } from '../../../../api/protocol-revenue/summary/platformRevenueData';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import DisplayModeFilter, { DisplayMode } from '../../../shared/filters/DisplayModeFilter';
import { LegendOrdinal } from '@visx/legend';
import { Text } from '@visx/text';
import BrushTimeScale from '../../../shared/BrushTimeScale';

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

// Define types for stacked chart data
interface StackedDataPoint {
  date: string;
  [platform: string]: string | number | undefined | Date;
  total?: number;
  x?: Date; // Add x property for brush interaction
}

// Props interface
interface PlatformRevenueChartProps {
  timeFilter?: TimeFilter;
  displayMode?: DisplayMode;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (filter: TimeFilter) => void;
  onDisplayModeChange?: (mode: DisplayMode) => void;
}

// Chart component
const PlatformRevenueChart: React.FC<PlatformRevenueChartProps> = ({ 
  timeFilter = 'M',
  displayMode = 'absolute', 
  isModalOpen = false, 
  onModalClose = () => {},
  onTimeFilterChange,
  onDisplayModeChange
}) => {
  // Main chart data
  const [rawData, setRawData] = useState<any[]>([]);
  const [data, setData] = useState<StackedDataPoint[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<StackedDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific data
  const [modalData, setModalData] = useState<StackedDataPoint[]>([]);
  const [modalKeys, setModalKeys] = useState<string[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<TimeFilter>(timeFilter);
  const [modalDisplayMode, setModalDisplayMode] = useState<DisplayMode>(displayMode);
  const [modalFilteredData, setModalFilteredData] = useState<StackedDataPoint[]>([]);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  
  // Internal display mode
  const [_displayMode, _setDisplayMode] = useState<DisplayMode>(displayMode);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as StackedDataPoint | null, 
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
  
  // Function to transform raw API data into stacked format
  const transformDataToStackedFormat = (rawData: any[]): { data: StackedDataPoint[], keys: string[] } => {
    console.log("Raw data length:", rawData?.length);
    console.log("Raw data sample:", rawData?.slice(0, 2));
    
    if (!rawData || !rawData.length) return { data: [], keys: [] };
    
    // Group data by date
    const groupedByDate: Record<string, Record<string, number>> = {};
    const allPlatforms = new Set<string>();
    
    rawData.forEach(item => {
      // Check both lowercase and uppercase property names due to API inconsistency
      const platform = item.platform || item.Platform; 
      const revenue = item.protocol_revenue_usd;
      const date = item.block_date;
      
      if (!date || !platform || revenue === undefined) {
        console.log("Skipping item due to missing data:", item);
        return;
      }
      
      const dateStr = date.substring(0, 10); // Extract YYYY-MM-DD
      
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = {};
      }
      
      // Add platform revenue
      allPlatforms.add(platform);
      
      // Sum up if multiple entries for same platform/date
      const currentValue = groupedByDate[dateStr][platform] || 0;
      groupedByDate[dateStr][platform] = currentValue + revenue;
    });
    
    console.log("Dates found:", Object.keys(groupedByDate).length);
    console.log("Platforms found:", allPlatforms.size);
    
    // Convert to array format needed by BarStack
    const result: StackedDataPoint[] = Object.keys(groupedByDate)
      .sort() // Sort dates chronologically
      .map(date => {
        const entry: StackedDataPoint = { date };
        let total = 0;
        
        // Add a property for each platform
        allPlatforms.forEach(platform => {
          const value = groupedByDate[date][platform] || 0;
          entry[platform] = value;
          total += value;
        });
        
        // Add total
        entry.total = total;
        
        // Add x property for brush/time scale
        entry.x = new Date(date);
        
        return entry;
      });
    
    console.log("Transformed entries:", result.length);
    
    if (result.length === 0) {
      console.error("No entries after transformation");
      return { data: [], keys: [] };
    }
    
    // Get top platforms by total revenue
    const platformTotals: Record<string, number> = {};
    allPlatforms.forEach(platform => {
      platformTotals[platform] = result.reduce(
        (sum, entry) => sum + (Number(entry[platform]) || 0), 
        0
      );
    });
    
    // Sort platforms by total revenue (descending)
    const sortedPlatforms = Array.from(allPlatforms)
      .sort((a, b) => platformTotals[b] - platformTotals[a])
      .slice(0, 30); // Take top 30 platforms instead of just 10
    
    console.log("Top platforms:", sortedPlatforms);
    
    return { 
      data: result,
      keys: sortedPlatforms
    };
  };
  
  // Create a fetchData function that can be called to refresh data for main chart
  const fetchData = useCallback(async () => {
    console.log("Fetching platform revenue data with timeFilter:", timeFilter);
    setLoading(true);
    setError(null);
    try {
      // Use the original API function to ensure consistent implementation
      const platformData = await fetchPlatformRevenueData(timeFilter);
      console.log("Fetched platform data:", platformData?.length, "entries");
      
      // Make direct API request to get time series data
      const response = await fetch(
        "https://analytics.topledger.xyz/solana/api/queries/12589/results?api_key=oiGI7qFLlC7o3etCqCywaqnYbY2Z2bGFxOOKdJwO", 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parameters: {
              "Date Part": timeFilter
            }
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log("API response structure:", Object.keys(result));
      
      if (!result.query_result || !result.query_result.data || !result.query_result.data.rows) {
        console.error("Invalid data structure:", result);
        throw new Error('Invalid data structure in API response');
      }
      
      console.log("Query result rows count:", result.query_result.data.rows.length);
      
      const rawData = result.query_result.data.rows;
      setRawData(rawData);
      
      // Transform data for time series format
      const { data: transformedData, keys: platformKeys } = transformDataToStackedFormat(rawData);
      
      if (transformedData.length === 0) {
        console.error('No data available for this period');
        setError('No data available for this period.');
        setData([]);
        setKeys([]);
        setFilteredData([]);
      } else {
        console.log('Transformed data:', transformedData.length, 'entries');
        console.log('Platform keys:', platformKeys);
        setData(transformedData);
        setKeys(platformKeys);
        setFilteredData(transformedData);
        
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
      setKeys([]);
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
      // Make API request to get raw data 
      const response = await fetch(
        "https://analytics.topledger.xyz/solana/api/queries/12589/results?api_key=oiGI7qFLlC7o3etCqCywaqnYbY2Z2bGFxOOKdJwO", 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parameters: {
              "Date Part": modalTimeFilter
            }
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.query_result || !result.query_result.data || !result.query_result.data.rows) {
        throw new Error('Invalid data structure in API response');
      }
      
      const rawData = result.query_result.data.rows;
      
      // Transform data
      const { data: transformedData, keys: platformKeys } = transformDataToStackedFormat(rawData);
      
      if (transformedData.length === 0) {
        setModalError('No data available for this period.');
        setModalData([]);
        setModalKeys([]);
        setModalFilteredData([]);
      } else {
        setModalData(transformedData);
        setModalKeys(platformKeys);
        setModalFilteredData(transformedData);
        
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
      setModalKeys([]);
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
  
  // Handle brush updates for main chart
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
      const itemDate = d.x ? new Date(d.x).getTime() : 0;
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
      const itemDate = d.x ? new Date(d.x).getTime() : 0;
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
  }, []);
  
  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const margin = { left: 60 };
    const innerWidth = rect.width - margin.left - 25;
    
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
      setModalDisplayMode(_displayMode);
      
      // Initialize with current main chart data
      setModalData(data);
      setModalKeys(keys);
      setModalFilteredData(filteredData); 
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      
      // Force fetch new data for modal to ensure it's updated
      fetchModalData();
    }
  }, [isModalOpen, timeFilter, _displayMode, data, keys, filteredData, brushDomain, isBrushActive, fetchModalData]);
  
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
    if (onDisplayModeChange) {
      onDisplayModeChange(newMode);
    }
  }, [onDisplayModeChange]);

  // Format date for display
  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit'
    });
  }, []);

  // Get platform display name
  const getPlatformDisplayName = useCallback((platform: string): string => {
    // Capitalize platform name and handle special cases
    if (!platform) return "Unknown";
    
    // Handle special cases
    const specialCases: Record<string, string> = {
      'magiceden': 'Magic Eden',
      'tensorswap': 'Tensor',
      'bloxroute': 'Bloxroute',
      'jupiterdca': 'Jupiter DCA',
    };
    
    const lowercased = platform.toLowerCase();
    if (specialCases[lowercased]) {
      return specialCases[lowercased];
    }
    
    // Capitalize first letter 
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  }, []);

  // Handle mouse over for bar segments
  const handleBarMouseOver = useCallback((event: React.MouseEvent<SVGRectElement>, datum: any, platform: string) => {
    const coords = localPoint(event) || { x: 0, y: 0 };
    
    // Get the platform data and date from the bar
    try {
      const barData = datum.data;
      const date = barData.x instanceof Date 
        ? barData.x.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        : barData.date || 'Unknown date';
      
      // Create a tooltip showing just this bar's data
      setTooltip({
        visible: true,
        dataPoint: barData,
        left: coords.x,
        top: coords.y
      });
    } catch (err) {
      console.error('Error handling bar mouse over:', err);
    }
  }, []);

  // Render chart content
  const renderChartContent = (width: number, height: number, isModal = false) => {
    // Use modal data/filters if in modal mode, otherwise use the main data/filters
    const activeDisplayMode = isModal ? modalDisplayMode : _displayMode;
    const activeData = isModal ? modalFilteredData : filteredData; // Use filtered data for display
    const activeKeys = isModal ? modalKeys : keys;
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    
    // Show loading state
    if (activeLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state with refresh button
    if (activeError || activeData.length === 0 || activeKeys.length === 0) {
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
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && tooltip.dataPoint && (
          <ChartTooltip
            title={tooltip.dataPoint.x instanceof Date ? formatDate(tooltip.dataPoint.x) : formatDate(new Date())}
            items={activeKeys.filter(key => !!tooltip.dataPoint?.[key]).map(key => ({
              color: getPlatformColor(key),
              label: getPlatformDisplayName(key),
              value: formatCurrency(Number(tooltip.dataPoint?.[key]) || 0),
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
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null;
              
              const margin = { top: 20, right: 25, bottom: 30, left: 60 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              // Create scales
              const xScale = scaleBand<Date>({
                domain: activeData.map(d => d.x as Date),
                range: [0, innerWidth],
                padding: 0.2
              });

              const yMax = Math.max(...activeData.map(d => d.total || 0));
              
              const yScale = scaleLinear<number>({
                domain: [0, yMax * 1.1], // Add 10% padding
                range: [innerHeight, 0],
                nice: true
              });

              // Create color scale for platforms
              const colorScale = scaleOrdinal<string, string>({
                domain: activeKeys,
                range: activeKeys.map(platform => getPlatformColor(platform))
              });
              
              // Determine whether to show percentages or absolute values
              const isPercentMode = activeDisplayMode === 'percent';
              
              // Generate data for BarStack - convert to expected format
              const stackedData = activeData.map(d => {
                // Create a new object with x property as Date
                const result: any = { x: d.x };
                
                // Add each key with its value
                activeKeys.forEach(key => {
                  // For percent mode, calculate percentage of total
                  if (isPercentMode && d.total && d.total > 0) {
                    result[key] = ((d[key] as number || 0) / d.total!) * 100;
                  } else {
                    result[key] = d[key] || 0;
                  }
                });
                
                return result;
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
                    
                    {/* Stacked bars */}
                    <BarStack
                      data={stackedData}
                      keys={activeKeys}
                      x={d => d.x}
                      xScale={xScale}
                      yScale={yScale}
                      color={colorScale}
                    >
                      {barStacks => 
                        barStacks.map(barStack => 
                          barStack.bars.map(bar => (
                            <rect
                              key={`bar-stack-${barStack.index}-${bar.index}`}
                              x={bar.x}
                              y={bar.y}
                              height={bar.height}
                              width={bar.width}
                              fill={bar.color}
                              onMouseMove={event => handleBarMouseOver(event, bar, barStack.key)}
                              onMouseLeave={handleMouseLeave}
                              rx={2}
                            />
                          ))
                        )
                      }
                    </BarStack>
                    
                    {/* X-axis */}
                    <AxisBottom 
                      top={innerHeight}
                      scale={xScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      tickFormat={(value) => formatDate(value as Date)}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
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
                      tickFormat={(value) => 
                        isPercentMode 
                          ? formatPercentage(value as number)
                          : formatCurrency(value as number)
                      }
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
            data={isModal ? modalData : data}
            isModal={isModal}
            activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
            onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
            onClearBrush={isModal 
              ? () => { setModalBrushDomain(null); setIsModalBrushActive(false); }
              : () => { setBrushDomain(null); setIsBrushActive(false); }
            }
            getDate={(d) => d.x ? d.x.toISOString() : ''}
            getValue={(d) => {
              // Sum all platforms for the brush value
              return activeKeys.reduce((sum: number, key: string) => sum + (Number(d[key]) || 0), 0);
            }}
            lineColor="#60a5fa"
            margin={{ top: 5, right: 25, bottom: 10, left: 60 }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full relative">
      <div className="h-full w-full">
        <ParentSize>
          {({ width, height }) => {
            console.log("Parent size dimensions:", { width, height });
            if (width === 0 || height === 0) {
              return <div className="flex justify-center items-center h-full">
                <p className="text-gray-400">Resizing chart...</p>
              </div>;
            }
            return renderChartContent(width, height);
          }}
        </ParentSize>
      </div>
      
      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="Protocol Revenue by Platform" subtitle="Revenue distribution across platforms in the Solana ecosystem">
        
        {/* Filters */}
        <div className="flex items-center justify-between pl-1 py-0 mb-3">
          <div className="flex space-x-4 items-center">
            <TimeFilterSelector 
              value={modalTimeFilter} 
              onChange={(val) => {
                handleModalTimeFilterChange(val as TimeFilter);
              }}
              options={[
                { value: 'D', label: 'D' },
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' },
                { value: 'Y', label: 'Y' }
              ]}
            />
            <DisplayModeFilter 
              mode={modalDisplayMode} 
              onChange={handleModalDisplayModeChange}
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
              <ParentSize>
                {({ width, height }) => renderChartContent(width, height, true)}
              </ParentSize>
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              <div className="text-[10px] text-gray-400 mb-2">PLATFORMS</div>
              {modalKeys.slice(0, 20).map((platform: string) => (
                <div key={platform} className="flex items-center mb-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-sm mr-1.5" 
                    style={{ backgroundColor: getPlatformColor(platform) }}
                  ></div>
                  <span className="text-[11px] text-gray-300">{getPlatformDisplayName(platform)}</span>
                </div>
              ))}
              {modalKeys.length > 20 && (
                <div className="flex items-center mb-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-sm mr-1.5" 
                    style={{ backgroundColor: '#888888' }}
                  ></div>
                  <span className="text-[11px] text-gray-300">Others</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlatformRevenueChart; 