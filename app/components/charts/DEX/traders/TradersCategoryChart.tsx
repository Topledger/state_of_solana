"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TradersCategoryChartPoint, traderCategories, fetchTradersCategoryData, formatLargeNumber, formatVolume, formatMonth } from '../../../../api/dex/traders/tradersCategoryData';
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
import BrushTimeScale from '../../../shared/BrushTimeScale';
import DataTypeFilter, { DataType } from '../../../shared/filters/DataTypeFilter';
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

// Colors for trader categories - use first 6 colors from our sequential color system
const categoryColors: { [key: string]: string } = {
  "<1k USD ": colors[0], // blue (1st color)
  "1k-10k USD": colors[2], // green (3rd color)
  "10k-50k USD": colors[1], // purple (2nd color)
  "50k-500k USD": colors[3], // orange (4th color)
  "500k-2.5M USD": colors[4], // red (5th color)
  ">2.5M USD": colors[5] // yellow (6th color)
};

// Chart colors for styling
export const tradersCategoryChartColors = {
  grid: grid,
  axisLines: axisLines,
  tickLabels: tickLabels,
};

interface TradersCategoryChartProps {
  dataType: DataType;
  displayMode: DisplayMode;
  isModalOpen: boolean;
  onModalClose: () => void;
}

export default function TradersCategoryChart({ 
  dataType,
  displayMode,
  isModalOpen, 
  onModalClose
}: TradersCategoryChartProps) {
  // State for chart data
  const [volumeData, setVolumeData] = useState<TradersCategoryChartPoint[]>([]);
  const [signersData, setSignersData] = useState<TradersCategoryChartPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Color mapping state - maps category names to colors based on values
  const [categoryColorMap, setCategoryColorMap] = useState<Record<string, string>>({});
  
  // Filtering and brushing states
  const [filteredVolumeData, setFilteredVolumeData] = useState<TradersCategoryChartPoint[]>([]);
  const [filteredSignersData, setFilteredSignersData] = useState<TradersCategoryChartPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific states
  const [modalData, setModalData] = useState<TradersCategoryChartPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<TradersCategoryChartPoint[]>([]);
  const [modalDataType, setModalDataType] = useState<DataType>(dataType);
  const [modalDisplayMode, setModalDisplayMode] = useState<DisplayMode>(displayMode);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as TradersCategoryChartPoint | null,
    category: '',
    value: 0,
    left: 0, 
    top: 0,
    items: [] as { color: string; label: string; value: string; rawValue: number; shape: "circle" | "square" }[]
  });
  
  // Add refs for throttling
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // Get color for a category from the dynamic color map
  const getCategoryColor = (category: string) => {
    return categoryColorMap[category] || categoryColors[category] || '#6b7280';
  };
  
  // Fetch data from the API
  const fetchData = useCallback(async () => {
    console.log('[TradersCategoryChart] Starting to fetch data');
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTradersCategoryData();
      console.log('[TradersCategoryChart] Fetched data:', data);
      
      if (!data.volumeData || data.volumeData.length === 0 || !data.signersData || data.signersData.length === 0) {
        console.warn('[TradersCategoryChart] No data returned from API');
        setError('No data available from API');
        setVolumeData([]);
        setSignersData([]);
        setFilteredVolumeData([]);
        setFilteredSignersData([]);
      } else {
        // Sort data by date
        const sortedVolumeData = [...data.volumeData].sort((a, b) => a.date.getTime() - b.date.getTime());
        const sortedSignersData = [...data.signersData].sort((a, b) => a.date.getTime() - b.date.getTime());
        
        setVolumeData(sortedVolumeData);
        setSignersData(sortedSignersData);
        setFilteredVolumeData(sortedVolumeData);
        setFilteredSignersData(sortedSignersData);
        
        // Set brush as active but don't set a specific domain
        setIsBrushActive(true);
        setBrushDomain(null);
        
        // Calculate total values per category and create color mapping
        updateCategoryColorMapping(sortedVolumeData, sortedSignersData, dataType);
      }
    } catch (err) {
      console.error('[TradersCategoryChart] Error fetching data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setError('Failed to load traders data: ' + message);
      setVolumeData([]);
      setSignersData([]);
      setFilteredVolumeData([]);
      setFilteredSignersData([]);
    } finally {
      setLoading(false);
    }
  }, [dataType]);
  
  // Update color mapping when data type changes
  useEffect(() => {
    if (volumeData.length > 0 && signersData.length > 0) {
      updateCategoryColorMapping(volumeData, signersData, dataType);
    }
  }, [dataType, volumeData, signersData]);
  
  // Function to calculate total values and assign colors
  const updateCategoryColorMapping = (
    volumeData: TradersCategoryChartPoint[], 
    signersData: TradersCategoryChartPoint[],
    currentDataType: DataType
  ) => {
    const relevantData = currentDataType === 'volume' ? volumeData : signersData;
    
    // Calculate total values per category
    const categoryTotals: Record<string, number> = {};
    
    traderCategories.forEach(category => {
      categoryTotals[category] = 0;
      
      relevantData.forEach(dataPoint => {
        categoryTotals[category] += dataPoint[category] || 0;
      });
    });
    
    // Sort categories by total values (highest first)
    const sortedCategories = traderCategories
      .map(category => ({ name: category, total: categoryTotals[category] || 0 }))
      .sort((a, b) => b.total - a.total)
      .map(item => item.name);
      
    // Create color map - assign colors based on value ranking
    const newColorMap: Record<string, string> = {};
    sortedCategories.forEach((category, index) => {
      // Use first set of colors from our palette (wrap around if needed)
      newColorMap[category] = colors[index % colors.length];
    });
    
    // Set the new color map
    setCategoryColorMap(newColorMap);
  };
  
  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    console.log('[TradersCategoryChart] Starting to fetch modal data');
    setModalLoading(true);
    setModalError(null);
    try {
      const data = await fetchTradersCategoryData();
      console.log('[TradersCategoryChart] Fetched modal data');
      
      if (!data.volumeData || data.volumeData.length === 0 || !data.signersData || data.signersData.length === 0) {
        console.warn('[TradersCategoryChart] No modal data returned from API');
        setModalError('No data available from API');
        setModalData([]);
        setModalFilteredData([]);
      } else {
        // Use appropriate data based on type
        const currentData = modalDataType === 'volume' ? data.volumeData : data.signersData;
        const sortedModalData = [...currentData].sort((a, b) => a.date.getTime() - b.date.getTime());
        
        setModalData(sortedModalData);
        setModalFilteredData(sortedModalData);
        
        // Set brush as active but don't set a specific domain
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      }
    } catch (err) {
      console.error('[TradersCategoryChart] Error fetching modal data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setModalError('Failed to load traders data: ' + message);
      setModalData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  }, [modalDataType]);
  
  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle brush change with throttling
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
        setFilteredVolumeData(volumeData);
        setFilteredSignersData(signersData);
      }
      // Clear any pending throttle timeout
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
        canUpdateFilteredDataRef.current = true; // Allow immediate update on clear
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    // Update immediate brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setBrushDomain(newDomain);
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
    
    // Apply throttling to data filtering
    if (canUpdateFilteredDataRef.current) {
      canUpdateFilteredDataRef.current = false;
      
      // Filter data within the date range
      const filteredVolume = volumeData.filter(d => {
        const itemDate = d.date.getTime();
        return itemDate >= startDate.getTime() && itemDate <= endDate.getTime();
      });
      
      const filteredSigners = signersData.filter(d => {
        const itemDate = d.date.getTime();
        return itemDate >= startDate.getTime() && itemDate <= endDate.getTime();
      });
      
      if (filteredVolume.length === 0 || filteredSigners.length === 0) {
        // Fallback to all data if no dates are in range
        setFilteredVolumeData(volumeData);
        setFilteredSignersData(signersData);
      } else {
        // Set filtered data
        setFilteredVolumeData(filteredVolume);
        setFilteredSignersData(filteredSigners);
      }
      
      // Set timeout to allow next update
      throttleTimeoutRef.current = setTimeout(() => {
        canUpdateFilteredDataRef.current = true;
        throttleTimeoutRef.current = null;
      }, 100);
    }
  }, [isBrushActive, volumeData, signersData]);
  
  // Handle modal brush change with throttling
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
        setModalFilteredData(modalData);
      }
      // Clear any pending throttle timeout
      if (modalThrottleTimeoutRef.current) {
        clearTimeout(modalThrottleTimeoutRef.current);
        modalThrottleTimeoutRef.current = null;
        canUpdateModalFilteredDataRef.current = true; // Allow immediate update on clear
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    // Update immediate brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setModalBrushDomain(newDomain);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
    
    // Apply throttling to data filtering
    if (canUpdateModalFilteredDataRef.current) {
      canUpdateModalFilteredDataRef.current = false;
      
      // Filter data within the date range
      const filtered = modalData.filter(d => {
        const itemDate = d.date.getTime();
        return itemDate >= startDate.getTime() && itemDate <= endDate.getTime();
      });
      
      if (filtered.length === 0) {
        // Fallback to all data if no dates are in range
        setModalFilteredData(modalData);
      } else {
        // Set filtered data
        setModalFilteredData(filtered);
      }
      
      // Set timeout to allow next update
      modalThrottleTimeoutRef.current = setTimeout(() => {
        canUpdateModalFilteredDataRef.current = true;
        modalThrottleTimeoutRef.current = null;
      }, 100);
    }
  }, [isModalBrushActive, modalData]);
  
  // Handle modal data type change
  const handleModalDataTypeChange = useCallback((newType: DataType) => {
    setModalDataType(newType);
    // Refresh modal data with the new data type
    fetchModalData();
  }, [fetchModalData]);

  // Handle modal display mode change
  const handleModalDisplayModeChange = useCallback((newMode: DisplayMode) => {
    setModalDisplayMode(newMode);
  }, []);
  
  // When modal data type changes, update the modal data
  useEffect(() => {
    if (isModalOpen) {
      // If modal is open and data type changes, update the filtered data
      if (modalData.length > 0) {
        const currentData = modalDataType === 'volume' ? volumeData : signersData;
        setModalData(currentData);
        setModalFilteredData(currentData);
      }
    }
  }, [modalDataType, isModalOpen, volumeData, signersData]);
  
  // When modal opens, prepare modal data
  useEffect(() => {
    if (isModalOpen) {
      const currentData = dataType === 'volume' ? volumeData : signersData;
      setModalDataType(dataType);
      setModalDisplayMode(displayMode);
      
      // Only fetch if we don't have data yet
      if (currentData.length > 0) {
        setModalData(currentData);
        setModalFilteredData(currentData);
        setModalLoading(false);
      } else {
        fetchModalData();
      }
    }
  }, [isModalOpen, dataType, displayMode, volumeData, signersData, fetchModalData]);
  
  // Enhanced tooltip handler for hovering over bars
  const handleBarHover = useCallback((e: React.MouseEvent, dataPoint: TradersCategoryChartPoint, category: string, value: number, isModal = false) => {
    const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
    if (!chartEl) return;
    
    const rect = chartEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setTooltip({
      visible: true,
      dataPoint,
      category,
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
  
  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      if (modalThrottleTimeoutRef.current) {
        clearTimeout(modalThrottleTimeoutRef.current);
      }
    };
  }, []);
  
  // Process data for brush component
  const processDataForBrush = useCallback((chartData: TradersCategoryChartPoint[]): { date: string; value: number }[] => {
    if (!chartData || chartData.length === 0) {
      return [];
    }
    
    // Sum up all category values for each month
    return chartData.map(item => {
      let totalValue = 0;
      traderCategories.forEach(category => {
        totalValue += item[category] || 0;
      });
      
      return {
        date: item.date.toISOString(),
        value: totalValue
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);
  
  // Get available categories for legend
  const getAvailableCategories = (data: TradersCategoryChartPoint[]) => {
    if (!data || data.length === 0) return [];
    
    return traderCategories.map(category => ({
      key: category,
      displayName: category,
      shape: 'square',
      color: getCategoryColor(category)
    }));
  };
  
  // Render the ViSX based chart 
  const renderChart = (isModal = false) => {
    console.log('[TradersCategoryChart] Rendering chart. Modal:', isModal);
    
    // Use the appropriate state variables based on modal or main view
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    const activeDataType = isModal ? modalDataType : dataType;
    const activeDisplayMode = isModal ? modalDisplayMode : displayMode;
    const activeData = isModal 
      ? (isModalBrushActive ? modalFilteredData : modalData) 
      : (dataType === 'volume' ? filteredVolumeData : filteredSignersData);
    
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
            title={formatMonth(tooltip.dataPoint.date)}
            items={
              // If tooltip has multiple items, show them all
              tooltip.items ? tooltip.items :
              // Otherwise use the single category/value from original tooltip
              [{
                color: getCategoryColor(tooltip.category),
                label: tooltip.category,
                value: activeDataType === 'volume' ? formatVolume(tooltip.value) : formatLargeNumber(tooltip.value),
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
          className="h-[85%] w-full overflow-hidden relative"
          onMouseLeave={handleMouseLeave}
          ref={isModal ? modalChartRef : chartContainerRef}
          onMouseMove={(e) => {
            const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
            if (!chartEl) return;
            
            const rect = chartEl.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Get chart margins and dimensions
            const margin = { top: 20, right: 20, bottom: 40, left: 60 };
            const innerWidth = rect.width - margin.left - margin.right;
            
            // Only process if within chart area (not in margins)
            if (mouseX < margin.left || mouseX > innerWidth + margin.left) return;
            
            // Get current data based on context
            const currentData = isModal 
              ? (isModalBrushActive ? modalFilteredData : modalData) 
              : (activeDataType === 'volume' ? filteredVolumeData : filteredSignersData);
              
            // Find the closest month based on x position
            const dataIndex = Math.min(
              currentData.length - 1,
              Math.max(0, Math.floor((mouseX - margin.left) / (innerWidth / currentData.length)))
            );
            
            if (dataIndex >= 0 && dataIndex < currentData.length) {
              const dataPoint = currentData[dataIndex];
              
              // Create items for all categories with non-zero values
              const tooltipItems = traderCategories
                .map(category => ({
                  color: getCategoryColor(category),
                  label: category,
                  value: activeDataType === 'volume' 
                    ? formatVolume(dataPoint[category] || 0) 
                    : formatLargeNumber(dataPoint[category] || 0),
                  rawValue: dataPoint[category] || 0,
                  shape: "square" as const
                }))
                .filter(item => item.rawValue > 0) // Only show non-zero values
                .sort((a, b) => b.rawValue - a.rawValue); // Sort by value, highest first
              
              setTooltip({
                visible: true,
                dataPoint,
                category: '', // Not needed when using items array
                value: 0,     // Not needed when using items array
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
              
              const margin = { top: 20, right: 20, bottom: 40, left: 60 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              
              if (innerWidth <= 0 || innerHeight <= 0) return null;
              
              // Setup scales
              const xScale = scaleBand<string>({
                domain: activeData.map(d => formatMonth(d.date)),
                padding: 0.3,
                range: [0, innerWidth]
              });
              
              // Find maximum value for y-axis
              let maxValue = 0;
              
              // For absolute values, calculate based on stacked totals
              if (activeDisplayMode === 'absolute') {
                activeData.forEach(d => {
                  let stackTotal = 0;
                  traderCategories.forEach(category => {
                    stackTotal += d[category] || 0;
                  });
                  maxValue = Math.max(maxValue, stackTotal);
                });
              } else {
                // For percentage mode, max is always 100%
                maxValue = 100;
              }
              
              const yScale = scaleLinear<number>({
                domain: [0, maxValue * 1.1], // Add 10% padding
                range: [innerHeight, 0],
                nice: true
              });
              
              const colorScale = scaleOrdinal<string, string>({
                domain: traderCategories,
                range: traderCategories.map(cat => getCategoryColor(cat))
              });
              
              // Prepare data for BarStack - convert to percentage if needed
              let processedData = [...activeData];
              
              if (activeDisplayMode === 'percent') {
                processedData = activeData.map(d => {
                  // Calculate total for this data point
                  let total = 0;
                  traderCategories.forEach(category => {
                    total += d[category] || 0;
                  });
                  
                  // Create a new data point with percentages
                  const percentagePoint: any = { month: d.month, date: d.date };
                  traderCategories.forEach(category => {
                    if (total > 0) {
                      percentagePoint[category] = ((d[category] || 0) / total) * 100;
                    } else {
                      percentagePoint[category] = 0;
                    }
                  });
                  
                  return percentagePoint;
                });
              }
              
              return (
                <svg width={width} height={height} className="overflow-visible">
                  <Group left={margin.left} top={margin.top}>
                    {/* Display active brush status */}
                    {(isModal ? isModalBrushActive : isBrushActive) && (
                      <text x={0} y={-8} fontSize={8} fill={colorScale(traderCategories[0])} textAnchor="start">
                        {`Filtered: ${activeData.length} item${activeData.length !== 1 ? 's' : ''}`}
                      </text>
                    )}
                  
                    {/* Grid lines */}
                    <GridRows 
                      scale={yScale} 
                      width={innerWidth} 
                      stroke={tradersCategoryChartColors.grid} 
                      strokeDasharray="2,3" 
                      strokeOpacity={0.5} 
                      numTicks={5} 
                    />
                    
                    {/* Stacked bars */}
                    <BarStack
                      data={processedData}
                      keys={traderCategories}
                      x={d => formatMonth(d.date)}
                      xScale={xScale}
                      yScale={yScale}
                      color={colorScale}
                      order="reverse" // Reverse order to match image (largest category at bottom)
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
                              opacity={tooltip.visible && tooltip.dataPoint?.month === bar.bar.data.month && tooltip.category === traderCategories[bar.index] ? 0.9 : 0.7}
                              rx={2}
                              onMouseEnter={(e) => handleBarHover(
                                e, 
                                bar.bar.data, 
                                traderCategories[bar.index], 
                                bar.bar.data[traderCategories[bar.index]],
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
                    
                    {/* X-axis (months) */}
                    <AxisBottom 
                      top={innerHeight} 
                      scale={xScale} 
                      stroke={tradersCategoryChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0}
                      hideZero={true}
                      tickLabelProps={() => ({ 
                        fill: tradersCategoryChartColors.tickLabels, 
                        fontSize: 10, 
                        textAnchor: 'middle', 
                        dy: '0.5em'
                      })}
                      numTicks={isModal ? 12 : Math.min(6, activeData.length)}
                    />
                    
                    {/* Y-axis */}
                    <AxisLeft 
                      scale={yScale}
                      stroke={tradersCategoryChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => {
                        if (activeDisplayMode === 'percent') {
                          return `${Number(value).toFixed(0)}%`;
                        } else {
                          return activeDataType === 'volume' 
                            ? formatVolume(Number(value)) 
                            : formatLargeNumber(Number(value));
                        }
                      }}
                      tickLabelProps={() => ({ 
                        fill: tradersCategoryChartColors.tickLabels, 
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
        
        {/* Brush component */}
        <div className="h-[15%] w-full mt-1">
          <BrushTimeScale
            data={processDataForBrush(
              isModal ? modalData : (dataType === 'volume' ? volumeData : signersData)
            )}
            isModal={isModal}
            activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
            onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
            onClearBrush={() => {
              if (isModal) {
                setModalBrushDomain(null);
                setIsModalBrushActive(false);
                setModalFilteredData(modalData);
              } else {
                setBrushDomain(null);
                setIsBrushActive(false);
                setFilteredVolumeData(volumeData);
                setFilteredSignersData(signersData);
              }
            }}
            getDate={(d) => d.date}
            getValue={(d) => d.value}
            lineColor={dataType === 'volume' ? "#60a5fa" : "#34d399"}
            margin={{ top: 5, right: 20, bottom: 10, left: 60 }}
          />
        </div>
      </div>
    );
  };
  
  // Render legend with enhanced styling
  const renderLegend = () => {
    return (
      <div className="flex flex-wrap gap-2 mt-2 max-h-[120px] overflow-y-auto
        [&::-webkit-scrollbar]:w-1.5 
        [&::-webkit-scrollbar-track]:bg-transparent 
        [&::-webkit-scrollbar-thumb]:bg-gray-700/40
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
        scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
        {traderCategories.map((category, index) => (
          <div key={`legend-${index}`} className="flex items-center">
            <div 
              className="w-3 h-3 mr-1 rounded-sm" 
              style={{ background: getCategoryColor(category) }}
            ></div>
            <span className="text-xs text-gray-300">{category}</span>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the modal content with enhanced UI and filters
  const renderModalContent = () => {
    // Use a safe fallback if modalFilteredData is empty
    const dataToUse = modalFilteredData.length > 0 ? modalFilteredData : modalData;
    const modalCategories = getAvailableCategories(dataToUse);
    
    return (
      <div className="p-4 w-full h-full">
        {/* Filters - horizontal row matching CostCapacityChart style */}
        <div className="flex items-center justify-between pl-1 py-0 mb-3">
          <div className="flex space-x-4 items-center">
            <DataTypeFilter 
              selectedDataType={modalDataType} 
              onChange={handleModalDataTypeChange}
              isCompact={true}
            />
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
              <div className="text-[10px] text-gray-400 mb-2">TRADER CATEGORIES</div>
              {!modalLoading && dataToUse.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[600px] w-[125px] overflow-y-auto
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {modalCategories.map((category, index) => (
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
                    <div className="w-2.5 h-2.5 bg-green-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
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
        title={dataType === 'volume' ? 'Trading Volume by Trader Category' : 'Traders by Category'}
        subtitle="Distribution of trading activity by trader lifetime volume"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
} 