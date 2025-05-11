"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { ParentSize } from '@visx/responsive';
import { TxnFeesDataPoint, fetchTxnFeesData, formatFees } from "@/app/api/overview/network-usage/txnFeesData";
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import ChartTooltip from "@/app/components/shared/ChartTooltip";
import Modal from "@/app/components/shared/Modal";
import { extent } from "@visx/vendor/d3-array";
import { localPoint } from "@visx/event";
import { useTooltip, defaultStyles } from '@visx/tooltip';
import { TooltipWithBounds } from '@visx/tooltip';

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Colors
const primaryColor = "#4682b4"; // steel blue
const axisColor = "#9CA3AF"; // gray-400
const gridColor = "rgba(156, 163, 175, 0.1)"; // translucent gray-400

interface TxnFeesChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

const TxnFeesChart: React.FC<TxnFeesChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
}) => {
  // State for main chart
  const [data, setData] = useState<TxnFeesDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for modal
  const [modalData, setModalData] = useState<TxnFeesDataPoint[]>([]);
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
  } = useTooltip<TxnFeesDataPoint>();

  // Fetch data function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const txnFeesData = await fetchTxnFeesData();
      
      if (txnFeesData.length === 0) {
        setError('No data available for transaction fees.');
        setData([]);
      } else {
        setData(txnFeesData);
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
        fetchTxnFeesData()
          .then(txnFeesData => {
            setModalData(txnFeesData);
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
    (event: React.MouseEvent<SVGRectElement>, xScale: any, yScale: any, chartData: TxnFeesDataPoint[], width: number, height: number, margin: { left: number, right: number, top: number, bottom: number }) => {
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
        const top = yScale(dataPoint.Average_Transaction_Fees);
        const left = xScale(new Date(dataPoint.block_date));
        
        showTooltip({
          tooltipData: dataPoint,
          tooltipLeft: left + margin.left,
          tooltipTop: top + margin.top,
        });
      }
    },
    [showTooltip]
  );

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
            fetchTxnFeesData()
              .then(txnFeesData => {
                setModalData(txnFeesData);
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
            
            // Transaction fee scale
            const yScale = scaleLinear({
              domain: [0, Math.max(...chartData.map(d => d.Average_Transaction_Fees)) * 1.1],
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
                    
                    {/* Line */}
                    <LinePath
                      data={chartData}
                      x={d => xScale(new Date(d.block_date))}
                      y={d => yScale(d.Average_Transaction_Fees)}
                      stroke={primaryColor}
                      strokeWidth={2.5}
                      curve={curveMonotoneX}
                    />
                    
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
                        return formatFees(typeof value === 'number' ? value : Number(value));
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
                    
                    {/* Tooltip marker */}
                    {tooltipOpen && tooltipData && (
                      <circle
                        cx={xScale(new Date(tooltipData.block_date))}
                        cy={yScale(tooltipData.Average_Transaction_Fees)}
                        r={5}
                        fill={primaryColor}
                        stroke="white"
                        strokeWidth={2}
                        pointerEvents="none"
                      />
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
                  Average Transaction Fees
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
                    <div className="text-sm font-medium mb-1">
                      {formatDate(tooltipData.block_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs">
                        {formatFees(tooltipData.Average_Transaction_Fees)}
                      </span>
                    </div>
                  </TooltipWithBounds>
                )}
              </div>
            );
          }}
        </ParentSize>
      </div>
    );
  };

  // Function to download data as CSV
  const downloadCSV = () => {
    const chartData = isModalOpen ? modalData : data;
    
    // Create CSV content
    const headers = ["Date", "Average Transaction Fees"];
    const csvContent = [
      headers.join(","),
      ...chartData.map(item => {
        return [
          item.block_date,
          item.Average_Transaction_Fees
        ].join(",");
      })
    ].join("\n");

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transaction_fees_${new Date().toISOString().split("T")[0]}.csv`);
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
          title="Average Transaction Fees" 
          subtitle="Average fees paid per transaction over time"
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

export default TxnFeesChart; 