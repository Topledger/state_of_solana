"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import ChartTooltip from "@/app/components/shared/ChartTooltip";
import Modal from "@/app/components/shared/Modal";
import LegendItem from "@/app/components/shared/LegendItem";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";

import { 
  fetchDappRevenueData, 
  DappRevenueDataPoint, 
  formatCurrency
} from "@/app/api/protocol-revenue/total/dappRevenueData";

// Props interface
interface DappRevenueChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

// Extended data type to include date for brush functionality
interface ExtendedDappRevenueDataPoint extends DappRevenueDataPoint {
  date?: Date;
}

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

// Define dapp colors mapping
const dappColors: Record<string, string> = {
  'BullX': '#fb7185',
  'Photon': '#34d399',
  'Phantom': '#60a5fa',
  'Pump Fun': '#a78bfa',
  'Raydium': '#f97316',
  'Trojan': '#c084fc',
  'GMGN': '#94a3b8',
  'DexScreener': '#7dd3fc',
  'Maestro': '#86efac',
  'Sol Trading Bot': '#fbbf24',
  'bloxroute': '#fbbf24',
  'bloom trading bot': '#f43f5e',
  'default': '#6b7280',
};

// Get color for a dapp with fallback to default
const getDappColor = (dapp: string): string => {
  return dappColors[dapp] || dappColors.default;
};

// Process data for bar stack
const processDataForBarStack = (data: ExtendedDappRevenueDataPoint[]) => {
  // Group by segment to identify top segments
  const segmentTotals = data.reduce<Record<string, number>>((acc, curr) => {
    if (!acc[curr.segment]) {
      acc[curr.segment] = 0;
    }
    acc[curr.segment] += curr.protocol_revenue;
    return acc;
  }, {});
  
  // Sort segments by total revenue and take top segments
  const topSegments = Object.entries(segmentTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([segment]) => segment);
  
  // Filter data to only include top segments
  const filteredData = data.filter(d => topSegments.includes(d.segment));
  
  // Group data by segment
  const groupedBySegment = filteredData.reduce<Record<string, any>>((acc, curr) => {
    if (!acc[curr.segment]) {
      acc[curr.segment] = { segment: curr.segment, date: curr.date };
    }
    
    // Add dapp revenue to this segment
    acc[curr.segment][curr.dapp] = (acc[curr.segment][curr.dapp] || 0) + curr.protocol_revenue;
    
    return acc;
  }, {});
  
  // Convert to array and sort by total revenue
  const result = Object.values(groupedBySegment).sort((a: any, b: any) => {
    const aTotal = Object.keys(a).filter(key => key !== 'segment' && key !== 'date').reduce((sum, key) => sum + a[key], 0);
    const bTotal = Object.keys(b).filter(key => key !== 'segment' && key !== 'date').reduce((sum, key) => sum + b[key], 0);
    return bTotal - aTotal;
  });
  
  return result;
};

