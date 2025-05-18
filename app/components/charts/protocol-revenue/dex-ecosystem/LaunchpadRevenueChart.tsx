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
import Modal, { ScrollableLegend } from "@/app/components/shared/Modal";
import LegendItem from "@/app/components/shared/LegendItem";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";

import { 
  fetchLaunchpadRevenueData, 
  LaunchpadRevenueDataPoint,
  formatCurrency,
  getLaunchpadColor
} from "@/app/api/protocol-revenue/dex-ecosystem/launchpadRevenueData";

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
interface LaunchpadRevenueChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

// Extended type to include date for brush functionality
interface ExtendedLaunchpadRevenueDataPoint extends LaunchpadRevenueDataPoint {
  date?: Date;
}

// Prepare data for stacked bar chart
interface StackedBarData {
  month: string;
  date: Date;
  [platform: string]: any;
}

// Process data for brush component - aggregate revenue by date/month
const processDataForBrush = (data: ExtendedLaunchpadRevenueDataPoint[]) => {
  // Group data by month and sum revenue
  const revenueByMonth = data.reduce<Record<string, number>>((acc, curr) => {
    if (!acc[curr.month]) {
      acc[curr.month] = 0;
    }
    acc[curr.month] += curr.protocol_revenue;
    return acc;
  }, {});
  
  // Convert to array of { date, value } objects
  return Object.entries(revenueByMonth).map(([month, value]) => ({
    month,
    date: new Date(month),
    value
  }));
};

