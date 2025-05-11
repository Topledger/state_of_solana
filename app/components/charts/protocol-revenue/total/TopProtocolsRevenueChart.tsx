"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { localPoint } from '@visx/event';
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import ChartTooltip from "@/app/components/shared/ChartTooltip";
import Modal from "@/app/components/shared/Modal";
import LegendItem from "@/app/components/shared/LegendItem";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";

import { 
  fetchTopProtocolsRevenueData, 
  PlatformRevenueDataPoint,
  formatCurrency 
} from "@/app/api/protocol-revenue/total/topProtocolsData";

// Define chart colors - using a color mapping for different platforms
const platformColors: Record<string, string> = {
  'Photon': '#34d399',
  'Phantom': '#60a5fa',
  'Pump Fun': '#a78bfa',
  'Raydium': '#f97316',
  'bloxroute': '#fbbf24',
  'BullX': '#fb7185',
  'Trojan': '#c084fc',
  'GMGN': '#94a3b8',
  'Jito': '#86efac',
  'DexScreener': '#7dd3fc',
  'default': '#6b7280',
};

// Get color for a platform with fallback to default
const getPlatformColor = (platform: string): string => {
  return platformColors[platform] || platformColors.default;
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
interface TopProtocolsRevenueChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

// Extended type to include date for brush functionality
interface ExtendedPlatformRevenueDataPoint extends PlatformRevenueDataPoint {
  date?: Date;
}

// Main chart component
const TopProtocolsRevenueChart: React.FC<TopProtocolsRevenueChartProps> = ({ 
  isModalOpen = false, 
  onModalClose = () => {},
  legendsChanged
}) => {
  // State for chart data
  const [data, setData] = useState<ExtendedPlatformRevenueDataPoint[]>([]);
  const [filteredData, setFilteredData] = useState<ExtendedPlatformRevenueDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  
  // Brush state
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Modal brush state
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  
  // State for tooltip
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as ExtendedPlatformRevenueDataPoint | null, 
    left: 0, 
    top: 0 
  });
  
  // Function to fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const revenueData = await fetchTopProtocolsRevenueData();
      
      if (revenueData.length === 0) {
        setError('No data available for top protocols.');
        setData([]);
        setFilteredData([]);
      } else {
        // Add date property to each data point for brush
        const dataWithDates = revenueData.map((d, i) => ({
          ...d,
          date: new Date(2024, 0, 1 + i * Math.floor(365 / revenueData.length))
        }));
        
        setData(dataWithDates);
        setFilteredData(dataWithDates);
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
  }, []);
  
  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Create and send legend data to parent component
  useEffect(() => {
    if (legendsChanged && data.length > 0) {
      // Create top 5 legends for display in parent component
      const legendsData = data.slice(0, 5).map(item => ({
        label: item.platform,
        color: getPlatformColor(item.platform),
        value: item.protocol_revenue
      }));
      
      // Send to parent component
      legendsChanged(legendsData);
    }
  }, [data, legendsChanged]);
  
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
    
    // Convert to array indices based on domain range
    const startIndex = Math.floor(x0 * data.length);
    const endIndex = Math.min(Math.ceil(x1 * data.length), data.length - 1);
    
    setBrushDomain([new Date(x0), new Date(x1)]);
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [data.length, isBrushActive]);
  
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
    
    // Convert to array indices based on domain range
    const startIndex = Math.floor(x0 * data.length);
    const endIndex = Math.min(Math.ceil(x1 * data.length), data.length - 1);
    
    setModalBrushDomain([new Date(x0), new Date(x1)]);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [data.length, isModalBrushActive]);
  
  // Apply brush domain to filter data
  useEffect(() => {
    if (data.length === 0) {
      if (filteredData.length > 0) setFilteredData([]);
      return;
    }
    
    // If brush domain is null but filter is active, use full range
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
    
    // Filter data using the brush domain
    // Instead of filtering by date, we'll calculate the corresponding indices
    const [startDate, endDate] = brushDomain;
    
    // Find indices that correspond to our date range
    const startIndex = data.findIndex(d => d.date && d.date.getTime() >= startDate.getTime());
    const endIndex = data.findIndex(d => d.date && d.date.getTime() > endDate.getTime());
    
    // Extract the slice of data that falls within our range
    const filtered = data.slice(
      startIndex >= 0 ? startIndex : 0,
      endIndex >= 0 ? endIndex : data.length
    );
    
    setFilteredData(filtered.length > 0 ? filtered : data);
  }, [brushDomain, data, isBrushActive, filteredData.length]);
  
  // Tooltip handler for vertical bars
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    
    // Use current data based on brush state
    const currentData = isBrushActive ? filteredData : data;
    
    // Check if we have data to work with
    if (currentData.length === 0) return;
    
    // Calculate available chart space
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    // Calculate bar width
    const barWidth = innerWidth / currentData.length;
    
    // Find the bar index based on mouse position
    const barIndex = Math.floor((mouseX - margin.left) / barWidth);
    
    // Validate the index
    if (barIndex < 0 || barIndex >= currentData.length) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the data point at this index
    const dataPoint = currentData[barIndex];
    
    // Only update if showing a new data point or hiding previous one
    if (!tooltip.visible || tooltip.dataPoint?.platform !== dataPoint.platform) {
      setTooltip({
        visible: true,
        dataPoint,
        left: mouseX,
        top: e.clientY - rect.top
      });
    }
  }, [data, filteredData, isBrushActive, tooltip]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modal data/filters if in modal mode, otherwise use the main data/filters
    const activeData = isModal ? data : data;
    const activeFilteredData = isModal ? (isModalBrushActive ? filteredData : data) : (isBrushActive ? filteredData : data);
    const activeLoading = isModal ? loading : loading;
    const activeError = isModal ? error : error;
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
          <ButtonSecondary onClick={fetchData}>
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
            title={tooltip.dataPoint.platform}
            items={[
              {
                color: getPlatformColor(tooltip.dataPoint.platform),
                label: 'Protocol Revenue',
                value: formatCurrency(tooltip.dataPoint.protocol_revenue),
                shape: 'square'
              }
            ]}
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
              
              const margin = { top: 10, right: 45, bottom: 30, left: 60 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              // Get data for chart
              const displayData = activeFilteredData;
              
              // X scale for platforms (band scale for categorical data)
              const xScale = scaleBand<string>({
                domain: displayData.map(d => d.platform),
                range: [0, innerWidth],
                padding: 0.2
              });
              
              // Y scale for revenue values
              const yMax = Math.max(...displayData.map(d => d.protocol_revenue));
              const yScale = scaleLinear<number>({
                domain: [0, yMax * 1.1], // 10% extra padding
                range: [innerHeight, 0],
                nice: true
              });
              
              // Bar width based on scale
              const barWidth = xScale.bandwidth();

              return (
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid lines */}
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      stroke="#1f2937"
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                    />
                    
                    {/* Bars */}
                    {displayData.map(d => {
                      const barHeight = innerHeight - yScale(d.protocol_revenue);
                      return (
                        <Bar
                          key={`bar-${d.platform}`}
                          x={xScale(d.platform) || 0}
                          y={yScale(d.protocol_revenue)}
                          width={barWidth}
                          height={barHeight}
                          fill={getPlatformColor(d.platform)}
                          opacity={tooltip.dataPoint?.platform === d.platform ? 1 : 0.75}
                          rx={2}
                        />
                      );
                    })}
                    
                    {/* X-axis (Platform names) */}
                    <AxisBottom
                      top={innerHeight}
                      scale={xScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      hideAxisLine={false}
                      tickLength={0}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        textAnchor: 'middle',
                        dy: '0.5em'
                      })}
                      tickFormat={(platform) => {
                        // Truncate long platform names
                        const name = platform as string;
                        return name.length > 8 ? `${name.substring(0, 8)}...` : name;
                      }}
                    />
                    
                    {/* Y-axis (Revenue values) */}
                    <AxisLeft
                      scale={yScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideZero={true}
                      numTicks={5}
                      tickFormat={(value) => formatCurrency(value as number)}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'end',
                        dy: '0.33em',
                        dx: '-0.5em'
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
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null;
              
              return (
                <BrushTimeScale
                  data={activeData}
                  isModal={isModal}
                  activeBrushDomain={activeBrushDomain}
                  onBrushChange={activeHandleBrushChange}
                  onClearBrush={() => {
                    if (isModal) {
                      setModalBrushDomain(null);
                      setIsModalBrushActive(false);
                    } else {
                      setBrushDomain(null);
                      setIsBrushActive(false);
                    }
                  }}
                  getDate={(d) => d.date ? d.date.toISOString() : ''}
                  getValue={(d) => d.protocol_revenue}
                  lineColor={platformColors.Photon}
                  margin={{ top: 5, right: 45, bottom: 10, left: 60 }}
                />
              );
            }}
          </ParentSize>
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
        title="Top Protocols by Revenue"
        subtitle="Revenue generated by top protocols since January 2024"
      >
        <div className="h-[70vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-full pr-3 border-r border-gray-900">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              <div className="text-[10px] text-gray-400 mb-2">PLATFORMS</div>
              {loading ? (
                // Show loading state
                <>
                  <LegendItem label="Loading..." color="#60a5fa" isLoading={true} />
                  <LegendItem label="Loading..." color="#a78bfa" isLoading={true} />
                  <LegendItem label="Loading..." color="#34d399" isLoading={true} />
                </>
              ) : (
                // Create legend items array
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[500px] pr-1">
                  {data.slice(0, 10).map((item) => (
                    <LegendItem
                      key={item.platform}
                      label={item.platform}
                      color={getPlatformColor(item.platform)}
                      shape="square"
                      tooltipText={formatCurrency(item.protocol_revenue)}
                    />
                  ))}
                  {data.length > 10 && (
                    <LegendItem
                      label="Others"
                      color="#888888"
                      shape="square"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TopProtocolsRevenueChart; 