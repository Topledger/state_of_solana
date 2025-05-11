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
import CurrencyFilter from "@/app/components/shared/filters/CurrencyFilter";

import {
  fetchP2PTransferSizeData,
  P2PTransferSizeDataPoint,
  StablecoinType,
  formatNumber,
  formatDate,
  getStablecoinColor
} from "@/app/api/stablecoins/liquidity-velocity/p2pTransferSizeData";

// Define RefreshIcon component
const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface AvgTransferSizeChartProps {
  stablecoin: StablecoinType;
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

interface TooltipData {
  date: Date;
  stablecoin: StablecoinType;
  avgTransferSize: number;
  color: string;
}

const AvgTransferSizeChart: React.FC<AvgTransferSizeChartProps> = ({ 
  stablecoin, 
  isModalOpen = false, 
  onModalClose = () => {} 
}) => {
  // Main chart data
  const [data, setData] = useState<P2PTransferSizeDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<P2PTransferSizeDataPoint[]>([]);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState<number | null>(null);
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  
  // Brush state
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);

  // Modal state
  const [modalStablecoin, setModalStablecoin] = useState<StablecoinType>(stablecoin);
  const [modalData, setModalData] = useState<P2PTransferSizeDataPoint[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  
  // Create a fetchData function that can be called to refresh data for main chart
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chartData = await fetchP2PTransferSizeData(stablecoin);
      
      if (chartData.length === 0) {
        setError('No data available.');
        setData([]);
        setFilteredData([]);
      } else {
        // Add date property for consistency
        const processedData = chartData.map(item => ({
          ...item,
          date: item.date || new Date(item.block_date)
        }));
        
        setData(processedData);
        setFilteredData(processedData);
        
        // Reset brush state
        setIsBrushActive(false);
        setBrushDomain(null);
      }
    } catch (err) {
      console.error('[AvgTransferSizeChart] Error loading chart data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setError(message);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [stablecoin]);

  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const chartData = await fetchP2PTransferSizeData(modalStablecoin);
      
      if (chartData.length === 0) {
        setModalError('No data available.');
        setModalData([]);
      } else {
        // Add date property for consistency
        const processedData = chartData.map(item => ({
          ...item,
          date: item.date || new Date(item.block_date)
        }));
        
        setModalData(processedData);
        
        // Reset brush state
        setIsModalBrushActive(false);
        setModalBrushDomain(null);
      }
    } catch (err) {
      console.error('[AvgTransferSizeChart] Error loading modal chart data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setModalError(message);
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  }, [modalStablecoin]);

  // Fetch data for main chart on mount and when currency changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Apply brush domain to filter data
  useEffect(() => {
    if (data.length === 0) {
      if (filteredData.length > 0) setFilteredData([]);
      return;
    }
    
    if (!brushDomain && isBrushActive) {
      setFilteredData(data);
      return;
    }
    
    if (!brushDomain || !isBrushActive) {
      if (filteredData.length !== data.length) {
        setFilteredData(data);
      }
      return;
    }
    
    const [start, end] = brushDomain;
    
    const filtered = data.filter(d => {
      const itemDate = d.date;
      return itemDate && itemDate >= start && itemDate <= end;
    });
    
    setFilteredData(filtered.length > 0 ? filtered : data);
  }, [brushDomain, data, isBrushActive, filteredData.length]);

  // Update modalStablecoin when stablecoin changes
  useEffect(() => {
    if (!isModalOpen) {
      setModalStablecoin(stablecoin);
    }
  }, [stablecoin, isModalOpen]);

  // Initialize modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setModalStablecoin(stablecoin);
      
      if (data.length > 0) {
        setModalData(data);
        setModalLoading(false);
        setModalError(null);
        
        setIsModalBrushActive(false);
        setModalBrushDomain(null);
      } else {
        fetchModalData();
      }
    }
  }, [isModalOpen, stablecoin, data, fetchModalData]);
  
  // Sync brush state to modal when opened
  useEffect(() => {
    if (isModalOpen) {
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
    }
  }, [isModalOpen, brushDomain, isBrushActive]);
  
  // Fetch modal data when modalStablecoin changes and modal is open
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [modalStablecoin, isModalOpen, fetchModalData]);

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

  // Get filtered data based on brush domain
  const getFilteredDataForBrush = useCallback((data: P2PTransferSizeDataPoint[], brushDomain: [Date, Date] | null): P2PTransferSizeDataPoint[] => {
    if (!brushDomain || data.length === 0) {
      return data;
    }
    
    const [startDate, endDate] = brushDomain;
    
    const filtered = data.filter(d => {
      return d.date && d.date >= startDate && d.date <= endDate;
    });
    
    return filtered.length > 0 ? filtered : data;
  }, []);

  // Handle modal stablecoin change
  const handleModalStablecoinChange = useCallback((newStablecoin: string) => {
    setModalStablecoin(newStablecoin as StablecoinType);
  }, []);

  // Handle tooltip
  const handleTooltip = useCallback(
    (
      event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>,
      dataSet: P2PTransferSizeDataPoint[],
      xScale: any,
      yScale: any,
      margin: { top: number; right: number; bottom: number; left: number },
      activeStablecoin: StablecoinType
    ) => {
      const { x } = localPoint(event) || { x: 0 };
      const x0 = xScale.invert(x - margin.left);
      
      // Find the closest data point
      let closestPoint: P2PTransferSizeDataPoint | null = null;
      let closestDistance = Infinity;
      
      dataSet.forEach(point => {
        if (point && typeof point === 'object' && point.date) {
          const distance = Math.abs(point.date.getTime() - x0.getTime());
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = point;
          }
        }
      });
      
      if (closestPoint) {
        // Use double casting to bypass TypeScript type checking
        const typedClosestPoint = closestPoint as unknown as {
          date: Date;
          Avg_P2P_Transfer_Size: number;
        };
        
        setTooltipData({
          date: typedClosestPoint.date,
          stablecoin: activeStablecoin,
          avgTransferSize: typedClosestPoint.Avg_P2P_Transfer_Size,
          color: getStablecoinColor(activeStablecoin)
        });
        setTooltipLeft(xScale(typedClosestPoint.date) + margin.left);
        setTooltipTop(yScale(typedClosestPoint.Avg_P2P_Transfer_Size) + margin.top);
      } else {
        setTooltipData(null);
        setTooltipLeft(null);
        setTooltipTop(null);
      }
    },
    []
  );

  // Available stablecoins for the filter
  const stablecoins: StablecoinType[] = [
    'USDC', 'USDT', 'PYUSD', 'EURC', 'EUROe', 
    'USDe', 'USDY', 'sUSD', 'USDS', 'FDUSD', 'AUSD', 'USDG'
  ];

  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modal or main data based on context
    const activeStablecoin = isModal ? modalStablecoin : stablecoin;
    const activeData = isModal ? modalData : data;
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const activeIsBrushActive = isModal ? isModalBrushActive : isBrushActive;
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    
    // Determine which data to display based on brush state
    const displayData = activeIsBrushActive
      ? getFilteredDataForBrush(activeData, activeBrushDomain)
      : activeData;
    
    if (activeLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
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
    
    return (
      <div className="flex flex-col h-full">
        <div className="h-[85%] w-full overflow-hidden relative"
          ref={isModal ? modalChartRef : chartRef}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null;
              
              const margin = { top: 10, right: 20, bottom: 50, left: 60 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
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
              
              const valueMax = Math.max(...displayData.map(d => d.Avg_P2P_Transfer_Size));
              const yScale = scaleLinear({
                domain: [0, valueMax * 1.1], // Add 10% padding
                range: [innerHeight, 0],
                nice: true
              });
              
              const lineColor = getStablecoinColor(activeStablecoin);
              
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
                      
                      {/* Line path */}
                      {displayData.length > 0 && (
                        <LinePath
                          data={displayData}
                          x={(d) => {
                            // Type casting to access properties safely
                            const typedD = d as unknown as { date?: Date };
                            return xScale(typedD.date || new Date());
                          }}
                          y={(d) => {
                            // Type casting to access properties safely
                            const typedD = d as unknown as { Avg_P2P_Transfer_Size: number };
                            return yScale(typedD.Avg_P2P_Transfer_Size);
                          }}
                          stroke={lineColor}
                          strokeWidth={2.5}
                          strokeOpacity={0.8}
                          curve={curveMonotoneX}
                        />
                      )}
                      
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
                        onMouseMove={(e) => handleTooltip(e, displayData, xScale, yScale, margin, activeStablecoin)}
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
                      <div className="text-xs font-medium mb-1">{formatDate(tooltipData.date.toISOString())}</div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tooltipData.color }}
                        />
                        <div className="text-xs">{tooltipData.stablecoin}</div>
                        <div className="text-xs font-medium">{formatNumber(tooltipData.avgTransferSize)}</div>
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
                  data={activeData}
                  isModal={isModal}
                  activeBrushDomain={activeBrushDomain}
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
                  getValue={(d: any) => d.Avg_P2P_Transfer_Size}
                  lineColor={getStablecoinColor(activeStablecoin)}
                  margin={{ top: 5, right: 20, bottom: 10, left: 60 }}
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
        title="Average P2P Transfer Size"
        subtitle={`${modalStablecoin} average peer-to-peer transfer size over time`}
      >
        {/* Stablecoin filter - left aligned */}
        <div className="flex items-center justify-start pl-1 py-0 mb-3">
          <CurrencyFilter 
            currency={modalStablecoin} 
            options={stablecoins}
            onChange={handleModalStablecoinChange}
            isCompact={true}
            label="Stablecoin"
          />
        </div>
        
        {/* Horizontal line */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        <div className="h-[70vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-full pr-3 border-r border-gray-900">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              <div className="text-[10px] text-gray-400 mb-2">STABLECOIN</div>
              {modalLoading ? (
                <LegendItem label="Loading..." color={getStablecoinColor(modalStablecoin)} isLoading={true} />
              ) : (
                <LegendItem 
                  key={modalStablecoin}
                  label={modalStablecoin}
                  color={getStablecoinColor(modalStablecoin)}
                  shape="square"
                />
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

export default AvgTransferSizeChart; 