// Main chart component
const LaunchpadRevenueChart: React.FC<LaunchpadRevenueChartProps> = ({ 
  isModalOpen = false, 
  onModalClose = () => {},
  legendsChanged
}) => {
  // State for chart data
  const [rawData, setRawData] = useState<ExtendedLaunchpadRevenueDataPoint[]>([]);
  const [stackedData, setStackedData] = useState<StackedBarData[]>([]);
  const [filteredData, setFilteredData] = useState<StackedBarData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
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
    month: '',
    items: [] as { platform: string, value: number, color: string }[],
    left: 0, 
    top: 0 
  });

  // Function to prepare stacked data from raw data
  const prepareStackedData = useCallback((data: ExtendedLaunchpadRevenueDataPoint[]): StackedBarData[] => {
    // Group data by month
    const groupedByMonth = data.reduce((acc, curr) => {
      if (!acc[curr.month]) {
        acc[curr.month] = { 
          month: curr.month,
          date: curr.date || new Date(curr.month)
        };
      }
      
      // Add platform revenue
      acc[curr.month][curr.platform] = curr.protocol_revenue;
      
      return acc;
    }, {} as Record<string, StackedBarData>);
    
    // Convert to array and sort by date
    return Object.values(groupedByMonth).sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  }, []);
  
  // Function to fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching Launchpad revenue data...`);
      const revenueData = await fetchLaunchpadRevenueData();
      
      if (revenueData.length === 0) {
        console.error('No data returned from API');
        setError('No data available for Memecoin LaunchPad revenue.');
        setRawData([]);
        setStackedData([]);
        setFilteredData([]);
        setAvailablePlatforms([]);
      } else {
        console.log(`Successfully received ${revenueData.length} data points:`, revenueData.slice(0, 3));
        
        // Add date property to each data point for brush
        const dataWithDates = revenueData.map(d => ({
          ...d,
          date: new Date(d.month)
        }));
        
        // Get unique platforms and sort by total revenue
        const platformTotals: Record<string, number> = {};
        dataWithDates.forEach(d => {
          if (!platformTotals[d.platform]) {
            platformTotals[d.platform] = 0;
          }
          platformTotals[d.platform] += d.protocol_revenue;
        });
        
        const sortedPlatforms = Object.entries(platformTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([platform]) => platform);
        
        console.log('Sorted platforms by revenue:', sortedPlatforms);
        
        setAvailablePlatforms(sortedPlatforms);
        setRawData(dataWithDates);
        
        // Prepare stacked data
        const prepared = prepareStackedData(dataWithDates);
        console.log(`Prepared ${prepared.length} stacked data points`);
        setStackedData(prepared);
        setFilteredData(prepared);
        
        // Set brush active
        setIsBrushActive(true);
        setBrushDomain(null);
        
        // Update legends if callback provided
        if (legendsChanged) {
          const legends = sortedPlatforms.slice(0, 5).map(platform => ({
            label: platform,
            color: getLaunchpadColor(platform),
            value: platformTotals[platform]
          }));
          legendsChanged(legends);
        }
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      const message = error instanceof Error ? error.message : 'Failed to load data.';
      setError(message);
      setRawData([]);
      setStackedData([]);
      setFilteredData([]);
      setAvailablePlatforms([]);
    } finally {
      setLoading(false);
    }
  }, [legendsChanged, prepareStackedData]);
  
  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Apply brush domain to filter data
  useEffect(() => {
    if (stackedData.length === 0) {
      if (filteredData.length > 0) setFilteredData([]);
      return;
    }
    
    // If brush domain is null but filter is active, use full range
    if (!brushDomain && isBrushActive) {
      setFilteredData(stackedData);
      return;
    }
    
    // If no brush domain is set or full range is selected, show all data
    if (!brushDomain || !isBrushActive) {
      if (filteredData.length !== stackedData.length) {
        setFilteredData(stackedData);
      }
      return;
    }
    
    // Filter data using the brush domain
    const [startDate, endDate] = brushDomain;
    
    const filtered = stackedData.filter(d => {
      const date = d.date instanceof Date ? d.date : new Date(d.month);
      return date >= startDate && date <= endDate;
    });
    
    setFilteredData(filtered.length > 0 ? filtered : stackedData);
  }, [brushDomain, stackedData, isBrushActive, filteredData.length]);
  
  // Sync modal brush domain with main brush domain when modal opens
  useEffect(() => {
    if (isModalOpen) {
      // When modal opens, sync the brush domains
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
    }
  }, [isModalOpen, brushDomain, isBrushActive]);
  
  // Function to filter data based on a brush domain
  const getFilteredDataForBrush = useCallback((brushDomain: [Date, Date] | null): StackedBarData[] => {
    if (!brushDomain || stackedData.length === 0) {
      return stackedData;
    }
    
    const [startDate, endDate] = brushDomain;
    
    const filtered = stackedData.filter(d => {
      const date = d.date instanceof Date ? d.date : new Date(d.month);
      return date >= startDate && date <= endDate;
    });
    
    return filtered.length > 0 ? filtered : stackedData;
  }, [stackedData]);
  
  // Tooltip handler for stacked bars
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    
    // Use current data based on brush state and modal state
    const isActiveBrush = isModal ? isModalBrushActive : isBrushActive;
    const currentBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const currentData = isActiveBrush 
      ? (isModal ? getFilteredDataForBrush(currentBrushDomain) : filteredData) 
      : stackedData;
    
    // Check if we have data to work with
    if (currentData.length === 0) return;
    
    // Calculate available chart space
    const margin = { top: 10, right: 15, bottom: 30, left: 45 };
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
    
    // Only update if showing a new month or hiding previous one
    if (!tooltip.visible || tooltip.month !== dataPoint.month) {
      // Create tooltip items for each platform
      const tooltipItems = availablePlatforms
        .filter(platform => dataPoint[platform] > 0)
        .map(platform => ({
          platform,
          value: dataPoint[platform],
          color: getLaunchpadColor(platform)
        }))
        .sort((a, b) => b.value - a.value);
        
      setTooltip({
        visible: true,
        month: dataPoint.month,
        items: tooltipItems,
        left: mouseX,
        top: e.clientY - rect.top
      });
    }
  }, [stackedData, filteredData, isBrushActive, tooltip.visible, tooltip.month, availablePlatforms, 
      isModalBrushActive, modalBrushDomain, brushDomain, getFilteredDataForBrush]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Format date for display to match the format in DexRevenueChart
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    // Use more readable format - Month name and year
    return d.toLocaleDateString('en-US', { 
      month: 'short',
      year: 'numeric'
    });
  };
  
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
    
    setBrushDomain([new Date(x0), new Date(x1)]);
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
    
    setModalBrushDomain([new Date(x0), new Date(x1)]);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive]);
  
  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Show loading state
    if (loading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state with refresh button
    if (error || stackedData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{error || 'No data available'}</div>
          <ButtonSecondary onClick={fetchData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    // Get appropriate brush state based on whether we're in a modal or not
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const isActiveBrush = isModal ? isModalBrushActive : isBrushActive;
    
    // Define consistent margins for chart and brush to ensure alignment
    const chartMargin = { top: 10, right: 15, bottom: 30, left: 45 };
    const brushMargin = { top: 5, right: chartMargin.right, bottom: 10, left: chartMargin.left };
    
    // Process data for brush
    const brushData = processDataForBrush(rawData);
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && tooltip.items.length > 0 && (
          <ChartTooltip
            title={formatDate(tooltip.month)}
            items={tooltip.items.map(item => ({
              color: item.color,
              label: item.platform,
              value: formatCurrency(item.value),
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
              
              const margin = chartMargin;
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              // Get data for chart - use the correct brush state based on modal vs non-modal
              const displayData = isActiveBrush ? 
                (isModal ? getFilteredDataForBrush(activeBrushDomain) : filteredData) : 
                stackedData;
              
              // X scale for months (band scale for categorical data)
              const xScale = scaleBand<string>({
                domain: displayData.map(d => d.month),
                range: [0, innerWidth],
                padding: 0.2
              });
              
              // Calculate how many ticks to show based on available width
              const calculateTickValues = () => {
                // For smaller screens, show fewer ticks to avoid overcrowding
                const tickThreshold = innerWidth < 500 ? 6 : 12;
                if (displayData.length <= tickThreshold) {
                  // Show all if there aren't too many
                  return displayData.map(d => d.month);
                } else {
                  // Pick evenly spaced ticks
                  const step = Math.ceil(displayData.length / (tickThreshold - 1));
                  const tickValues = displayData
                    .filter((_, i) => i % step === 0 || i === displayData.length - 1)
                    .map(d => d.month);
                  return tickValues;
                }
              };
              
              // Get tick values for x-axis
              const xTickValues = calculateTickValues();
              
              // Y scale for revenue values
              const totalsByMonth = displayData.map(d => {
                return availablePlatforms.reduce((sum, platform) => sum + (d[platform] || 0), 0);
              });
              
              const yMax = Math.max(...totalsByMonth);
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
                    
                    {/* Stacked bars */}
                    {displayData.map((d, i) => {
                      const x = xScale(d.month) || 0;
                      
                      // Create stack for this month
                      let barY = innerHeight;
                      const stackedBars: React.ReactNode[] = [];
                      
                      // Generate bars for each platform, sorted by revenue
                      availablePlatforms
                        .filter(platform => d[platform] > 0)
                        .sort((a, b) => d[a] - d[b]) // Sort ascending for proper stacking
                        .forEach(platform => {
                          const value = d[platform] || 0;
                          const barHeight = innerHeight - yScale(value);
                          barY -= barHeight;
                          
                          stackedBars.push(
                            <Bar
                              key={`bar-${i}-${platform}`}
                              x={x}
                              y={barY}
                              width={barWidth}
                              height={barHeight}
                              fill={getLaunchpadColor(platform)}
                              opacity={tooltip.month === d.month ? 1 : 0.8}
                              rx={2}
                            />
                          );
                        });
                      
                      return (
                        <Group key={`month-${i}`}>
                          {stackedBars}
                        </Group>
                      );
                    })}
                    
                    {/* X-axis (Months) */}
                    <AxisBottom
                      top={innerHeight}
                      scale={xScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      hideAxisLine={false}
                      tickLength={0}
                      tickValues={xTickValues}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        textAnchor: 'middle',
                        dy: '0.5em'
                      })}
                      tickFormat={(date) => {
                        // Format date for display to match Month YYYY format
                        const d = new Date(date as string);
                        return d.toLocaleDateString('en-US', { 
                          month: 'short',
                          year: 'numeric'
                        });
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
          <BrushTimeScale
            data={brushData}
            isModal={isModal}
            activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
            onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
            onClearBrush={() => {
              if (isModal) {
                setModalBrushDomain(null);
                setIsModalBrushActive(false);
              } else {
                setBrushDomain(null);
                setIsBrushActive(false);
              }
            }}
            getDate={(d) => d.date.toISOString()}
            getValue={(d) => d.value}
            lineColor="#ff6b6b"
            margin={brushMargin}
          />
        </div>
      </div>
    );
  };
  
  // Main render - just call renderChartContent with props
  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="Memecoin LaunchPad Protocol Revenue"
        subtitle="Revenue generated by Memecoin LaunchPads on Solana"
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
              
              {loading ? (
                // Show loading state
                <>
                  <LegendItem label="Loading..." color="#ff6b6b" isLoading={true} />
                  <LegendItem label="Loading..." color="#6c5ce7" isLoading={true} />
                  <LegendItem label="Loading..." color="#00b894" isLoading={true} />
                </>
              ) : (
                <ScrollableLegend
                  items={availablePlatforms.map((platform) => {
                    // Calculate total revenue for this platform
                    const platformRevenue = rawData
                      .filter(d => d.platform === platform)
                      .reduce((sum, item) => sum + item.protocol_revenue, 0);
                      
                    return {
                      id: platform,
                      label: platform,
                      color: getLaunchpadColor(platform),
                      
                    };
                  })}
                  maxHeight={600}
                  maxItems={28}
                />
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LaunchpadRevenueChart; 