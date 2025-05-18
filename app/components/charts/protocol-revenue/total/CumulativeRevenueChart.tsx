"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { ParentSize } from '@visx/responsive';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { LinePath, Bar } from '@visx/shape';
import { localPoint } from '@visx/event';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import ChartTooltip from "@/app/components/shared/ChartTooltip";
import Modal, { ScrollableLegend } from "@/app/components/shared/Modal";
import TimeFilterSelector from "@/app/components/shared/filters/TimeFilter";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
import LegendItem from "@/app/components/shared/LegendItem";

import { 
  fetchProtocolRevenueData, 
  ProtocolRevenueDataPoint, 
  TimeFilter, 
  formatValue, 
  formatDate 
} from "@/app/api/protocol-revenue/summary/chartData";

// Define chart colors
const chartColors = {
  protocolRevenue: '#60a5fa', // blue
  solanaRevenue: '#a78bfa',   // purple
  grid: '#1f2937',
  axis: '#374151'
};

// Format currency values more concisely (no decimal places for millions)
const formatCurrency = (value: number): string => {
  if (value >= 1e9) {
    return `$${Math.round(value / 1e9)}B`;
  }
  if (value >= 1e6) {
    return `$${Math.round(value / 1e6)}M`;
  }
  if (value >= 1e3) {
    return `$${Math.round(value / 1e3)}K`;
  }
  return `$${Math.round(value)}`;
};

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

