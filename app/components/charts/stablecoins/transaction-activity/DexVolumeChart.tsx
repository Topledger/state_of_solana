"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { ParentSize } from '@visx/responsive';
import { BarStack } from '@visx/shape';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { localPoint } from '@visx/event';
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import ChartTooltip from "@/app/components/shared/ChartTooltip";
import Modal from "@/app/components/shared/Modal";
import LegendItem from "@/app/components/shared/LegendItem";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";

import {
  fetchDexVolumeData,
  DexVolumeDataPoint,
  formatCurrency,
  getStablecoinColor
} from "@/app/api/stablecoins/transaction-activity/dexVolumeData";

// Define icon for refresh button
const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Define props for the chart component
interface DexVolumeChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

// Define processed data structure for the chart
interface ProcessedData {
  month: string;
  [key: string]: string | number | Date | undefined;
}

// Main chart component
const DexVolumeChart: React.FC<DexVolumeChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
  legendsChanged
}) => {
  // State management
  const [rawData, setRawData] = useState<DexVolumeDataPoint[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
  const [filteredData, setFilteredData] = useState<ProcessedData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stablecoins, setStablecoins] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);

  // Brush state
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({
    visible: false,
    month: '',
    items: [] as { mint: string, value: number, color: string }[],
    left: 0,
    top: 0
  });

  // Process data for the chart
  const prepareData = useCallback((data: DexVolumeDataPoint[]): ProcessedData[] => {
    // Group data by month
    const dataByMonth: { [month: string]: ProcessedData } = {};
    
    data.forEach(point => {
      const { month, mint, Dex_Volume, date } = point;
      
      if (!dataByMonth[month]) {
        dataByMonth[month] = { month, date };
      }
      
      // Add the mint volume to the month data
      dataByMonth[month][mint] = Dex_Volume || 0;
    });
    
    // Extract all unique stablecoins
    const uniqueStablecoins = [...new Set(data.map(d => d.mint))].filter(mint => mint !== null);
    setStablecoins(uniqueStablecoins);
    
    // Convert to array and sort by date
    const result = Object.values(dataByMonth).sort((a, b) => {
      if (a.date instanceof Date && b.date instanceof Date) {
        return a.date.getTime() - b.date.getTime();
      }
      return 0;
    });
    
    // Calculate totals for each month
    result.forEach(item => {
      let total = 0;
      uniqueStablecoins.forEach(coin => {
        const coinValue = item[coin] as number;
        total += coinValue || 0;
      });
      item.total = total;
    });
    
    return result;
  }, []);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDexVolumeData();
      
      if (data.length === 0) {
        setError("No DEX volume data available");
      } else {
        setRawData(data);
        
        const prepared = prepareData(data);
        setProcessedData(prepared);
        setFilteredData(prepared);
        
        // Reset brush state to show full data initially
        setIsBrushActive(false);
        setBrushDomain(null);
        
        // Update legends
        if (legendsChanged) {
          // Get unique stablecoins and calculate their total volume
          const stablecoinVolumes: Record<string, number> = {};
          
          data.forEach(point => {
            if (!stablecoinVolumes[point.mint]) {
              stablecoinVolumes[point.mint] = 0;
            }
            stablecoinVolumes[point.mint] += point.Dex_Volume || 0;
          });
          
          // Sort stablecoins by volume for better visualization
          const sortedStablecoins = Object.entries(stablecoinVolumes)
            .sort((a, b) => b[1] - a[1])
            .map(([mint, volume]) => ({
              label: mint,
              color: getStablecoinColor(mint),
              value: volume
            }));
          
          legendsChanged(sortedStablecoins);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [legendsChanged, prepareData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update filtered data based on brush domain
  useEffect(() => {
    if (processedData.length === 0) {
      if (filteredData.length > 0) setFilteredData([]);
      return;
    }
    
    if (!brushDomain && isBrushActive) {
      setFilteredData(processedData);
      return;
    }
    
    if (!brushDomain || !isBrushActive) {
      if (filteredData.length !== processedData.length) {
        setFilteredData(processedData);
      }
      return;
    }
    
    const [startDate, endDate] = brushDomain;
    
    const filtered = processedData.filter(d => {
      const date = d.date instanceof Date ? d.date : new Date(d.date as string);
      return date >= startDate && date <= endDate;
    });
    
    setFilteredData(filtered.length > 0 ? filtered : processedData);
  }, [brushDomain, processedData, isBrushActive, filteredData.length]);

  // Update modal brush state when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
    }
  }, [isModalOpen, brushDomain, isBrushActive]);

  // Get filtered data for brush
  const getFilteredDataForBrush = useCallback((brushDomain: [Date, Date] | null): ProcessedData[] => {
    if (!brushDomain || processedData.length === 0) {
      return processedData;
    }
    
    const [startDate, endDate] = brushDomain;
    
    const filtered = processedData.filter(d => {
      const date = d.date instanceof Date ? d.date : new Date(d.date as string);
      return date >= startDate && date <= endDate;
    });
    
    return filtered.length > 0 ? filtered : processedData;
  }, [processedData]);

  // Handle mouse movement for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    
    const isActiveBrush = isModal ? isModalBrushActive : isBrushActive;
    const currentBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const currentData = isActiveBrush
      ? (isModal ? getFilteredDataForBrush(currentBrushDomain) : filteredData)
      : processedData;
    
    if (currentData.length === 0) return;
    
    const margin = { top: 20, right: 20, bottom: 50, left: 80 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    const barWidth = innerWidth / currentData.length;
    const barIndex = Math.floor((mouseX - margin.left) / barWidth);
    
    if (barIndex < 0 || barIndex >= currentData.length) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    const dataPoint = currentData[barIndex];
    
    if (!tooltip.visible || tooltip.month !== dataPoint.month) {
      const tooltipItems = stablecoins
        .filter(mint => (dataPoint[mint] as number) > 0)
        .map(mint => ({
          mint,
          value: dataPoint[mint] as number,
          color: getStablecoinColor(mint)
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
  }, [processedData, filteredData, isBrushActive, tooltip.visible, tooltip.month, stablecoins,
      isModalBrushActive, modalBrushDomain, brushDomain, getFilteredDataForBrush]);

  // Handle mouse leave for tooltip
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Format date for display
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  // Format month for axis labels
  const formatMonthYear = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getFullYear().toString().substr(2, 2)}`;
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
    if (loading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    if (error || processedData.length === 0) {
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
    
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const isActiveBrush = isModal ? isModalBrushActive : isBrushActive;
    const dataToUse = isActiveBrush
      ? (isModal ? getFilteredDataForBrush(activeBrushDomain) : filteredData)
      : processedData;
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && tooltip.items.length > 0 && (
          <ChartTooltip
            title={formatDate(tooltip.month)}
            items={tooltip.items.map(item => ({
              color: item.color,
              label: item.mint,
              value: formatCurrency(item.value),
              shape: 'square'
            }))}
            top={tooltip.top}
            left={tooltip.left}
            isModal={isModal}
          />
        )}
        
        <div className="h-[85%] w-full overflow-hidden relative" 
          ref={isModal ? modalChartRef : chartRef}
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width < 10 || height < 10) return null;
              
              // Create scales
              const margin = { top: 20, right: 20, bottom: 50, left: 80 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              
              // Month scale for x-axis
              const xScale = scaleBand<string>({
                domain: dataToUse.map(d => d.month),
                padding: 0.3,
                range: [0, innerWidth]
              });
              
              // Calculate tick values for x-axis
              const calculateTickValues = () => {
                const tickThreshold = innerWidth < 500 ? 5 : 10;
                if (dataToUse.length <= tickThreshold) {
                  return dataToUse.map(d => d.month);
                } else {
                  const step = Math.ceil(dataToUse.length / (tickThreshold - 1));
                  const tickValues = dataToUse
                    .filter((_, i) => i % step === 0 || i === dataToUse.length - 1)
                    .map(d => d.month);
                  return tickValues;
                }
              };
              
              const xTickValues = calculateTickValues();
              
              // Value scale for y-axis
              const maxY = Math.max(...dataToUse.map(d => (d.total as number) || 0));
              const yScale = scaleLinear<number>({
                domain: [0, maxY * 1.1], // Add 10% padding at the top
                range: [innerHeight, 0],
                nice: true
              });
              
              // Color scale for stablecoin types
              const colorScale = scaleOrdinal<string, string>({
                domain: stablecoins,
                range: stablecoins.map(getStablecoinColor)
              });
              
              // Bar stack keys (stablecoins sorted by total volume)
              const sortedStablecoins = [...stablecoins].sort((a, b) => {
                const aTotal = dataToUse.reduce((sum, d) => sum + ((d[a] as number) || 0), 0);
                const bTotal = dataToUse.reduce((sum, d) => sum + ((d[b] as number) || 0), 0);
                return bTotal - aTotal;
              });
              
              const barWidth = xScale.bandwidth();
              
              return (
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Background grid */}
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      stroke="#1f2937"
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                    />
                    
                    {/* Custom bar stacking instead of BarStack */}
                    {dataToUse.map((d, i) => {
                      const x = xScale(d.month) || 0;
                      
                      // Create stack for this month
                      let barY = innerHeight;
                      const stackedBars: React.ReactNode[] = [];
                      
                      // Get stablecoins for this month with values > 0
                      const monthStablecoins = sortedStablecoins
                        .filter(mint => (d[mint] as number) > 0)
                        // Sort ascending for proper stacking (smallest at bottom)
                        .sort((a, b) => (d[a] as number) - (d[b] as number));
                      
                      // Generate bars for each stablecoin, in the sorted order
                      monthStablecoins.forEach(mint => {
                        const value = d[mint] as number || 0;
                        const barHeight = innerHeight - yScale(value);
                        barY -= barHeight;
                        
                        stackedBars.push(
                          <rect
                            key={`bar-${i}-${mint}`}
                            x={x}
                            y={barY}
                            width={barWidth}
                            height={barHeight}
                            fill={getStablecoinColor(mint)}
                            rx={2}
                            className={`transition-opacity duration-200 ${tooltip.month === d.month ? 'opacity-100' : 'opacity-80'}`}
                          />
                        );
                      });
                      
                      return (
                        <Group key={`month-${i}`}>
                          {stackedBars}
                        </Group>
                      );
                    })}
                    
                    {/* X-axis */}
                    <AxisBottom
                      top={innerHeight}
                      scale={xScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      hideAxisLine={false}
                      tickLength={0}
                      tickValues={xTickValues}
                      tickFormat={formatMonthYear}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        textAnchor: 'middle',
                        dy: '0.5em'
                      })}
                    />
                    
                    {/* Y-axis */}
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
                  data={rawData}
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
                  getDate={(d: any) => d.date ? d.date.toISOString() : d.month}
                  getValue={(d: any) => d.Dex_Volume}
                  lineColor="#2775ca"
                  margin={{ top: 5, right: 20, bottom: 10, left: 80 }}
                />
              );
            }}
          </ParentSize>
        </div>
      </div>
    );
  };

  // Main render function
  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal for expanded view */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="Stablecoin DEX Volume"
        subtitle="Monthly DEX volume for stablecoins on Solana"
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
              <div className="text-[10px] text-gray-400 mb-2">STABLECOINS</div>
              {loading ? (
                // Show loading state
                <>
                  <LegendItem label="Loading..." color="#2775ca" isLoading={true} />
                  <LegendItem label="Loading..." color="#26a17b" isLoading={true} />
                  <LegendItem label="Loading..." color="#fa7a35" isLoading={true} />
                </>
              ) : (
                // Create legend items array
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[500px] pr-1">
                  {stablecoins
                    .sort((a, b) => {
                      const aTotal = rawData
                        .filter(d => d.mint === a)
                        .reduce((sum, d) => sum + (d.Dex_Volume || 0), 0);
                      const bTotal = rawData
                        .filter(d => d.mint === b)
                        .reduce((sum, d) => sum + (d.Dex_Volume || 0), 0);
                      return bTotal - aTotal;
                    })
                    .map(stablecoin => {
                      const totalVolume = rawData
                        .filter(d => d.mint === stablecoin)
                        .reduce((sum, d) => sum + (d.Dex_Volume || 0), 0);
                      
                      return (
                        <LegendItem
                          key={stablecoin}
                          label={stablecoin}
                          color={getStablecoinColor(stablecoin)}
                          shape="square"
                          tooltipText={formatCurrency(totalVolume)}
                        />
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DexVolumeChart; 