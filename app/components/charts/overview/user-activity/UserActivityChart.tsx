"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scaleBand, scaleTime } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import ChartTooltip from "@/app/components/shared/ChartTooltip";
import Modal from "@/app/components/shared/Modal";
import LegendItem from "@/app/components/shared/LegendItem";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
import { fetchUserActivityData, UserActivityDataPoint } from "@/app/api/overview/user-activity/userActivityData";
import TimeFilter from "@/app/components/shared/filters/TimeFilter";

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface UserActivityChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  timeView?: 'W' | 'M' | 'Q' | 'Y';
  onTimeViewChange?: (value: 'W' | 'M' | 'Q' | 'Y') => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

// Extended UserActivityDataPoint with dateObj for internal use
interface ExtendedUserActivityDataPoint extends UserActivityDataPoint {
  dateObj: Date;
}

// Define colors for the different metrics
const COLORS = {
  Active_Wallets: '#3b82f6', // blue
  New_Wallets: '#10b981', // green
  grid: '#1f2937',
  axisLines: '#374151',
  tickLabels: '#6b7280',
};

const UserActivityChart: React.FC<UserActivityChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
  timeView = 'M',
  onTimeViewChange,
  legendsChanged
}) => {
  // Main chart data state
  const [data, setData] = useState<ExtendedUserActivityDataPoint[]>([]);
  const [filteredData, setFilteredData] = useState<ExtendedUserActivityDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Brush state 
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Modal state
  const [modalData, setModalData] = useState<ExtendedUserActivityDataPoint[]>([]);
  const [modalFilteredData, setModalFilteredData] = useState<ExtendedUserActivityDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeView, setModalTimeView] = useState<'W' | 'M' | 'Q' | 'Y'>(timeView);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({
    visible: false,
    date: '',
    items: [] as { label: string, value: number, color: string }[],
    left: 0,
    top: 0
  });

  // Add refs for throttling
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  // Chart container refs
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);

  // Fetch data function for main chart
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activityData = await fetchUserActivityData(timeView);
      
      if (activityData.length === 0) {
        setError('No data available for user activity.');
        setData([]);
        setFilteredData([]);
      } else {
        // Process dates and sort by date
        const processedData: ExtendedUserActivityDataPoint[] = activityData.map(item => ({
          ...item,
          dateObj: new Date(item.block_date)
        })).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        
        setData(processedData);
        setFilteredData(processedData);
        
        // Update brush state to show full data initially
        setIsBrushActive(false);
        setBrushDomain(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data.';
      setError(message);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [timeView]);

  // Fetch data function for modal
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const activityData = await fetchUserActivityData(modalTimeView);
      
      if (activityData.length === 0) {
        setModalError('No data available for user activity.');
        setModalData([]);
        setModalFilteredData([]);
      } else {
        // Process dates and sort by date
        const processedData: ExtendedUserActivityDataPoint[] = activityData.map(item => ({
          ...item,
          dateObj: new Date(item.block_date)
        })).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        
        setModalData(processedData);
        setModalFilteredData(processedData);
        
        // Update brush state to show full data initially
        setIsModalBrushActive(false);
        setModalBrushDomain(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data.';
      setModalError(message);
      setModalData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  }, [modalTimeView]);

  // Fetch data on mount and when timeView changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle modal open to sync data
  useEffect(() => {
    if (isModalOpen) {
      setModalTimeView(timeView);
      setModalData(data);
      setModalFilteredData(filteredData.length > 0 ? filteredData : data);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      fetchModalData();
    }
  }, [isModalOpen, timeView, data, filteredData, brushDomain, isBrushActive, fetchModalData]);

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
    
    const filtered = data.filter(d => {
      return d.dateObj >= start && d.dateObj <= end;
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
    
    const filtered = modalData.filter(d => {
      return d.dateObj >= start && d.dateObj <= end;
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

  // Create tooltip handler with precise positioning
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const margin = { left: 60, right: 20 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    // Exit if mouse outside the chart area
    if (mouseX < margin.left || mouseX > innerWidth + margin.left) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the active data based on modal state
    const activeData = isModal ? modalFilteredData : filteredData;
    if (activeData.length === 0) return;
    
    // Calculate which data point we're hovering over
    const barWidth = innerWidth / activeData.length;
    const barIndex = Math.min(
      Math.floor((mouseX - margin.left) / barWidth),
      activeData.length - 1
    );
    
    if (barIndex < 0 || barIndex >= activeData.length) return;
    
    const dataPoint = activeData[barIndex];
    
    // Update tooltip data
    setTooltip({
      visible: true,
      date: dataPoint.block_date,
      items: [
        { 
          label: 'Active Wallets', 
          value: dataPoint.Active_Wallets, 
          color: COLORS.Active_Wallets 
        },
        { 
          label: 'New Wallets', 
          value: dataPoint.New_Wallets, 
          color: COLORS.New_Wallets 
        }
      ],
      left: mouseX,
      top: mouseY
    });
  }, [filteredData, modalFilteredData, tooltip.visible]);

  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Format number values
  const formatNumber = (value: number | { valueOf(): number }) => {
    const numValue = typeof value === 'number' ? value : value.valueOf();
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`;
    } else {
      return numValue.toString();
    }
  };

  // Format date based on time view
  const formatDate = (dateStr: string, view: 'W' | 'M' | 'Q' | 'Y' = timeView) => {
    const date = new Date(dateStr);
    
    if (view === 'W') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (view === 'M') {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else if (view === 'Q') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    } else {
      return date.getFullYear().toString();
    }
  };

  // Render the chart with responsive styling
  const renderChartContent = (width: number, height: number, isModal = false) => {
    // Use modal state or main state based on context
    const activeTimeView = isModal ? modalTimeView : timeView;
    const activeData = isModal ? modalData : data;
    const activeFilteredData = isModal ? 
      (isModalBrushActive ? modalFilteredData : modalData) : 
      (isBrushActive ? filteredData : data);
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    
    // Show loading state
    if (activeLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <Loader size="sm" />
        </div>
      );
    }

    // Show error state with retry button
    if (activeError || activeFilteredData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <p className="text-red-400 mb-3 text-sm">{activeError || 'No data available'}</p>
          <ButtonSecondary onClick={isModal ? fetchModalData : fetchData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Retry</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && (
          <ChartTooltip
            left={tooltip.left}
            top={tooltip.top}
            title={`Date: ${formatDate(tooltip.date, activeTimeView)}`}
            items={tooltip.items.map(item => ({
              ...item,
              value: formatNumber(item.value)
            }))}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div 
          className="h-[85%] w-full overflow-hidden relative"
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
              
              // Find max value for Y scale
              const maxActiveWallets = Math.max(...activeFilteredData.map(d => d.Active_Wallets));
              const maxNewWallets = Math.max(...activeFilteredData.map(d => d.New_Wallets));
              const maxValue = Math.max(maxActiveWallets, maxNewWallets);
              
              // Scales with padding for visual appeal
              const xScale = scaleBand<string>({
                domain: activeFilteredData.map(d => d.block_date),
                range: [0, innerWidth],
                padding: 0.2
              });

              const yScale = scaleLinear<number>({
                domain: [0, maxValue * 1.1], // Add 10% padding on top
                range: [innerHeight, 0],
                nice: true
              });

              // Calculate bar width
              const barWidth = xScale.bandwidth() / 2;
              
              return (
                <svg width={width} height={height - 5}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Y Grid */}
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      height={innerHeight}
                      stroke={COLORS.grid}
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                      numTicks={5}
                    />
                    
                    {/* Bars for Active Wallets */}
                    {activeFilteredData.map((d, i) => {
                      const barHeight = innerHeight - yScale(d.Active_Wallets);
                      const x = xScale(d.block_date) || 0;
                      
                      return (
                        <Bar
                          key={`active-${i}`}
                          x={x}
                          y={innerHeight - barHeight}
                          width={barWidth}
                          height={barHeight}
                          fill={COLORS.Active_Wallets}
                          opacity={tooltip.date === d.block_date ? 1 : 0.8}
                          rx={2} // Rounded corners
                        />
                      );
                    })}
                    
                    {/* Bars for New Wallets */}
                    {activeFilteredData.map((d, i) => {
                      const barHeight = innerHeight - yScale(d.New_Wallets);
                      const x = (xScale(d.block_date) || 0) + barWidth;
                      
                      return (
                        <Bar
                          key={`new-${i}`}
                          x={x}
                          y={innerHeight - barHeight}
                          width={barWidth}
                          height={barHeight}
                          fill={COLORS.New_Wallets}
                          opacity={tooltip.date === d.block_date ? 1 : 0.8}
                          rx={2} // Rounded corners
                        />
                      );
                    })}
                    
                    {/* X Axis with improved date formatting */}
                    <AxisBottom
                      top={innerHeight}
                      scale={xScale}
                      stroke={COLORS.axisLines}
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideZero={true}
                      numTicks={Math.min(5, activeFilteredData.length)}
                      tickFormat={(date) => {
                        const d = new Date(date);
                        // Custom formatting based on active time view
                        switch(activeTimeView) {
                          case 'Y': return d.getFullYear().toString();
                          case 'Q': return `Q${Math.floor(d.getMonth() / 3) + 1}`;
                          case 'M': return d.toLocaleDateString('en-US', { month: 'short' });
                          case 'W': 
                          default: return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                      }}
                      tickLabelProps={(value, index) => ({
                        fill: COLORS.tickLabels,
                        fontSize: 11,
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: index === 0 ? 'start' : 'middle',
                        dy: '0.5em',
                        dx: index === 0 ? '0.5em' : 0
                      })}
                    />
                    
                    {/* Y Axis with number formatting */}
                    <AxisLeft
                      scale={yScale}
                      stroke={COLORS.axisLines}
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      numTicks={5}
                      tickFormat={formatNumber}
                      tickLabelProps={() => ({
                        fill: COLORS.tickLabels,
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
            getDate={(d) => d.dateObj}
            getValue={(d) => {
              // Sum active and new wallets for the brush value
              return d.Active_Wallets + d.New_Wallets;
            }}
            lineColor={COLORS.Active_Wallets}
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
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="User Activity" 
        subtitle="Tracking active and new wallets in the Solana ecosystem"
      >
        {/* Filters */}
        <div className="flex items-center justify-between pl-1 py-0 mb-3">
          <div className="flex space-x-4 items-center">
            <TimeFilter 
              value={modalTimeView}
              onChange={(value) => {
                setModalTimeView(value as 'W' | 'M' | 'Q' | 'Y');
                if (onTimeViewChange) {
                  onTimeViewChange(value as 'W' | 'M' | 'Q' | 'Y');
                }
              }}
              options={[
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' },
                { value: 'Y', label: 'Y' }
              ]}
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
              <div className="text-[10px] text-gray-400 mb-2">WALLET TYPES</div>
              <div className="flex items-center mb-1.5">
                <div 
                  className="w-2.5 h-2.5 rounded-sm mr-1.5" 
                  style={{ backgroundColor: COLORS.Active_Wallets }}
                ></div>
                <span className="text-[11px] text-gray-300">Active Wallets</span>
              </div>
              <div className="flex items-center mb-1.5">
                <div 
                  className="w-2.5 h-2.5 rounded-sm mr-1.5" 
                  style={{ backgroundColor: COLORS.New_Wallets }}
                ></div>
                <span className="text-[11px] text-gray-300">New Wallets</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserActivityChart; 