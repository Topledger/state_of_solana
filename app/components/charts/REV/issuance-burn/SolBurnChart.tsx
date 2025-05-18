import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { LinePath, Bar } from '@visx/shape';
import { fetchSolBurnData, CurrencyType, SolBurnDataPoint } from '../../../../api/REV/issuance-burn/solburn';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
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

interface SolBurnChartProps {
  currency: CurrencyType;
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

// Helper functions
const formatBurn = (value: number, currency: CurrencyType) => {
  if (currency === 'USD') {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `${(value / 1e3).toFixed(2)}k`;
};

// Simplified date parsing function
const parseDate = (dateStr: string): Date => {
  try {
    // Check if dateStr is undefined or null
    if (!dateStr) {
      console.warn('Date string is undefined or empty');
      return new Date(); // Return current date as fallback
    }
    
    // Simple date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    console.warn(`Unable to parse date: ${dateStr}`);
    return new Date();
  } catch (e) {
    console.error(`Error parsing date: ${dateStr}`, e);
    return new Date(); // Fallback to current date
  }
};

const formatDate = (dateStr: string) => {
  try {
    // Simple date formatting - just return the date string as is
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

// Colors for the chart
export const solBurnColors = {
  axisLines: '#374151',
  tickLabels: '#6b7280',
  burnBar: '#ef4444',
  cumulativeLine: '#ec4899',
  grid: '#1f2937',
};

// Value-based color assignment based on total burn values
const getValueBasedColors = (data: SolBurnDataPoint[]) => {
  if (data.length === 0) return solBurnColors;
  
  // Define metrics to consider
  const metrics = ['sol_burn', 'cumulative_sol_burn'];
  
  // Calculate total value for each metric
  const totals: { [key: string]: number } = {};
  metrics.forEach(metric => {
    totals[metric] = data.reduce((sum, d) => sum + (Math.abs(Number(d[metric as keyof typeof d])) || 0), 0);
  });
  
  // Sort metrics by total value (highest first)
  const sortedMetrics = [...metrics].sort((a, b) => totals[b] - totals[a]);
  
  // Define available colors
  const availableColors = [
    '#ef4444', // red
    '#ec4899', // pink
  ];
  
  // Create a dynamic color map
  const colorMap: { [key: string]: string } = {};
  sortedMetrics.forEach((metric, index) => {
    colorMap[metric] = availableColors[index % availableColors.length];
  });
  
  return {
    ...solBurnColors,
    burnBar: colorMap.sol_burn || solBurnColors.burnBar,
    cumulativeLine: colorMap.cumulative_sol_burn || solBurnColors.cumulativeLine
  };
};

// Export a function to get chart colors for external use
export const getSolBurnChartColors = (data?: SolBurnDataPoint[]) => {
  const colors = data ? getValueBasedColors(data) : solBurnColors;
  return {
    burn: colors.burnBar,
    cumulative: colors.cumulativeLine
  };
};

// Helper function to get available metrics from the data
export const getSolBurnChartMetrics = (colors: { burn: string, cumulative: string }) => {
  return [
    { key: 'sol_burn', displayName: 'SOL Burn', shape: 'square', color: colors.burn },
    { key: 'cumulative_sol_burn', displayName: 'Cumulative SOL Burn', shape: 'circle', color: colors.cumulative }
  ];
};

const SolBurnChart: React.FC<SolBurnChartProps> = ({ 
  currency, 
  isModalOpen = false, 
  onModalClose = () => {} 
}) => {
  // Main chart data
  const [data, setData] = useState<SolBurnDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<SolBurnDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific data
  const [modalData, setModalData] = useState<SolBurnDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<SolBurnDataPoint[]>([]);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ visible: false, dataPoint: null as SolBurnDataPoint | null, left: 0, top: 0 });

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
      console.log('Fetching SOL burn data...');
      const chartData = await fetchSolBurnData(currency);
      
      // Enhanced debugging logs
      if (chartData.length > 0) {
        console.log('Data received successfully!');
        console.log('Sample data:', chartData.slice(0, 2));
        console.log('Data length:', chartData.length);
        console.log('First 5 dates:', chartData.slice(0, 5).map(d => d.date));
      } else {
        console.warn('API returned empty data array');
      }
      
      if (chartData.length === 0) {
        setError('No data available from API. Please try again later.');
        setData([]);
      } else {
        // Accept the data as is, with minimal sorting
        const processedData = [...chartData].sort((a, b) => {
          // Try to sort by date - if dates are invalid, maintain original order
          try {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              return dateA.getTime() - dateB.getTime();
            }
            return 0; // Keep original order if dates invalid
          } catch (e) {
            return 0; // Keep original order on error
          }
        });
        
        console.log('Processed data length:', processedData.length);
        
        if (processedData.length === 0) {
          setError('No valid data points available.');
          setData([]);
        } else {
          // Log the final processed data that will be shown
          console.log('Final data sample:', processedData.slice(0, 3));
          
          setData(processedData);
          setFilteredData(processedData);
          
          // Set brush as active but don't set a specific domain
          // This will result in the full range being selected
          setIsBrushActive(true);
          setBrushDomain(null);
        }
      }
    } catch (err) {
      console.error('[Chart] Error loading chart data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = `${message} Error: ${err.message}`;
      }
      setError(message);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [currency]);

  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      console.log('Fetching modal SOL burn data...');
      const chartData = await fetchSolBurnData(currency);
      
