import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarStack } from '@visx/shape';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { ParentSize } from '@visx/responsive';
import { FormattedMemecoinVolumeData, MemecoinVolumeTimeFilter, fetchMemecoinVolumeDataWithFallback, formatVolume } from '../../../../api/dex/volume/memecoinVolumeData';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal, { ScrollableLegend } from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import { colors } from '../../../../utils/chartColors';

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

// Memecoin color palette with amber/yellow theme
const memecoinColors = colors.slice(0, 17);

// Assign colors to memecoins based on volume values
const getMemecoinColorMap = (series: { name: string; data: number[] }[]): Record<string, string> => {
  if (!series || series.length === 0) {
    return {};
  }
  
  // Calculate total volume for each memecoin
  const memecoinsWithVolume = series.map(s => ({
    name: s.name,
    totalVolume: s.data.reduce((sum, vol) => sum + vol, 0)
  }));
  
  // Sort memecoins by volume (highest first)
  const sortedMemecoins = [...memecoinsWithVolume]
    .sort((a, b) => b.totalVolume - a.totalVolume);
  
  // Assign colors based on rank (highest volume gets first color)
  const colorMap: Record<string, string> = {};
  sortedMemecoins.forEach((memecoin, index) => {
    colorMap[memecoin.name] = memecoinColors[index % memecoinColors.length];
  });
  
  return colorMap;
};

// Chart colors for consistent styling
export const memecoinVolumeColors = {
  grid: '#1f2937',
  axisLines: '#374151',
  tickLabels: '#6b7280',
};

// Export a function to get chart colors for external use
export const getMemecoinVolumeChartColors = () => {
  return {
    primary: memecoinColors[0]
  };
};

interface MemecoinVolumeChartProps {
  timeFilter: MemecoinVolumeTimeFilter;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onDataUpdate?: (data: { token: string; volume: number; percentage: number }[]) => void;
}

interface MemecoinVolumeDataPoint {
  date: string;
  volume: number;
}

