"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { ParentSize } from '@visx/responsive';
import { TPSDataPoint, fetchTPSData, formatTPS } from "@/app/api/overview/network-usage/tpsData";
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import Modal from "@/app/components/shared/Modal";
import { extent, max } from "@visx/vendor/d3-array";
import { localPoint } from "@visx/event";
import { useTooltip, defaultStyles } from '@visx/tooltip';
import { TooltipWithBounds } from '@visx/tooltip';
import { LegendOrdinal } from "@visx/legend";
import { scaleOrdinal } from '@visx/scale';

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Colors
const colorMap = {
  Total_TPS: "#4682b4", // steel blue
  Success_TPS: "#2ecc71", // green
  Failed_TPS: "#e74c3c", // red
  Real_TPS: "#9b59b6", // purple
};

const labelMap = {
  Total_TPS: "Total TPS",
  Success_TPS: "Success TPS",
  Failed_TPS: "Failed TPS",
  Real_TPS: "Real TPS",
};

const axisColor = "#9CA3AF"; // gray-400
const gridColor = "rgba(156, 163, 175, 0.1)"; // translucent gray-400

interface TPSChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

const TPSChart: React.FC<TPSChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
}) => {
  // State for main chart
  const [data, setData] = useState<TPSDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLines, setActiveLines] = useState<Record<string, boolean>>({
    Total_TPS: true,
    Success_TPS: true,
    Failed_TPS: true,
    Real_TPS: true,
  });
  
  // State for modal
  const [modalData, setModalData] = useState<TPSDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  
  // Refs for chart containers
  const chartRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // Tooltip setup
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip
  } = useTooltip<TPSDataPoint>();

  // Color scale
  const colorScale = scaleOrdinal({
    domain: Object.keys(colorMap),
    range: Object.values(colorMap),
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tpsData = await fetchTPSData();
      
      if (tpsData.length === 0) {
        setError('No data available for TPS.');
        setData([]);
      } else {
        setData(tpsData);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data.';
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setModalLoading(true);
      if (data.length > 0) {
        setModalData(data);
        setModalLoading(false);
      } else {
        fetchTPSData()
          .then(tpsData => {
            setModalData(tpsData);
          })
          .catch(err => {
            console.error('Error loading modal chart data:', err);
          })
          .finally(() => {
            setModalLoading(false);
          });
      }
    }
  }, [isModalOpen, data]);

  // Format date 
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }, []);

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>, xScale: any, yScale: any, chartData: TPSDataPoint[], width: number, height: number, margin: { left: number, right: number, top: number, bottom: number }) => {
      const point = localPoint(event) || { x: 0, y: 0 };
      const x = point.x - margin.left;
      
      // Find the closest data point to the mouse x position
      if (chartData.length > 0) {
        const dates = chartData.map(d => new Date(d.block_date).getTime());
        const xValue = xScale.invert(x).getTime();
        
        // Find the closest index
        let closestIndex = 0;
        let minDiff = Math.abs(dates[0] - xValue);
        
        for (let i = 1; i < dates.length; i++) {
          const diff = Math.abs(dates[i] - xValue);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }
        
        const dataPoint = chartData[closestIndex];
        const top = yScale(Math.max(
          activeLines.Total_TPS ? dataPoint.Total_TPS : 0,
          activeLines.Success_TPS ? dataPoint.Success_TPS : 0,
          activeLines.Failed_TPS ? dataPoint.Failed_TPS : 0,
          activeLines.Real_TPS ? dataPoint.Real_TPS : 0
        ));
        const left = xScale(new Date(dataPoint.block_date));
        
        showTooltip({
          tooltipData: dataPoint,
          tooltipLeft: left + margin.left,
          tooltipTop: top + margin.top,
        });
      }
    },
    [showTooltip, activeLines]
  );

  // Toggle a line's visibility
  const toggleLine = (key: string) => {
    setActiveLines(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Render the chart content
  const renderChartContent = (isModal: boolean = false) => {
    const chartData = isModal ? modalData : data;
    const isChartLoading = isModal ? modalLoading : loading;
    
    // Set margin
    const margin = { top: 20, right: 30, bottom: 50, left: isModal ? 80 : 60 };
    
    if (isChartLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <Loader size="sm" />
        </div>
      );
    }

    if (error || chartData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <p className="text-red-400 mb-3 text-sm">{error || 'No data available'}</p>
          <ButtonSecondary onClick={isModal ? () => {
            setModalLoading(true);
            fetchTPSData()
              .then(tpsData => {
                setModalData(tpsData);
              })
              .catch(err => {
                console.error('Error loading modal chart data:', err);
              })
              .finally(() => {
                setModalLoading(false);
              });
          } : fetchData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Retry</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    return (
      <div className="relative h-full w-full" ref={isModal ? modalChartRef : chartRef}>
        <ParentSize>
          {({ width, height }) => {
            // Create scales
            const xMax = width - margin.left - margin.right;
            const yMax = height - margin.top - margin.bottom;
            
            // Date scale
            const xScale = scaleTime({
              domain: extent(chartData, d => new Date(d.block_date)) as [Date, Date],
              range: [0, xMax],
            });
            
            // TPS scale
            const yScale = scaleLinear({
              domain: [0, max(chartData, d => Math.max(
                activeLines.Total_TPS ? d.Total_TPS : 0,
                activeLines.Success_TPS ? d.Success_TPS : 0,
                activeLines.Failed_TPS ? d.Failed_TPS : 0, 
                activeLines.Real_TPS ? d.Real_TPS : 0
              )) as number * 1.1],
              range: [yMax, 0],
              nice: true,
            });
            
            return (
              <div>
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid */}
                    <GridRows
                      scale={yScale}
                      width={xMax}
                      height={yMax}
                      stroke={gridColor}
                      numTicks={5}
                    />
                    
                    {/* Lines */}
                    {activeLines.Total_TPS && (
                      <LinePath
                        data={chartData}
                        x={d => xScale(new Date(d.block_date))}
                        y={d => yScale(d.Total_TPS)}
                        stroke={colorMap.Total_TPS}
                        strokeWidth={2.5}
                        curve={curveMonotoneX}
                      />
                    )}
                    
                    {activeLines.Success_TPS && (
                      <LinePath
                        data={chartData}
                        x={d => xScale(new Date(d.block_date))}
                        y={d => yScale(d.Success_TPS)}
                        stroke={colorMap.Success_TPS}
                        strokeWidth={2.5}
                        curve={curveMonotoneX}
                      />
                    )}
                    
                    {activeLines.Failed_TPS && (
                      <LinePath
                        data={chartData}
                        x={d => xScale(new Date(d.block_date))}
                        y={d => yScale(d.Failed_TPS)}
                        stroke={colorMap.Failed_TPS}
                        strokeWidth={2.5}
                        curve={curveMonotoneX}
                      />
                    )}
                    
                    {activeLines.Real_TPS && (
                      <LinePath
                        data={chartData}
                        x={d => xScale(new Date(d.block_date))}
                        y={d => yScale(d.Real_TPS)}
                        stroke={colorMap.Real_TPS}
                        strokeWidth={2.5}
                        curve={curveMonotoneX}
                      />
                    )}
                    
                    {/* Axes */}
                    <AxisBottom
                      top={yMax}
                      scale={xScale}
                      numTicks={isModal ? 10 : 5}
                      stroke={axisColor}
                      tickStroke={axisColor}
                      tickLabelProps={() => ({
                        fill: axisColor,
                        fontSize: 10,
                        textAnchor: 'middle',
                        dy: '0.5em',
                      })}
                      tickFormat={(date) => {
                        if (date instanceof Date) {
                          return formatDate(date.toISOString());
                        }
                        return '';
                      }}
                    />
                    <AxisLeft
                      scale={yScale}
                      numTicks={5}
                      stroke={axisColor}
                      tickStroke={axisColor}
                      tickLabelProps={() => ({
                        fill: axisColor,
                        fontSize: 10,
                        textAnchor: 'end',
                        dx: '-0.5em',
                        dy: '0.3em',
                      })}
                      tickFormat={(value) => {
                        return formatTPS(typeof value === 'number' ? value : Number(value));
                      }}
                    />
                    
                    {/* Tooltip overlay */}
                    <rect
                      x={0}
                      y={0}
                      width={xMax}
                      height={yMax}
                      fill="transparent"
                      onMouseMove={(event) => handleMouseMove(event, xScale, yScale, chartData, width, height, margin)}
                      onMouseLeave={() => hideTooltip()}
                    />
                    
                    {/* Tooltip markers */}
                    {tooltipOpen && tooltipData && (
                      <>
                        {activeLines.Total_TPS && (
                          <circle
                            cx={xScale(new Date(tooltipData.block_date))}
                            cy={yScale(tooltipData.Total_TPS)}
                            r={4}
                            fill={colorMap.Total_TPS}
                            stroke="white"
                            strokeWidth={2}
                            pointerEvents="none"
                          />
                        )}
                        {activeLines.Success_TPS && (
                          <circle
                            cx={xScale(new Date(tooltipData.block_date))}
                            cy={yScale(tooltipData.Success_TPS)}
                            r={4}
                            fill={colorMap.Success_TPS}
                            stroke="white"
                            strokeWidth={2}
                            pointerEvents="none"
                          />
                        )}
                        {activeLines.Failed_TPS && (
                          <circle
                            cx={xScale(new Date(tooltipData.block_date))}
                            cy={yScale(tooltipData.Failed_TPS)}
                            r={4}
                            fill={colorMap.Failed_TPS}
                            stroke="white"
                            strokeWidth={2}
                            pointerEvents="none"
                          />
                        )}
                        {activeLines.Real_TPS && (
                          <circle
                            cx={xScale(new Date(tooltipData.block_date))}
                            cy={yScale(tooltipData.Real_TPS)}
                            r={4}
                            fill={colorMap.Real_TPS}
                            stroke="white"
                            strokeWidth={2}
                            pointerEvents="none"
                          />
                        )}
                      </>
                    )}
                  </Group>
                </svg>
                
                {/* Axis labels */}
                <div className="text-center text-gray-400 text-xs mt-2">Date</div>
                <div 
                  className="absolute text-gray-400 text-xs" 
                  style={{ 
                    left: 0, 
                    top: '50%', 
                    transform: 'rotate(-90deg) translateX(50%)', 
                    transformOrigin: 'left center' 
                  }}
                >
                  Transactions Per Second (TPS)
                </div>
                
                {/* Tooltip */}
                {tooltipOpen && tooltipData && (
                  <TooltipWithBounds
                    key={Math.random()}
                    top={tooltipTop}
                    left={tooltipLeft}
                    style={{
                      ...defaultStyles,
                      background: '#1F2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: 'white',
                      padding: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <div className="text-sm font-medium mb-2">
                      {formatDate(tooltipData.block_date)}
                    </div>
                    {activeLines.Total_TPS && (
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap.Total_TPS }}></div>
                        <span className="text-xs">Total: {formatTPS(tooltipData.Total_TPS)}</span>
                      </div>
                    )}
                    {activeLines.Success_TPS && (
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap.Success_TPS }}></div>
                        <span className="text-xs">Success: {formatTPS(tooltipData.Success_TPS)}</span>
                      </div>
                    )}
                    {activeLines.Failed_TPS && (
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap.Failed_TPS }}></div>
                        <span className="text-xs">Failed: {formatTPS(tooltipData.Failed_TPS)}</span>
                      </div>
                    )}
                    {activeLines.Real_TPS && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap.Real_TPS }}></div>
                        <span className="text-xs">Real: {formatTPS(tooltipData.Real_TPS)}</span>
                      </div>
                    )}
                  </TooltipWithBounds>
                )}
              </div>
            );
          }}
        </ParentSize>
        
        {/* Legend */}
        {isModal && (
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {Object.entries(labelMap).map(([key, label]) => (
              <button
                key={key}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition ${
                  activeLines[key as keyof typeof activeLines] 
                    ? 'bg-gray-800' 
                    : 'bg-gray-900 opacity-50'
                }`}
                onClick={() => toggleLine(key)}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: colorMap[key as keyof typeof colorMap] }}
                ></div>
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Function to download data as CSV
  const downloadCSV = () => {
    const chartData = isModalOpen ? modalData : data;
    
    // Create CSV content
    const headers = ["Date", "Total TPS", "Success TPS", "Failed TPS", "Real TPS"];
    const csvContent = [
      headers.join(","),
      ...chartData.map(item => {
        return [
          item.block_date,
          item.Total_TPS,
          item.Success_TPS,
          item.Failed_TPS,
          item.Real_TPS
        ].join(",");
      })
    ].join("\n");

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `solana_tps_data_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full w-full relative" ref={chartRef}>
      {renderChartContent(false)}
      
      {/* Modal */}
      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={onModalClose} 
          title="Transactions Per Second (TPS)" 
          subtitle="Shows the rate of transactions processed by the Solana network"
        >
          <div className="h-[70vh]">
            <div className="flex justify-end mb-4">
              <button 
                onClick={downloadCSV}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs rounded-md text-blue-400 hover:text-blue-300 transition-colors"
              >
                Download CSV
              </button>
            </div>
            
            <div className="h-[calc(100%-3rem)]">
              {renderChartContent(true)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TPSChart; 