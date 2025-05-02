import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { LinePath } from '@visx/shape';
import { fetchTvlHistoryDataWithFallback, TvlHistoryDataPoint } from '../../api/dex/tvl/tvlHistoryData';
import Loader from '../shared/Loader';
import ChartTooltip from '../shared/ChartTooltip';
import ButtonSecondary from '../shared/buttons/ButtonSecondary';
import Modal from '../shared/Modal';
import BrushTimeScale from '../shared/BrushTimeScale';

// Define TimeFilter type to match what's used in the parent component
export type TimeFilter = 'W' | 'M' | 'Q' | 'Y';

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

// Helper functions
const formatTvl = (value: number) => `$${(value / 1e9).toFixed(1)}B`;
const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

// Helper to filter data by timeFilter
const filterDataByTimeRange = (data: TvlHistoryDataPoint[], timeFilter: TimeFilter): TvlHistoryDataPoint[] => {
  if (!data || data.length === 0) return [];
  
  const now = new Date();
  let cutoffDate: Date;
  
  switch (timeFilter) {
    case 'W':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week ago
      break;
    case 'M':
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); // 1 month ago
      break;
    case 'Q':
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); // 3 months ago
      break;
    case 'Y':
      cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); // 1 year ago
      break;
    default:
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to 1 week
  }
  
  console.log('[TvlHistoryChart] Filtering data with cutoff date:', cutoffDate.toISOString());
  
  // Filter data to include only dates after the cutoff
  return data.filter(item => {
    try {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    } catch (e) {
      console.error('[TvlHistoryChart] Error parsing date:', item.date, e);
      return false;
    }
  });
};