const MemecoinVolumeChart: React.FC<MemecoinVolumeChartProps> = ({ 
  timeFilter, 
  isModalOpen = false, 
  onModalClose = () => {},
  onDataUpdate = () => {}
}) => {
  // Main chart data
  const [data, setData] = useState<FormattedMemecoinVolumeData>({ dates: [], series: [], totalsByToken: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<FormattedMemecoinVolumeData>({ dates: [], series: [], totalsByToken: [] });
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific data
  const [modalData, setModalData] = useState<FormattedMemecoinVolumeData>({ dates: [], series: [], totalsByToken: [] });
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<MemecoinVolumeTimeFilter>(timeFilter);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<FormattedMemecoinVolumeData>({ dates: [], series: [], totalsByToken: [] });
  
  // Chart container refs
  const chartRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    data: null as null | { 
      date: string, 
      tokens: { token: string, volume: number, color: string }[]
    },
    left: 0, 
    top: 0 
  });

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
      const chartData = await fetchMemecoinVolumeDataWithFallback(timeFilter);
      if (chartData.dates.length === 0 || chartData.series.length === 0) {
        setError('No data available for this period.');
        setData({ dates: [], series: [], totalsByToken: [] });
      } else {
        setData(chartData);
        setFilteredData(chartData);
        
        // Set brush as active but don't set a specific domain
        setIsBrushActive(true);
        setBrushDomain(null);
      }
    } catch (err) {
      console.error('[Chart] Error loading memecoin volume data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setError(message);
      setData({ dates: [], series: [], totalsByToken: [] });
      setFilteredData({ dates: [], series: [], totalsByToken: [] });
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const chartData = await fetchMemecoinVolumeDataWithFallback(modalTimeFilter);
      if (chartData.dates.length === 0 || chartData.series.length === 0) {
        setModalError('No data available for this period.');
        setModalData({ dates: [], series: [], totalsByToken: [] });
        setModalFilteredData({ dates: [], series: [], totalsByToken: [] });
      } else {
        setModalData(chartData);
        setModalFilteredData(chartData);
        
        // Set brush as active but don't set a specific domain
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      }
    } catch (err) {
      console.error('[Chart] Error loading modal memecoin volume data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setModalError(message);
      setModalData({ dates: [], series: [], totalsByToken: [] });
      setModalFilteredData({ dates: [], series: [], totalsByToken: [] });
    } finally {
      setModalLoading(false);
    }
  }, [modalTimeFilter]);

  // Fetch data for main chart on mount and when timeFilter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Process data with dates
  const dataWithDates = useMemo(() => 
    data.dates.map(d => ({
      date: d,
      dateObj: new Date(d)
    })),
  [data.dates]);
  
  // Process data for brush component
  const processDataForBrush = useCallback((chartData: FormattedMemecoinVolumeData): MemecoinVolumeDataPoint[] => {
    if (!chartData || !chartData.dates || chartData.dates.length === 0) {
      return [];
    }
    
    // Create a flat array of date/volume pairs for the brush component
    return chartData.dates.map((date, index) => {
      // Sum all volumes for this date
      const totalVolume = chartData.series.reduce((sum: number, series) => {
        return sum + (series.data[index] || 0);
      }, 0);
      
      return {
        date,
        volume: totalVolume
      };
    });
  }, []);
  
  // Handle brush change with throttling
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
        setFilteredData(data);
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
    
    // Apply throttling to data filtering
    if (canUpdateFilteredDataRef.current) {
      canUpdateFilteredDataRef.current = false;
      
      // Find indices within date range
      const dateIndicesToKeep: number[] = [];
      data.dates.forEach((dateStr, index) => {
        const date = new Date(dateStr);
        if (date >= startDate && date <= endDate) {
          dateIndicesToKeep.push(index);
        }
      });
      
      if (dateIndicesToKeep.length === 0) {
        // Fallback to all data if no dates are in range
        setFilteredData(data);
      } else {
        // Create filtered data
        const filteredDates = dateIndicesToKeep.map(i => data.dates[i]);
        const filteredSeries = data.series.map(series => ({
          name: series.name,
          data: dateIndicesToKeep.map(i => series.data[i] || 0)
        }));
        
        // Calculate new totals based on filtered data
        const tokenTotals: Record<string, number> = {};
        filteredSeries.forEach(series => {
          tokenTotals[series.name] = series.data.reduce((sum, vol) => sum + vol, 0);
        });
        
        const filteredTotalsByToken = Object.entries(tokenTotals)
          .map(([token, volume]) => ({ token, volume }))
          .sort((a, b) => b.volume - a.volume);
        
        setFilteredData({
          dates: filteredDates,
          series: filteredSeries,
          totalsByToken: filteredTotalsByToken
        });
      }
      
      // Set timeout to allow next update
      throttleTimeoutRef.current = setTimeout(() => {
        canUpdateFilteredDataRef.current = true;
        throttleTimeoutRef.current = null;
      }, 100);
    }
  }, [isBrushActive, data]);

  // Handle modal brush change with throttling
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
        setModalFilteredData(modalData);
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
    
    // Apply throttling to data filtering
    if (canUpdateModalFilteredDataRef.current) {
      canUpdateModalFilteredDataRef.current = false;
      
      // Find indices within date range
      const dateIndicesToKeep: number[] = [];
      modalData.dates.forEach((dateStr, index) => {
        const date = new Date(dateStr);
        if (date >= startDate && date <= endDate) {
          dateIndicesToKeep.push(index);
        }
      });
      
      if (dateIndicesToKeep.length === 0) {
        // Fallback to all data if no dates are in range
        setModalFilteredData(modalData);
      } else {
        // Create filtered data
        const filteredDates = dateIndicesToKeep.map(i => modalData.dates[i]);
        const filteredSeries = modalData.series.map(series => ({
          name: series.name,
          data: dateIndicesToKeep.map(i => series.data[i] || 0)
        }));
        
        // Calculate new totals based on filtered data
        const tokenTotals: Record<string, number> = {};
        filteredSeries.forEach(series => {
          tokenTotals[series.name] = series.data.reduce((sum, vol) => sum + vol, 0);
        });
        
        const filteredTotalsByToken = Object.entries(tokenTotals)
          .map(([token, volume]) => ({ token, volume }))
          .sort((a, b) => b.volume - a.volume);
        
        setModalFilteredData({
          dates: filteredDates,
          series: filteredSeries,
          totalsByToken: filteredTotalsByToken
        });
      }
      
      // Set timeout to allow next update
      modalThrottleTimeoutRef.current = setTimeout(() => {
        canUpdateModalFilteredDataRef.current = true;
        modalThrottleTimeoutRef.current = null;
      }, 100);
    }
  }, [isModalBrushActive, modalData]);

  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const rect = e.currentTarget.getBoundingClientRect();
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
    
    if (!currentData || !currentData.dates || currentData.dates.length === 0) return;
    
    // Find nearest data point
    const index = Math.floor((mouseX - margin.left) / (innerWidth / currentData.dates.length));
    
    if (index >= 0 && index < currentData.dates.length) {
      const date = currentData.dates[index];
      
      // Get all token volumes for this date
      const tokens = currentData.series
        .map((series, tokenIndex) => ({
          token: series.name,
          volume: series.data[index] || 0,
          color: memecoinColors[tokenIndex % memecoinColors.length]
        }))
        .filter(item => item.volume > 0)
        .sort((a, b) => b.volume - a.volume);
      
      if (!tooltip.visible || tooltip.data?.date !== date) {
        setTooltip({
          visible: true,
          data: { date, tokens },
          left: mouseX,
          top: mouseY
        });
      }
    }
  }, [data, filteredData, modalData, modalFilteredData, isBrushActive, isModalBrushActive, tooltip.visible, tooltip.data?.date]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Handle modal-related effects
  useEffect(() => {
    if (isModalOpen) {
      console.log("Modal opened - initializing with data");
      setModalTimeFilter(timeFilter);
      setModalData(data);
      setModalFilteredData(filteredData);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      setModalLoading(false); // Initialize as not loading if we already have data
      
      if (data.dates.length === 0) {
        fetchModalData();
      }
    }
  }, [isModalOpen, timeFilter, data, filteredData, brushDomain, isBrushActive, fetchModalData]);
  
  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: string) => {
    console.log('Time filter changed to:', newFilter);
    setModalTimeFilter(newFilter as MemecoinVolumeTimeFilter);
  }, []);

  // Effect to fetch modal data when time filter changes
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [modalTimeFilter, isModalOpen, fetchModalData]);

  // Process chart data for chart visualization
  const processChartData = useCallback((chartData: FormattedMemecoinVolumeData) => {
    if (!chartData || !chartData.dates || chartData.dates.length === 0 || !chartData.series || chartData.series.length === 0) {
      return { processedData: [], keys: [] };
    }

    // Prepare keys (token names) for the stacked bars
    const keys = chartData.series.map(s => s.name);
    
    // Convert series data into the format expected by BarStack
    const processedData = chartData.dates.map((date, dateIndex) => {
      const dataPoint: any = { date };
      chartData.series.forEach(series => {
        dataPoint[series.name] = series.data[dateIndex] || 0;
      });
      return dataPoint;
    });

    return { processedData, keys };
  }, []);

  // Update the parent component with token data when it changes
  useEffect(() => {
    if (filteredData.totalsByToken.length > 0) {
      // Calculate total volume across all tokens
      const totalVolume = filteredData.totalsByToken.reduce((sum, item) => sum + item.volume, 0);
      
      // Create the formatted data to send to parent
      const tokenData = filteredData.totalsByToken.map(item => ({
        token: item.token,
        volume: item.volume,
        percentage: totalVolume > 0 ? (item.volume / totalVolume) * 100 : 0
      }));
      
      onDataUpdate(tokenData);
    }
  }, [filteredData.totalsByToken]);

  // Render chart content
  const renderChartContent = (width: number, height: number, isModal = false) => {
    // Use modalTimeFilter and modalData if in modal mode, otherwise use the main timeFilter and data
    const activeTimeFilter = isModal ? modalTimeFilter : timeFilter;
    const activeData = isModal ? modalData : data;
    const activeFilteredData = isModal ? (isModalBrushActive ? modalFilteredData : modalData) : (isBrushActive ? filteredData : data);
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const activeIsBrushActive = isModal ? isModalBrushActive : isBrushActive;
    const activeHandleBrushChange = isModal ? handleModalBrushChange : handleBrushChange;
    const activeClearBrush = isModal 
      ? () => { setModalBrushDomain(null); setIsModalBrushActive(false); setModalFilteredData(modalData); }
      : () => { setBrushDomain(null); setIsBrushActive(false); setFilteredData(data); };
    
    // Show loading state
    if (activeLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state with refresh button
    if (activeError || activeData.dates.length === 0) {
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

    // Process data for the chart
    const { processedData, keys } = processChartData(activeFilteredData);
    
    if (processedData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full text-gray-400 text-sm">
          <div className="mb-2">No data available for this time period</div>
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
        {tooltip.visible && tooltip.data && (
          <ChartTooltip
            title={tooltip.data.date}
            items={tooltip.data.tokens.map(token => ({
              color: token.color,
              label: token.token,
              value: formatVolume(token.volume),
              shape: 'square'
            }))}
            top={tooltip.top}
            left={tooltip.left}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div className="h-[85%] w-full overflow-hidden relative" ref={isModal ? modalChartRef : chartRef}
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

              // Find the maximum value for the y-axis
              const maxValue = Math.max(
                ...processedData.map(d => {
                  return keys.reduce((sum, key) => sum + (d[key] || 0), 0);
                })
              );

              // Setup scales
              const xScale = scaleBand<string>({
                domain: processedData.map(d => d.date),
                padding: 0.3,
                range: [0, innerWidth]
              });

              const yScale = scaleLinear<number>({
                domain: [0, maxValue * 1.1], // Add 10% padding at the top
                range: [innerHeight, 0],
                nice: true
              });

              const colorScale = scaleOrdinal<string, string>({
                domain: keys,
                range: keys.map(key => {
                  const colorMap = getMemecoinColorMap(activeFilteredData.series);
                  return colorMap[key] || memecoinColors[0];
                })
              });

              return (
                <svg width={width} height={height} className="overflow-visible">
                  <Group left={margin.left} top={margin.top}>
                    <GridRows 
                      scale={yScale} 
                      width={innerWidth} 
                      stroke={memecoinVolumeColors.grid} 
                      strokeDasharray="2,3" 
                      strokeOpacity={0.5} 
                      numTicks={5} 
                    />
                    
                    {/* Display active brush status */}
                    {activeIsBrushActive && (
                      <text x={0} y={-8} fontSize={8} fill={memecoinColors[0]} textAnchor="start">
                        {`Filtered: ${activeFilteredData.dates.length} item${activeFilteredData.dates.length !== 1 ? 's' : ''}`}
                      </text>
                    )}
                    
                    {/* Stacked bars */}
                    <BarStack
                      data={processedData}
                      keys={keys}
                      x={d => d.date}
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
                              opacity={tooltip.visible && tooltip.data?.date === bar.bar.data.date ? 0.9 : 0.7}
                              rx={2}
                            />
                          ))
                        )
                      }
                    </BarStack>
                    
                    {/* X-axis (dates) */}
                    <AxisBottom 
                      top={innerHeight} 
                      scale={xScale} 
                      stroke={memecoinVolumeColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0}
                      hideZero={true}
                      tickLabelProps={(value, index) => ({ 
                        fill: memecoinVolumeColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: index === 0 ? 'start' : 'middle', 
                        dy: '0.5em',
                        dx: index === 0 ? '0.5em' : 0
                      })}
                      numTicks={Math.min(6, processedData.length)}
                    />
                    
                    {/* Y-axis (volume) */}
                    <AxisLeft 
                      scale={yScale}
                      stroke={memecoinVolumeColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => {
                        const val = Number(value);
                        if (val === 0) return '$0';
                        
                        if (val >= 1e9) {
                          return `$${Math.round(val / 1e9)}B`;
                        }
                        
                        if (val >= 1e6) {
                          return `$${Math.round(val / 1e6)}M`;
                        }
                        
                        if (val >= 1e3) {
                          return `$${Math.round(val / 1e3)}K`;
                        }
                        
                        return `$${val}`;
                      }}
                      tickLabelProps={() => ({ 
                        fill: memecoinVolumeColors.tickLabels, 
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
            data={processDataForBrush(isModal ? modalData : data)}
            isModal={isModal}
            activeBrushDomain={activeBrushDomain}
            onBrushChange={activeHandleBrushChange}
            onClearBrush={activeClearBrush}
            getDate={(d) => d.date}
            getValue={(d) => d.volume}
            lineColor={memecoinColors[0]}
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
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="Top Memecoins by Volume" subtitle="Analysis of trading volume across memecoins">
        
        {/* Time filter */}
        <div className="flex items-center justify-start pl-1 py-0 mb-3">
          <TimeFilterSelector 
            value={modalTimeFilter} 
            onChange={handleModalTimeFilterChange}
            options={[
              { value: 'D', label: 'D' },
              { value: 'W', label: 'W' },
              { value: 'M', label: 'M' },
            ]}
          />
        </div>
        
        {/* Horizontal line */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        <div className="h-[60vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-full pr-3 border-r border-gray-900 relative">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 10% width with scrollbar */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              {!modalLoading && modalFilteredData.totalsByToken.length > 0 ? (
                <ScrollableLegend
                  items={modalFilteredData.totalsByToken.map((item, index) => ({
                    id: item.token,
                    color: memecoinColors[index % memecoinColors.length],
                    label: item.token,
                    
                  }))}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Loading states */}
                  <div className="flex items-start">
                    <div className="w-2.5 h-2.5 bg-amber-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                    <span className="text-[11px] text-gray-300">Loading...</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2.5 h-2.5 bg-amber-400 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                    <span className="text-[11px] text-gray-300">Loading...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MemecoinVolumeChart; 