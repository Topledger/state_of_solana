import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { scaleLinear, scaleTime } from '@visx/scale';
import { Brush } from '@visx/brush';
import { LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';

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
  margin = { top: 5, right: 25, bottom: 10, left: 45 }
}) => {
  // Prevent the initial render from triggering onChange
  const initialRenderRef = useRef(true);
  
  // Track the brush instance to prevent unnecessary updates
  const brushRef = useRef<any>(null);
  
  // Generate a stable ID for this component instance
  const instanceIdRef = useRef(`brush-${Math.random().toString(36).substring(2, 9)}`);
  
  // Create a stable key for the Brush component that only changes when data changes
  const brushKey = React.useMemo(() => {
    return `${instanceIdRef.current}-${data.length}`;
  }, [data.length]);
  
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
          
          // Find max value for Y axis scale
          const maxValue = Math.max(
            ...data.map(d => getValue(d)),
            1 // Ensure minimum scale even if all values are 0
          );
          
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
            : data.map((d, idx) => ({
                date: typeof getDate(d) === 'string' ? getDate(d) as string : (getDate(d) as Date).toISOString(),
                idx,
                value: getValue(d)
              }));
              
          // Create a wrapped change handler that prevents the initial render from triggering updates
          const handleBrushChange = (domain: any) => {
            if (initialRenderRef.current) {
              // Skip the first onChange event
              initialRenderRef.current = false;
              return;
            }
            
            if (!domain) {
              onClearBrush();
              return;
            }
            
            // Use requestAnimationFrame to avoid React update loops
            window.requestAnimationFrame(() => {
              onBrushChange(domain);
            });
          };
          
          return (
            <svg width={width} height={height}>
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
                  y={(d) => valueScale(d.value)}
                  stroke={lineColor || "#53a7fe"}
                  strokeOpacity={0.3}
                  strokeWidth={1.5}
                  curve={curveMonotoneX}
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