// Main chart component
const DappRevenueChart: React.FC<DappRevenueChartProps> = ({ 
  isModalOpen = false, 
  onModalClose = () => {},
  legendsChanged
}) => {
  // State for chart data
  const [data, setData] = useState<ExtendedDappRevenueDataPoint[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<ExtendedDappRevenueDataPoint[]>([]);
  const [filteredProcessedData, setFilteredProcessedData] = useState<any[]>([]);
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
    segment: '',
    dapps: [] as { name: string, value: number, color: string }[],
    left: 0, 
    top: 0 
  });
  
  // Modal state
  const [modalData, setModalData] = useState<ExtendedDappRevenueDataPoint[]>([]);
  const [modalProcessedData, setModalProcessedData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Available dapps in the dataset
  const [availableDapps, setAvailableDapps] = useState<string[]>([]);

  // Function to fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const revenueData = await fetchDappRevenueData();
      
      if (revenueData.length === 0) {
        setError('No data available.');
        setData([]);
        setProcessedData([]);
        setFilteredData([]);
        setFilteredProcessedData([]);
        setAvailableDapps([]);
      } else {
        // Add dates to data points for brush functionality
        const dataWithDates = revenueData.map((d, i) => ({
          ...d,
          date: new Date(2024, 0, 1 + i * Math.floor(365 / revenueData.length))
        }));
        
        // Get unique dapps from the data
        const uniqueDapps = [...new Set(dataWithDates.map(d => d.dapp))];
        
        // Sort by total revenue and take top 15 for legends
        const dappTotals = dataWithDates.reduce<Record<string, number>>((acc, curr) => {
          if (!acc[curr.dapp]) {
            acc[curr.dapp] = 0;
          }
          acc[curr.dapp] += curr.protocol_revenue;
          return acc;
        }, {});
        
        const topDapps = Object.entries(dappTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([dapp]) => dapp);
        
        // Set available dapps for the chart
        setAvailableDapps(topDapps);
        
        // Process data for bar stack
        const processed = processDataForBarStack(dataWithDates);
        
        setData(dataWithDates);
        setProcessedData(processed);
        setFilteredData(dataWithDates);
        setFilteredProcessedData(processed);
        
        // Initialize brush as active
        setIsBrushActive(true);
        setBrushDomain(null);
        
        // Update legends if callback provided
        if (legendsChanged) {
          const legends = topDapps.slice(0, 5).map(dapp => ({
            label: dapp,
            color: getDappColor(dapp),
            value: dataWithDates
              .filter(d => d.dapp === dapp)
              .reduce((sum, item) => sum + item.protocol_revenue, 0)
          }));
          legendsChanged(legends);
        }
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      let message = 'Failed to load data from API.';
      if (error instanceof Error) {
        message = error.message || message;
      }
      setError(message);
      setData([]);
      setProcessedData([]);
      setFilteredData([]);
      setFilteredProcessedData([]);
      setAvailableDapps([]);
    } finally {
      setLoading(false);
    }
  }, [legendsChanged]);

  // Function to fetch modal data
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    
    try {
      const revenueData = await fetchDappRevenueData();
      
      if (revenueData.length === 0) {
        setModalError('No data available.');
        setModalData([]);
        setModalProcessedData([]);
      } else {
        // Add dates to data points for brush functionality
        const dataWithDates = revenueData.map((d, i) => ({
          ...d,
          date: new Date(2024, 0, 1 + i * Math.floor(365 / revenueData.length))
        }));
        
        // Process data for bar stack
        const processed = processDataForBarStack(dataWithDates);
        
        setModalData(dataWithDates);
        setModalProcessedData(processed);
        
        // Initialize modal brush
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      }
    } catch (error) {
      console.error('Error loading modal chart data:', error);
      let message = 'Failed to load data from API.';
      if (error instanceof Error) {
        message = error.message || message;
      }
      setModalError(message);
      setModalData([]);
      setModalProcessedData([]);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Fetch modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [isModalOpen, fetchModalData]);
  
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
    const startIndex = Math.floor(x0 * modalData.length);
    const endIndex = Math.min(Math.ceil(x1 * modalData.length), modalData.length - 1);
    
    setModalBrushDomain([new Date(x0), new Date(x1)]);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [modalData.length, isModalBrushActive]);
  
  // Apply brush domain to filter data
  useEffect(() => {
    if (data.length === 0) {
      if (filteredData.length > 0) {
        setFilteredData([]);
        setFilteredProcessedData([]);
      }
      return;
    }
    
    // If brush domain is null but filter is active, use full range
    if (!brushDomain && isBrushActive) {
      setFilteredData(data);
      setFilteredProcessedData(processedData);
      return;
    }
    
    // If no brush domain is set or full range is selected, show all data
    if (!brushDomain || !isBrushActive) {
      if (filteredData.length !== data.length) {
        setFilteredData(data);
        setFilteredProcessedData(processedData);
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
    
    // Process the filtered data
    const processedFiltered = processDataForBarStack(filtered);
    
    setFilteredData(filtered.length > 0 ? filtered : data);
    setFilteredProcessedData(processedFiltered.length > 0 ? processedFiltered : processedData);
  }, [brushDomain, data, processedData, isBrushActive, filteredData.length]);
  
  // Handle mouse move for tooltips
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    
    // Use current data based on chart state
    const currentData = isModal 
      ? (isModalBrushActive ? modalProcessedData : modalProcessedData)
      : (isBrushActive ? filteredProcessedData : processedData);
    
    // Check if we have data to work with
    if (currentData.length === 0) return;
    
    // Calculate margins
    const margin = { top: 40, right: 20, bottom: 60, left: 70 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    // Calculate segment width
    const segmentWidth = innerWidth / currentData.length;
    
    // Find the segment index based on mouse position
    const segmentIndex = Math.floor((mouseX - margin.left) / segmentWidth);
    
    // Validate the index
    if (segmentIndex < 0 || segmentIndex >= currentData.length) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the data point at this index
    const segmentData = currentData[segmentIndex];
    
    // Only update if showing a new segment or hiding previous one
    if (!tooltip.visible || tooltip.segment !== segmentData.segment) {
      // Get all dapps for this segment
      const dapps = availableDapps
        .filter(dapp => segmentData[dapp] > 0)
        .map(dapp => ({
          name: dapp,
          value: segmentData[dapp],
          color: getDappColor(dapp)
        }))
        .sort((a, b) => b.value - a.value);
        
      setTooltip({
        visible: true,
        segment: segmentData.segment,
        dapps,
        left: mouseX,
        top: e.clientY - rect.top
      });
    }
  }, [availableDapps, processedData, filteredProcessedData, modalProcessedData, tooltip.visible, tooltip.segment, isBrushActive, isModalBrushActive]);
  
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Render chart function
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use appropriate data source based on whether we're in a modal
    const chartData = isModal 
      ? (isModalBrushActive ? modalProcessedData : modalProcessedData) 
      : (isBrushActive ? filteredProcessedData : processedData);
    const allData = isModal ? modalData : data;
    const isLoading = isModal ? modalLoading : loading;
    const errorMessage = isModal ? modalError : error;
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const activeIsBrushActive = isModal ? isModalBrushActive : isBrushActive;
    const activeHandleBrushChange = isModal ? handleModalBrushChange : handleBrushChange;
    
    // Show loading state
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state with refresh button
    if (errorMessage || chartData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{errorMessage || 'No data available'}</div>
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
        {tooltip.visible && (
          <ChartTooltip
            title={tooltip.segment}
            items={tooltip.dapps.map(dapp => ({
              color: dapp.color,
              label: dapp.name,
              value: formatCurrency(dapp.value),
              shape: 'square' as const
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
              
              const margin = { top: 10, right: 45, bottom: 30, left: 60 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              // Get segment names from processed data
              const segments = chartData.map((d: any) => d.segment);
              
              // Create scales
              const xScale = scaleBand<string>({
                domain: segments,
                range: [0, innerWidth],
                padding: 0.2
              });
              
              // Calculate max value for y-axis
              const yMax = Math.max(
                ...chartData.map((d: any) => 
                  availableDapps.reduce((sum, dapp) => sum + (d[dapp] || 0), 0)
                )
              );
              
              const yScale = scaleLinear<number>({
                domain: [0, yMax * 1.1], // Add 10% padding
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
                      stroke="#1f2937"
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                    />
                    
                    {/* Manual bar stacks */}
                    {chartData.map((d: any, i: number) => {
                      const segment = d.segment;
                      const x = xScale(segment) || 0;
                      const width = xScale.bandwidth();
                      
                      // Stack the dapps
                      let yPos = innerHeight;
                      const stackedBars: React.ReactNode[] = [];
                      
                      // Get dapps sorted by value for stacking from bottom to top
                      const dappsInSegment = availableDapps
                        .filter(dapp => d[dapp] > 0)
                        .sort((a, b) => d[a] - d[b]); // Sort ascending for proper stacking
                      
                      dappsInSegment.forEach(dapp => {
                        const value = d[dapp] || 0;
                        if (value > 0) {
                          const height = innerHeight - yScale(value);
                          yPos -= height;
                          
                          stackedBars.push(
                            <rect
                              key={`bar-${i}-${dapp}`}
                              x={x}
                              y={yPos}
                              width={width}
                              height={height}
                              fill={getDappColor(dapp)}
                              opacity={tooltip.segment === segment ? 1 : 0.75}
                              rx={2}
                            />
                          );
                        }
                      });
                      
                      return (
                        <Group key={`segment-${i}`}>
                          {stackedBars}
                        </Group>
                      );
                    })}
                    
                    {/* X-axis (Segment names) */}
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
                      tickFormat={(value) => {
                        // Truncate long segment names
                        const name = value as string;
                        return name.length > 10 ? `${name.substring(0, 10)}...` : name;
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
                  data={allData}
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
                  lineColor={dappColors.Photon}
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
        title="Protocol Revenue by Segment"
        subtitle="Revenue breakdown by segment, grouped by dapp"
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
              <div className="text-[10px] text-gray-400 mb-2">DAPPS</div>
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
                  {availableDapps.slice(0, 10).map((dapp) => {
                    // Calculate total revenue for this dapp
                    const dappRevenue = data
                      .filter(d => d.dapp === dapp)
                      .reduce((sum, item) => sum + item.protocol_revenue, 0);
                      
                    return (
                      <LegendItem
                        key={dapp}
                        label={dapp}
                        color={getDappColor(dapp)}
                        shape="square"
                        tooltipText={formatCurrency(dappRevenue)}
                      />
                    );
                  })}
                  {availableDapps.length > 10 && (
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

export default DappRevenueChart; 