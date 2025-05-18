"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StackedBarDataPoint, transactionCategories, fetchTradersStackedData, formatLargeNumber, formatVolume, formatMonth } from '../../../../api/dex/traders/tradersStackedData';
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
import { blue, green, grid, axisLines, tickLabels, transactionCategoryColors, colors } from '../../../../utils/chartColors';

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

// Create a properly typed categoryColors object from transactionCategoryColors
const categoryColors: Record<string, string> = { ...transactionCategoryColors };

// Chart colors for styling
export const tradersStackedBarChartColors = {
  grid: grid,
  axisLines: axisLines,
  tickLabels: tickLabels,
};

// Export a function to get chart colors for external use
export const getTradersStackedBarChartColors = () => {
  return {
    primary: colors[0], // blue (1st color)
    secondary: colors[2], // green (3rd color)
  };
};

interface TradersStackedBarChartProps {
  dataType: DataType;
  onDataTypeChange: (type: DataType) => void;
  isModalOpen: boolean;
  onModalClose: () => void;
}

export default function TradersStackedBarChart({ 
  dataType,
  onDataTypeChange,
  isModalOpen, 
  onModalClose
}: TradersStackedBarChartProps) {
  // State for chart data
  const [volumeData, setVolumeData] = useState<StackedBarDataPoint[]>([]);
  const [signersData, setSignersData] = useState<StackedBarDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Color mapping state - maps category names to colors based on values
  const [categoryColorMap, setCategoryColorMap] = useState<Record<string, string>>({});
  
  // Filtering and brushing states
  const [filteredVolumeData, setFilteredVolumeData] = useState<StackedBarDataPoint[]>([]);
  const [filteredSignersData, setFilteredSignersData] = useState<StackedBarDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific states
  const [modalData, setModalData] = useState<StackedBarDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<StackedBarDataPoint[]>([]);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as StackedBarDataPoint | null,
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
  
  // Debug element dimensions when rendered
  useEffect(() => {
    if (chartContainerRef.current) {
      const { width, height } = chartContainerRef.current.getBoundingClientRect();
      console.log('[TradersStackedBarChart] Container dimensions:', { width, height });
    } else {
      console.warn('[TradersStackedBarChart] Container ref not available');
    }
  }, []);
  
  // Get color for a category from the dynamic color map
  const getCategoryColor = (category: string) => {
    return categoryColorMap[category] || categoryColors[category] || '#6b7280';
  };
  
  // Fetch data from the API
  const fetchData = useCallback(async () => {
    console.log('[TradersStackedBarChart] Starting to fetch data');
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTradersStackedData();
      console.log('[TradersStackedBarChart] Fetched data:', data);
      
      if (!data.volumeData || data.volumeData.length === 0 || !data.signersData || data.signersData.length === 0) {
        console.warn('[TradersStackedBarChart] No data returned from API or fallback');
        setError('No data available from API or fallback');
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
      console.error('[TradersStackedBarChart] Error fetching data:', err);
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
    volumeData: StackedBarDataPoint[], 
    signersData: StackedBarDataPoint[],
    currentDataType: DataType
  ) => {
    const relevantData = currentDataType === 'volume' ? volumeData : signersData;
    
    // Calculate total values per category
    const categoryTotals: Record<string, number> = {};
    
    transactionCategories.forEach(category => {
      categoryTotals[category] = 0;
      
      relevantData.forEach(dataPoint => {
        categoryTotals[category] += dataPoint[category] || 0;
      });
    });
    
    // Sort categories by total values (highest first)
    const sortedCategories = transactionCategories
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
    console.log('[TradersStackedBarChart] Starting to fetch modal data');
    setModalLoading(true);
    setModalError(null);
    try {
      const data = await fetchTradersStackedData();
      console.log('[TradersStackedBarChart] Fetched modal data');
      
      if (!data.volumeData || data.volumeData.length === 0 || !data.signersData || data.signersData.length === 0) {
        console.warn('[TradersStackedBarChart] No modal data returned from API or fallback');
        setModalError('No data available from API or fallback');
        setModalData([]);
        setModalFilteredData([]);
      } else {
        // Use appropriate data based on type
        const modalData = dataType === 'volume' ? data.volumeData : data.signersData;
        const sortedModalData = [...modalData].sort((a, b) => a.date.getTime() - b.date.getTime());
        
        setModalData(sortedModalData);
        setModalFilteredData(sortedModalData);
        
        // Set brush as active but don't set a specific domain
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      }
    } catch (err) {
      console.error('[TradersStackedBarChart] Error fetching modal data:', err);
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
  }, [dataType]);
  
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
  
  // Initialize modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      console.log("Modal opened - initializing with data");
      const currentData = dataType === 'volume' ? filteredVolumeData : filteredSignersData;
      setModalData(currentData);
      setModalFilteredData(currentData);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      setModalLoading(false); // Initialize as not loading if we already have data
      
      if (volumeData.length === 0 || signersData.length === 0) {
        fetchModalData();
      }
    }
  }, [isModalOpen, dataType, filteredVolumeData, filteredSignersData, brushDomain, isBrushActive, volumeData, signersData, fetchModalData]);
  
  // Handle modal time filter change
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [dataType, isModalOpen, fetchModalData]);
  
  // Enhanced tooltip handler for hovering over bars
  const handleBarHover = useCallback((e: React.MouseEvent, dataPoint: StackedBarDataPoint, category: string, value: number, isModal = false) => {
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
  const processDataForBrush = useCallback((chartData: StackedBarDataPoint[]): { date: string; value: number }[] => {
    if (!chartData || chartData.length === 0) {
      return [];
    }
    
    // Sum up all category values for each month
    return chartData.map(item => {
      let totalValue = 0;
      transactionCategories.forEach(category => {
        totalValue += item[category] || 0;
      });
      
      return {
        date: item.date.toISOString(),
        value: totalValue
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);
  
  // Get available categories for legend
  const getAvailableCategories = (data: StackedBarDataPoint[]) => {
    if (!data || data.length === 0) return [];
    
    return transactionCategories.map(category => ({
      key: category,
      displayName: category,
      shape: 'square',
      color: getCategoryColor(category)
    }));
  };
  
  // Render the ViSX based chart 
  const renderChart = (isModal = false) => {
    console.log('[TradersStackedBarChart] Rendering chart. Modal:', isModal);
    
    // Use the appropriate state variables based on modal or main view
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
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
              tooltip.items && tooltip.items.length > 0 ? tooltip.items :
              // Otherwise use the single category/value from original tooltip
              [{
                color: getCategoryColor(tooltip.category),
                label: tooltip.category,
                value: dataType === 'volume' ? formatVolume(tooltip.value) : formatLargeNumber(tooltip.value),
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
              : (dataType === 'volume' ? filteredVolumeData : filteredSignersData);
              
            // Find the closest month based on x position
            const dataIndex = Math.min(
              currentData.length - 1,
              Math.max(0, Math.floor((mouseX - margin.left) / (innerWidth / currentData.length)))
            );
            
            if (dataIndex >= 0 && dataIndex < currentData.length) {
              const dataPoint = currentData[dataIndex];
              
              // Create items for all categories with non-zero values
              const tooltipItems = transactionCategories
                .map(category => ({
                  color: getCategoryColor(category),
                  label: category,
                  value: dataType === 'volume' 
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
                domain: activeData.map(d => d.month),
                padding: 0.3,
                range: [0, innerWidth]
              });
              
              // Find maximum value for y-axis
              let maxValue = 0;
              activeData.forEach(d => {
                let stackTotal = 0;
                transactionCategories.forEach(category => {
                  stackTotal += d[category] || 0;
                });
                maxValue = Math.max(maxValue, stackTotal);
              });
              
              const yScale = scaleLinear<number>({
                domain: [0, maxValue * 1.1], // Add 10% padding
                range: [innerHeight, 0],
                nice: true
              });
              
              const colorScale = scaleOrdinal<string, string>({
                domain: transactionCategories,
                range: transactionCategories.map(cat => getCategoryColor(cat))
              });
              
              return (
                <svg width={width} height={height} className="overflow-visible">
                  <Group left={margin.left} top={margin.top}>
                    {/* Display active brush status */}
                    {(isModal ? isModalBrushActive : isBrushActive) && (
                      <text x={0} y={-8} fontSize={8} fill={colorScale(transactionCategories[0])} textAnchor="start">
                        {`Filtered: ${activeData.length} item${activeData.length !== 1 ? 's' : ''}`}
                      </text>
                    )}
                  
                    {/* Grid lines */}
                    <GridRows 
                      scale={yScale} 
                      width={innerWidth} 
                      stroke={tradersStackedBarChartColors.grid} 
                      strokeDasharray="2,3" 
                      strokeOpacity={0.5} 
                      numTicks={5} 
                    />
                    
                    {/* Stacked bars */}
                    <BarStack
                      data={activeData}
                      keys={transactionCategories}
                      x={d => d.month}
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
                              opacity={tooltip.visible && tooltip.dataPoint?.month === bar.bar.data.month && tooltip.category === transactionCategories[bar.index] ? 0.9 : 0.7}
                              rx={2}
                              onMouseEnter={(e) => handleBarHover(
                                e, 
                                bar.bar.data, 
                                transactionCategories[bar.index], 
                                bar.bar.data[transactionCategories[bar.index]],
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
                      stroke={tradersStackedBarChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0}
                      hideZero={true}
                      tickLabelProps={() => ({ 
                        fill: tradersStackedBarChartColors.tickLabels, 
                        fontSize: 10, 
                        textAnchor: 'middle', 
                        dy: '0.5em'
                      })}
                      tickFormat={(monthStr) => {
                        const date = new Date(monthStr);
                        return formatMonth(date);
                      }}
                      numTicks={isModal ? 12 : Math.min(6, activeData.length)}
                    />
                    
                    {/* Y-axis */}
                    <AxisLeft 
                      scale={yScale}
                      stroke={tradersStackedBarChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => {
                        return dataType === 'volume' 
                          ? formatVolume(Number(value)) 
                          : formatLargeNumber(Number(value));
                      }}
                      tickLabelProps={() => ({ 
                        fill: tradersStackedBarChartColors.tickLabels, 
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
        {transactionCategories.map((category, index) => (
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
  
  // Render the modal content with enhanced UI
  const renderModalContent = () => {
    const modalCategories = getAvailableCategories(modalData);
    
    return (
      <div className="p-4 w-full h-full">
        {/* Controls Row */}
        <div className="flex justify-between items-center mb-3">
          <DataTypeFilter 
            selectedDataType={dataType} 
            onChange={onDataTypeChange} 
          />
        </div>
        
        {/* Horizontal divider */}
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
              {!modalLoading && modalData.length > 0 ? (
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
      {/* Header with title only - data type filter now added in parent */}
      
      
      {/* Chart */}
      <div className="h-[calc(100%)]">
        {renderChart(false)}
      </div>
      
      {/* Modal for expanded view */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title={dataType === 'volume' ? 'DEX Trading Volume by Transaction Frequency' : 'DEX Traders by Transaction Frequency'}
        subtitle="Analyzing trading patterns across different user activity levels"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
} 