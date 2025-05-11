"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scaleTime } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { LinePath } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Tooltip, defaultStyles } from '@visx/tooltip';
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import Modal from "@/app/components/shared/Modal";
import LegendItem from "@/app/components/shared/LegendItem";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";

import {
  fetchLiquidityVelocityData,
  TransactionActivityDataPoint,
  formatNumber,
  getStablecoinColor
} from "@/app/api/stablecoins/liquidity-velocity/liquidityVelocityData";

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface P2PVelocityChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  legendsChanged?: (legends: {label: string, color: string, value?: number}[]) => void;
}

interface ProcessedData {
  date: Date;
  mintName: string;
  p2pVelocity: number;
}

interface TooltipData {
  date: Date;
  mintName: string;
  p2pVelocity: number;
  color: string;
}

const P2PVelocityChart: React.FC<P2PVelocityChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
  legendsChanged
}) => {
  const [rawData, setRawData] = useState<TransactionActivityDataPoint[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
  const [filteredData, setFilteredData] = useState<ProcessedData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availableMints, setAvailableMints] = useState<string[]>([]);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState<number | null>(null);
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);

  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);

  const prepareData = useCallback((data: TransactionActivityDataPoint[]): ProcessedData[] => {
    return data.map(item => ({
      date: item.date || new Date(item.month),
      mintName: item.mint_name,
      p2pVelocity: item.p2p_velocity
    })).filter(item => item.p2pVelocity > 0 && !isNaN(item.p2pVelocity));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLiquidityVelocityData();
      if (data.length === 0) {
        setError('No data available for stablecoin P2P velocity.');
        setRawData([]);
        setProcessedData([]);
        setFilteredData([]);
        setAvailableMints([]);
      } else {
        // Extract unique mints and calculate average P2P velocity for each
        const mintVelocities: Record<string, { total: number; count: number }> = {};
        data.forEach(d => {
          if (d.p2p_velocity > 0 && !isNaN(d.p2p_velocity)) {
            if (!mintVelocities[d.mint_name]) {
              mintVelocities[d.mint_name] = { total: 0, count: 0 };
            }
            mintVelocities[d.mint_name].total += d.p2p_velocity;
            mintVelocities[d.mint_name].count += 1;
          }
        });
        
        // Sort mints by average P2P velocity (descending)
        const averageVelocities = Object.entries(mintVelocities).map(([mint, data]) => ({
          mint,
          average: data.total / data.count
        }));
        const sortedMints = averageVelocities
          .sort((a, b) => b.average - a.average)
          .map(item => item.mint);
        
        setAvailableMints(sortedMints);
        setRawData(data);
        
        const prepared = prepareData(data);
        setProcessedData(prepared);
        setFilteredData(prepared);
        
        // Update brush state to show full data initially
        setIsBrushActive(false);
        setBrushDomain(null);
        
        if (legendsChanged) {
          const legends = sortedMints.map(mint => {
            const avgVelocity = averageVelocities.find(v => v.mint === mint)?.average || 0;
            return {
              label: mint,
              color: getStablecoinColor(mint),
              value: avgVelocity
            };
          });
          legendsChanged(legends);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data.';
      setError(message);
      setRawData([]);
      setProcessedData([]);
      setFilteredData([]);
      setAvailableMints([]);
    } finally {
      setLoading(false);
    }
  }, [legendsChanged, prepareData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      return d.date >= startDate && d.date <= endDate;
    });
    
    setFilteredData(filtered.length > 0 ? filtered : processedData);
  }, [brushDomain, processedData, isBrushActive, filteredData.length]);

  useEffect(() => {
    if (isModalOpen) {
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
    }
  }, [isModalOpen, brushDomain, isBrushActive]);

  const getFilteredDataForBrush = useCallback((brushDomain: [Date, Date] | null): ProcessedData[] => {
    if (!brushDomain || processedData.length === 0) {
      return processedData;
    }
    
    const [startDate, endDate] = brushDomain;
    
    const filtered = processedData.filter(d => {
      return d.date >= startDate && d.date <= endDate;
    });
    
    return filtered.length > 0 ? filtered : processedData;
  }, [processedData]);

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

  const handleTooltip = useCallback(
    (
      event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>,
      dataSet: ProcessedData[],
      xScale: any,
      yScale: any,
      margin: { top: number; right: number; bottom: number; left: number }
    ) => {
      const { x } = localPoint(event) || { x: 0 };
      const x0 = xScale.invert(x - margin.left);
      
      // Find the closest data point
      let closestPoint: ProcessedData | null = null;
      let closestDistance = Infinity;
      let closestMintName = '';
      
      dataSet.forEach(point => {
        const distance = Math.abs(point.date.getTime() - x0.getTime());
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPoint = point;
          closestMintName = point.mintName;
        }
      });
      
      if (closestPoint) {
        // Find all points at the same date for different mints
        const sameDate = dataSet.filter(
          d => d.date.getTime() === closestPoint!.date.getTime()
        );
        
        // Find the specific point that was hovered (closest to cursor vertically)
        const { y } = localPoint(event) || { y: 0 };
        const closestYDistance = sameDate.reduce(
          (min, p) => {
            const yDistance = Math.abs(yScale(p.p2pVelocity) + margin.top - y);
            return yDistance < min.distance
              ? { distance: yDistance, point: p }
              : min;
          },
          { distance: Infinity, point: sameDate[0] }
        );
        
        const hoverPoint = closestYDistance.point || closestPoint;
        
        setTooltipData({
          date: hoverPoint.date,
          mintName: hoverPoint.mintName,
          p2pVelocity: hoverPoint.p2pVelocity,
          color: getStablecoinColor(hoverPoint.mintName)
        });
        setTooltipLeft(xScale(hoverPoint.date) + margin.left);
        setTooltipTop(yScale(hoverPoint.p2pVelocity) + margin.top);
      } else {
        setTooltipData(null);
        setTooltipLeft(null);
        setTooltipTop(null);
      }
    },
    []
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

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
    
    return (
      <div className="flex flex-col h-full">
        <div className="h-[85%] w-full overflow-hidden relative"
          ref={isModal ? modalChartRef : chartRef}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null;
              
              const margin = { top: 10, right: 20, bottom: 50, left: 80 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              const displayData = isActiveBrush ?
                (isModal ? getFilteredDataForBrush(activeBrushDomain) : filteredData) :
                processedData;
              
              // If no data after filtering, don't render the chart
              if (displayData.length === 0) {
                return (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-gray-400/80 text-xs">No data available for the selected time range</div>
                  </div>
                );
              }
              
              // Create scales
              const dateExtent = extent(displayData, d => d.date);
              const xScale = scaleTime({
                domain: dateExtent as [Date, Date],
                range: [0, innerWidth]
              });
              
              const velocityMax = Math.max(...displayData.map(d => d.p2pVelocity));
              const yScale = scaleLinear({
                domain: [0, velocityMax * 1.1], // Add 10% padding
                range: [innerHeight, 0],
                nice: true
              });
              
              // Group data by mint
              const dataByMint = availableMints.reduce((acc, mint) => {
                const mintData = displayData.filter(d => d.mintName === mint);
                if (mintData.length > 0) {
                  acc[mint] = mintData.sort((a, b) => a.date.getTime() - b.date.getTime());
                }
                return acc;
              }, {} as Record<string, ProcessedData[]>);
              
              return (
                <>
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
                      
                      {/* Line paths for each mint */}
                      {Object.entries(dataByMint).map(([mint, data]) => {
                        return (
                          <LinePath
                            key={`line-${mint}`}
                            data={data}
                            x={d => xScale(d.date)}
                            y={d => yScale(d.p2pVelocity)}
                            stroke={getStablecoinColor(mint)}
                            strokeWidth={2.5}
                            strokeOpacity={0.8}
                            curve={curveMonotoneX}
                          />
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
                        numTicks={width < 500 ? 5 : 10}
                        tickLabelProps={() => ({
                          fill: '#6b7280',
                          fontSize: 11,
                          fontWeight: 300,
                          textAnchor: 'middle',
                          dy: '0.5em'
                        })}
                        tickFormat={(date) => {
                          const d = date as Date;
                          return d.toLocaleDateString('en-US', {
                            month: 'numeric',
                            year: '2-digit'
                          });
                        }}
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
                        tickFormat={(value) => formatNumber(value as number)}
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
                      
                      {/* Overlay for tooltip */}
                      <rect
                        width={innerWidth}
                        height={innerHeight}
                        fill="transparent"
                        onMouseMove={(e) => handleTooltip(e, displayData, xScale, yScale, margin)}
                        onMouseLeave={() => {
                          setTooltipData(null);
                          setTooltipLeft(null);
                          setTooltipTop(null);
                        }}
                      />
                    </Group>
                  </svg>
                  
                  {/* Tooltip */}
                  {tooltipData && tooltipLeft != null && tooltipTop != null && (
                    <Tooltip
                      left={tooltipLeft}
                      top={tooltipTop}
                      style={{
                        ...defaultStyles,
                        backgroundColor: '#1f2937',
                        color: 'white',
                        border: '1px solid #374151',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      <div className="text-xs font-medium mb-1">{formatDate(tooltipData.date)}</div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tooltipData.color }}
                        />
                        <div className="text-xs">{tooltipData.mintName}</div>
                        <div className="text-xs font-medium">{formatNumber(tooltipData.p2pVelocity)}</div>
                      </div>
                    </Tooltip>
                  )}
                </>
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
                  data={processedData}
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
                  getDate={(d: any) => d.date.toISOString()}
                  getValue={(d: any) => d.p2pVelocity}
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

  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="Stablecoin P2P Velocity"
        subtitle="Monthly peer-to-peer velocity indicators of stablecoins on Solana"
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
                    // Calculate average P2P velocity for this mint
                    const mintData = processedData.filter(d => d.mintName === mint);
                    const avgP2PVelocity = mintData.length > 0
                      ? mintData.reduce((sum, item) => sum + item.p2pVelocity, 0) / mintData.length
                      : 0;
                      
                    return (
                      <LegendItem
                        key={mint}
                        label={mint}
                        color={getStablecoinColor(mint)}
                        shape="square"
                        tooltipText={formatNumber(avgP2PVelocity)}
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

// Import missing utilities
import { extent } from 'd3-array';
import { localPoint } from '@visx/event';

export default P2PVelocityChart; 