// Define props interface
interface CumulativeRevenueChartProps {
  timeFilter?: TimeFilter;
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onTimeFilterChange?: (filter: TimeFilter) => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

// Process data for brush component - ensure one data point per month
const processDataForBrush = (data: ProtocolRevenueDataPoint[]) => {
  if (!data || data.length === 0) return [];
  
  // Group data by month to ensure one data point per month
  const revenueByMonth = data.reduce<Record<string, number>>((acc, curr) => {
    if (!acc[curr.month]) {
      acc[curr.month] = 0;
    }
    acc[curr.month] += curr.cumulative_protocol_revenue;
    return acc;
  }, {});
  
  // Convert to array of { month, date, value } objects for the brush
  return Object.entries(revenueByMonth).map(([month, value]) => ({
    month,
    date: new Date(month),
    value
  }));
};

// Main chart component
const CumulativeRevenueChart: React.FC<CumulativeRevenueChartProps> = ({ 
  timeFilter = 'M',
  isModalOpen = false, 
  onModalClose = () => {},
  onTimeFilterChange,
  legendsChanged
}) => {
  // State for chart data
  const [data, setData] = useState<ProtocolRevenueDataPoint[]>([]);
  const [filteredData, setFilteredData] = useState<ProtocolRevenueDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  
  // State for tooltip
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as ProtocolRevenueDataPoint | null, 
    left: 0, 
    top: 0 
  });
  
  // Modal state
  const [modalData, setModalData] = useState<ProtocolRevenueDataPoint[]>([]);
  const [modalFilteredData, setModalFilteredData] = useState<ProtocolRevenueDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<TimeFilter>(timeFilter);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  
  // Function to fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const revenueData = await fetchProtocolRevenueData(timeFilter);
      
      if (revenueData.length === 0) {
        setError('No data available for this period.');
        setData([]);
        setFilteredData([]);
      } else {
        setData(revenueData);
        setFilteredData(revenueData);
        setIsBrushActive(true);
        setBrushDomain(null);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      let message = 'Failed to load data.';
      if (error instanceof Error) {
        message = error.message || message;
      }
      setError(message);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);
  
  // Function to fetch modal data
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    
    try {
      const revenueData = await fetchProtocolRevenueData(modalTimeFilter);
      
      if (revenueData.length === 0) {
        setModalError('No data available for this period.');
        setModalData([]);
        setModalFilteredData([]);
      } else {
        setModalData(revenueData);
        setModalFilteredData(revenueData);
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      }
    } catch (error) {
      console.error('Error loading modal chart data:', error);
      let message = 'Failed to load data.';
      if (error instanceof Error) {
        message = error.message || message;
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
  
  // Create and send legend data to parent component
  useEffect(() => {
    if (legendsChanged && data.length > 0) {
      const legendsData = Object.entries({
        'Protocol Revenue': {
          color: chartColors.protocolRevenue,
          value: data[data.length - 1]?.cumulative_protocol_revenue
        },
        'Solana Revenue': {
          color: chartColors.solanaRevenue,
          value: data[data.length - 1]?.Cumulative_Solana_Rev
        }
      }).map(([label, { color, value }]) => ({ 
        label, 
        color, 
        value 
      }));
      
      // Send to parent component
      legendsChanged(legendsData);
    }
  }, [data, legendsChanged]);
  
  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: TimeFilter) => {
    setModalTimeFilter(newFilter);
    if (onTimeFilterChange) {
      onTimeFilterChange(newFilter);
    }
  }, [onTimeFilterChange]);
  
  // Handle modal-related effects
  useEffect(() => {
    if (isModalOpen) {
      setModalTimeFilter(timeFilter);
      setModalData(data);
      setModalFilteredData(filteredData.length > 0 ? filteredData : data);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      fetchModalData();
    }
  }, [isModalOpen, timeFilter, data, filteredData, brushDomain, isBrushActive, fetchModalData]);
  
  // Fetch modal data when time filter changes in modal
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [isModalOpen, modalTimeFilter, fetchModalData]);
  
  // Find the closest data point based on mouse x position
  const getClosestPointFromX = useCallback((
    currentData: ProtocolRevenueDataPoint[], 
    mouseX: number, 
    leftMargin: number, 
    chartWidth: number
  ) => {
    if (currentData.length === 0) return -1;
    
    // Calculate approximate index based on mouse position
    const itemWidth = chartWidth / currentData.length;
    const index = Math.floor((mouseX - leftMargin) / itemWidth);
    
    // Return the closest valid index
    if (index < 0) return 0;
    if (index >= currentData.length) return currentData.length - 1;
    return index;
  }, []);
  
  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Use the same margin values as in chart rendering
    const margin = { left: 60, right: 45 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    if (mouseX < margin.left || mouseX > innerWidth + margin.left) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Use current data based on brush state
    const currentData = isModal 
      ? (isModalBrushActive ? modalFilteredData : modalData)
      : (isBrushActive ? filteredData : data);
    
    if (currentData.length === 0) {
      return; // Don't show tooltip if no data is available
    }
    
    // Find the closest data point based on x position
    const closestIndex = getClosestPointFromX(currentData, mouseX, margin.left, innerWidth);
    
    if (closestIndex !== -1) {
      const closestPoint = currentData[closestIndex];
      // Check if this is a new data point or if tooltip is not yet visible
      const isNewDataPoint = !tooltip.dataPoint || tooltip.dataPoint.month !== closestPoint.month;
      
      if (!tooltip.visible || isNewDataPoint) {
        // Full update when showing new data point
        setTooltip({
          visible: true,
          dataPoint: closestPoint,
          left: mouseX,
          top: mouseY
        });
      } else {
        // Only update dataPoint without changing position
        setTooltip(prev => ({
          ...prev,
          dataPoint: closestPoint
        }));
      }
    }
  }, [data, filteredData, modalData, modalFilteredData, isBrushActive, isModalBrushActive, tooltip, getClosestPointFromX]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }
    
    setBrushDomain([startDate, endDate]);
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive]);
  
  // Handle modal brush change
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }
    
    setModalBrushDomain([startDate, endDate]);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive]);
  
  // Apply brush domain to filter data
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
    
    const [start, end] = brushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = data.filter(d => {
      const itemDate = new Date(d.month).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    setFilteredData(filtered.length > 0 ? filtered : data);
  }, [brushDomain, data, isBrushActive, filteredData.length]);
  
  // Apply brush domain to filter modal data
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
    
    const [start, end] = modalBrushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = modalData.filter(d => {
      const itemDate = new Date(d.month).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    setModalFilteredData(filtered.length > 0 ? filtered : modalData);
  }, [modalBrushDomain, modalData, isModalBrushActive, modalFilteredData.length]);
  
  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modal data/filters if in modal mode, otherwise use the main data/filters
    const activeTimeFilter = isModal ? modalTimeFilter : timeFilter;
    const activeData = isModal ? modalData : data;
    const activeFilteredData = isModal ? (isModalBrushActive ? modalFilteredData : modalData) : (isBrushActive ? filteredData : data);
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const activeIsBrushActive = isModal ? isModalBrushActive : isBrushActive;
    const activeHandleBrushChange = isModal ? handleModalBrushChange : handleBrushChange;
    
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
    
    // Define consistent margins for chart and brush to ensure alignment
    const chartMargin = { top: 10, right: 15, bottom: 30, left: 45 };
    const brushMargin = { top: 5, right: chartMargin.right, bottom: 10, left: chartMargin.left };
    
    // Process data for brush
    const brushData = processDataForBrush(activeData);
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && tooltip.dataPoint && (() => {
          // Generate tooltip content
          const tooltipItems = [
            {
              color: chartColors.protocolRevenue,
              label: 'Protocol Revenue',
              value: formatCurrency(tooltip.dataPoint.cumulative_protocol_revenue),
              shape: 'square' as const
            },
            {
              color: chartColors.solanaRevenue,
              label: 'Solana Revenue',
              value: formatCurrency(tooltip.dataPoint.Cumulative_Solana_Rev),
              shape: 'square' as const
            }
          ];
          
          return (
            <ChartTooltip
              title={formatDate(tooltip.dataPoint.month, activeTimeFilter)}
              items={tooltipItems}
              top={tooltip.top}
              left={tooltip.left}
              isModal={isModal}
            />
          );
        })()}
        
        {/* Main chart */}
        <div className="h-[85%] w-full overflow-hidden relative"
          ref={isModal ? modalChartRef : chartRef}
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null;
              
              const margin = chartMargin;
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              // Get data for chart
              const displayData = activeFilteredData;
              
              if (displayData.length === 0) return null;
              
              // Create x and y scales - explicitly ensure we're using Date objects
              const xScale = scaleTime({
                domain: [
                  new Date(displayData[0].month),
                  new Date(displayData[displayData.length - 1].month)
                ] as [Date, Date],
                range: [0, innerWidth]
              });
              
              // Find max value for y-axis scaling (use whichever is larger)
              const maxProtocolRevenue = Math.max(
                ...displayData.map(d => d.cumulative_protocol_revenue)
              );
              
              const maxSolanaRevenue = Math.max(
                ...displayData.map(d => d.Cumulative_Solana_Rev)
              );
              
              const maxValue = Math.max(maxProtocolRevenue, maxSolanaRevenue);
              
              const yScale = scaleLinear({
                domain: [0, maxValue * 1.1], // Add 10% padding
                range: [innerHeight, 0],
                nice: true
              });
              
              return (
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid lines */}
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      height={innerHeight}
                      stroke={chartColors.grid}
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                      numTicks={5}
                    />
                    
                    {/* Protocol Revenue Line */}
                    <LinePath
                      data={displayData}
                      x={(d) => xScale(new Date(d.month))}
                      y={(d) => yScale(d.cumulative_protocol_revenue)}
                      stroke={chartColors.protocolRevenue}
                      strokeWidth={2}
                      curve={curveMonotoneX}
                    />
                    
                    {/* Solana Revenue Line */}
                    <LinePath
                      data={displayData}
                      x={(d) => xScale(new Date(d.month))}
                      y={(d) => yScale(d.Cumulative_Solana_Rev)}
                      stroke={chartColors.solanaRevenue}
                      strokeWidth={2}
                      curve={curveMonotoneX}
                    />
                    
                    {/* X-Axis */}
                    <AxisBottom
                      top={innerHeight}
                      scale={xScale}
                      stroke={chartColors.axis}
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideZero={true}
                      numTicks={Math.min(5, displayData.length)}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'middle',
                        dy: '0.5em'
                      })}
                      tickFormat={(date) => {
                        const d = date as Date;
                        // Simpler date formatting - just show month name
                        return d.toLocaleDateString('en-US', { month: 'short' });
                      }}
                    />
                    
                    {/* Y-Axis */}
                    <AxisLeft
                      scale={yScale}
                      stroke={chartColors.axis}
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      numTicks={5}
                      tickFormat={(value) => formatCurrency(value as number)}
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
                    
                    {/* Invisible bars for tooltip interaction */}
                    {displayData.map((d, i) => {
                      const x = xScale(new Date(d.month));
                      const barWidth = innerWidth / displayData.length;
                      
                      return (
                        <Bar
                          key={`hover-bar-${i}`}
                          x={x - barWidth / 2}
                          y={0}
                          width={barWidth}
                          height={innerHeight}
                          fill="transparent"
                          onMouseMove={(event) => {
                            const coords = localPoint(event) || { x: 0, y: 0 };
                            setTooltip({
                              visible: true,
                              dataPoint: d,
                              left: coords.x,
                              top: coords.y
                            });
                          }}
                        />
                      );
                    })}
                  </Group>
                </svg>
              );
            }}
          </ParentSize>
        </div>
        
        {/* Brush component */}
        <div className="h-[15%] w-full mt-1">
          <BrushTimeScale
            data={brushData}
            isModal={isModal}
            activeBrushDomain={activeBrushDomain}
            onBrushChange={activeHandleBrushChange}
            onClearBrush={isModal 
              ? () => { setModalBrushDomain(null); setIsModalBrushActive(false); }
              : () => { setBrushDomain(null); setIsBrushActive(false); }
            }
            getDate={(d) => d.date.toISOString()}
            getValue={(d) => d.value}
            lineColor={chartColors.protocolRevenue}
            margin={brushMargin}
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
        title="Cumulative Protocol Revenue"
        subtitle="Growth of cumulative protocol revenue and Solana revenue over time"
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
              
              {modalLoading ? (
                // Show loading state
                <>
                  <LegendItem label="Loading..." color="#60a5fa" isLoading={true} />
                  <LegendItem label="Loading..." color="#a78bfa" isLoading={true} />
                </>
              ) : (
                // Use ScrollableLegend component
                <ScrollableLegend
                  
                  items={[
                    {
                      id: 'protocol-revenue',
                      label: 'Protocol Revenue',
                      color: chartColors.protocolRevenue,
                     
                    },
                    {
                      id: 'solana-revenue',
                      label: 'Solana Revenue',
                      color: chartColors.solanaRevenue,
                      
                    }
                  ]}
                />
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CumulativeRevenueChart; 