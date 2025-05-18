import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { scaleLinear, scaleTime } from '@visx/scale';
import { Brush } from '@visx/brush';
import { LinePath } from '@visx/shape';
import { curveMonotoneX, curveLinear, curveStep, curveBasis, curveCardinal, curveCatmullRom } from '@visx/curve';

export interface BrushTimeScaleProps {
  data: any[];
  isModal?: boolean;
  activeBrushDomain: [Date, Date] | null;
  onBrushChange: (domain: any) => void;
  onClearBrush: () => void;
  // Function that extracts date from data point, can return string or Date
  getDate: (d: any) => string | Date;
  // Function that extracts value for the line from data point
  getValue: (d: any) => number;
  // Function for organizing data by unique dates
  getUniqueDates?: (data: any[]) => string[];
  // Line color
  lineColor: string;
  // Optional margin
  margin?: { top: number; right: number; bottom: number; left: number };
  // Custom curve type
  curveType?: string | null;
  // Stroke width
  strokeWidth?: number;
  // Filter values - when these change, brush should reset to fully selected mode
  filterValues?: Record<string, string>;
}

const BrushTimeScale: React.FC<BrushTimeScaleProps> = ({
  data,
  isModal = false,
  activeBrushDomain,
  onBrushChange,
  onClearBrush,
  getDate,
  getValue,
  getUniqueDates,
  lineColor,
  margin = { top: 5, right: 25, bottom: 10, left: 45 },
  curveType = "monotoneX",
  strokeWidth,
  filterValues
}) => {
  // Prevent the initial render from triggering onChange
  const initialRenderRef = useRef(true);
  
  // Track the brush instance to prevent unnecessary updates
  const brushRef = useRef<any>(null);
  
  // Add a ref to the SVG container so we can find DOM elements more reliably
  const svgRef = useRef<SVGSVGElement | null>(null);
  
  // Generate a stable ID for this component instance
  const instanceIdRef = useRef(`brush-${Math.random().toString(36).substring(2, 9)}`);
  
  // Create a stable key for the Brush component that only changes when data changes
  const brushKey = React.useMemo(() => {
    return `${instanceIdRef.current}-${data.length}`;
  }, [data.length]);
  
  // Track previous filter values to detect changes
  const prevFilterValuesRef = useRef<Record<string, string> | undefined>(filterValues);

  // Effect to reset brush when filter values change
  useEffect(() => {
    // Skip the initial render
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    // Check if filterValues exist and have changed
    if (filterValues && prevFilterValuesRef.current) {
      // Check if any filter values have changed
      const hasFilterChanged = Object.keys(filterValues).some(key => 
        filterValues[key] !== prevFilterValuesRef.current?.[key]
      );

      if (hasFilterChanged) {
        console.log('Filter changed, resetting brush to show full dataset');
        
        // Reset the brush to show the full dataset
        onClearBrush();
        
        // Force visual reset of the brush selection by manipulating the DOM
        setTimeout(() => {
          // Use the SVG reference to scope our search to just this component
          if (svgRef.current) {
            const selectionRect = svgRef.current.querySelector('.visx-brush-selection');
            const brushElement = svgRef.current.querySelector('.visx-brush');
            
            if (selectionRect && brushElement) {
              const containerWidth = brushElement.getBoundingClientRect().width;
              // Reset to full width with slight padding
              selectionRect.setAttribute('width', String(containerWidth - 4));
              selectionRect.setAttribute('x', '2');
              console.log(`Reset brush to width: ${containerWidth - 4}, x: 2`);
            } else {
              console.log('Could not find brush elements within SVG');
            }
          } else {
            // Fallback to document-wide search if SVG ref isn't available
            console.log('Falling back to document-wide search');
            const allSelections = document.querySelectorAll('.visx-brush-selection');
            const allBrushes = document.querySelectorAll('.visx-brush');
            
            if (allSelections.length > 0 && allBrushes.length > 0) {
              const selectionRect = allSelections[0];
              const brushElement = allBrushes[0];
              
              const containerWidth = brushElement.getBoundingClientRect().width;
              selectionRect.setAttribute('width', String(containerWidth - 4));
              selectionRect.setAttribute('x', '2');
              console.log(`Reset brush using fallback method: width: ${containerWidth - 4}, x: 2`);
            } else {
              console.log('Could not find any brush elements in document');
            }
          }
        }, 50);
      }
    }

    // Update ref for next comparison
    prevFilterValuesRef.current = filterValues;
  }, [filterValues, onClearBrush]);
  
  // Map curve type string to actual curve function
  const getCurveFunction = useCallback((type: string | null) => {
    // Always return a valid curve function
    if (type === null) return curveLinear;
    
    switch (type) {
      case 'monotoneX':
        return curveMonotoneX;
      case 'linear':
        return curveLinear;
      case 'step':
        return curveStep;
      case 'basis':
        return curveBasis;
      case 'cardinal':
        return curveCardinal;
      case 'catmullRom':
        return curveCatmullRom;
      default:
        return curveMonotoneX; // Default
    }
  }, []);
  
  // Get the actual curve function
  const curveFunction = React.useMemo(() => {
    return getCurveFunction(curveType);
  }, [curveType, getCurveFunction]);
  
  if (data.length === 0) return null;
  
  return (
    <div className="h-full w-full">
      <ParentSize>
        {({ width, height }) => {
          if (width <= 0 || height <= 0) return null;
          
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;
          if (innerWidth <= 0 || innerHeight <= 0) return null;
          
          // Handle unique dates if provided
          const uniqueDates = getUniqueDates 
            ? getUniqueDates(data)
            : [...new Set(data.map(d => {
                const dateValue = getDate(d);
                return typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
              }))];
          
          // Convert dates to Date objects for the time scale
          const dateDomain = uniqueDates.map(d => new Date(d));
          const dateExtent = [
            new Date(Math.min(...dateDomain.map(d => d.getTime()))),
            new Date(Math.max(...dateDomain.map(d => d.getTime())))
          ];
          
          // Use scaleTime for the brush
          const brushDateScale = scaleTime<number>({
            domain: dateExtent,
            range: [0, innerWidth],
            nice: true
          });
          
          // Find max value for Y axis scale (ensuring we don't have bad values)
          let allValues = data.map(d => {
            const val = getValue(d);
            return (val === undefined || val === null || isNaN(val)) ? 0 : val;
          });
          
          // Ensure we have at least one positive value for scale
          if (allValues.length === 0 || Math.max(...allValues) <= 0) {
            allValues = [1];
          }
          
          const maxValue = Math.max(...allValues);
          
          const valueScale = scaleLinear<number>({
            domain: [0, maxValue * 1.1], // Add 10% headroom
            range: [innerHeight, 0],
            nice: true,
            round: false // Prevent rounding to ensure all gridlines show
          });
          
          // Create linear scale for distributing indices
          const indexScale = scaleLinear({
            domain: [0, uniqueDates.length - 1],
            range: [0, innerWidth],
          });
          
          // Calculate initial brush position
          const initialBrushPosition = activeBrushDomain
            ? { 
                start: { x: brushDateScale(activeBrushDomain[0]) }, 
                end: { x: brushDateScale(activeBrushDomain[1]) } 
              }
            : { 
                start: { x: 0 }, 
                end: { x: innerWidth } 
              };
          
          // If getUniqueDates is provided, we need to create line data by dates
          const lineData = getUniqueDates 
            ? uniqueDates.map((date, idx) => {
                // Find data point for this date - assumes first match is representative
                const dataPoint = data.find(d => {
                  const dateValue = getDate(d);
                  return typeof dateValue === 'string' 
                    ? dateValue === date 
                    : dateValue.toISOString() === date;
                });
                return {
                  date,
                  idx,
                  value: dataPoint ? getValue(dataPoint) : 0
                };
              })
            // Otherwise use data directly with indices
            : data.map((d, idx) => {
                // Ensure valid values for the line path
                const val = getValue(d);
                const safeValue = (val === undefined || val === null || isNaN(val)) ? 0 : val;
                
                return {
                  date: typeof getDate(d) === 'string' ? getDate(d) as string : (getDate(d) as Date).toISOString(),
                  idx,
                  value: safeValue
                };
              });
              
          // Create a wrapped change handler that prevents the initial render from triggering updates
          const handleBrushChange = (domain: any) => {
            if (domain) {
              // Use requestAnimationFrame to avoid React update loops
              window.requestAnimationFrame(() => {
                onBrushChange(domain);
              });
            } else {
              onClearBrush();
            }
          };
          
          return (
            <svg width={width} height={height} ref={svgRef}>
              <Group left={margin.left} top={margin.top}>
                {/* Background rectangle to ensure brush is visible when empty */}
                <rect
                  x={0}
                  y={0}
                  width={innerWidth}
                  height={innerHeight}
                  fill="transparent"
                />
                
                {/* Line representing the data */}
                <LinePath 
                  data={lineData}
                  x={(d) => indexScale(d.idx)}
                  y={(d) => {
                    // Ensure we have valid values
                    const val = d.value;
                    if (val === undefined || val === null || isNaN(val)) {
                      return valueScale(0);
                    }
                    return valueScale(val);
                  }}
                  stroke={lineColor || "#53a7fe"}
                  strokeOpacity={0.3}
                  strokeWidth={strokeWidth || 1.5}
                  curve={curveFunction}
                />
                
                <Brush
                  key={brushKey}
                  ref={brushRef}
                  xScale={brushDateScale}
                  yScale={valueScale}
                  width={innerWidth}
                  height={innerHeight}
                  handleSize={8}
                  resizeTriggerAreas={['left', 'right']}
                  brushDirection="horizontal"
                  initialBrushPosition={initialBrushPosition}
                  onChange={handleBrushChange}
                  onClick={onClearBrush}
                  useWindowMoveEvents={true}
                  selectedBoxStyle={{ 
                    fill: 'rgba(96, 165, 250, 0.1)', // Very light transparent fill
                    stroke: '#374151', // Border color
                    strokeWidth: 0.5,
                    rx: 4,
                    ry: 4,
                  }}
                />
              </Group>
            </svg>
          );
        }}
      </ParentSize>
    </div>
  );
};

export default BrushTimeScale; 