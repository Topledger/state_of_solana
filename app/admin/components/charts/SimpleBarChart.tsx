import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar } from '@visx/shape';
import { ChartConfig, YAxisConfig } from '../../types';
import { blue, getColorByIndex, allColorsArray } from '@/app/utils/chartColors';
import ChartTooltip from '@/app/components/shared/ChartTooltip';
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import Loader from "@/app/components/shared/Loader";
import LegendItem from "@/app/components/shared/LegendItem";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
import Modal from '@/app/components/shared/Modal';
import TimeFilterSelector from '@/app/components/shared/filters/TimeFilter';
import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';

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

interface SimpleBarChartProps {
  chartConfig: ChartConfig;
  data: any[];
  width?: number;
  height?: number;
  isExpanded?: boolean;
  onCloseExpanded?: () => void;
  colorMap?: Record<string, string>;
  filterValues?: Record<string, string>;
  yAxisUnit?: string;
}

interface DateBrushPoint {
  date: Date;
  value: number;
}

interface ChartDataItem {
  [key: string]: any;
}

type ColorResult = string | Record<string, string>;

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ 
  chartConfig, 
  data, 
  width = 500, 
  height = 300,
  isExpanded = false,
  onCloseExpanded,
  colorMap: externalColorMap,
  filterValues,
  yAxisUnit
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legendItems, setLegendItems] = useState<Array<{id: string, label: string, color: string, value?: number}>>([]);
  
  // Brush state
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Filtered data based on brush
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Modal-specific filtered data
  const [modalFilteredData, setModalFilteredData] = useState<any[]>([]);

  // Update tooltip state definition
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    key: string;
    items: { label: string, value: string | number, color: string, shape?: 'circle' | 'square' }[];
  }>({
    visible: false,
    left: 0,
    top: 0,
    key: '',
    items: []
  });

  // Modal brush state
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Add state for filter values in modal
  const [modalFilterValues, setModalFilterValues] = useState<Record<string, string>>(filterValues || {});
  
  // Add state to track client-side rendering
  const [isClient, setIsClient] = useState(false);

  // Extract mapping fields
  const xField = chartConfig.dataMapping.xAxis;
  const yField = chartConfig.dataMapping.yAxis;
  
  // For type safety, ensure we use string values for indexing
  const xKey = typeof xField === 'string' ? xField : xField[0];
  
  // Helper function to get field from YAxisConfig or use string directly
  const getYAxisField = useCallback((field: string | YAxisConfig): string => {
    return typeof field === 'string' ? field : field.field;
  }, []);
  
  // Determine if we have multiple Y-axis fields
  const isMultiSeries = useMemo(() => Array.isArray(yField) && yField.length > 1, [yField]);
  
  // Get array of y-fields
  const yFields = useMemo(() => {
    if (typeof yField === 'string') {
      return [yField];
    } else if (Array.isArray(yField)) {
      return yField.map(f => getYAxisField(f));
    }
    return [];
  }, [yField, getYAxisField]);
  
  // Ensure yKey is always a string (first y-field for backwards compatibility)
  const yKey = yFields[0];

  // Format value for tooltip
  const formatValue = useCallback((value: number, unit?: string) => {
    // Add null/undefined check
    if (value === undefined || value === null) {
      return '0.00';
    }
    
    // Get the unit symbol (don't use a default)
    const unitSymbol = unit || '';
    const isUnitPrefix = unitSymbol && unitSymbol !== '%' && unitSymbol !== 'SOL'; // Most units are prefixed, but some go after
    
    // Format with appropriate scale
    let formattedValue: string;
    if (value >= 1000000000) {
      formattedValue = `${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      formattedValue = `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      formattedValue = `${(value / 1000).toFixed(2)}K`;
    } else {
      formattedValue = value.toFixed(2);
    }
    
    // Return with correct unit placement (or no unit if not specified)
    if (!unitSymbol) return formattedValue;
    return isUnitPrefix ? `${unitSymbol}${formattedValue}` : `${formattedValue}${unitSymbol}`;
  }, []);

  // Format y-axis tick value with appropriate units
  const formatTickValue = useCallback((value: number) => {
    if (value === 0) return '0';
    
    if (value >= 1000000000) {
      const formattedValue = (value / 1000000000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${formattedValue.slice(0, -2)}B` 
        : `${formattedValue}B`;
    } else if (value >= 1000000) {
      const formattedValue = (value / 1000000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${formattedValue.slice(0, -2)}M` 
        : `${formattedValue}M`;
    } else if (value >= 1000) {
      const formattedValue = (value / 1000).toFixed(1);
      return formattedValue.endsWith('.0') 
        ? `${formattedValue.slice(0, -2)}K` 
        : `${formattedValue}K`;
    } else {
      return value.toFixed(0);
    }
  }, []);

  // Update modal filters when component receives new filter values
  useEffect(() => {
    if (filterValues) {
      setModalFilterValues(filterValues);
    }
  }, [filterValues]);

  // Set isClient to true when component mounts in browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Placeholder for refresh data functionality
  const refreshData = useCallback(() => {
    // If onFilterChange exists in chartConfig, call it with current filters
    if (chartConfig.onFilterChange) {
      chartConfig.onFilterChange(filterValues || {});
    }
    
    setError(null);
  }, [filterValues, chartConfig]);

  // Process data for the chart - use filtered data when available
  const { chartData, barColor } = useMemo(() => {
    // Use appropriate filtered data depending on context
    const currentData: any[] = 
      (isExpanded && isModalBrushActive && modalFilteredData.length > 0) ? modalFilteredData :
      (!isExpanded && isBrushActive && filteredData.length > 0) ? filteredData : 
      data;
    
    if (isExpanded) {
      console.log('Modal chart data source:', 
        isModalBrushActive && modalFilteredData.length > 0 ? 'modal filtered data' : 'full data',
        'Count:', currentData.length);
    }
      
    // If no data is available, return empty defaults
    if (!currentData || currentData.length === 0) {
      return { 
        chartData: [] as ChartDataItem[], 
        barColor: blue as ColorResult
      };
    }

    // Use external color map if available
    const preferredColorMap = externalColorMap || {};
    
    // For simple bar chart, use consistent color unless explicitly configured
    const shouldUseConsistentColor = !chartConfig.useDistinctColors;
    
    // Filter data first
    const processedData: ChartDataItem[] = currentData.filter((d: any) => d[xKey] !== undefined && d[xKey] !== null);
    
    // Sort by date if applicable
    if (processedData.length > 0) {
      // Detect if data contains dates
      const isDateField = typeof processedData[0][xKey] === 'string' && 
        (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
         /^\w+\s\d{4}$/.test(processedData[0][xKey]) || 
         /^\d{4}$/.test(processedData[0][xKey]));
      
      if (isDateField) {
        // Sort dates chronologically (oldest to newest)
        processedData.sort((a: any, b: any) => {
          const dateA = new Date(a[xKey]);
          const dateB = new Date(b[xKey]);
          return dateA.getTime() - dateB.getTime();
        });
      }
    }
    
    // If multi-series, handle differently than single y-field
    if (isMultiSeries) {
      // Create color map for each y-field
      const colorMap: Record<string, string> = {};
      
      yFields.forEach((field, i) => {
        colorMap[field] = preferredColorMap[field] || getColorByIndex(i);
      });
      
      // Group by x-axis values to prevent duplicate x values
      const groupedData: Record<string, ChartDataItem> = {};
      processedData.forEach((item: ChartDataItem) => {
        const xValue = String(item[xKey]);
        
        if (!groupedData[xValue]) {
          // First time seeing this x value, create a base object
          groupedData[xValue] = { 
            [xKey]: item[xKey] 
          };
          
          // Copy all y field values
          yFields.forEach(field => {
            groupedData[xValue][field] = item[field] !== undefined ? item[field] : 0;
          });
        } else {
          // Update fields if they have higher values (for aggregating duplicates)
          yFields.forEach(field => {
            if (item[field] !== undefined && 
                (groupedData[xValue][field] === undefined || 
                 Number(item[field]) > Number(groupedData[xValue][field]))) {
              groupedData[xValue][field] = item[field];
            }
          });
        }
      });
      
      // Convert back to array
      const uniqueProcessedData = Object.values(groupedData);
      
      return {
        chartData: uniqueProcessedData,
        barColor: colorMap
      };
    } else {
      // Single y-field, original logic
      // Group by x-axis values to prevent duplicate bars
      const groupedData: Record<string, ChartDataItem> = {};
      processedData.forEach((item: ChartDataItem) => {
        const xValue = String(item[xKey]);
        
        // If this x-value is already in the grouped data, update it
        if (groupedData[xValue]) {
          // By default, take the highest value to address the double bar issue
          if ((Number(item[yKey]) || 0) > (Number(groupedData[xValue][yKey]) || 0)) {
            groupedData[xValue] = item;
          }
        } else {
          // First time seeing this x value
          groupedData[xValue] = { ...item };
        }
      });
      
      // Convert back to array
      const uniqueProcessedData = Object.values(groupedData);
      console.log(`Processed ${processedData.length} items into ${uniqueProcessedData.length} unique data points`);
      
      // Use a consistent color unless distinctColors is requested
      if (shouldUseConsistentColor) {
        return { 
          chartData: uniqueProcessedData, 
          barColor: preferredColorMap[yKey] || blue
        };
      } else {
        // Create color map for each bar if distinct colors requested
        const colorMap: Record<string, string> = {};
        uniqueProcessedData.forEach((d: any, i: number) => {
          const xValue = String(d[xKey]);
          colorMap[xValue] = preferredColorMap[xValue] || getColorByIndex(i % allColorsArray.length);
        });
        
        return { 
          chartData: uniqueProcessedData, 
          barColor: colorMap
        };
      }
    }
  }, [data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive, xKey, yKey, chartConfig, isMultiSeries, yFields, externalColorMap, isExpanded]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Handle mouse move for tooltips
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Get mouse position - use client coordinates for consistency
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Use current data based on brush state
    const currentData = isModal 
      ? (isModalBrushActive && modalFilteredData.length > 0 ? modalFilteredData : data)
      : (isBrushActive && filteredData.length > 0 ? filteredData : data);
    
    // Check if we have data to work with
    if (currentData.length === 0) return;
    
    // Calculate available chart space
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    // Adjust mouseX to account for margin
    const adjustedMouseX = mouseX - margin.left;
    
    // Early exit if mouse is outside the chart area
    if (adjustedMouseX < 0 || adjustedMouseX > innerWidth) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the actual rendered data
    const effectiveData = isMultiSeries ? chartData : chartData;
    
    // Calculate bar width based on the actual rendered data
    const barWidth = innerWidth / effectiveData.length;
    
    // Calculate the index of the bar under the mouse pointer
    const barIndex = Math.floor(adjustedMouseX / barWidth);
    
    // Validate the index
    if (barIndex < 0 || barIndex >= effectiveData.length) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the data point at this index
    const dataPoint = effectiveData[barIndex];
    if (!dataPoint) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }

    const xValue = dataPoint[xKey];
    
    // Calculate tooltip position - always follow mouse in both normal and modal views
    const tooltipLeft = mouseX;
    const tooltipTop = Math.max(mouseY - 10, 10);
    
    // Only update if showing a new x-value or hiding previous one
    if (!tooltip.visible || tooltip.key !== xValue) {
      let tooltipItems = [];
      
      if (isMultiSeries) {
        // For multi-series, show non-zero values for all y fields
        tooltipItems = yFields
          .filter(field => {
            const value = Number(dataPoint[field]);
            return !isNaN(value) && value > 0;
          })
          .map(field => ({
            label: field,
            value: formatValue(Number(dataPoint[field]) || 0, getYAxisUnit(yField, yAxisUnit)),
            color: typeof barColor === 'string' ? barColor : (barColor[field] || blue),
            shape: 'square' as 'square'
          }))
          .sort((a, b) => {
            // Sort by value (descending)
            const aVal = typeof a.value === 'string' 
              ? parseFloat(a.value.replace(/[^0-9.-]+/g, '')) 
              : a.value;
            const bVal = typeof b.value === 'string' 
              ? parseFloat(b.value.replace(/[^0-9.-]+/g, '')) 
              : b.value;
            return bVal - aVal;
          });
        
        // If no items passed the filter, show the first field with a 0 value
        if (tooltipItems.length === 0 && yFields.length > 0) {
          tooltipItems = [{
            label: yFields[0],
            value: '$0.00',
            color: typeof barColor === 'string' ? barColor : (barColor[yFields[0]] || blue),
            shape: 'square' as 'square'
          }];
        }
      } else {
        // For simple bar chart, just show the single value
        tooltipItems = [{
          label: yKey,
          value: formatValue(dataPoint[yKey], getYAxisUnit(yField, yAxisUnit)),
          color: typeof barColor === 'string' ? barColor : (barColor[dataPoint[xKey]] || blue),
          shape: 'square' as 'square'
        }];
      }
      
      // Update the tooltip
      setTooltip({
        visible: true,
        key: xValue,
        items: tooltipItems,
        left: tooltipLeft,
        top: tooltipTop
      });
    } else {
      // If tooltip content isn't changing, just update position
      setTooltip(prev => ({
        ...prev,
        left: tooltipLeft,
        top: tooltipTop
      }));
    }
  }, [data, filteredData, modalFilteredData, isBrushActive, isModalBrushActive, chartData, xKey, yKey, yFields, barColor, formatValue, 
      tooltip.visible, tooltip.key, isMultiSeries, yAxisUnit]);

  // Process data for brush component
  const brushData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    console.log('Creating brush data with', data.length, 'items');
    
    // First, apply the same sorting/filtering as the chart data
    let processedData: any[] = [...data].filter((d: any) => d[xKey] !== undefined && d[xKey] !== null);
    
    // Sort by date if applicable
    if (processedData.length > 0) {
      // Detect if data contains dates
      const isDateField = typeof processedData[0][xKey] === 'string' && 
        (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
         /^\d{2}\/\d{2}\/\d{4}/.test(processedData[0][xKey]) ||
          /^[A-Za-z]{3}\s\d{4}$/.test(processedData[0][xKey]) || 
         /^\d{4}$/.test(processedData[0][xKey]));
      
      if (isDateField) {
        // Sort dates chronologically (oldest to newest)
        processedData.sort((a: any, b: any) => {
          const dateA = new Date(a[xKey]);
          const dateB = new Date(b[xKey]);
          return dateA.getTime() - dateB.getTime();
        });
      }
    }
    
    // Create synthetic dates if needed
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Check if we're dealing with a simple bar chart without filters
    const isSimpleChartWithoutFilters = 
      !filterValues || Object.keys(filterValues).length === 0;
    
    // For simple chart without filters, use more direct approach to ensure continuous line
    if (isSimpleChartWithoutFilters) {
      console.log('Processing simple chart without filters');
      
      // Group by x-axis values to prevent duplicates
      const groupedData: Record<string, any> = {};
      processedData.forEach((item: any) => {
        const xValue = String(item[xKey]);
        
        if (groupedData[xValue]) {
          // Keep the highest value
          if ((Number(item[yKey]) || 0) > (Number(groupedData[xValue][yKey]) || 0)) {
            groupedData[xValue] = item;
          }
        } else {
          groupedData[xValue] = item;
        }
      });
      
      // Convert back to array
      const uniqueData = Object.values(groupedData);
      console.log(`Processed ${processedData.length} brush items into ${uniqueData.length} unique data points`);
      
      // Create a series of evenly spaced date points for consistency
      const brushDataPoints = uniqueData.map((d: any, i: number) => {
        let dateObj;
        
        // Try to parse the date from the x-axis field
        if (typeof d[xKey] === 'string' && 
           (d[xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
            /^\d{2}\/\d{2}\/\d{4}/.test(d[xKey]) ||
            /^[A-Za-z]{3}\s\d{4}$/.test(d[xKey]) || 
            /^\d{4}$/.test(d[xKey]))) {
          // This is a date string, parse it
          dateObj = new Date(d[xKey]);
          // Check if the date is valid
          if (isNaN(dateObj.getTime())) {
            // Invalid date, use synthetic date based on index
            dateObj = new Date(baseDate);
            dateObj.setDate(baseDate.getDate() + i);
          }
        } else if (d[xKey] instanceof Date) {
          // Already a Date object
          dateObj = d[xKey];
        } else {
          // Non-date value, use synthetic date based on index
          dateObj = new Date(baseDate);
          dateObj.setDate(baseDate.getDate() + i);
        }
        
        // Convert value to number and ensure it's valid
        const numValue = Number(d[yKey]);
        const value = isNaN(numValue) ? 0 : numValue;
        
        return {
          date: dateObj,
          value: value,
          idx: i,
          originalIndex: i,
          originalData: d
        };
      });
      
      console.log('Created brush data points for simple chart:', brushDataPoints.length);
      return brushDataPoints;
    }
    
    // Standard processing for charts with filters
    // Important: Create a multi-point pattern for the brush line that follows bar heights
    // The BrushTimeScale component uses indexes for x-axis and value for y-axis
    const brushDataPoints = processedData.map((d: any, i: number) => {
      let dateObj;
      
      // Try to parse the date from the x-axis field
      if (typeof d[xKey] === 'string' && 
         (d[xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
          /^\d{2}\/\d{2}\/\d{4}/.test(d[xKey]) ||
          /^[A-Za-z]{3}\s\d{4}$/.test(d[xKey]) || 
          /^\d{4}$/.test(d[xKey]))) {
        // This is a date string, parse it
        dateObj = new Date(d[xKey]);
        // Check if the date is valid
        if (isNaN(dateObj.getTime())) {
          // Invalid date, use synthetic date based on index
          dateObj = new Date(baseDate);
          dateObj.setDate(baseDate.getDate() + i);
        }
      } else if (d[xKey] instanceof Date) {
        // Already a Date object
        dateObj = d[xKey];
      } else {
        // Non-date value, use synthetic date based on index
        dateObj = new Date(baseDate);
        dateObj.setDate(baseDate.getDate() + i);
      }
      
      // For general case, still handle null/undefined values
      let yValue = Number(d[yKey]);
      if (yValue === null || yValue === undefined || isNaN(yValue)) {
        yValue = 0;
      }
      
      return {
        date: dateObj,
        value: yValue,
        idx: i,
        originalIndex: i,
        originalData: d
      };
    });
    
    console.log('Created brush data points:', brushDataPoints.length);
    return brushDataPoints;
  }, [data, xKey, yKey, filterValues]);
  
  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
        setFilteredData([]); // Reset filtered data
      }
      return;
    }
    
    const { x0, x1 } = domain;
    console.log('Brush change:', new Date(x0), 'to', new Date(x1));
    
    // Update brush domain
    setBrushDomain([new Date(x0), new Date(x1)]);
    
    // Get the selected brushData items
    const selectedBrushItems = brushData.filter((item: any) => {
      return item.date >= new Date(x0) && item.date <= new Date(x1);
    });
    
    console.log('Selected brush items:', selectedBrushItems.length);
    
    // Map back to original data using originalData directly
    const selectedDataObjects = selectedBrushItems.map(item => item.originalData);
    
    console.log('Filtered data after brush:', selectedDataObjects.length);
    setFilteredData(selectedDataObjects);
    
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive, brushData]);

  // Handle modal brush change
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
        setModalFilteredData([]); // Reset modal filtered data
      }
      return;
    }
    
    const { x0, x1 } = domain;
    console.log('Modal brush change:', new Date(x0), 'to', new Date(x1));
    
    // Update modal brush domain
    setModalBrushDomain([new Date(x0), new Date(x1)]);
    
    // Get the selected brushData items
    const selectedBrushItems = brushData.filter((item: any) => {
      return item.date >= new Date(x0) && item.date <= new Date(x1);
    });
    
    console.log('Selected modal brush items:', selectedBrushItems.length);
    
    // Map back to original data using originalData
    // We use the actual data objects rather than indices to ensure the modal view shows correct data
    const selectedDataObjects = selectedBrushItems.map(item => item.originalData);
    
    console.log('Filtered data after modal brush:', selectedDataObjects.length);
    setModalFilteredData(selectedDataObjects);
    
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive, brushData]);

  // Sync modal brush domain with main brush domain when modal opens
  useEffect(() => {
    if (isExpanded) {
      console.log('Modal opened, syncing brush domains');
      // When modal opens, sync the brush domains
      setModalBrushDomain(brushDomain);
      setIsModalBrushActive(isBrushActive);
      
      // Also sync filtered data
      if (isBrushActive && filteredData.length > 0) {
        console.log('Syncing filtered data to modal:', filteredData.length, 'items');
        setModalFilteredData(filteredData);
      }
    }
  }, [isExpanded, brushDomain, isBrushActive, filteredData]);

  // Update memoized values for max chart value to use in brush
  const maxValue = useMemo(() => {
    if (!chartData || chartData.length === 0) return 1;
    
    const values = chartData.map(d => Number(d[yKey]) || 0);
    return Math.max(...values, 1);
  }, [chartData, yKey]);

  // Render chart content
  const renderChartContent = useCallback((chartWidth: number, chartHeight: number, isModal = false) => {
    // Show error state with refresh button
    if (error || chartData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{error || 'No data available'}</div>
          <ButtonSecondary onClick={refreshData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    // Define margins for chart
    const margin = { top: 10, right: 15, bottom: 30, left: 40 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;
    
    if (innerWidth <= 0 || innerHeight <= 0) return null;
    
    // Create scales
    const xScale = scaleBand<string>({
      domain: chartData.map((d: ChartDataItem) => d[xKey]),
      range: [0, innerWidth],
      padding: 0.2,
    });
    
    // Calculate the max value for the y-axis
    const yMax = isMultiSeries
      ? Math.max(
          ...chartData.flatMap(d => 
            yFields.map(field => Number(d[field]) || 0)
          ), 
          1
        )
      : Math.max(...chartData.map((d: ChartDataItem) => Number(d[yKey]) || 0), 1);
    
    const yScale = scaleLinear<number>({
      domain: [0, yMax * 1.1], // Add 10% padding
      range: [innerHeight, 0],
      nice: true,
      clamp: true,
    });

    // Use all X-axis values for tick labels, but limit date ticks to 8 max
    const xTickValues = (() => {
      // Check if the data contains dates
      const isDateData = chartData.length > 0 && 
        typeof chartData[0][xKey] === 'string' && 
        (/^\d{4}-\d{2}-\d{2}/.test(chartData[0][xKey]) || 
         /^\d{2}\/\d{2}\/\d{4}/.test(chartData[0][xKey]) ||
         /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(chartData[0][xKey]) ||
         /^[A-Za-z]{3}\s\d{4}$/.test(chartData[0][xKey]) || 
         /^\d{4}$/.test(chartData[0][xKey]));
      
      // For date data, limit to 8 ticks maximum
      if (isDateData && chartData.length > 8) {
        const tickInterval = Math.ceil(chartData.length / 8);
        return chartData
          .filter((_, i) => i % tickInterval === 0)
          .map(d => d[xKey]);
      }
      
      // For other data types, show all values
      return chartData.map(d => d[xKey]);
    })();

    // Render the chart content
    return (
      <div 
        className="relative w-full h-full" 
        onMouseMove={(e) => handleMouseMove(e, isModal)}
        onMouseLeave={handleMouseLeave}
        ref={isModal ? modalChartRef : chartRef}
      >
        {/* Tooltip */}
        {tooltip.visible && tooltip.items && !isModal && (
          <ChartTooltip
            title={String(tooltip.key)}
            items={tooltip.items}
            left={tooltip.left}
            top={tooltip.top}
            isModal={false}
            timeFilter={filterValues?.timeFilter}
          />
        )}
        
        <svg width={chartWidth} height={chartHeight}>
          <Group left={margin.left} top={margin.top}>
            {/* Y-axis grid lines */}
            <GridRows
              scale={yScale}
              width={innerWidth}
              stroke="#1f2937"
              strokeOpacity={0.5}
              strokeDasharray="2,3"
            />
            
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
              tickFormat={(value) => {
                // Format date labels for readability
                if (typeof value === 'string') {
                  // For ISO dates (YYYY-MM-DD)
                  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                    const date = new Date(value);
                    
                    if (!isNaN(date.getTime())) {
                      // Format based on timeFilter if available
                      if (filterValues?.timeFilter === 'D' || filterValues?.timeFilter === 'W') {
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      } else if (filterValues?.timeFilter === 'M') {
                        return date.toLocaleDateString('en-US', { month: 'short' });
                      } else if (filterValues?.timeFilter === 'Q') {
                        const quarter = Math.floor(date.getMonth() / 3) + 1;
                        return `Q${quarter}`;
                      } else if (filterValues?.timeFilter === 'Y') {
                        return date.getFullYear().toString();
                      }
                      
                      // Default format if no timeFilter is specified
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                  }
                  
                  // For US dates (MM/DD/YYYY)
                  if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      // Use same formatting logic as above
                      return formatXAxisLabel(value, filterValues);
                    }
                  }
                  
                  // For quarterly format (Q1 2023)
                  if (/^Q[1-4]\s\d{4}$/.test(value)) {
                    return value.substring(0, 2); // Just "Q1", "Q2", etc.
                  }
                  
                  // For month-year format (Jan 2023)
                  if (/^[A-Za-z]{3}\s\d{4}$/.test(value)) {
                    return value.substring(0, 3); // Just "Jan", "Feb", etc.
                  }
                }
                
                // For non-date values, format using our helper function
                return formatXAxisLabel(String(value), filterValues);
              }}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                textAnchor: 'middle',
                dy: '0.5em'
              })}
              // Ensure first tick doesn't start before origin
              left={0}
            />
            
            {/* Y-axis */}
            <AxisLeft
              scale={yScale}
              stroke="#374151"
              strokeWidth={0.5}
              tickStroke="transparent"
              tickLength={0}
              hideZero={false}
              numTicks={5}
              tickFormat={(value) => formatTickValue(Number(value))}
              tickLabelProps={() => ({
                fill: '#6b7280',
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.05em',
                textAnchor: 'end',
                dy: '0.33em',
                dx: '-0.25em'
              })}
            />
            
            {/* Render bars */}
            {isMultiSeries ? (
              // For multi-series, render bars side by side
              chartData.map((d: ChartDataItem) => {
                const x = xScale(d[xKey]) || 0;
                const barWidth = xScale.bandwidth() / yFields.length; // Divide bar width by number of fields
                
                return (
                  <React.Fragment key={`multi-${d[xKey]}`}>
                    {yFields.map((field, i) => {
                      const value = Number(d[field]) || 0;
                      const barHeight = innerHeight - yScale(value);
                      // Position each field's bar side by side
                      const barX = x + (i * barWidth);
                      const barY = innerHeight - barHeight;
                      
                      // Get color for this field
                      const color = typeof barColor === 'object' ? (barColor[field] || blue) : barColor;
                      
                      return (
                        <Bar
                          key={`bar-${d[xKey]}-${field}`}
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={barHeight}
                          fill={color}
                          opacity={tooltip.visible && tooltip.key === d[xKey] ? 1 : 0.8}
                          rx={2}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })
            ) : (
              // For single y-field, render regular bars
              chartData.map((d: ChartDataItem, i: number) => {
                const barX = xScale(d[xKey]) || 0;
                const barWidth = xScale.bandwidth();
                const barHeight = innerHeight - yScale(Number(d[yKey]) || 0);
                const barY = innerHeight - barHeight;
                
                // Determine bar color based on config
                const color = typeof barColor === 'string' 
                  ? barColor 
                  : (barColor[d[xKey]] || blue);
                
                return (
                  <Bar
                    key={`bar-${i}`}
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    opacity={tooltip.visible && tooltip.key === d[xKey] ? 1 : 0.8}
                    rx={2}
                  />
                );
              })
            )}
          </Group>
        </svg>
      </div>
    );
  }, [chartData, xKey, yKey, yFields, barColor, formatTickValue, error, refreshData, tooltip, handleMouseMove, handleMouseLeave, isMultiSeries, filterValues]);

  // Update legend items 
  useEffect(() => {
    if (chartData.length > 0) {
      if (isMultiSeries) {
        // For multi-series, create a legend item for each y-field
        const items = yFields.map(field => ({
          id: field,
          label: field,
          color: typeof barColor === 'string' ? barColor : (barColor[field] || blue)
        }));
        setLegendItems(items);
      } else {
        // Single y-field
        setLegendItems([{
          id: yKey,
          label: yKey,
          color: typeof barColor === 'string' ? barColor : blue
        }]);
      }
    }
  }, [chartData, yKey, barColor, isMultiSeries, yFields]);

  // Render the brush with proper shape reflecting bar values
  const renderBrushArea = useCallback((modalView = false) => {
    if (!brushData || brushData.length === 0) return null;
    
    // For simple chart without filters, we need to customize the brush path
    const isSimpleChartWithoutFilters = 
      !filterValues || Object.keys(filterValues).length === 0;
    
    // Calculate padding to prevent line from extending beyond brush area
    // Add a small negative padding to keep the line just inside the brush bounds
    const padding = isSimpleChartWithoutFilters ? -0.5 : 0;
    
    return (
      <div className="h-[18%] w-full mt-2">
        <BrushTimeScale
          data={brushData}
          activeBrushDomain={modalView ? modalBrushDomain : brushDomain}
          onBrushChange={modalView ? handleModalBrushChange : handleBrushChange}
          onClearBrush={() => {
            if (modalView) {
              setModalBrushDomain(null);
              setIsModalBrushActive(false);
              setModalFilteredData([]);
            } else {
              setBrushDomain(null);
              setIsBrushActive(false);
              setFilteredData([]);
            }
          }}
          getDate={(d) => d.date}
          getValue={(d) => {
            // For simple charts without filters, ensure we reflect the bar heights
            if (isSimpleChartWithoutFilters) {
              const idx = d.originalIndex;
              if (chartData[idx]) {
                // Use actual value from chart data for better visual representation
                const val = Number(chartData[idx][yKey]) || 0;
                
                // Ensure the line doesn't touch the base by applying a minimum value
                // This makes the line more visible even for small values
                return Math.max(val, maxValue * 0.05);
              }
            }
            return d.value;
          }}
          lineColor={isSimpleChartWithoutFilters ? "#3b82f6" : "#60a5fa"} // Brighter blue for simple charts
          margin={{ top: 10, right: 15 + padding, bottom: modalView ? 10 : 20, left: 40 + padding }}
          isModal={modalView}
          // Use appropriate curve type based on the chart configuration
          curveType={isMultiSeries ? "catmullRom" : (isSimpleChartWithoutFilters ? "linear" : "monotoneX")}
          strokeWidth={isMultiSeries ? 2 : 1.5} // Slightly thicker line for multi-series
          filterValues={modalView ? modalFilterValues : filterValues}
        />
      </div>
    );
  }, [brushData, modalBrushDomain, brushDomain, handleModalBrushChange, handleBrushChange, 
      setModalBrushDomain, setIsModalBrushActive, setModalFilteredData, setBrushDomain, 
      setIsBrushActive, setFilteredData, chartData, yKey, filterValues, maxValue, isMultiSeries, modalFilterValues]);

  // Add back the handleFilterChange function
  const handleFilterChange = useCallback((key: string, value: string) => {
    const updatedFilters = {
      ...modalFilterValues,
      [key]: value
    };
    
    // Update local state
    setModalFilterValues(updatedFilters);
    
    // If onFilterChange exists in chartConfig, call it with updated filters
    if (chartConfig.onFilterChange) {
      chartConfig.onFilterChange(updatedFilters);
    }
  }, [modalFilterValues, chartConfig]);

  // When rendering the chart in expanded mode, use the Modal component
  if (isExpanded) {
    // Only render Modal on client-side to prevent hydration errors
    if (!isClient) {
      return <div className="w-full h-full flex items-center justify-center">Loading expanded view...</div>;
    }
    
    // Render expanded view inside Modal
    return (
      <Modal 
        isOpen={isExpanded} 
        onClose={onCloseExpanded || (() => {})}
        title={chartConfig.title || "Chart View"}
        subtitle={chartConfig.subtitle}
      >
        <div className="w-full h-[80vh] relative overflow-visible">
          {/* Filters row */}
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Time filter */}
              {chartConfig.additionalOptions?.filters?.timeFilter && (
                <div className="flex items-center">
                  <TimeFilterSelector
                    value={modalFilterValues?.timeFilter || chartConfig.additionalOptions.filters.timeFilter.activeValue || 'M'}
                    onChange={(value) => handleFilterChange('timeFilter', value)}
                    options={chartConfig.additionalOptions.filters.timeFilter.options?.map((opt: string) => ({
                      value: opt,
                      label: opt
                    }))}
                  />
                </div>
              )}
              
              {/* Currency filter */}
              {chartConfig.additionalOptions?.filters?.currencyFilter && (
                <CurrencyFilter
                  currency={modalFilterValues?.currencyFilter || chartConfig.additionalOptions.filters.currencyFilter.activeValue || 'USD'}
                  onChange={(value) => handleFilterChange('currencyFilter', value as string)}
                  options={chartConfig.additionalOptions.filters.currencyFilter.options}
                 
                />
              )}
              
              {/* Display mode filter */}
              {chartConfig.additionalOptions?.filters?.displayModeFilter && (
                <div className="flex items-center">
                  <DisplayModeFilter
                    mode={(modalFilterValues?.displayMode || chartConfig.additionalOptions.filters.displayModeFilter.activeValue || 'absolute') as DisplayMode}
                    onChange={(value) => handleFilterChange('displayMode', value)}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Horizontal line below filters */}
          <div className="w-full h-px bg-gray-900 mb-4"></div>
          
          {/* Chart with legends */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-[90%] pr-3 border-r border-gray-900">
              <div className="flex flex-col h-full">
                {/* Display tooltip at the container level for modal views */}
                {tooltip.visible && tooltip.items && (
                  <div className="absolute z-50" style={{ 
                    pointerEvents: 'none',
                    top: tooltip.top,
                    left: tooltip.left
                  }}>
                    <ChartTooltip
                      title={String(tooltip.key)}
                      items={tooltip.items}
                      left={0}
                      top={0}
                      isModal={true}
                      timeFilter={modalFilterValues?.timeFilter || filterValues?.timeFilter}
                    />
                  </div>
                )}
                
                {/* Main chart - 85% height */}
                <div className="h-[85%] w-full relative">
                  <ParentSize debounceTime={10}>
                    {({ width: parentWidth, height: parentHeight }) => 
                      parentWidth > 0 && parentHeight > 0 
                        ? renderChartContent(parentWidth, parentHeight, true)
                        : null
                    }
                  </ParentSize>
                </div>
                
                {/* Brush component - 15% height */}
                {brushData.length > 0 ? renderBrushArea(true) : (
                  <div className="h-[15%] w-full flex items-center justify-center text-gray-500 text-sm">
                    No brush data available
                  </div>
                )}
              </div>
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] h-full pl-3 flex flex-col justify-start items-start">
              {/* Show legend items */}
              <div className="space-y-2 w-full overflow-y-auto max-h-[600px]
                [&::-webkit-scrollbar]:w-1.5 
                [&::-webkit-scrollbar-track]:bg-transparent 
                [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                {legendItems.map(item => (
                  <LegendItem 
                    key={item.id} 
                    label={item.label}
                    color={item.color}
                    shape="square"
                    tooltipText={item.value ? formatValue(item.value) : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Render normal view with brush
  return (
    <div className="w-full h-full relative">
      <div className="h-[85%] w-full">
        <ParentSize debounceTime={10}>
          {({ width: parentWidth, height: parentHeight }) => 
            parentWidth > 0 && parentHeight > 0 
              ? renderChartContent(parentWidth, parentHeight)
              : null
          }
        </ParentSize>
      </div>
      
      {brushData.length > 0 ? renderBrushArea(false) : (
        <div className="h-[15%] w-full mt-2 flex items-center justify-center text-gray-500 text-sm">
          No brush data available
        </div>
      )}
    </div>
  );
};

// Helper function to get unit from YAxisConfig or component prop
function getYAxisUnit(field: string | YAxisConfig | (string | YAxisConfig)[], defaultUnit?: string): string | undefined {
  if (typeof field === 'string') {
    return defaultUnit;
  } else if (Array.isArray(field)) {
    if (field.length === 0) return defaultUnit;
    return typeof field[0] === 'string' ? defaultUnit : field[0].unit || defaultUnit;
  } else {
    return field.unit || defaultUnit;
  }
}

// Helper function to format X-axis tick labels
const formatXAxisLabel = (value: string, filterValues?: Record<string, string>): string => {
  // Check if the value is a date format (YYYY-MM-DD or similar)
  const isDateFormat = /^\d{4}-\d{2}-\d{2}/.test(value) || 
                       /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
                       /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(value);
  
  if (isDateFormat) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Format based on timeFilter
      if (filterValues?.timeFilter === 'D' || filterValues?.timeFilter === 'W') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (filterValues?.timeFilter === 'M') {
        return date.toLocaleDateString('en-US', { month: 'short' });
      } else if (filterValues?.timeFilter === 'Q') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter}`;
      } else if (filterValues?.timeFilter === 'Y') {
        return date.getFullYear().toString();
      }
      
      // Default format if timeFilter is not specified
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  
  // For quarter format (Q1, Q2, etc.)
  if (/^Q[1-4]\s\d{4}$/.test(value)) {
    return value.substring(0, 2); // Just "Q1", "Q2", etc.
  }
  
  // For month-year format (Jan 2023)
  if (/^[A-Za-z]{3}\s\d{4}$/.test(value)) {
    return value.substring(0, 3); // Just "Jan", "Feb", etc.
  }
  
  // Don't shorten other values that are already short
  if (value.length <= 5) {
    return value;
  }
  
  // For other longer text, truncate with ellipsis
  return `${value.substring(0, 3)}...`;
};

export default React.memo(SimpleBarChart); 