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
  fetchStablecoinP2PData,
  StablecoinP2PDataPoint,
  formatCurrency,
  getStablecoinColor
} from "@/app/api/stablecoins/stablecoin-usage/stablecoinP2PData";

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface StablecoinP2PChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

interface ExtendedP2PDataPoint extends StablecoinP2PDataPoint {
  date?: Date;
}

interface StackedBarData {
  month: string;
  date: Date;
  [mintName: string]: any;
}

const StablecoinP2PChart: React.FC<StablecoinP2PChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
  legendsChanged
}) => {
  const [rawData, setRawData] = useState<ExtendedP2PDataPoint[]>([]);
  const [stackedData, setStackedData] = useState<StackedBarData[]>([]);
  const [filteredData, setFilteredData] = useState<StackedBarData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availableMints, setAvailableMints] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);

  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);

  const [tooltip, setTooltip] = useState({
    visible: false,
    month: '',
    items: [] as { mint: string, value: number, color: string }[],
    left: 0,
    top: 0
  });

  const prepareStackedData = useCallback((data: ExtendedP2PDataPoint[]): StackedBarData[] => {
    const groupedByMonth = data.reduce((acc, curr) => {
      if (!acc[curr.Month]) {
        acc[curr.Month] = {
          month: curr.Month,
          date: curr.date || new Date(curr.Month)
        };
      }
      // Use mint as the property name
      acc[curr.Month][curr.mint] = curr.Volume;
      return acc;
    }, {} as Record<string, StackedBarData>);
    
    return Object.values(groupedByMonth).sort((a, b) =>
      a.date.getTime() - b.date.getTime()
    );
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p2pData = await fetchStablecoinP2PData();
      if (p2pData.length === 0) {
        setError('No data available for stablecoin P2P transfers.');
        setRawData([]);
        setStackedData([]);
        setFilteredData([]);
        setAvailableMints([]);
      } else {
        const dataWithDates = p2pData.map(d => ({
          ...d,
          date: new Date(d.Month)
        }));
        
        // Extract unique mints and calculate total volume for each
        const mintTotals: Record<string, number> = {};
        dataWithDates.forEach(d => {
          if (!mintTotals[d.mint]) {
            mintTotals[d.mint] = 0;
          }
          mintTotals[d.mint] += d.Volume;
        });
        
        // Sort mints by total volume (descending)
        const sortedMints = Object.entries(mintTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([mint]) => mint);
        
        setAvailableMints(sortedMints);
        setRawData(dataWithDates);
        
        const prepared = prepareStackedData(dataWithDates);
        setStackedData(prepared);
        setFilteredData(prepared);
        
        // Update brush state to show full data initially
        setIsBrushActive(false);
        setBrushDomain(null);
        
        if (legendsChanged) {
          const legends = sortedMints.map(mint => ({
            label: mint,
            color: getStablecoinColor(mint),
            value: mintTotals[mint]
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
      setAvailableMints([]);
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
      const date = d.date instanceof Date ? d.date : new Date(d.month);
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
      const date = d.date instanceof Date ? d.date : new Date(d.month);
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
    
    if (!tooltip.visible || tooltip.month !== dataPoint.month) {
      const tooltipItems = availableMints
        .filter(mint => dataPoint[mint] > 0)
        .map(mint => ({
          mint,
          value: dataPoint[mint],
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
  }, [stackedData, filteredData, isBrushActive, tooltip.visible, tooltip.month, availableMints,
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
              if (width <= 0 || height <= 0) return null;
              
              const margin = { top: 10, right: 20, bottom: 50, left: 90 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              const displayData = isActiveBrush ?
                (isModal ? getFilteredDataForBrush(activeBrushDomain) : filteredData) :
                stackedData;
              
              const xScale = scaleBand<string>({
                domain: displayData.map(d => d.month),
                range: [0, innerWidth],
                padding: 0.2
              });
              
              const calculateTickValues = () => {
                const tickThreshold = innerWidth < 500 ? 5 : 10;
                if (displayData.length <= tickThreshold) {
                  return displayData.map(d => d.month);
                } else {
                  const step = Math.ceil(displayData.length / (tickThreshold - 1));
                  const tickValues = displayData
                    .filter((_, i) => i % step === 0 || i === displayData.length - 1)
                    .map(d => d.month);
                  return tickValues;
                }
              };
              
              const xTickValues = calculateTickValues();
              
              const totalsByMonth = displayData.map(d => {
                return availableMints.reduce((sum, mint) => sum + (d[mint] || 0), 0);
              });
              
              const yMax = Math.max(...totalsByMonth);
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
                      const x = xScale(d.month) || 0;
                      
                      // Create stack for this month
                      let barY = innerHeight;
                      const stackedBars: React.ReactNode[] = [];
                      
                      // Generate bars for each mint, sorted by volume
                      availableMints
                        .filter(mint => d[mint] > 0)
                        .sort((a, b) => d[a] - d[b]) // Sort ascending for proper stacking
                        .forEach(mint => {
                          const value = d[mint] || 0;
                          const barHeight = innerHeight - yScale(value);
                          barY -= barHeight;
                          
                          stackedBars.push(
                            <Bar
                              key={`bar-${i}-${mint}`}
                              x={x}
                              y={barY}
                              width={barWidth}
                              height={barHeight}
                              fill={getStablecoinColor(mint)}
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
                      tickFormat={(month) => {
                        const d = new Date(month as string);
                        return d.toLocaleDateString('en-US', {
                          month: 'numeric',
                          year: '2-digit'
                        });
                      }}
                    />
                    
                    {/* Y-axis (Volume values) */}
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
                  getDate={(d: any) => d.date ? d.date.toISOString() : d.Month}
                  getValue={(d: any) => d.Volume}
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
        title="Stablecoin P2P Transfers"
        subtitle="Monthly peer-to-peer transfer volume of stablecoins on Solana"
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
                  {availableMints.map((mint) => {
                    // Calculate total volume for this mint
                    const totalVolume = rawData
                      .filter(d => d.mint === mint)
                      .reduce((sum, item) => sum + item.Volume, 0);
                      
                    return (
                      <LegendItem
                        key={mint}
                        label={mint}
                        color={getStablecoinColor(mint)}
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

export default StablecoinP2PChart; 