      if (chartData.length === 0) {
        setModalError('No data available from API. Please try again later.');
        setModalData([]);
        setModalFilteredData([]);
      } else {
        // Use the same simplified approach as the main chart
        const processedData = [...chartData].sort((a, b) => {
          // Try to sort by date - if dates are invalid, maintain original order
          try {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              return dateA.getTime() - dateB.getTime();
            }
            return 0; // Keep original order if dates invalid
          } catch (e) {
            return 0; // Keep original order on error
          }
        });
        
        if (processedData.length === 0) {
          setModalError('No valid data points available.');
          setModalData([]);
          setModalFilteredData([]);
        } else {
          setModalData(processedData);
          setModalFilteredData(processedData);
          
          // Set brush as active but don't set a specific domain
          // This will result in the full range being selected
          setIsModalBrushActive(true);
          setModalBrushDomain(null);
        }
      }
    } catch (err) {
      console.error('[Chart] Error loading modal chart data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = `${message} Error: ${err.message}`;
      }
      setModalError(message);
      setModalData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  }, [currency]);

  // Fetch data for main chart on mount and when currency changes
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
      try {
        const itemDate = new Date(d.date).getTime();
        return !isNaN(itemDate) && itemDate >= startTime && itemDate <= endTime;
      } catch (e) {
        return false;
      }
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
      try {
        const itemDate = new Date(d.date).getTime();
        return !isNaN(itemDate) && itemDate >= startTime && itemDate <= endTime;
      } catch (e) {
        return false;
      }
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
    const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
    if (!chartEl) return;
    
    const rect = chartEl.getBoundingClientRect();
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

  // Initialize modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
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
  }, [isModalOpen, data, fetchModalData]);

  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modal or main data based on context
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
    
    // Get dynamic colors based on value
    const dynamicColors = getValueBasedColors(activeFilteredData);
    
    // Show loading state
    if (activeLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state with refresh button
    if (activeError || activeData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2 text-center max-w-xs">
            {activeError || 'No data available'}
          </div>
          <div className="text-gray-500/60 text-[10px] mb-3">
            Try changing the currency or refreshing the data
          </div>
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
            title={(() => {
              try {
                const date = new Date(tooltip.dataPoint.date);
                if (!isNaN(date.getTime())) {
                  return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                }
                return tooltip.dataPoint.date;
              } catch (e) {
                return tooltip.dataPoint.date;
              }
            })()}
            items={[
              { color: dynamicColors.burnBar, label: 'SOL Burn', value: formatBurn(tooltip.dataPoint.sol_burn, currency), shape: 'square' },
              { color: dynamicColors.cumulativeLine, label: 'Cumulative Burn', value: formatBurn(tooltip.dataPoint.cumulative_sol_burn, currency), shape: 'circle' }
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
              // We'll use a more robust approach to create the domain
              const uniqueDates = Array.from(new Set(displayData.map(d => d.date))).filter(date => !!date);

              // Sort the dates chronologically to ensure proper ordering
              const sortedDates = uniqueDates.sort((a, b) => {
                try {
                  return new Date(a).getTime() - new Date(b).getTime();
                } catch (e) {
                  return 0;
                }
              });

              // Smart sampling of dates for the x-axis based on data size
              let domainDates = sortedDates;

              // If we have more than 20 dates, sample them intelligently
              if (sortedDates.length > 20) {
                // Get first and last date always
                const first = sortedDates[0];
                const last = sortedDates[sortedDates.length - 1];
                
                // If we have a lot of dates (> 100), use monthly sampling
                if (sortedDates.length > 100) {
                  // Group dates by month and year and take one from each group
                  const monthlyGroups: Record<string, string[]> = {};
                  
                  sortedDates.forEach(date => {
                    try {
                      const d = new Date(date);
                      if (!isNaN(d.getTime())) {
                        const monthYear = `${d.getFullYear()}-${d.getMonth() + 1}`;
                        if (!monthlyGroups[monthYear]) {
                          monthlyGroups[monthYear] = [];
                        }
                        monthlyGroups[monthYear].push(date);
                      }
                    } catch (e) {
                      // Skip dates that can't be parsed
                    }
                  });
                  
                  // Take first date from each month group
                  domainDates = Object.values(monthlyGroups).map(group => group[0]);
                  
                  // Ensure first and last date are included
                  if (!domainDates.includes(first)) domainDates.unshift(first);
                  if (!domainDates.includes(last)) domainDates.push(last);
                  
                  // Sort again to ensure correct order
                  domainDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                } else {
                  // For medium-sized datasets, use evenly spaced sampling
                  const step = Math.ceil(sortedDates.length / 15); // Aim for about 15 ticks
                  domainDates = [first];
                  
                  // Add evenly spaced dates
                  for (let i = step; i < sortedDates.length - 1; i += step) {
                    domainDates.push(sortedDates[i]);
                  }
                  
                  // Add the last date if not already included
                  if (domainDates[domainDates.length - 1] !== last) {
                    domainDates.push(last);
                  }
                }
              }

              // Create a date scale that uses string dates
              const dateScale = scaleBand<string>({
                domain: domainDates,
                range: [0, innerWidth],
                padding: 0.3,
              });

              // Better scale domains with guaranteed minimum values
              const maxBurn = Math.max(10000, ...displayData.map(d => d.sol_burn));
              const maxCumulative = Math.max(10000, ...displayData.map(d => d.cumulative_sol_burn));

              const burnScale = scaleLinear<number>({
                domain: [0, maxBurn * 1.1],
                range: [innerHeight, 0],
                nice: true,
              });

              const cumulativeScale = scaleLinear<number>({
                domain: [0, maxCumulative * 1.1],
                range: [innerHeight, 0],
                nice: true,
              });
              
              // Function to get x position for a data point
              const getXPosition = (d: SolBurnDataPoint) => {
                // If this exact date is in our domain, use it directly
                if (domainDates.includes(d.date)) {
                  return (dateScale(d.date) || 0) + dateScale.bandwidth() / 2;
                }
                
                // Otherwise find the nearest date in our domain
                try {
                  const dataDate = new Date(d.date).getTime();
                  
                  // Find the closest date in our domain
                  const closestDate = domainDates.reduce((prev, curr) => {
                    const prevDate = new Date(prev).getTime();
                    const currDate = new Date(curr).getTime();
                    return Math.abs(currDate - dataDate) < Math.abs(prevDate - dataDate) ? curr : prev;
                  }, domainDates[0]);
                  
                  return (dateScale(closestDate) || 0) + dateScale.bandwidth() / 2;
                } catch (e) {
                  // Fallback to index-based positioning if date parsing fails
                  const index = displayData.indexOf(d);
                  const position = (index / displayData.length) * innerWidth;
                  return position;
                }
              };

              return (
                <svg width={width} height={height} className="overflow-visible">
                  <Group left={margin.left} top={margin.top}>
                    <GridRows scale={burnScale} width={innerWidth} stroke={solBurnColors.grid} strokeDasharray="2,3" strokeOpacity={0.5} numTicks={5} />
                    
                    {/* Display active brush status */}
                    {activeIsBrushActive && (
                      <text x={0} y={-8} fontSize={8} fill={solBurnColors.cumulativeLine} textAnchor="start">
                        {`Filtered: ${displayData.length} item${displayData.length !== 1 ? 's' : ''}`}
                      </text>
                    )}
                    
                    {/* Bar chart for SOL burn */}
                    {displayData.map((d, index) => {
                      const barX = dateScale(d.date);
                      const barWidth = dateScale.bandwidth();
                      const barHeight = Math.max(0, innerHeight - burnScale(d.sol_burn));
                      
                      // Only render bars for dates in our domain to avoid overcrowding
                      if (!domainDates.includes(d.date)) return null;
                      if (barX === undefined || barHeight <= 0) return null;
                      
                      return (
                        <Bar 
                          key={`bar-${index}`} 
                          x={barX} 
                          y={innerHeight - barHeight} 
                          width={barWidth} 
                          height={barHeight}
                          fill={dynamicColors.burnBar} 
                          opacity={tooltip.dataPoint?.date === d.date ? 1 : 0.7} 
                        />
                      );
                    })}
                    
                    {/* Line chart for cumulative SOL burn */}
                    <LinePath 
                      data={displayData}
                      x={(d) => {
                        // For line chart, use a simpler positioning approach
                        try {
                          const dataDate = new Date(d.date).getTime();
                          
                          // Map the date to a position on the x-axis using linear interpolation
                          const firstDate = new Date(sortedDates[0]).getTime();
                          const lastDate = new Date(sortedDates[sortedDates.length - 1]).getTime();
                          
                          // Handle special case where there's only one date
                          if (firstDate === lastDate) {
                            return innerWidth / 2;
                          }
                          
                          // Calculate position as percentage of total date range
                          const datePosition = (dataDate - firstDate) / (lastDate - firstDate);
                          const xPos = datePosition * innerWidth;
                          
                          // Ensure the position is within bounds
                          return Math.max(0, Math.min(innerWidth, xPos));
                        } catch (e) {
                          // Fallback to getXPosition if there's an error
                          return getXPosition(d);
                        }
                      }}
                      y={(d) => cumulativeScale(d.cumulative_sol_burn)}
                      stroke={dynamicColors.cumulativeLine} 
                      strokeWidth={1.5} 
                      curve={curveMonotoneX} 
                    />
                    
                    {/* X-Axis (dates) */}
                    <AxisBottom 
                      top={innerHeight} 
                      scale={dateScale}
                      tickFormat={(dateStr) => {
                        // Better date formatting for axis labels
                        try {
                          const date = new Date(dateStr);
                          if (!isNaN(date.getTime())) {
                            // Get current year to compare
                            const currentYear = new Date().getFullYear();
                            
                            // Different formatting based on date density
                            if (domainDates.length <= 6) {
                              // For fewer dates, show more details
                              return date.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: date.getFullYear() !== currentYear ? '2-digit' : undefined 
                              });
                            } else {
                              // For dense charts, just show month and year if different
                              return date.toLocaleDateString('en-US', { 
                                month: 'short',
                                year: date.getFullYear() !== currentYear ? '2-digit' : undefined
                              });
                            }
                          }
                          return dateStr;
                        } catch (e) {
                          return dateStr;
                        }
                      }}
                      stroke={solBurnColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0}
                      hideZero={true}
                      tickLabelProps={() => ({ 
                        fill: solBurnColors.tickLabels, 
                        fontSize: 10, 
                        fontWeight: 300,
                        letterSpacing: '0.03em',
                        textAnchor: 'middle', 
                        dy: '0.5em',
                        angle: 45,
                        transform: 'translate(-10, 10)'
                      })}
                      numTicks={Math.min(10, domainDates.length)} 
                    />
                    
                    {/* Y-Axis (SOL burn) */}
                    <AxisLeft 
                      scale={burnScale} 
                      stroke={solBurnColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => formatBurn(Number(value), currency)}
                      tickLabelProps={() => ({ 
                        fill: solBurnColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'end', 
                        dx: '-0.6em', 
                        dy: '0.25em' 
                      })} 
                    />
                    
                    {/* Y-Axis (Cumulative SOL burn) */}
                    <AxisRight 
                      left={innerWidth} 
                      scale={cumulativeScale} 
                      stroke={solBurnColors.axisLines} 
                      strokeWidth={0.5}
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => formatBurn(Number(value), currency)}
                      tickLabelProps={() => ({ 
                        fill: solBurnColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'start', 
                        dx: '0.5em', 
                        dy: '0.25em' 
                      })} 
                    />
                  </Group>
                </svg>
              );
            }}
          </ParentSize>
        </div>
        
        {/* Brush component - shown for both main chart and modal */}
        <div className="h-[15%] w-full mt-1">
          <BrushTimeScale 
            data={isModal ? modalData : data}
            isModal={isModal}
            activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
            onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
            onClearBrush={activeClearBrush}
            getDate={(d) => {
              // More robust date parsing for the brush component
              try {
                const date = new Date(d.date);
                return date.toISOString(); // Return as string, not Date object
              } catch (e) {
                // Fallback if date parsing fails
                return d.date || '';
              }
            }}
            getValue={(d) => Math.max(0.1, d.sol_burn)} // Ensure non-zero values
            lineColor={dynamicColors.burnBar}
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
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="SOL Burn Analysis" subtitle="Tracking SOL burn over time and cumulative total">
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
                    {getSolBurnChartMetrics({ 
                      burn: solBurnColors.burnBar, 
                      cumulative: solBurnColors.cumulativeLine 
                    }).map(metric => (
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
                      <div className="w-2.5 h-2.5 bg-red-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                      <span className="text-[11px] text-gray-300">Loading...</span>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-2.5 h-2.5 bg-pink-500 mr-2 rounded-full mt-0.5 animate-pulse"></div>
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

export default SolBurnChart; 