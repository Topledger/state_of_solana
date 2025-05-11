"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TradersDataPoint, fetchTradersData, formatLargeNumber, formatTraderDate } from '../../../../api/dex/traders/tradersData';
import Modal from '../../../shared/Modal';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { LinePath } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { scaleBand, scaleLinear, scaleTime } from '@visx/scale';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import { curveMonotoneX } from '@visx/curve';

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

// Chart colors for consistent styling
export const tradersActivityChartColors = {
  grid: '#1f2937',
  axisLines: '#374151',
  tickLabels: '#6b7280',
  activeTraders: '#60a5fa', // blue for bar chart
  newTraders: '#f97316', // orange for new traders line
  activationRatio: '#34d399', // green for activation ratio line
};

// Export a function to get chart colors for external use
export const getTradersActivityChartColors = () => {
  return {
    activeTraders: tradersActivityChartColors.activeTraders,
    newTraders: tradersActivityChartColors.newTraders,
    activationRatio: tradersActivityChartColors.activationRatio,
  };
};

// Helper functions
const formatActiveTraders = (value: number) => formatLargeNumber(value);
const formatNewTraders = (value: number) => formatLargeNumber(value);
const formatRatio = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatAxisDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

interface TradersActivityChartProps {
  isModalOpen: boolean;
  onModalClose: () => void;
}

