import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleBand } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar } from '@visx/shape';
import { VolumeHistoryDataPoint, VolumeTimeFilter, fetchVolumeHistoryData, formatVolume, formatVolumeDate } from '../../api/dex/volume';
import Loader from '../shared/Loader';
import ChartTooltip from '../shared/ChartTooltip';
import ButtonSecondary from '../shared/buttons/ButtonSecondary';
import Modal from '../shared/Modal';
import TimeFilterSelector from '../shared/filters/TimeFilter';
import BrushTimeScale from '../shared/BrushTimeScale';

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

// Chart colors for volume history
export const volumeHistoryColors = {
  volumeBar: '#60a5fa', // blue
  grid: '#374151',
  axisLines: '#374151',
  tickLabels: '#9ca3af',
};

// Export a function to get chart colors for external use
export const getVolumeHistoryChartColors = () => {
  return {
    volume: volumeHistoryColors.volumeBar
  };
};

interface VolumeHistoryChartProps {
  timeFilter: VolumeTimeFilter;
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

const VolumeHistoryChart: React.FC<VolumeHistoryChartProps> = ({ 
  timeFilter, 
  isModalOpen = false, 
  onModalClose = () => {} 
}) => {
  // Main chart data
  const [data, setData] = useState<VolumeHistoryDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<VolumeHistoryDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific data
  const [modalData, setModalData] = useState<VolumeHistoryDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<VolumeTimeFilter>(timeFilter);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<VolumeHistoryDataPoint[]>([]);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as VolumeHistoryDataPoint | null, 
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
      const chartData = await fetchVolumeHistoryData(timeFilter);
      if (chartData.length === 0) {
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
      const chartData = await fetchVolumeHistoryData(modalTimeFilter);
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

  // Fetch data for main chart on mount and when timeFilter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Process data with dates
  const dataWithDates = useMemo(() => 
    data.map(d => ({
      ...d,
      dateObj: new Date(d.date)
    })),
  [data]);
  
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
      
      // Filter the data based on the brush domain
      const filteredData = data.filter(d => {
        const date = new Date(d.date);
        return date >= startDate && date <= endDate;
      });
      
      setFilteredData(filteredData);
      
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
      
      // Filter the data based on the brush domain
      const filteredData = modalData.filter(d => {
        const date = new Date(d.date);
        return date >= startDate && date <= endDate;
      });
      
      setModalFilteredData(filteredData);
      
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
          left: e.clientX,
          top: e.clientY
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
      console.log("Modal opened - initializing with data");
      setModalTimeFilter(timeFilter);
      setModalData(data);
      setModalFilteredData(filteredData);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      setModalLoading(false); // Initialize as not loading if we already have data
      
      if (data.length === 0) {
        fetchModalData();
      }
    }
  }, [isModalOpen, timeFilter, data, filteredData, brushDomain, isBrushActive, fetchModalData]);
  
  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: VolumeTimeFilter) => {
    console.log('Time filter changed to:', newFilter);
    setModalTimeFilter(newFilter);
  }, []);

  // Effect to fetch modal data when time filter changes
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [modalTimeFilter, isModalOpen, fetchModalData]);

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
            title={formatVolumeDate(tooltip.dataPoint.date, activeTimeFilter)}
            items={[
              { color: volumeHistoryColors.volumeBar, label: 'Volume', value: formatVolume(tooltip.dataPoint.volume), shape: 'square' }
            ]}
            top={tooltip.top - (isModal ? 50 : 240)}
            left={tooltip.left - (isModal ? 50 : 240)}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div className="h-[85%] w-full overflow-hidden"
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

              // Use displayed data for this chart (modal or main)
              const displayData = activeFilteredData;

              // Create a time domain from the current data
              const dateDomain = displayData.map(d => new Date(d.date));
              
              // Setup scales for chart
          const dateScale = scaleBand<Date>({
                domain: dateDomain,
            range: [0, innerWidth],
            padding: 0.3,
          });

          const volumeScale = scaleLinear<number>({
                domain: [0, Math.max(...displayData.map(d => d.volume)) * 1.1 || 1],
            range: [innerHeight, 0],
                nice: true,
          });

          return (
                <svg width={width} height={height} className="overflow-visible">
              <Group left={margin.left} top={margin.top}>
                <GridRows scale={volumeScale} width={innerWidth} stroke={volumeHistoryColors.grid} strokeDasharray="2,3" strokeOpacity={0.5} numTicks={5} />
                    
                    {/* Display active brush status */}
                    {activeIsBrushActive && (
                  <text x={0} y={-8} fontSize={8} fill={volumeHistoryColors.volumeBar} textAnchor="start">
                    {`Filtered: ${displayData.length} item${displayData.length !== 1 ? 's' : ''}`}
                  </text>
                )}
                    
                    {/* Volume bars */}
                    {displayData.map((d) => {
                      const date = new Date(d.date);
                      const barX = dateScale(date);
                  const barWidth = dateScale.bandwidth();
                  const barHeight = Math.max(0, innerHeight - volumeScale(d.volume));
                      if (barX === undefined || barHeight < 0) return null;
                  return (
                    <Bar
                          key={`bar-${d.date}`} 
                      x={barX}
                      y={innerHeight - barHeight}
                      width={barWidth}
                      height={barHeight}
                      fill={volumeHistoryColors.volumeBar}
                      opacity={tooltip.dataPoint?.date === d.date ? 1 : 0.7}
                      rx={2}
                    />
                  );
                })}
                    
                    {/* X-axis (dates) */}
                 <AxisBottom 
                  top={innerHeight} 
                  scale={dateScale}
                      tickFormat={(date) => {
                        const d = date as Date;
                        return formatVolumeDate(d.toISOString(), activeTimeFilter);
                      }}
                      stroke={volumeHistoryColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0}
                      hideZero={true}
                  tickLabelProps={(value, index) => ({ 
                        fill: volumeHistoryColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: index === 0 ? 'start' : 'middle', 
                        dy: '0.5em',
                        dx: index === 0 ? '0.5em' : 0
                      })}
                      numTicks={Math.min(6, displayData.length)}
                    />
                    
                    {/* Y-axis (volume) */}
                <AxisLeft 
                  scale={volumeScale}
                      stroke={volumeHistoryColors.axisLines} 
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
                        fill: volumeHistoryColors.tickLabels, 
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
            getDate={(d) => d.date}
        getValue={(d) => d.volume} 
        lineColor={volumeHistoryColors.volumeBar}
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
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="Trading Volume History" subtitle="Tracking trading volume trends across the Solana ecosystem">
        
        {/* Time filter */}
        <div className="flex items-center justify-start pl-1 py-0 mb-3">
          <TimeFilterSelector 
            value={modalTimeFilter} 
            onChange={(val) => handleModalTimeFilterChange(val as VolumeTimeFilter)}
            options={[
              { value: 'W', label: 'W' },
              { value: 'M', label: 'M' },
              { value: 'Q', label: 'Q' }
            ]}
          />
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
              <div className="text-[10px] text-gray-400 mb-2">METRICS</div>
              <div className="flex items-center mb-1.5">
                <div className="w-2.5 h-2.5 rounded-sm mr-1.5" style={{ backgroundColor: volumeHistoryColors.volumeBar }}></div>
                <span className="text-[11px] text-gray-300">Volume</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VolumeHistoryChart;