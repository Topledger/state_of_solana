"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DexVolumeChartPoint, fetchDexVolumeData, formatLargeNumber, formatVolume } from '../../../../api/dex/aggregators/dexVolumeData';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { BarStack } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import DisplayModeFilter, { DisplayMode } from '../../../shared/filters/DisplayModeFilter';
import { colors, grid, axisLines, tickLabels } from '../../../../utils/chartColors';

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

// Colors for medium categories
const mediumColors: { [key: string]: string } = {
  "Direct": colors[0], // blue (1st color)
  "Aggregator": colors[1] // orange (4th color)
};

// Chart colors for styling
export const dexVolumeChartColors = {
  grid: grid,
  axisLines: axisLines,
  tickLabels: tickLabels,
};

// Medium categories
const mediumCategories = ['Direct', 'Aggregator'];

interface DexVolumeChartProps {
  displayMode: DisplayMode;
  isModalOpen: boolean;
  onModalClose: () => void;
}

export default function DexVolumeChart({ 
  displayMode,
  isModalOpen, 
  onModalClose
}: DexVolumeChartProps) {
  // State for chart data
  const [data, setData] = useState<DexVolumeChartPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal specific states
  const [modalData, setModalData] = useState<DexVolumeChartPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalDisplayMode, setModalDisplayMode] = useState<DisplayMode>(displayMode);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as DexVolumeChartPoint | null,
    medium: '',
    value: 0,
    left: 0, 
    top: 0,
    items: [] as { color: string; label: string; value: string; rawValue: number; shape: "circle" | "square" }[]
  });
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // Fetch data from the API
  const fetchData = useCallback(async () => {
    console.log('[DexVolumeChart] Starting to fetch data');
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDexVolumeData();
      console.log('[DexVolumeChart] Fetched data:', data);
      
      if (!data.chartData || data.chartData.length === 0) {
        console.warn('[DexVolumeChart] No data returned from API');
        setError('No data available from API');
        setData([]);
      } else {
        // Limit to top 10 DEXes by total volume
        const topDexes = data.chartData.slice(0, 10);
        setData(topDexes);
      }
    } catch (err) {
      console.error('[DexVolumeChart] Error fetching data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setError('Failed to load DEX volume data: ' + message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    console.log('[DexVolumeChart] Starting to fetch modal data');
    setModalLoading(true);
    setModalError(null);
    try {
      const data = await fetchDexVolumeData();
      console.log('[DexVolumeChart] Fetched modal data');
      
      if (!data.chartData || data.chartData.length === 0) {
        console.warn('[DexVolumeChart] No modal data returned from API');
        setModalError('No data available from API');
        setModalData([]);
      } else {
        setModalData(data.chartData);
      }
    } catch (err) {
      console.error('[DexVolumeChart] Error fetching modal data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setModalError('Failed to load DEX volume data: ' + message);
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  }, []);
  
  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle modal display mode change
  const handleModalDisplayModeChange = useCallback((newMode: DisplayMode) => {
    setModalDisplayMode(newMode);
  }, []);
  
  // When modal opens, prepare modal data
  useEffect(() => {
    if (isModalOpen) {
      // Only initialize the modal display mode when the modal first opens
      if (modalData.length === 0) {
        setModalDisplayMode(displayMode);
      }
      
      // Only fetch if we don't have data yet
      if (data.length > 0) {
        setModalData(data);
        setModalLoading(false);
      } else {
        fetchModalData();
      }
    }
  }, [isModalOpen, data, fetchModalData, modalData.length]);
  
  // Enhanced tooltip handler for hovering over bars
  const handleBarHover = useCallback((e: React.MouseEvent, dataPoint: DexVolumeChartPoint, medium: string, value: number, isModal = false) => {
    const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
    if (!chartEl) return;
    
    const rect = chartEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setTooltip({
      visible: true,
      dataPoint,
      medium,
      value,
      left: mouseX,
      top: mouseY,
      items: []
    });
  }, []);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Get available categories for legend
  const getAvailableCategories = () => {
    return mediumCategories.map(medium => ({
      key: medium,
      displayName: medium,
      shape: 'square',
      color: mediumColors[medium] || tickLabels
    }));
  };
  
  // Render the ViSX based chart 
  const renderChart = (isModal = false) => {
    console.log('[DexVolumeChart] Rendering chart. Modal:', isModal);
    
    // Use the appropriate state variables based on modal or main view
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    const activeDisplayMode = isModal ? modalDisplayMode : displayMode;
    const activeData = isModal ? modalData : data;
    
    // Show loading state
    if (activeLoading) {
      return <Loader size="sm" />;
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
    
    return (
      <div className="flex flex-col h-full w-full">
        {/* Tooltip */}
        {tooltip.visible && tooltip.dataPoint && (
          <ChartTooltip
            title={tooltip.dataPoint.dex}
            items={
              // If tooltip has multiple items, show them all
              tooltip.items && tooltip.items.length > 0 ? tooltip.items :
              // Otherwise use the single medium/value from original tooltip
              [{
                color: mediumColors[tooltip.medium] || tickLabels,
                label: tooltip.medium,
                value: formatVolume(tooltip.value),
                shape: 'square'
              }]
            }
            top={tooltip.top}
            left={tooltip.left}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div 
          className="h-full w-full overflow-hidden relative"
          onMouseLeave={handleMouseLeave}
          ref={isModal ? modalChartRef : chartContainerRef}
          onMouseMove={(e) => {
            const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
            if (!chartEl) return;
            
            const rect = chartEl.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Get chart margins and dimensions
            const margin = { top: 20, right: 20, bottom: 60, left: 70 };
            const innerWidth = rect.width - margin.left - margin.right;
            
            // Only process if within chart area (not in margins)
            if (mouseX < margin.left || mouseX > innerWidth + margin.left) return;
            
            // Get current data
            const currentData = isModal ? modalData : data;
            
            // Since this is a bar chart with discrete x-values (DEXes), we need to find the closest DEX
            const dexWidth = innerWidth / currentData.length;
            const dexIndex = Math.min(
              currentData.length - 1,
              Math.max(0, Math.floor((mouseX - margin.left) / dexWidth))
            );
            
            if (dexIndex >= 0 && dexIndex < currentData.length) {
              const dataPoint = currentData[dexIndex];
              
              // Create items for all mediums with non-zero values
              const tooltipItems = mediumCategories
                .map(medium => ({
                  color: mediumColors[medium] || tickLabels,
                  label: medium,
                  value: formatVolume(Number(dataPoint[medium] || 0)),
                  rawValue: Number(dataPoint[medium] || 0),
                  shape: "square" as const
                }))
                .filter(item => item.rawValue > 0) // Only show non-zero values
                .sort((a, b) => b.rawValue - a.rawValue); // Sort by value, highest first
              
              setTooltip({
                visible: true,
                dataPoint,
                medium: '', // Not needed when using items array
                value: 0,   // Not needed when using items array
                left: mouseX,
                top: mouseY,
                items: tooltipItems
              });
            }
          }}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null;
              
              const margin = { top: 20, right: 20, bottom: 60, left: 70 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              // Setup scales
              const xScale = scaleBand<string>({
                domain: activeData.map(d => d.dex),
                padding: 0.3,
                range: [0, innerWidth]
              });
              
              // Find maximum value for y-axis
              let maxValue = 0;
              
              // For absolute values, calculate based on stacked totals
              if (activeDisplayMode === 'absolute') {
                activeData.forEach(d => {
                  let stackTotal = 0;
                  mediumCategories.forEach(medium => {
                    stackTotal += Number(d[medium] || 0);
                  });
                  maxValue = Math.max(maxValue, stackTotal);
                });
              } else {
                // For percentage mode, max is always 100%
                maxValue = 100;
              }
              
              const yScale = scaleLinear<number>({
                domain: [0, activeDisplayMode === 'percent' ? 100 : maxValue * 1.1], // No padding for percentage mode
                range: [innerHeight, 0],
                nice: true
              });
              
              const colorScale = scaleOrdinal<string, string>({
                domain: mediumCategories,
                range: mediumCategories.map(cat => mediumColors[cat] || tickLabels)
              });
              
              // Prepare data for BarStack - convert to percentage if needed
              let processedData = [...activeData];
              
              if (activeDisplayMode === 'percent') {
                processedData = activeData.map(d => {
                  // Calculate total for this data point
                  const total = d.total;
                  
                  // Create a new data point with percentages
                  const percentagePoint: any = { dex: d.dex, total: d.total };
                  mediumCategories.forEach(medium => {
                    if (total > 0) {
                      percentagePoint[medium] = ((Number(d[medium]) || 0) / total) * 100;
                    } else {
                      percentagePoint[medium] = 0;
                    }
                  });
                  
                  return percentagePoint;
                });
              }
              
              return (
                <svg width={width} height={height} className="overflow-visible">
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid lines */}
                    <GridRows 
                      scale={yScale} 
                      width={innerWidth} 
                      stroke={dexVolumeChartColors.grid} 
                      strokeDasharray="2,3" 
                      strokeOpacity={0.5} 
                      numTicks={5} 
                    />
                    
                    {/* Stacked bars */}
                    <BarStack
                      data={processedData}
                      keys={mediumCategories}
                      x={d => d.dex}
                      xScale={xScale}
                      yScale={yScale}
                      color={colorScale}
                    >
                      {barStacks => 
                        barStacks.map(barStack => 
                          barStack.bars.map(bar => (
                            <rect
                              key={`bar-stack-${barStack.index}-${bar.index}`}
                              x={bar.x}
                              y={bar.y}
                              height={bar.height}
                              width={bar.width}
                              fill={bar.color}
                              opacity={tooltip.visible && tooltip.dataPoint?.dex === bar.bar.data.dex && tooltip.medium === mediumCategories[bar.index] ? 0.9 : 0.7}
                              rx={2}
                              onMouseEnter={(e) => handleBarHover(
                                e, 
                                bar.bar.data, 
                                mediumCategories[bar.index], 
                                Number(bar.bar.data[mediumCategories[bar.index]] || 0),
                                isModal
                              )}
                              onMouseMove={(e) => {
                                const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
                                if (!chartEl) return;
                                
                                const rect = chartEl.getBoundingClientRect();
                                const mouseX = e.clientX - rect.left;
                                const mouseY = e.clientY - rect.top;
                                
                                setTooltip(prev => ({ 
                                  ...prev, 
                                  left: mouseX, 
                                  top: mouseY 
                                }));
                              }}
                            />
                          ))
                        )
                      }
                    </BarStack>
                    
                    {/* X-axis (DEXes) */}
                    <AxisBottom 
                      top={innerHeight} 
                      scale={xScale} 
                      stroke={dexVolumeChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0}
                      hideZero={true}
                      tickLabelProps={() => ({ 
                        fill: dexVolumeChartColors.tickLabels, 
                        fontSize: 10, 
                        textAnchor: 'middle', 
                        dy: '1.2em',
                        verticalAnchor: 'start'
                      })}
                    />
                    
                    {/* Y-axis */}
                    <AxisLeft 
                      scale={yScale}
                      stroke={dexVolumeChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => {
                        if (activeDisplayMode === 'percent') {
                          return `${Number(value).toFixed(0)}%`;
                        } else {
                          return formatVolume(Number(value));
                        }
                      }}
                      tickLabelProps={() => ({ 
                        fill: dexVolumeChartColors.tickLabels, 
                        fontSize: 10, 
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
      </div>
    );
  };
  
  // Render the modal content with enhanced UI and filters
  const renderModalContent = () => {
    const categories = getAvailableCategories();
    
    return (
      <div className="p-4 w-full h-full">
        {/* Filters - horizontal row */}
        <div className="flex items-center justify-between pl-1 py-0 mb-3">
          <div className="flex space-x-4 items-center">
            <DisplayModeFilter 
              mode={modalDisplayMode} 
              onChange={handleModalDisplayModeChange}
            />
          </div>
        </div>
        
        {/* Horizontal line */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        {/* Chart with legends in modal */}
        <div className="h-[60vh]">
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-full pr-3 border-r border-gray-900">
              {renderChart(true)}
            </div>
            
            {/* Legend area - 10% width with scrollbar */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              <div className="text-[10px] text-gray-400 mb-2">SOURCE</div>
              {!modalLoading && modalData.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[600px] w-[125px] overflow-y-auto
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {categories.map((category, index) => (
                    <div key={`modal-legend-${index}`} className="flex items-start">
                      <div 
                        className="w-2.5 h-2.5 mr-1.5 rounded-sm mt-0.5"
                        style={{ background: category.color }}
                      ></div>
                      <span className="text-[11px] text-gray-300">
                        {category.displayName}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Loading states */}
                  <div className="flex items-start">
                    <div className="w-2.5 h-2.5 bg-blue-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                    <span className="text-[11px] text-gray-300">Loading...</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2.5 h-2.5 bg-orange-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                    <span className="text-[11px] text-gray-300">Loading...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render legend for main chart view
  const renderLegend = () => {
    const categories = getAvailableCategories();
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {categories.map((category, index) => (
          <div key={`legend-${index}`} className="flex items-center">
            <div 
              className="w-3 h-3 mr-1 rounded-sm" 
              style={{ background: category.color }}
            ></div>
            <span className="text-xs text-gray-300">{category.displayName}</span>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="h-full w-full relative">
      {/* Chart */}
      <div className="h-full">
        {renderChart(false)}
      </div>
      
      {/* Modal for expanded view */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="DEX Volume by Source"
        subtitle="Volume distribution between direct trades and aggregator-routed trades"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
} 