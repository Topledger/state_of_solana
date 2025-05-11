"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scaleBand } from '@visx/scale';
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

import {
  fetchStablecoinUsageData,
  StablecoinUsageDataPoint,
  formatCurrency,
  formatNumber,
  getStablecoinColor
} from "@/app/api/stablecoins/stablecoin-usage/stablecoinUsageData";

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface StablecoinSupplyChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

interface ExtendedStablecoinDataPoint extends StablecoinUsageDataPoint {
  date?: Date;
}

interface StackedBarData {
  block_date: string;
  date: Date;
  [mintName: string]: any;
}

const StablecoinSupplyChart: React.FC<StablecoinSupplyChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
  legendsChanged
}) => {
  const [rawData, setRawData] = useState<ExtendedStablecoinDataPoint[]>([]);
  const [stackedData, setStackedData] = useState<StackedBarData[]>([]);
  const [filteredData, setFilteredData] = useState<StackedBarData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availableMintNames, setAvailableMintNames] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);

  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);

  const [tooltip, setTooltip] = useState({
    visible: false,
    date: '',
    items: [] as { mintName: string, value: number, color: string }[],
    left: 0,
    top: 0
  });

  const prepareStackedData = useCallback((data: ExtendedStablecoinDataPoint[]): StackedBarData[] => {
    const groupedByDate = data.reduce((acc, curr) => {
      if (!acc[curr.block_date]) {
        acc[curr.block_date] = {
          block_date: curr.block_date,
          date: curr.date || new Date(curr.block_date)
        };
      }
      // Use mint_name as the property name
      acc[curr.block_date][curr.mint_name] = curr.token_supply;
      return acc;
    }, {} as Record<string, StackedBarData>);
    
    return Object.values(groupedByDate).sort((a, b) =>
      new Date(a.block_date).getTime() - new Date(b.block_date).getTime()
    );
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usageData = await fetchStablecoinUsageData();
      if (usageData.length === 0) {
        setError('No data available for stablecoin usage.');
        setRawData([]);
        setStackedData([]);
        setFilteredData([]);
        setAvailableMintNames([]);
      } else {
        const dataWithDates = usageData.map(d => ({
          ...d,
          date: new Date(d.block_date)
        }));
        
        // Extract unique mint names and calculate total supply for each
        const mintNameTotals: Record<string, number> = {};
        dataWithDates.forEach(d => {
          if (!mintNameTotals[d.mint_name]) {
            mintNameTotals[d.mint_name] = 0;
          }
          mintNameTotals[d.mint_name] += d.token_supply;
        });
        
        // Sort mint names by total supply (descending)
        const sortedMintNames = Object.entries(mintNameTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([mintName]) => mintName);
        
        setAvailableMintNames(sortedMintNames);
        setRawData(dataWithDates);
        
        const prepared = prepareStackedData(dataWithDates);
        setStackedData(prepared);
        setFilteredData(prepared);
        
        setIsBrushActive(true);
        setBrushDomain(null);
        
        if (legendsChanged) {
          const legends = sortedMintNames.map(mintName => ({
            label: mintName,
            color: getStablecoinColor(mintName),
            value: mintNameTotals[mintName]
          }));
          legendsChanged(legends);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data.';
      setError(message);
      setRawData([]);
      setStackedData([]);
      setFilteredData([]);
      setAvailableMintNames([]);
    } finally {
      setLoading(false);
    }
  }, [legendsChanged, prepareStackedData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (stackedData.length === 0) {
      if (filteredData.length > 0) setFilteredData([]);
      return;
    }
    
    if (!brushDomain && isBrushActive) {
      setFilteredData(stackedData);
      return;
    }
    
    if (!brushDomain || !isBrushActive) {
      if (filteredData.length !== stackedData.length) {
        setFilteredData(stackedData);
      }
      return;
    }
    
    const [startDate, endDate] = brushDomain;
    
    const filtered = stackedData.filter(d => {
      const date = d.date instanceof Date ? d.date : new Date(d.block_date);
      return date >= startDate && date <= endDate;
    });
    
    setFilteredData(filtered.length > 0 ? filtered : stackedData);
  }, [brushDomain, stackedData, isBrushActive, filteredData.length]);

  useEffect(() => {
    if (isModalOpen) {
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
    }
  }, [isModalOpen, brushDomain, isBrushActive]);

  const getFilteredDataForBrush = useCallback((brushDomain: [Date, Date] | null): StackedBarData[] => {
    if (!brushDomain || stackedData.length === 0) {
      return stackedData;
    }
    
    const [startDate, endDate] = brushDomain;
    
    const filtered = stackedData.filter(d => {
      const date = d.date instanceof Date ? d.date : new Date(d.block_date);
      return date >= startDate && date <= endDate;
    });
    
    return filtered.length > 0 ? filtered : stackedData;
  }, [stackedData]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    
    const isActiveBrush = isModal ? isModalBrushActive : isBrushActive;
    const currentBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const currentData = isActiveBrush
      ? (isModal ? getFilteredDataForBrush(currentBrushDomain) : filteredData)
      : stackedData;
    
    if (currentData.length === 0) return;
    
    const margin = { top: 20, right: 20, bottom: 60, left: 90 };
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
    
    if (!tooltip.visible || tooltip.date !== dataPoint.block_date) {
      const tooltipItems = availableMintNames
        .filter(mintName => dataPoint[mintName] > 0)
        .map(mintName => ({
          mintName,
          value: dataPoint[mintName],
          color: getStablecoinColor(mintName)
        }))
        .sort((a, b) => b.value - a.value);
      
      setTooltip({
        visible: true,
        date: dataPoint.block_date,
        items: tooltipItems,
        left: mouseX,
        top: e.clientY - rect.top
      });
    }
  }, [stackedData, filteredData, isBrushActive, tooltip.visible, tooltip.date, availableMintNames,
      isModalBrushActive, modalBrushDomain, brushDomain, getFilteredDataForBrush]);

  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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

  const renderChartContent = (height: number, width: number, isModal = false) => {
    if (loading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
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
    
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const isActiveBrush = isModal ? isModalBrushActive : isBrushActive;
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && tooltip.items.length > 0 && (
          <ChartTooltip
            title={formatDate(tooltip.date)}
            items={tooltip.items.map(item => ({
              color: item.color,
              label: item.mintName,
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
              if (width <= 0 || height <= 0) return null;
              
              const margin = { top: 10, right: 20, bottom: 50, left: 90 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              const displayData = isActiveBrush ?
                (isModal ? getFilteredDataForBrush(activeBrushDomain) : filteredData) :
                stackedData;
              
              const xScale = scaleBand<string>({
                domain: displayData.map(d => d.block_date),
                range: [0, innerWidth],
                padding: 0.2
              });
              
              const calculateTickValues = () => {
                const tickThreshold = innerWidth < 500 ? 5 : 10;
                if (displayData.length <= tickThreshold) {
                  return displayData.map(d => d.block_date);
                } else {
                  const step = Math.ceil(displayData.length / (tickThreshold - 1));
                  const tickValues = displayData
                    .filter((_, i) => i % step === 0 || i === displayData.length - 1)
                    .map(d => d.block_date);
                  return tickValues;
                }
              };
              
              const xTickValues = calculateTickValues();
              
              const totalsByDate = displayData.map(d => {
                return availableMintNames.reduce((sum, mintName) => sum + (d[mintName] || 0), 0);
              });
              
              const yMax = Math.max(...totalsByDate);
              const yScale = scaleLinear<number>({
                domain: [0, yMax * 1.1], // 10% padding
                range: [innerHeight, 0],
                nice: true
              });
              
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
                      const x = xScale(d.block_date) || 0;
                      
                      // Create stack for this date
                      let barY = innerHeight;
                      const stackedBars: React.ReactNode[] = [];
                      
                      // Generate bars for each mint name, sorted by supply
                      availableMintNames
                        .filter(mintName => d[mintName] > 0)
                        .sort((a, b) => d[a] - d[b]) // Sort ascending for proper stacking
                        .forEach(mintName => {
                          const value = d[mintName] || 0;
                          const barHeight = innerHeight - yScale(value);
                          barY -= barHeight;
                          
                          stackedBars.push(
                            <Bar
                              key={`bar-${i}-${mintName}`}
                              x={x}
                              y={barY}
                              width={barWidth}
                              height={barHeight}
                              fill={getStablecoinColor(mintName)}
                              opacity={tooltip.date === d.block_date ? 1 : 0.8}
                              rx={2}
                            />
                          );
                        });
                      
                      return (
                        <Group key={`date-${i}`}>
                          {stackedBars}
                        </Group>
                      );
                    })}
                    
                    {/* X-axis (Dates) */}
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
                        const d = new Date(date as string);
                        return d.toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                        });
                      }}
                    />
                    
                    {/* Y-axis (Supply values) */}
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
                  getDate={(d: any) => d.date ? d.date.toISOString() : d.block_date}
                  getValue={(d: any) => d.token_supply}
                  lineColor="#2775ca"
                  margin={{ top: 5, right: 20, bottom: 10, left: 90 }}
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
        title="Stablecoin Supply"
        subtitle="Token supply of stablecoins on Solana over time"
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
                  {availableMintNames.map((mintName) => {
                    // Calculate total supply for this mint name
                    const totalSupply = rawData
                      .filter(d => d.mint_name === mintName)
                      .reduce((sum, item) => {
                        // Just use the latest data point for each mint
                        return Math.max(sum, item.token_supply);
                      }, 0);
                      
                    return (
                      <LegendItem
                        key={mintName}
                        label={mintName}
                        color={getStablecoinColor(mintName)}
                        shape="square"
                        tooltipText={formatCurrency(totalSupply)}
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

export default StablecoinSupplyChart; 