// Define props interface
interface TvlHistoryChartProps {
  timeFilter: TimeFilter;
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

export const tvlHistoryColors = {
  axisLines: '#374151',
  tickLabels: '#9ca3af',
  tvlLine: '#60a5fa',
  grid: '#374151',
};

const TvlHistoryChart: React.FC<TvlHistoryChartProps> = ({
  timeFilter,
  isModalOpen = false,
  onModalClose = () => {}
}) => {
  // Chart data state
  const [rawData, setRawData] = useState<TvlHistoryDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Brush and filtering states
  const [filteredData, setFilteredData] = useState<TvlHistoryDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific states
  const [modalFilteredData, setModalFilteredData] = useState<TvlHistoryDataPoint[]>([]);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  
  // Add refs for throttling
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  // Add refs for chart containers
  const chartRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as TvlHistoryDataPoint | null, 
    left: 0, 
    top: 0 
  });
  
  // Calculate filtered data based on timeFilter
  const data = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    
    // Filter data based on timeFilter
    const filtered = filterDataByTimeRange(rawData, timeFilter);
    console.log(`[TvlHistoryChart] Filtered data for ${timeFilter}: ${filtered.length} points (from ${rawData.length} total)`);
    
    return filtered.length > 0 ? filtered : rawData; // Fall back to all data if filter yields nothing
  }, [rawData, timeFilter]);
  
  // Initialize filtered data when data changes
  useEffect(() => {
    setFilteredData(data);
    setModalFilteredData(data);
  }, [data]);
  
  // Process data for brush component
  const processDataForBrush = useCallback((chartData: TvlHistoryDataPoint[]): {date: string; tvl: number}[] => {
    if (!chartData || chartData.length === 0) {
      return [];
    }
    
    // Convert to array format for the brush component
    return chartData.map(item => ({
      date: item.date,
      tvl: item.tvl
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
      
      // Filter data within the date range
      const filtered = data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
      
      if (filtered.length === 0) {
        // Fallback to all data if no dates are in range
        setFilteredData(data);
      } else {
        // Set filtered data
        setFilteredData(filtered);
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
        setModalFilteredData(data);
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
      
      // Filter data within the date range
      const filtered = data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
      
      if (filtered.length === 0) {
        // Fallback to all data if no dates are in range
        setModalFilteredData(data);
      } else {
        // Set filtered data
        setModalFilteredData(filtered);
      }
      
      // Set timeout to allow next update
      modalThrottleTimeoutRef.current = setTimeout(() => {
        canUpdateModalFilteredDataRef.current = true;
        modalThrottleTimeoutRef.current = null;
      }, 100);
    }
  }, [isModalBrushActive, data]);

  // Fetch data function
  const fetchData = useCallback(async () => {
    console.log('[TvlHistoryChart] Fetching data with timeFilter:', timeFilter);
    setLoading(true);
    setError(null);
    try {
      const chartData = await fetchTvlHistoryDataWithFallback();
      console.log('[TvlHistoryChart] Data fetch complete, data points:', chartData.length);
      
      if (!chartData || chartData.length === 0) {
        setError('No data available.');
        setRawData([]);
        return;
      }
      
      // Directly use the data - the API should be handling validation
      setRawData(chartData);
      
    } catch (err) {
      console.error('[TvlHistoryChart] Error loading TVL history data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setError(message);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, []); 

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    if (!data || data.length === 0) return;
    
    const chartEl = isModal ? modalChartRef.current : chartRef.current;
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
    
    try {
      // Use the appropriate data based on context
      const chartData = isModal 
        ? (isModalBrushActive ? modalFilteredData : data)
        : (isBrushActive ? filteredData : data);
      
      // Find nearest data point
      const xScale = scaleTime({
        domain: [
          new Date(chartData[0]?.date || ''),
          new Date(chartData[chartData.length - 1]?.date || '')
        ],
        range: [0, innerWidth],
      });
      
      // Convert mouse position to date
      const mouseDate = xScale.invert(mouseX - margin.left);
      
      // Find the closest data point
      let closestPoint = chartData[0];
      let closestDistance = Infinity;
      
      chartData.forEach(point => {
        try {
          const pointDate = new Date(point.date);
          const distance = Math.abs(pointDate.getTime() - mouseDate.getTime());
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = point;
          }
        } catch (e) {
          console.error('[TvlHistoryChart] Error processing date for tooltip:', point.date, e);
        }
      });
      
      if (closestPoint && (!tooltip.visible || tooltip.dataPoint?.date !== closestPoint.date)) {
        setTooltip({
          visible: true,
          dataPoint: closestPoint,
          left: mouseX,
          top: mouseY
        });
      }
    } catch (e) {
      console.error('[TvlHistoryChart] Error handling mouse move:', e);
    }
  }, [data, tooltip.visible, tooltip.dataPoint?.date, filteredData, modalFilteredData, isBrushActive, isModalBrushActive]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Debug function to check if chart should display
  const shouldDisplayChart = !loading && !error && data && data.length > 0;
  
  useEffect(() => {
    console.log('[TvlHistoryChart] Chart display state:', {
      loading,
      error,
      rawDataLength: rawData?.length || 0,
      filteredDataLength: data?.length || 0,
      shouldDisplay: shouldDisplayChart,
      timeFilter
    });
  }, [loading, error, rawData, data, shouldDisplayChart, timeFilter]);

  // Cleanup throttle timeouts on unmount
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

  // Update renderChart to use filteredData
  const renderChart = useCallback(({ width, height }: { width: number, height: number }, isModal = false) => {
    if (width <= 0 || height <= 0) {
      return null;
    }
    
    // Use the appropriate data based on context
    const chartData = isModal 
      ? (isModalBrushActive ? modalFilteredData : data)
      : (isBrushActive ? filteredData : data);
    
    if (!chartData || chartData.length === 0) {
      return null;
    }
    
    const margin = { top: 25, right: 20, bottom: 30, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    if (innerWidth <= 0 || innerHeight <= 0) {
      return null;
    }
    
    try {
      // Create dates for domain
      const dates = chartData.map(d => new Date(d.date));
      const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      // Create scales
      const timeScale = scaleTime({
        domain: [startDate, endDate],
        range: [0, innerWidth],
      });
      
      const maxTvl = Math.max(...chartData.map(d => d.tvl));
      const tvlScale = scaleLinear<number>({
        domain: [0, maxTvl * 1.1],
        range: [innerHeight, 0],
        nice: true,
      });
      
      return (
        <svg width={width} height={height} className="overflow-visible">
          <Group left={margin.left} top={margin.top}>
            {/* Display active brush status */}
            {(isModal ? isModalBrushActive : isBrushActive) && (
              <text x={0} y={-8} fontSize={8} fill={tvlHistoryColors.tvlLine} textAnchor="start">
                {`Filtered: ${chartData.length} item${chartData.length !== 1 ? 's' : ''}`}
              </text>
            )}
            
            {/* Grid lines */}
            <GridRows 
              scale={tvlScale} 
              width={innerWidth} 
              stroke={tvlHistoryColors.grid} 
              strokeDasharray="2,3" 
              strokeOpacity={0.5} 
              numTicks={5} 
            />
            
            {/* TVL line */}
            <LinePath 
              data={chartData}
              x={(d) => {
                const date = new Date(d.date);
                return timeScale(date);
              }}
              y={(d) => tvlScale(d.tvl)}
              stroke={tvlHistoryColors.tvlLine} 
              strokeWidth={2} 
              curve={curveMonotoneX} 
            />
            
            {/* X-axis (dates) */}
            <AxisBottom 
              top={innerHeight} 
              scale={timeScale}
              stroke={tvlHistoryColors.axisLines} 
              strokeWidth={0.5} 
              tickStroke="transparent" 
              tickLength={0}
              hideZero={true}
              numTicks={5}
              tickFormat={(date) => {
                const d = date as Date;
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
              tickLabelProps={() => ({ 
                fill: tvlHistoryColors.tickLabels, 
                fontSize: 11, 
                fontWeight: 300,
                letterSpacing: '0.05em',
                textAnchor: 'middle', 
                dy: '0.5em',
              })}
            />
            
            {/* Y-axis (TVL values) */}
            <AxisLeft 
              scale={tvlScale} 
              stroke={tvlHistoryColors.axisLines} 
              strokeWidth={0.5} 
              tickStroke="transparent" 
              tickLength={0} 
              numTicks={5}
              tickFormat={(value) => formatTvl(Number(value))}
              tickLabelProps={() => ({ 
                fill: tvlHistoryColors.tickLabels, 
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
    } catch (error) {
      console.error('[TvlHistoryChart] Error rendering chart:', error);
      return null;
    }
  }, [data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive]);

  // Render chart content (either in card or modal)
  const renderChartContent = (isModal = false) => {
    return (
      <div className="h-full w-full relative" ref={isModal ? modalChartRef : chartRef}>
        {/* Show loading state */}
        {loading && (
          <div className="absolute inset-0 flex justify-center items-center">
            <Loader size="sm" />
          </div>
        )}
        
        {/* Show error state with refresh button */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            <div className="text-gray-400/80 text-xs mb-2">{error}</div>
            <ButtonSecondary onClick={fetchData}>
              <div className="flex items-center gap-1.5">
                <RefreshIcon className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </div>
            </ButtonSecondary>
          </div>
        )}
        
        {/* Show empty data state */}
        {!loading && !error && (!data || data.length === 0) && (
          <div className="absolute inset-0 flex justify-center items-center">
            <div className="text-gray-400/80 text-xs">No data available for selected time period.</div>
          </div>
        )}
        
        {/* Show chart with brush */}
        {shouldDisplayChart && (
          <div className="flex flex-col h-full w-full">
            {tooltip.visible && tooltip.dataPoint && (
              <ChartTooltip
                title={formatDate(tooltip.dataPoint.date)}
                items={[
                  { color: tvlHistoryColors.tvlLine, label: 'TVL', value: formatTvl(tooltip.dataPoint.tvl), shape: 'circle' }
                ]}
                top={tooltip.top}
                left={tooltip.left}
                isModal={isModal}
              />
            )}
            
            {/* Main chart */}
            <div 
              className="h-[85%] w-full overflow-hidden relative"
              onMouseMove={(e) => handleMouseMove(e, isModal)}
              onMouseLeave={handleMouseLeave}
            >
              <ParentSize>
                {(props) => renderChart(props, isModal)}
              </ParentSize>
            </div>
            
            {/* Brush component */}
            <div className="h-[15%] w-full mt-1">
              <BrushTimeScale
                data={processDataForBrush(data)}
                isModal={isModal}
                activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
                onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
                onClearBrush={() => {
                  if (isModal) {
                    setModalBrushDomain(null);
                    setIsModalBrushActive(false);
                    setModalFilteredData(data);
                  } else {
                    setBrushDomain(null);
                    setIsBrushActive(false);
                    setFilteredData(data);
                  }
                }}
                getDate={(d) => d.date}
                getValue={(d) => d.tvl}
                lineColor={tvlHistoryColors.tvlLine}
                margin={{ top: 5, right: 20, bottom: 10, left: 45 }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render chart with modal support
  return (
    <div className="h-full w-full relative">
      {renderChartContent(false)}
      
      {/* Modal for expanded view */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="TVL History" 
        subtitle="Historical Total Value Locked (TVL) on Solana DEXs"
      >
        <div className="p-4 w-full h-full">
          {/* Horizontal divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Chart with legends in modal */}
          <div className="h-[60vh]">
            <div className="flex h-full">
              {/* Chart area - 90% width */}
              <div className="w-[90%] h-full pr-3 border-r border-gray-900">
                {renderChartContent(true)}
              </div>
              
              {/* Legend area - 10% width */}
              <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
                <div className="text-[10px] text-gray-400 mb-2">METRICS</div>
                <div className="flex items-center mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm mr-1.5" style={{ backgroundColor: tvlHistoryColors.tvlLine }}></div>
                  <span className="text-[11px] text-gray-300">TVL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TvlHistoryChart; 