export default function TradersActivityChart({ 
  isModalOpen, 
  onModalClose,
}: TradersActivityChartProps) {
  // Main chart data states
  const [data, setData] = useState<TradersDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering and brushing states
  const [filteredData, setFilteredData] = useState<TradersDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific states
  const [modalData, setModalData] = useState<TradersDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<TradersDataPoint[]>([]);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as TradersDataPoint | null, 
    left: 0, 
    top: 0 
  });
  
  // Add refs for chart containers
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // Add refs for throttling brush updates
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  // Fetch data from the API with enhanced loading states
  const fetchData = useCallback(async () => {
    console.log('[TradersActivityChart] Starting to fetch data');
    setIsLoading(true);
    setError(null);
    try {
      const fetchedData = await fetchTradersData();
      console.log('[TradersActivityChart] Fetched data:', fetchedData.length, 'points');
      
      if (!fetchedData || fetchedData.length === 0) {
        console.warn('[TradersActivityChart] No data returned from API');
        setError('No data available from API');
        setData([]);
        setFilteredData([]);
      } else {
        setData(fetchedData);
        setFilteredData(fetchedData);
        
        // Set brush as active but don't set a specific domain
        setIsBrushActive(true);
        setBrushDomain(null);
      }
    } catch (err) {
      console.error('[TradersActivityChart] Error fetching data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setError(message);
      setData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    console.log('[TradersActivityChart] Starting to fetch modal data');
    setModalLoading(true);
    setModalError(null);
    try {
      const fetchedData = await fetchTradersData();
      console.log('[TradersActivityChart] Fetched modal data:', fetchedData.length, 'points');
      
      if (!fetchedData || fetchedData.length === 0) {
        console.warn('[TradersActivityChart] No modal data returned from API');
        setModalError('No data available from API');
        setModalData([]);
        setModalFilteredData([]);
      } else {
        setModalData(fetchedData);
        setModalFilteredData(fetchedData);
        
        // Set brush as active but don't set a specific domain
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      }
    } catch (err) {
      console.error('[TradersActivityChart] Error fetching modal data:', err);
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
  }, []);
  
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
    
    // Filtering update is handled by the useEffect based on brushDomain
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

  }, [modalBrushDomain, modalData, isModalBrushActive, modalFilteredData.length]);
  
  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    console.log('TradersActivity - Mouse move event', { isModal, clientX: e.clientX, clientY: e.clientY });
    
    const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
    if (!chartEl) return;
    
    const rect = chartEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const margin = { left: 60 };
    const innerWidth = rect.width - margin.left - 60;
    
    if (mouseX < margin.left || mouseX > innerWidth + margin.left) {
      if (tooltip.visible) {
        console.log('TradersActivity - Mouse outside chart area, hiding tooltip');
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Use the current displayed data based on whether we're in modal or main view
    const currentData = isModal 
      ? (isModalBrushActive ? modalFilteredData : modalData)
      : (isBrushActive ? filteredData : data);
    
    // Sort data by date to ensure chronological order
    const sortedData = [...currentData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Find nearest data point
    const index = Math.floor((mouseX - margin.left) / (innerWidth / sortedData.length));
    
    if (index >= 0 && index < sortedData.length) {
      const dataPoint = sortedData[index];
      if (!tooltip.visible || tooltip.dataPoint?.date !== dataPoint.date) {
        console.log('TradersActivity - Setting tooltip data', { 
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
      console.log('TradersActivity - Mouse leave, hiding tooltip');
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
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
      // If we already have data loaded for the main chart,
      // we can just use that data for the modal initially
      if (data.length > 0) {
        setModalData(data);
        setModalFilteredData(filteredData);
        setModalLoading(false);
        setModalError(null);
        
        // Set brush as active but don't set a specific domain
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      } else {
        // Otherwise fetch data specifically for the modal
        fetchModalData();
      }
    }
  }, [isModalOpen, data, filteredData, fetchModalData]);
  
  // Helper function to get available metrics for legends
  const getAvailableMetrics = (chartData: TradersDataPoint[]) => {
    if (!chartData || chartData.length === 0) return [];
    
    return [
      {
        key: 'active_signer',
        displayName: 'Active Traders',
        shape: 'square',
        color: tradersActivityChartColors.activeTraders
      },
      {
        key: 'new_signer',
        displayName: 'New Traders',
        shape: 'circle',
        color: tradersActivityChartColors.newTraders
      },
      {
        key: 'new_traders_activation_ratio',
        displayName: 'Activation Ratio',
        shape: 'circle',
        color: tradersActivityChartColors.activationRatio
      }
    ];
  };
  
  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use activeData if in modal mode, otherwise use the main data
    const activeData = isModal ? modalData : data;
    const activeFilteredData = isModal ? (isModalBrushActive ? modalFilteredData : modalData) : (isBrushActive ? filteredData : data);
    const activeLoading = isModal ? modalLoading : isLoading;
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
    
    // Ensure data is sorted by date
    const sortedData = [...activeFilteredData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && tooltip.dataPoint && (
          <ChartTooltip
            title={formatTraderDate(tooltip.dataPoint.date)}
            items={[
              { 
                color: tradersActivityChartColors.activeTraders,
                label: 'Active Traders',
                value: formatActiveTraders(tooltip.dataPoint.active_signer),
                shape: 'square'
              },
              {
                color: tradersActivityChartColors.newTraders,
                label: 'New Traders',
                value: formatNewTraders(tooltip.dataPoint.new_signer),
                shape: 'circle'
              },
              {
                color: tradersActivityChartColors.activationRatio,
                label: 'Activation Ratio',
                value: formatRatio(tooltip.dataPoint.new_traders_activation_ratio),
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
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
          ref={isModal ? modalChartRef : chartContainerRef}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null;
              
              const margin = { top: 20, right: 60, bottom: 40, left: 60 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              // Find range values for scales
              const maxActiveSigners = Math.max(...sortedData.map(d => d.active_signer), 0);
              const maxNewSigners = Math.max(...sortedData.map(d => d.new_signer), 0);
              const yMax = Math.max(maxActiveSigners, maxNewSigners) * 1.1; // Add 10% padding
              
              // Create date domain from the current data
              const dateDomain = sortedData.map(d => new Date(d.date));
              
              // Setup scales
              const dateScale = scaleBand<Date>({
                domain: dateDomain,
                padding: 0.3,
                range: [0, innerWidth]
              });
              
              const yScale = scaleLinear<number>({
                domain: [0, yMax],
                range: [innerHeight, 0],
                nice: true
              });
              
              // Secondary y-scale for activation ratio (0-1)
              const yRatioScale = scaleLinear<number>({
                domain: [0, 1.1], // Up to 110% for some padding
                range: [innerHeight, 0],
                nice: true
              });
              
              return (
                <svg width={width} height={height} className="overflow-visible">
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid lines */}
                    <GridRows 
                      scale={yScale} 
                      width={innerWidth} 
                      stroke={tradersActivityChartColors.grid} 
                      strokeDasharray="2,3" 
                      strokeOpacity={0.5} 
                      numTicks={5} 
                    />
                    
                    {/* Active Traders Bars */}
                    {sortedData.map((d, i) => {
                      const date = new Date(d.date);
                      const barX = dateScale(date);
                      const barWidth = dateScale.bandwidth();
                      const barHeight = innerHeight - yScale(d.active_signer);
                      if (barX === undefined || barHeight < 0) return null;
                      
                      return (
                        <Bar
                          key={`bar-${i}`}
                          x={barX}
                          y={innerHeight - barHeight}
                          width={barWidth}
                          height={barHeight}
                          fill={tradersActivityChartColors.activeTraders}
                          opacity={tooltip.dataPoint?.date === d.date ? 1 : 0.7}
                          rx={2}
                        />
                      );
                    })}
                    
                    {/* New Traders Line */}
                    <LinePath
                      data={sortedData}
                      x={(d) => (dateScale(new Date(d.date)) ?? 0) + dateScale.bandwidth() / 2}
                      y={(d) => yScale(d.new_signer)}
                      stroke={tradersActivityChartColors.newTraders}
                      strokeWidth={1.5}
                      curve={curveMonotoneX}
                    />
                    
                    {/* Activation Ratio Line */}
                    <LinePath
                      data={sortedData}
                      x={(d) => (dateScale(new Date(d.date)) ?? 0) + dateScale.bandwidth() / 2}
                      y={(d) => yRatioScale(d.new_traders_activation_ratio)}
                      stroke={tradersActivityChartColors.activationRatio}
                      strokeWidth={1.5}
                      curve={curveMonotoneX}
                    />
                    
                    {/* X-axis (dates) */}
                    <AxisBottom 
                      top={innerHeight} 
                      scale={dateScale}
                      tickFormat={(date) => {
                        const d = date as Date;
                        return formatAxisDate(d.toISOString());
                      }}
                      stroke={tradersActivityChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0}
                      hideZero={true}
                      tickLabelProps={(value, index) => ({ 
                        fill: tradersActivityChartColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: index === 0 ? 'start' : 'middle', 
                        dy: '0.5em',
                        dx: index === 0 ? '0.5em' : 0
                      })}
                      numTicks={isModal ? 6 : 4}
                    />
                    
                    {/* Primary Y-axis (Traders Count) */}
                    <AxisLeft 
                      scale={yScale}
                      stroke={tradersActivityChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => formatLargeNumber(Number(value))}
                      tickLabelProps={() => ({ 
                        fill: tradersActivityChartColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'end', 
                        dx: '-0.6em', 
                        dy: '0.25em' 
                      })}
                    />
                    
                    {/* Secondary Y-axis (Activation Ratio) */}
                    <AxisRight
                      left={innerWidth}
                      scale={yRatioScale}
                      stroke={tradersActivityChartColors.axisLines}
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      numTicks={5}
                      tickFormat={(value) => `${(Number(value) * 100).toFixed(0)}%`}
                      tickLabelProps={() => ({
                        fill: tradersActivityChartColors.tickLabels,
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
        
        {/* Brush component */}
        <div className="h-[15%] w-full mt-1">
          <BrushTimeScale
            data={isModal ? modalData : data}
            isModal={isModal}
            activeBrushDomain={activeBrushDomain}
            onBrushChange={activeHandleBrushChange}
            onClearBrush={activeClearBrush}
            getDate={(d) => d.date}
            getValue={(d) => d.active_signer}
            lineColor={tradersActivityChartColors.activeTraders}
            margin={{ top: 5, right: 60, bottom: 10, left: 60 }}
          />
        </div>
      </div>
    );
  };
  
  // Render the modal content
  const renderModalContent = () => {
    return (
      <div className="p-4 w-full h-full">
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
                    {getAvailableMetrics(modalData).map(metric => (
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
                      <div className="w-2.5 h-2.5 bg-orange-500 mr-2 rounded-full mt-0.5 animate-pulse"></div>
                      <span className="text-[11px] text-gray-300">Loading...</span>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-2.5 h-2.5 bg-green-500 mr-2 rounded-full mt-0.5 animate-pulse"></div>
                      <span className="text-[11px] text-gray-300">Loading...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal for expanded view */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="Traders Activity" subtitle="Analysis of active and new trader metrics on Solana DEXes">
        {renderModalContent()}
      </Modal>
    </div>
  );
} 