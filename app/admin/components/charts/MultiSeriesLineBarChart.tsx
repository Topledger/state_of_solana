import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar } from '@visx/shape';
import { LinePath } from '@visx/shape';
import { ChartConfig, YAxisConfig } from '../../types';
import { blue, getColorByIndex } from '@/app/utils/chartColors';
import ChartTooltip from '@/app/components/shared/ChartTooltip';
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import Loader from "@/app/components/shared/Loader";
import BrushTimeScale from "@/app/components/shared/BrushTimeScale";
import Modal from '@/app/components/shared/Modal';
import LegendItem from "@/app/components/shared/LegendItem";
import TimeFilterSelector from '@/app/components/shared/filters/TimeFilter';
import CurrencyFilter from '@/app/components/shared/filters/CurrencyFilter';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import { curveCatmullRom } from '@visx/curve';

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

interface MultiSeriesLineBarChartProps {
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

// Helper function to get field from YAxisConfig or use string directly
function getYAxisField(field: string | YAxisConfig): string {
  return typeof field === 'string' ? field : field.field;
}

// Helper function to get unit from YAxisConfig or use a default
function getYAxisUnit(field: string | YAxisConfig): string | undefined {
  return typeof field === 'string' ? undefined : field.unit;
}

// Helper function to determine if a field should be rendered as a line
function shouldRenderAsLine(field: string | YAxisConfig): boolean {
  if (typeof field === 'string') {
    return false; // Default to bar for string fields
  }
  return field.type === 'line';
}

// Format value with appropriate units
function formatWithUnit(value: number, unit?: string, defaultUnit?: string): string {
  // Get the unit symbol (use defaultUnit as fallback)
  const unitSymbol = unit || defaultUnit || '';
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
}

// Helper function to format X-axis tick labels
const formatXAxisLabel = (value: string, timeFilter?: string): string => {
  // Check if the value is a date format (YYYY-MM-DD or similar)
  const isDateFormat = /^\d{4}-\d{2}-\d{2}/.test(value) || 
                      /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
                      /^\d{1,2}-[A-Za-z]{3}-\d{4}/.test(value);
  
  if (isDateFormat) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Format based on timeFilter
      if (timeFilter === 'D' || timeFilter === 'W') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeFilter === 'M') {
        return date.toLocaleDateString('en-US', { month: 'short' });
      } else if (timeFilter === 'Q') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter}`;
      } else if (timeFilter === 'Y') {
        return date.getFullYear().toString();
      }
      
      // Default date format if timeFilter is not specified
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

const MultiSeriesLineBarChart: React.FC<MultiSeriesLineBarChartProps> = ({ 
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

  // Modal-specific filtered data and brush state
  const [modalFilteredData, setModalFilteredData] = useState<any[]>([]);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  
  // Add state for filter values in modal
  const [modalFilterValues, setModalFilterValues] = useState<Record<string, string>>(filterValues || {});
  
  // Add state to track client-side rendering
  const [isClient, setIsClient] = useState(false);

  // Update tooltip state definition
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    key: string;
    title?: string;
    items: { label: string, value: string | number, color: string, shape?: 'circle' | 'square' }[];
  }>({
    visible: false,
    left: 0,
    top: 0,
    key: '',
    items: []
  });

  // Extract mapping fields
  const xField = chartConfig.dataMapping.xAxis;
  const yField = chartConfig.dataMapping.yAxis;
  
  // For type safety, ensure we use string values for indexing
  const xKey = typeof xField === 'string' ? xField : xField[0];
  
  // Helper function to force reset the brush visual state
  const forceBrushVisualReset = useCallback((inModal = false) => {
    setTimeout(() => {
      let container: Document | Element = document;
      
      // For modal, only look within the modal container
      if (inModal) {
        const modalContainer = document.querySelector('.modal-backdrop');
        if (!modalContainer) return;
        container = modalContainer;
        console.log('Modal container found for brush reset:', modalContainer);
      }
      
      const brushElements = container.querySelectorAll('.visx-brush-selection');
      console.log(`Found ${brushElements.length} brush elements in ${inModal ? 'modal' : 'main'} view`);
      
      if (brushElements.length > 0) {
        console.log(`Forcing ${inModal ? 'modal ' : ''}brush visual reset`);
        
        // Reset the brush width to full width
        brushElements.forEach(el => {
          if (el instanceof SVGRectElement) {
            const parentSVG = el.closest('svg');
            if (parentSVG) {
              // Find the actual width of the brush container
              const brushGroup = parentSVG.querySelector('.visx-brush');
              if (brushGroup) {
                const brushWidth = brushGroup.getBoundingClientRect().width;
                // Reset to full width with slight padding on both sides
                el.setAttribute('width', String(brushWidth - 4));
                el.setAttribute('x', '2');
                console.log(`Reset brush to width: ${brushWidth - 4}, x: 2`);
              }
            }
          }
        });
      }
      
      // Additional attempt for modal - sometimes the brush elements are in an iframe or portal
      if (inModal) {
        // Try to find brush-related elements using more reliable selectors
        const svgElements = container.querySelectorAll('svg');
        svgElements.forEach(svg => {
          const brushElements = svg.querySelectorAll('.visx-brush-selection');
          if (brushElements.length > 0) {
            console.log(`Found ${brushElements.length} brush elements in a specific SVG`);
            brushElements.forEach(el => {
              if (el instanceof SVGRectElement) {
                const brushGroup = svg.querySelector('.visx-brush');
                if (brushGroup) {
                  const brushWidth = brushGroup.getBoundingClientRect().width;
                  el.setAttribute('width', String(brushWidth - 4));
                  el.setAttribute('x', '2');
                  console.log(`Reset specific SVG brush to width: ${brushWidth - 4}, x: 2`);
                }
              }
            });
          }
        });
      }
    }, 100);
  }, []);
  
  // Update modal filters when component receives new filter values
  useEffect(() => {
    if (filterValues) {
      setModalFilterValues(filterValues);
      
      // When filter values change in modal, reset modal brush
      if (isModalBrushActive && isExpanded) {
        console.log('Filter changed in modal, resetting brush to show full dataset');
        setModalBrushDomain(null);
        setIsModalBrushActive(true); // Keep active but reset domain
        setModalFilteredData(data); // Reset to full dataset
        
        // Force modal brush visual reset
        forceBrushVisualReset(true);
      }
    }
  }, [filterValues, isModalBrushActive, isExpanded, data, forceBrushVisualReset]);
  
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
  
  // Update the direct filter change handler to remove the brush visual reset
  useEffect(() => {
    console.log('filterValues changed directly from parent:', filterValues);
    
    // Skip first render
    if (!filterValues) return;
    
    // Reset modal brush state if it's active and modal is expanded
    if (isModalBrushActive && isExpanded) {
      console.log('Directly resetting brush due to external filter change');
      setModalBrushDomain(null);
      setIsModalBrushActive(true); // Keep active but reset domain
      setModalFilteredData(data); // Reset to full dataset
      
      // Force modal brush visual reset
      forceBrushVisualReset(true);
    }
    
    // Also reset normal brush state if it's active
    if (isBrushActive) {
      setBrushDomain(null);
      setIsBrushActive(true); // Keep active but reset domain
      setFilteredData(data); // Reset to full dataset
      
      // Force brush visual reset
      forceBrushVisualReset(false);
    }
    
    // Update the modal filter values to match
    setModalFilterValues(filterValues);
  }, [JSON.stringify(filterValues), isModalBrushActive, isBrushActive, isExpanded, data, forceBrushVisualReset]);
  
  // Update the modal filter change handler
  const handleModalFilterChange = useCallback((key: string, value: string) => {
    console.log(`Modal filter changed: ${key} = ${value}`);
    
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

  // Format value for tooltip
  const formatValue = useCallback((value: number) => {
    return formatWithUnit(value, yAxisUnit);
  }, [yAxisUnit]);

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
  }, [yAxisUnit]);

  // Placeholder for refresh data functionality
  const refreshData = useCallback(() => {
    // If onFilterChange exists in chartConfig, call it with current filters
    if (chartConfig.onFilterChange) {
      chartConfig.onFilterChange(filterValues || {});
    }
    
    setError(null);
  }, [filterValues, chartConfig]);

  // Extract data for the chart
  const { chartData, fields, fieldColors, fieldTypes } = useMemo(() => {
    // Use appropriate filtered data depending on context
    const currentData = isExpanded
      ? (isModalBrushActive && modalFilteredData.length > 0 ? modalFilteredData : data)
      : (isBrushActive && filteredData.length > 0 ? filteredData : data);
    
    if (!currentData || currentData.length === 0) {
      return { chartData: [], fields: [], fieldColors: {}, fieldTypes: {} };
    }

    // Use external color map if available
    const preferredColorMap = externalColorMap || {};
    
    // Filter data first to remove any undefined x values
    const processedData = currentData.filter(d => d[xKey] !== undefined && d[xKey] !== null);
    
    // Sort by date if applicable
    if (processedData.length > 0) {
      // Detect if data contains dates
      const isDateField = typeof processedData[0][xKey] === 'string' && 
        (processedData[0][xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
        /^\w+\s\d{4}$/.test(processedData[0][xKey]) || 
        /^\d{4}$/.test(processedData[0][xKey]));
      
      if (isDateField) {
        // Sort dates chronologically (oldest to newest)
        processedData.sort((a, b) => {
          const dateA = new Date(a[xKey]);
          const dateB = new Date(b[xKey]);
          return dateA.getTime() - dateB.getTime();
        });
      }
    }
    
    // Get all field names that should appear in the chart
    let allFields: string[] = [];
    let fieldTypesMap: Record<string, 'bar' | 'line'> = {};
    
    if (Array.isArray(yField)) {
      allFields = yField.map(field => getYAxisField(field));
      
      // Create mapping of field types (bar or line)
      yField.forEach(field => {
        const fieldName = getYAxisField(field);
        fieldTypesMap[fieldName] = typeof field === 'string' ? 'bar' : (field as YAxisConfig).type;
      });
    } else {
      allFields = [getYAxisField(yField)];
      fieldTypesMap[getYAxisField(yField)] = typeof yField === 'string' ? 'bar' : (yField as YAxisConfig).type;
    }
    
    // Prepare color mapping for fields
    const colorMapping: Record<string, string> = {};
    allFields.forEach((field, index) => {
      colorMapping[field] = preferredColorMap[field] || getColorByIndex(index);
    });
    
    return { 
      chartData: processedData,
      fields: allFields,
      fieldColors: colorMapping,
      fieldTypes: fieldTypesMap
    };
  }, [data, filteredData, isBrushActive, xKey, yField, externalColorMap, isExpanded, isModalBrushActive, modalFilteredData]);

  // Handle mouse leave for tooltip
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
    
    // Calculate bar width based on the actual rendered data
    const barWidth = innerWidth / chartData.length;
    
    // Calculate the index of the bar under the mouse pointer
    const barIndex = Math.floor(adjustedMouseX / barWidth);
    
    // Validate the index
    if (barIndex < 0 || barIndex >= chartData.length) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the data point at this index
    const dataPoint = chartData[barIndex];
    if (!dataPoint) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }

    const xValue = dataPoint[xKey];
    
    // Calculate tooltip position
    const tooltipLeft = mouseX;
    const tooltipTop = Math.max(mouseY - 10, 10);
    
    // Only update if showing a new x-value or hiding previous one
    if (!tooltip.visible || tooltip.key !== xValue) {
      // For all fields, show their values
      const tooltipItems = fields
        .filter(field => {
          // Only include fields with non-zero values
          const value = Number(dataPoint[field]);
          return !isNaN(value) && value > 0;
        })
        .map(field => {
          // Find the original YAxisConfig for this field to get the unit
          let fieldUnit = undefined;
          if (Array.isArray(yField)) {
            const fieldConfig = yField.find(f => {
              const fName = typeof f === 'string' ? f : f.field;
              return fName === field;
            });
            fieldUnit = typeof fieldConfig === 'string' ? undefined : fieldConfig?.unit;
          }

          return {
            label: field,
            value: formatWithUnit(Number(dataPoint[field]) || 0, fieldUnit, yAxisUnit),
            color: fieldColors[field] || blue,
            // Use different shape for bar vs line
            shape: fieldTypes[field] === 'line' ? 'circle' as 'circle' : 'square' as 'square'
          };
        });
      
      // If no values found, show placeholder
      if (tooltipItems.length === 0 && fields.length > 0) {
        tooltipItems.push({
          label: fields[0],
          value: formatWithUnit(0, undefined, yAxisUnit),
          color: fieldColors[fields[0]] || blue,
          shape: fieldTypes[fields[0]] === 'line' ? 'circle' as 'circle' : 'square' as 'square'
        });
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
  }, [chartData, fields, xKey, fieldColors, fieldTypes, formatWithUnit, tooltip, yAxisUnit, yField]);

  // Process brush data
  const brushData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Filter and ensure x values are valid
    const processedData = data.filter(d => d[xKey] !== undefined && d[xKey] !== null);
    
    // Create synthetic dates for brush
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    // Get the first field for brush data
    const firstField = fields.length > 0 ? fields[0] : '';
    
    // Create date points for the brush
    return processedData.map((d, i) => {
      // Try to parse date from x value or use synthetic date
      let date;
      if (typeof d[xKey] === 'string' && 
         (d[xKey].match(/^\d{4}-\d{2}-\d{2}/) || 
          /^\d{2}\/\d{2}\/\d{4}/.test(d[xKey]) ||
          /^[A-Za-z]{3}\s\d{4}$/.test(d[xKey]) || 
          /^\d{4}$/.test(d[xKey]))) {
        date = new Date(d[xKey]);
        if (isNaN(date.getTime())) {
          date = new Date(baseDate);
          date.setDate(baseDate.getDate() + i);
        }
      } else {
        date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
      }
      
      return {
        date,
        value: Number(d[firstField]) || 0,
        originalData: d
      };
    });
  }, [data, xKey, fields]);

  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
       
        setFilteredData([]);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    
    // Update brush domain
    setBrushDomain([new Date(x0), new Date(x1)]);
    
    // Filter data based on brush selection
    const selectedItems = brushData
      .filter(item => item.date >= new Date(x0) && item.date <= new Date(x1))
      .map(item => item.originalData);
      
    setFilteredData(selectedItems);
    
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive, brushData]);
  
  // Handle modal brush change
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
       
        setModalFilteredData([]);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    
    // Update modal brush domain
    setModalBrushDomain([new Date(x0), new Date(x1)]);
    
    // Filter data based on brush selection
    const selectedItems = brushData
      .filter(item => item.date >= new Date(x0) && item.date <= new Date(x1))
      .map(item => item.originalData);
      
    setModalFilteredData(selectedItems);
    
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive, brushData]);

  // Update legend items when chart data changes
  useEffect(() => {
    if (chartData.length > 0 && fields.length > 0) {
      const newLegendItems = fields.map(field => ({
        id: field,
        label: field,
        color: fieldColors[field] || blue
      }));
      
      setLegendItems(newLegendItems);
    }
  }, [chartData, fields, fieldColors]);

  // Set isClient to true when component mounts in browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render content function
  const renderChartContent = useCallback((chartWidth: number, chartHeight: number, isModal = false) => {
    // Show error state or no data
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
      domain: chartData.map(d => d[xKey]),
      range: [0, innerWidth],
      padding: 0.2,
    });
    
    // Calculate max value for y-axis
    const yMax = Math.max(
      ...chartData.flatMap(d => 
        fields.map(field => Number(d[field]) || 0)
      ), 
      1
    );
    
    const yScale = scaleLinear<number>({
      domain: [0, yMax * 1.1], // Add 10% padding
      range: [innerHeight, 0],
      nice: true,
      clamp: true,
    });
    
    // Create line data for series that should be rendered as lines
    const lineDataByField: Record<string, Array<{x: number, y: number}>> = {};
    
    // Initialize data structure for each field that should be a line
    fields.forEach(field => {
      if (fieldTypes[field] === 'line') {
        lineDataByField[field] = [];
      }
    });
    
    // Build line points
    chartData.forEach(d => {
      fields.forEach(field => {
        if (fieldTypes[field] === 'line') {
          const x = xScale(d[xKey]) || 0;
          const centerX = x + (xScale.bandwidth() / 2); // Center of the bar
          const y = yScale(Number(d[field]) || 0);
          
          lineDataByField[field].push({ x: centerX, y });
        }
      });
    });
    
    // Sort line data by x position
    Object.keys(lineDataByField).forEach(field => {
      lineDataByField[field].sort((a, b) => a.x - b.x);
    });
    
    // Calculate x-axis tick values - limit to 8 for date data
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
        {/* Tooltip - only show for non-modal version, modal has its own tooltip container */}
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
                // Format date labels based on timeFilter
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
                  
                  // For other date formats, use the helper function
                  return formatXAxisLabel(value, filterValues?.timeFilter);
                }
                
                // For non-date values, format using our helper function
                return formatXAxisLabel(String(value), filterValues?.timeFilter);
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
            
            {/* Render bars first (so lines appear on top) */}
            {chartData.map((d, i) => (
              <React.Fragment key={`bars-${i}`}>
                {fields.map((field, fieldIndex) => {
                  // Skip if this field should be rendered as a line
                  if (fieldTypes[field] === 'line') return null;
                  
                  // Determine how many fields should be rendered as bars
                  const barFields = fields.filter(f => fieldTypes[f] !== 'line');
                  const barWidth = xScale.bandwidth() / barFields.length;
                  
                  // Find this field's position in the barFields array
                  const barFieldIndex = barFields.indexOf(field);
                  
                  // Calculate bar dimensions
                  const value = Number(d[field]) || 0;
                  const barHeight = innerHeight - yScale(value);
                  const barX = (xScale(d[xKey]) || 0) + (barFieldIndex * barWidth);
                  const barY = innerHeight - barHeight;
                  
                  return (
                    <Bar
                      key={`bar-${i}-${field}`}
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={fieldColors[field]}
                      opacity={tooltip.visible && tooltip.key === d[xKey] ? 1 : 0.8}
                      rx={2}
                    />
                  );
                })}
              </React.Fragment>
            ))}
            
            {/* Render lines on top of bars */}
            {fields.map(field => {
              // Only render fields configured as lines
              if (fieldTypes[field] !== 'line') return null;
              
              const lineData = lineDataByField[field];
              if (!lineData || lineData.length === 0) return null;
              
              return (
                <LinePath
                  key={`line-${field}`}
                  data={lineData}
                  x={d => d.x}
                  y={d => d.y}
                  stroke={fieldColors[field]}
                  strokeWidth={2}
                  curve={curveCatmullRom}
                />
              );
            })}
          </Group>
        </svg>
      </div>
    );
  }, [
    chartData, fields, xKey, error, refreshData,
    handleMouseMove, handleMouseLeave,
    tooltip, fieldColors, fieldTypes, formatTickValue, modalChartRef
  ]);

  // Render the brush with proper shape reflecting bar values
  const renderBrushArea = useCallback((modalView = false) => {
    if (!brushData || brushData.length === 0) return null;
    
    return (
      <div className="h-[18%] w-full mt-2">
        <BrushTimeScale
          data={brushData}
          activeBrushDomain={modalView ? modalBrushDomain : brushDomain}
          onBrushChange={modalView ? handleModalBrushChange : handleBrushChange}
          onClearBrush={() => {
            if (modalView) {
              setModalBrushDomain(null);
              setIsModalBrushActive(true); // Keep active but reset domain
              setModalFilteredData(data); // Reset to full dataset
            } else {
              setBrushDomain(null);
              setIsBrushActive(true); // Keep active but reset domain
              setFilteredData(data); // Reset to full dataset
            }
          }}
          getDate={(d) => d.date}
          getValue={(d) => d.value}
          lineColor="#60a5fa"
          margin={{ top: 0, right: 15, bottom: modalView ? 10 : 20, left: 40 }}
          isModal={modalView}
          curveType="catmullRom"
          strokeWidth={2}
          filterValues={modalView ? modalFilterValues : filterValues}
        />
      </div>
    );
  }, [
    brushData, modalBrushDomain, brushDomain, handleModalBrushChange, handleBrushChange,
    setModalBrushDomain, setIsModalBrushActive, setModalFilteredData, setBrushDomain,
    setIsBrushActive, setFilteredData, data, modalFilterValues, filterValues
  ]);

  // Render the chart with brush
  return (
    <>
      {/* Expanded view in modal */}
      {isExpanded && isClient ? (
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
                      onChange={(value) => handleModalFilterChange('timeFilter', value)}
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
                    onChange={(value) => handleModalFilterChange('currencyFilter', value)}
                    options={chartConfig.additionalOptions.filters.currencyFilter.options}
                    
                  />
                )}
                
                {/* Display mode filter */}
                {chartConfig.additionalOptions?.filters?.displayModeFilter && (
                  <div className="flex items-center">
                    <DisplayModeFilter
                      mode={(modalFilterValues?.displayMode || chartConfig.additionalOptions.filters.displayModeFilter.activeValue || 'absolute') as DisplayMode}
                      onChange={(value) => handleModalFilterChange('displayMode', value)}
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
                        timeFilter={modalFilterValues?.timeFilter}
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
                      shape={fieldTypes[item.id] === 'line' ? 'circle' : 'square'}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      ) : (
        // Normal view with brush
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
            <div className="h-[15%] w-full flex items-center justify-center text-gray-500 text-sm">
              No brush data available
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default React.memo(MultiSeriesLineBarChart); 