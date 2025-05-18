"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TvlByDexDataPoint, fetchTvlByDexDataWithFallback } from '../../../../api/dex/tvl/tvlHistoryData';
import Modal from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { BarStack } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import { 
  colors, getColorByIndex, grid, axisLines, tickLabels 
} from '../../../../utils/chartColors';

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

// Chart colors for consistent styling
export const tvlByDexChartColors = {
  grid: grid,
  axisLines: axisLines,
  tickLabels: tickLabels,
};

// Export a function to get chart colors for external use
export const getTvlByDexChartColors = () => {
  return {
    primary: colors[0]
  };
};

interface TvlByDexChartProps {
  timeFilter: string;
  isModalOpen: boolean;
  onModalClose: () => void;
  onDataUpdate?: (data: { dex: string; tvl: number; percentage: number }[]) => void;
}

// Generate fallback color for any DEX not in the color map
const getFallbackColor = (dex: string | undefined | null) => {
  if (!dex) {
    return colors[9]; // Return gray as a default color when dex is undefined or null
  }
  
  try {
    // Simple hash function to generate consistent colors
    const hash = Array.from(String(dex)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return getColorByIndex(hash);
  } catch (error) {
    console.error('[TvlByDexChart] Error generating fallback color:', error);
    return colors[9]; // Return gray as fallback for any errors
  }
};

export default function TvlByDexChart({ 
  timeFilter, 
  isModalOpen, 
  onModalClose,
  onDataUpdate = () => {} 
}: TvlByDexChartProps) {
  // Main chart data states
  const [data, setData] = useState<TvlByDexDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uniqueDexes, setUniqueDexes] = useState<string[]>([]);
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [aggregatedData, setAggregatedData] = useState<Record<string, Record<string, number>>>({});
  
  // Color mapping state - maps DEX names to colors based on TVL
  const [dexColorMap, setDexColorMap] = useState<Record<string, string>>({});
  
  // Filtering and brushing states
  const [filteredData, setFilteredData] = useState<TvlByDexDataPoint[]>([]);
  const [filteredAggregatedData, setFilteredAggregatedData] = useState<Record<string, Record<string, number>>>({});
  const [filteredDexes, setFilteredDexes] = useState<string[]>([]);
  const [filteredDates, setFilteredDates] = useState<string[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific states
  const [modalData, setModalData] = useState<TvlByDexDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<string>(timeFilter);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<TvlByDexDataPoint[]>([]);
  
  // Enhanced tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    items: { dex: string; tvl: number; color: string }[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    date: '',
    items: []
  });
  
  // Add refs for throttling brush updates
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // Get color for a DEX from the dynamic color map
  const getDexColor = (dex: string | undefined | null) => {
    if (!dex) return colors[9];
    return dexColorMap[dex] || getFallbackColor(dex);
  };
  
  // Debug element dimensions when rendered
  useEffect(() => {
    if (chartContainerRef.current) {
      const { width, height } = chartContainerRef.current.getBoundingClientRect();
      console.log('[TvlByDexChart] Container dimensions:', { width, height });
    } else {
      console.warn('[TvlByDexChart] Container ref not available');
    }
  }, []);
  
  // Fetch data from the API with enhanced loading states
  const fetchData = useCallback(async () => {
    console.log('[TvlByDexChart] Starting to fetch data with timeFilter:', timeFilter);
    setIsLoading(true);
    setError(null);
    try {
      const fetchedData = await fetchTvlByDexDataWithFallback();
      console.log('[TvlByDexChart] Fetched data:', fetchedData.length, 'points');
      
      if (!fetchedData || fetchedData.length === 0) {
        console.warn('[TvlByDexChart] No data returned from API or fallback');
        setError('No data available from API or fallback');
        setData([]);
        setFilteredData([]);
        setIsLoading(false);
        return;
      }
      
      // Filter by time period if needed
      const filteredData = applyTimeFilter(fetchedData, timeFilter);
      console.log('[TvlByDexChart] After time filter:', filteredData.length, 'points');
      
      if (filteredData.length === 0) {
        console.warn('[TvlByDexChart] No data after time filtering');
        // Instead of showing error, use all data if time filter gives empty result
        processAndSetData(fetchedData);
      } else {
        // Use filtered data
        processAndSetData(filteredData);
      }
    } catch (err) {
      console.error('[TvlByDexChart] Error fetching data:', err);
      setError('Failed to load TVL by DEX data: ' + (err instanceof Error ? err.message : String(err)));
      setData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, [timeFilter]);
  
  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    console.log('[TvlByDexChart] Starting to fetch modal data with timeFilter:', modalTimeFilter);
    setModalLoading(true);
    setModalError(null);
    try {
      const fetchedData = await fetchTvlByDexDataWithFallback();
      console.log('[TvlByDexChart] Fetched modal data:', fetchedData.length, 'points');
      
      if (!fetchedData || fetchedData.length === 0) {
        console.warn('[TvlByDexChart] No modal data returned from API or fallback');
        setModalError('No data available from API or fallback');
        setModalData([]);
        setModalFilteredData([]);
        setModalLoading(false);
        return;
      }
      
      // Filter by time period if needed
      const filteredData = applyTimeFilter(fetchedData, modalTimeFilter);
      console.log('[TvlByDexChart] After modal time filter:', filteredData.length, 'points');
      
      if (filteredData.length === 0) {
        console.warn('[TvlByDexChart] No data after modal time filtering');
        // Instead of showing error, use all data if time filter gives empty result
        setModalData(fetchedData);
        setModalFilteredData(fetchedData);
      } else {
        // Use filtered data
        setModalData(filteredData);
        setModalFilteredData(filteredData);
      }
      
      // Set brush as active but don't set a specific domain
      setIsModalBrushActive(true);
      setModalBrushDomain(null);
    } catch (err) {
      console.error('[TvlByDexChart] Error fetching modal data:', err);
      setModalError('Failed to load TVL by DEX data: ' + (err instanceof Error ? err.message : String(err)));
      setModalData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  }, [modalTimeFilter]);
  
  // Process and set data with aggregation
  const processAndSetData = useCallback((dataToProcess: TvlByDexDataPoint[]) => {
    if (!dataToProcess || dataToProcess.length === 0) {
      setData([]);
      setFilteredData([]);
      setUniqueDexes([]);
      setUniqueDates([]);
      setAggregatedData({});
      setFilteredAggregatedData({});
      setDexColorMap({});
      return;
    }
    
    // Store the raw data
    setData(dataToProcess);
    setFilteredData(dataToProcess);
        
    // Extract unique DEXes and dates
    const dexes = Array.from(new Set(dataToProcess.map(item => item.dex))).sort();
    const dates = Array.from(new Set(dataToProcess.map(item => item.date))).sort();
        
    console.log('[TvlByDexChart] Unique DEXes:', dexes.length);
    console.log('[TvlByDexChart] Unique dates:', dates.length);
        
    setUniqueDexes(dexes);
    setUniqueDates(dates);
    setFilteredDexes(dexes);
    setFilteredDates(dates);
        
    // Aggregate data by date and dex for easier chart rendering
    const aggregated: Record<string, Record<string, number>> = {};
        
    // Initialize with 0 values for all combinations
    dates.forEach(date => {
      aggregated[date] = {};
      dexes.forEach(dex => {
        aggregated[date][dex] = 0;
      });
    });
        
    // Fill in actual values
    dataToProcess.forEach(item => {
      aggregated[item.date][item.dex] = item.tvl;
    });
        
    setAggregatedData(aggregated);
    setFilteredAggregatedData(aggregated);
    
    // Calculate total TVL per DEX to sort by value
    const tvlByDex: Record<string, number> = {};
    dataToProcess.forEach(item => {
      tvlByDex[item.dex] = (tvlByDex[item.dex] || 0) + item.tvl;
    });
    
    // Sort DEXes by total TVL (highest first)
    const sortedDexes = dexes
      .map(dex => ({ name: dex, tvl: tvlByDex[dex] || 0 }))
      .sort((a, b) => b.tvl - a.tvl)
      .map(item => item.name);
    
    // Create color map - assign colors based on TVL ranking
    const newColorMap: Record<string, string> = {};
    sortedDexes.forEach((dex, index) => {
      // Use first set of colors from our palette (wrap around if needed)
      newColorMap[dex] = colors[index % colors.length];
    });
    
    // Set the new color map
    setDexColorMap(newColorMap);
    
    // Set brush as active but don't set a specific domain
    setIsBrushActive(true);
    setBrushDomain(null);
    
    // Prepare data for the parent component if callback is provided
    if (onDataUpdate) {
      const totalTvl = dataToProcess.reduce((sum, item) => sum + item.tvl, 0);
      
      // Group TVL by DEX
      const tvlByDex: Record<string, number> = {};
      dataToProcess.forEach(item => {
        tvlByDex[item.dex] = (tvlByDex[item.dex] || 0) + item.tvl;
      });
      
      // Convert to array with percentages
      const dexData = Object.entries(tvlByDex)
        .map(([dex, tvl]) => ({
          dex,
          tvl,
          percentage: totalTvl > 0 ? (tvl / totalTvl) * 100 : 0
        }))
        .sort((a, b) => b.tvl - a.tvl);
      
      onDataUpdate(dexData);
    }
  }, [onDataUpdate]);
  
  // Apply time filter to the data
  const applyTimeFilter = (data: TvlByDexDataPoint[], filter: string): TvlByDexDataPoint[] => {
    if (!data || data.length === 0) return [];
    
    // Sort data by date to ensure we have a chronological order
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (filter) {
      case 'W':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'Q':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        // Default to 1 week
        cutoffDate.setDate(now.getDate() - 7);
    }
    
    console.log('[TvlByDexChart] Applying time filter:', filter, 'cutoff date:', cutoffDate.toISOString().split('T')[0]);
    
    return sortedData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });
  };
  
  // Process data for brush component
  const processDataForBrush = useCallback((chartData: TvlByDexDataPoint[]): {date: string; tvl: number}[] => {
    if (!chartData || chartData.length === 0) {
      return [];
    }
    
    // Group by date to sum up all TVL values for each date
    const tvlByDate: Record<string, number> = {};
    chartData.forEach(item => {
      tvlByDate[item.date] = (tvlByDate[item.date] || 0) + item.tvl;
    });
    
    // Convert to array format
    return Object.entries(tvlByDate)
      .map(([date, tvl]) => ({ date, tvl }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);
  
  // Handle brush change with throttling
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
        setFilteredData(data);
        setFilteredDates(uniqueDates);
        setFilteredDexes(uniqueDexes);
        setFilteredAggregatedData(aggregatedData);
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
      const filtered = data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
      
      if (filtered.length === 0) {
        // Fallback to all data if no dates are in range
        setFilteredData(data);
        setFilteredDates(uniqueDates);
        setFilteredDexes(uniqueDexes);
        setFilteredAggregatedData(aggregatedData);
      } else {
        // Set filtered data and recalculate aggregations
        setFilteredData(filtered);
        
        // Extract filtered unique dates and DEXes
        const filteredUniquesDates = Array.from(new Set(filtered.map(item => item.date))).sort();
        const filteredUniquesDexes = Array.from(new Set(filtered.map(item => item.dex))).sort();
        
        setFilteredDates(filteredUniquesDates);
        setFilteredDexes(filteredUniquesDexes);
        
        // Recreate aggregated data for filtered dataset
        const filteredAggregated: Record<string, Record<string, number>> = {};
        
        // Initialize with 0 values for all combinations
        filteredUniquesDates.forEach(date => {
          filteredAggregated[date] = {};
          filteredUniquesDexes.forEach(dex => {
            filteredAggregated[date][dex] = 0;
          });
        });
        
        // Fill in actual values
        filtered.forEach(item => {
          filteredAggregated[item.date][item.dex] = item.tvl;
        });
        
        setFilteredAggregatedData(filteredAggregated);
        
        // Update parent component with filtered data if callback is provided
        if (onDataUpdate) {
          const totalTvl = filtered.reduce((sum, item) => sum + item.tvl, 0);
          
          // Group TVL by DEX
          const tvlByDex: Record<string, number> = {};
          filtered.forEach(item => {
            tvlByDex[item.dex] = (tvlByDex[item.dex] || 0) + item.tvl;
          });
          
          // Convert to array with percentages
          const dexData = Object.entries(tvlByDex)
            .map(([dex, tvl]) => ({
              dex,
              tvl,
              percentage: totalTvl > 0 ? (tvl / totalTvl) * 100 : 0
            }))
            .sort((a, b) => b.tvl - a.tvl);
          
          onDataUpdate(dexData);
        }
      }
      
      // Set timeout to allow next update
      throttleTimeoutRef.current = setTimeout(() => {
        canUpdateFilteredDataRef.current = true;
        throttleTimeoutRef.current = null;
      }, 100);
    }
  }, [isBrushActive, data, uniqueDates, uniqueDexes, aggregatedData, onDataUpdate]);
  
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
      const filtered = modalData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
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
  
  // Enhanced tooltip handler for hovering over bars
  const handleBarHover = useCallback((e: React.MouseEvent, date: string, dex: string, tvl: number, isModal: boolean = false) => {
    const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
    if (!chartEl) return;
    
    const rect = chartEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setTooltip({
      visible: true,
      x: mouseX,
      y: mouseY,
      date,
      items: [{ dex, tvl, color: getDexColor(dex) }]
    });
  }, []);
  
  // Enhanced tooltip handler for hovering over date
  const handleDateHover = useCallback((e: React.MouseEvent, date: string, currentData: Record<string, Record<string, number>>, dexList: string[], isModal: boolean = false) => {
    const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
    if (!chartEl) return;
    
    const rect = chartEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const items = dexList
      .map(dex => ({
        dex,
        tvl: currentData[date]?.[dex] || 0,
        color: getDexColor(dex)
      }))
      .filter(item => item.tvl > 0)
      .sort((a, b) => b.tvl - a.tvl);
    
    setTooltip({
      visible: true,
      x: mouseX,
      y: mouseY,
      date,
      items
    });
  }, []);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Fetch data when component mounts or timeFilter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle modal-related effects
  useEffect(() => {
    if (isModalOpen) {
      console.log("Modal opened - initializing with data");
      setModalTimeFilter(timeFilter);
      setModalData(data);
      setModalFilteredData(filteredData);
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      setModalLoading(false); // Initialize as not loading if we already have data
      
      if (data.length === 0) {
        fetchModalData();
      }
    }
  }, [isModalOpen, timeFilter, data, filteredData, brushDomain, isBrushActive, fetchModalData]);
  
  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: string) => {
    console.log('Modal time filter changed to:', newFilter);
    setModalTimeFilter(newFilter);
  }, []);

  // Effect to fetch modal data when time filter changes
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [modalTimeFilter, isModalOpen, fetchModalData]);
  
  // Format currency values
  const formatCurrency = (value: number | undefined | null): string => {
    // Handle undefined, null, or NaN values
    if (value === undefined || value === null || isNaN(value)) {
      return '$0';
    }
    
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };
  
  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Render the ViSX based chart 
  const renderChart = (isModal = false) => {
    console.log('[TvlByDexChart] Rendering chart. Modal:', isModal);
    
    // Use the appropriate state variables based on modal or main view
    const activeLoading = isModal ? modalLoading : isLoading;
    const activeError = isModal ? modalError : error;
    const activeData = isModal 
      ? (isModalBrushActive ? modalFilteredData : modalData) 
      : (isBrushActive ? filteredData : data);
    const activeDates = isModal 
      ? [...new Set(activeData.map(item => item.date))].sort()
      : filteredDates;
    const activeDexes = isModal
      ? [...new Set(activeData.map(item => item.dex))].sort()
      : filteredDexes;
    const activeAggregatedData = isModal 
      ? {} // We'll compute this on-the-fly for modal
      : filteredAggregatedData;
      
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
    
    // Handle case where we don't have enough data to render
    if (activeDates.length === 0 || activeDexes.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-yellow-500 text-sm">
            Unable to process data correctly. Dates: {activeDates.length}, DEXes: {activeDexes.length}
          </div>
        </div>
      );
    }
    
    // Prepare aggregated data for the modal if needed
    const modalAggregatedData: Record<string, Record<string, number>> = {};
    if (isModal) {
      activeDates.forEach(date => {
        modalAggregatedData[date] = {};
        activeDexes.forEach(dex => {
          modalAggregatedData[date][dex] = 0;
        });
      });
      
      activeData.forEach(item => {
        if (modalAggregatedData[item.date]) {
          modalAggregatedData[item.date][item.dex] = item.tvl;
        }
      });
    }
    
    // Use the appropriate aggregated data
    const actualAggregatedData = isModal ? modalAggregatedData : activeAggregatedData;
    
    // Prepare data for BarStack component
    const processedData = activeDates.map(date => {
      const dataPoint: any = { date };
      activeDexes.forEach(dex => {
        dataPoint[dex] = actualAggregatedData[date]?.[dex] || 0;
      });
      return dataPoint;
    });
    
    return (
      <div className="flex flex-col h-full w-full" ref={isModal ? modalChartRef : chartContainerRef}>
        {/* Tooltip */}
        {tooltip.visible && tooltip.items.length > 0 && (
          <ChartTooltip
            title={formatDate(tooltip.date)}
            items={tooltip.items.map(item => ({
              color: item.color,
              label: item.dex,
              value: formatCurrency(item.tvl),
              shape: 'square'
            }))}
            top={tooltip.y}
            left={tooltip.x}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div 
          className="h-[85%] w-full overflow-hidden relative"
          onMouseLeave={handleMouseLeave}
          onMouseMove={(e) => {
            // Handle chart-wide hover to show tooltip for all DEXes
            const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
            if (!chartEl) return;
            
            const rect = chartEl.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Get current data based on context
            const currentData = isModal 
              ? (isModalBrushActive ? modalFilteredData : modalData) 
              : (isBrushActive ? filteredData : data);
              
            const currentDexes = isModal 
              ? [...new Set(currentData.map(item => item.dex))].sort()
              : filteredDexes;
              
            const currentAggregatedData = isModal 
              ? {} // We'll compute this on-the-fly for modal
              : filteredAggregatedData;
            
            const activeDatesList = isModal 
              ? [...new Set(currentData.map(item => item.date))].sort()
              : filteredDates;
            
            if (activeDatesList.length === 0) return;
            
            // Calculate the current date based on mouse position
            const margin = { left: 60, right: 20 };
            const innerWidth = rect.width - margin.left - margin.right;
            
            // Only process if mouse is in chart area
            if (mouseX < margin.left || mouseX > innerWidth + margin.left) return;
            
            // Find the date based on mouse X position
            const dateIndex = Math.min(
              activeDatesList.length - 1,
              Math.max(0, Math.floor((mouseX - margin.left) / (innerWidth / activeDatesList.length)))
            );
            const currentDate = activeDatesList[dateIndex];
            
            // Prepare per-DEX data for the tooltip
            let dateAggregatedData: Record<string, number> = {};
            
            // For modal data, calculate on-the-fly
            if (isModal) {
              currentDexes.forEach(dex => {
                const dexData = currentData.filter(item => item.dex === dex && item.date === currentDate);
                dateAggregatedData[dex] = dexData.reduce((sum, item) => sum + item.tvl, 0);
              });
            } else {
              // Use pre-computed aggregated data for main chart
              dateAggregatedData = filteredAggregatedData[currentDate] || {};
            }
            
            // Create tooltip items for all DEXes at this date point
            const tooltipItems = currentDexes
              .map(dex => ({
                dex,
                tvl: dateAggregatedData[dex] || 0,
                color: getDexColor(dex)
              }))
              .filter(item => item.tvl > 0)
              .sort((a, b) => b.tvl - a.tvl);
            
            // Update tooltip
            setTooltip({
              visible: true,
              x: mouseX,
              y: mouseY,
              date: currentDate,
              items: tooltipItems
            });
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
                domain: activeDates,
                padding: 0.3,
                range: [0, innerWidth]
              });
    
              // Find max TVL for y-axis scale
              let maxTvl = 0;
              activeDates.forEach(date => {
                let totalTvl = 0;
                activeDexes.forEach(dex => {
                  totalTvl += actualAggregatedData[date]?.[dex] || 0;
                });
                maxTvl = Math.max(maxTvl, totalTvl);
              });
    
              // Ensure maxTvl is not zero to avoid division by zero
              if (maxTvl === 0) maxTvl = 1;
              
              const yScale = scaleLinear<number>({
                domain: [0, maxTvl * 1.1], // Add 10% padding at the top
                range: [innerHeight, 0],
                nice: true
              });
              
              const colorScale = scaleOrdinal<string, string>({
                domain: activeDexes,
                range: activeDexes.map(dex => getDexColor(dex))
              });
              
              return (
                <svg width={width} height={height} className="overflow-visible">
                  <Group left={margin.left} top={margin.top}>
                    <GridRows 
                      scale={yScale} 
                      width={innerWidth} 
                      stroke={tvlByDexChartColors.grid} 
                      strokeDasharray="2,3" 
                      strokeOpacity={0.5} 
                      numTicks={5} 
                    />
                    
                    {/* Stacked bars */}
                    <BarStack
                      data={processedData}
                      keys={activeDexes}
                      x={d => d.date}
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
                              opacity={tooltip.visible && tooltip.date === bar.bar.data.date ? 0.9 : 0.7}
                              rx={2}
                              onMouseEnter={(e) => handleBarHover(
                                e, 
                                bar.bar.data.date, 
                                activeDexes[bar.index], 
                                bar.bar.data[activeDexes[bar.index]], 
                                isModal
                              )}
                              onMouseMove={(e) => {
                                const chartEl = isModal ? modalChartRef.current : chartContainerRef.current;
                                if (!chartEl) return;
                                
                                const rect = chartEl.getBoundingClientRect();
                                const mouseX = e.clientX - rect.left;
                                const mouseY = e.clientY - rect.top;
                                
                                setTooltip(prev => ({ ...prev, x: mouseX, y: mouseY }));
                              }}
                            />
                          ))
                        )
                      }
                    </BarStack>
                    
                    {/* X-axis (dates) */}
                    <AxisBottom 
                      top={innerHeight} 
                      scale={xScale} 
                      stroke={tvlByDexChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0}
                      hideZero={true}
                      tickLabelProps={() => ({ 
                        fill: tvlByDexChartColors.tickLabels, 
                        fontSize: 10, 
                        textAnchor: 'middle', 
                        dy: '0.5em'
                      })}
                      tickFormat={(d) => formatDate(d.toString())}
                      numTicks={Math.min(6, activeDates.length)}
                    />
                    
                    {/* Y-axis (TVL) */}
                    <AxisLeft 
                      scale={yScale}
                      stroke={tvlByDexChartColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => formatCurrency(Number(value))}
                      tickLabelProps={() => ({ 
                        fill: tvlByDexChartColors.tickLabels, 
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
            data={processDataForBrush(isModal ? modalData : data)}
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
                setFilteredData(data);
                setFilteredDates(uniqueDates);
                setFilteredDexes(uniqueDexes);
                setFilteredAggregatedData(aggregatedData);
              }
            }}
            getDate={(d) => d.date}
            getValue={(d) => d.tvl}
            lineColor={colors[0]}
            margin={{ top: 5, right: 20, bottom: 10, left: 60 }}
          />
        </div>
      </div>
    );
  };
  
  // Render legend with enhanced styling
  const renderLegend = (dexes: string[] = uniqueDexes) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2 max-h-[120px] overflow-y-auto
        [&::-webkit-scrollbar]:w-1.5 
        [&::-webkit-scrollbar-track]:bg-transparent 
        [&::-webkit-scrollbar-thumb]:bg-gray-700/40
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
        scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
        {dexes.map((dex, index) => (
          <div key={`legend-${index}`} className="flex items-center">
            <div 
              className="w-3 h-3 mr-1 rounded-sm" 
              style={{ background: getDexColor(dex) }}
            ></div>
            <span className="text-xs text-gray-300">{dex}</span>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the modal content with enhanced UI
  const renderModalContent = () => {
    // Calculate DEX data for the modal
    const modalDexes = [...new Set(
      (isModalBrushActive ? modalFilteredData : modalData).map(item => item.dex)
    )].sort();
    
    return (
      <div className="p-4 w-full h-full">
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
              {!modalLoading && modalFilteredData.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[600px] w-[125px] overflow-y-auto
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {modalDexes.map((dex, index) => (
                    <div key={`modal-legend-${index}`} className="flex items-start">
                      <div 
                        className="w-2.5 h-2.5 mr-1.5 rounded-sm mt-0.5"
                        style={{ background: getDexColor(dex) }}
                      ></div>
                      <span className="text-[11px] text-gray-300">
                        {dex}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Loading states */}
                  <div className="flex items-start">
                    <div className="w-2.5 h-2.5 bg-purple-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                    <span className="text-[11px] text-gray-300">Loading...</span>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2.5 h-2.5 bg-blue-400 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
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
      {renderChart(false)}
      
      {/* Modal for expanded view */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="TVL by DEX" subtitle="Analysis of total value locked across Solana DEXes">
        {renderModalContent()}
      </Modal>
    </div>
  );
} 