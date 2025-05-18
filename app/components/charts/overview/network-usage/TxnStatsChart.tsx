"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { LinePath, Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear, scaleBand } from '@visx/scale';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { ParentSize } from '@visx/responsive';
import { TxnStatsDataPoint, fetchTxnStatsData, formatNumber, formatPercentage } from "@/app/api/overview/network-usage/txnStatsData";
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import Modal from "@/app/components/shared/Modal";
import TimeFilterSelector from "@/app/components/shared/filters/TimeFilter";
import { extent, max } from "@visx/vendor/d3-array";
import { localPoint } from "@visx/event";
import { useTooltip, defaultStyles } from '@visx/tooltip';
import { TooltipWithBounds } from '@visx/tooltip';
import { blue, green, red, purple, grid, tickLabels } from '@/app/utils/chartColors';

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Colors for the chart elements
const colorMap = {
  Total_Vote_Transactions: blue,
  Total_Non_Vote_Transactions: green,
  Succeesful_Transactions_perc: red,
  Successful_Non_Vote_Transactiosn_perc: purple,
};

const labelMap = {
  Total_Vote_Transactions: "Vote Transactions",
  Total_Non_Vote_Transactions: "Non-Vote Transactions",
  Succeesful_Transactions_perc: "Success Rate (%)",
  Successful_Non_Vote_Transactiosn_perc: "Non-Vote Success Rate (%)",
};

// Constants for styling
const axisColor = tickLabels;
const gridColor = grid;

interface TxnStatsChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  timeView: 'M' | 'Q' | 'Y';
  onTimeViewChange: (value: 'M' | 'Q' | 'Y') => void;
}

const TxnStatsChart: React.FC<TxnStatsChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
  timeView,
  onTimeViewChange,
}) => {
  // State for main chart
  const [data, setData] = useState<TxnStatsDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLines, setActiveLines] = useState<Record<string, boolean>>({
    Total_Vote_Transactions: true,
    Total_Non_Vote_Transactions: true,
    Succeesful_Transactions_perc: true,
    Successful_Non_Vote_Transactiosn_perc: true,
  });
  
  // State for modal
  const [modalData, setModalData] = useState<TxnStatsDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalTimeView, setModalTimeView] = useState<'M' | 'Q' | 'Y'>(timeView);
  
  // Refs for chart containers
  const chartRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // State for dual Y-axis scales
  const [showTransactions, setShowTransactions] = useState(true);
  const [showPercentages, setShowPercentages] = useState(true);
  
  // Tooltip setup
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip
  } = useTooltip<TxnStatsDataPoint>();

  // Fetch data function
  const fetchData = useCallback(async (view: 'M' | 'Q' | 'Y') => {
    setLoading(true);
    setError(null);
    try {
      const txnStatsData = await fetchTxnStatsData(view);
      
      if (txnStatsData.length === 0) {
        setError('No data available for transaction statistics.');
        setData([]);
      } else {
        setData(txnStatsData);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data.';
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch modal data
  const fetchModalData = useCallback(async (view: 'M' | 'Q' | 'Y') => {
    setModalLoading(true);
    try {
      const txnStatsData = await fetchTxnStatsData(view);
      
      if (txnStatsData.length === 0) {
        setModalData([]);
      } else {
        setModalData(txnStatsData);
      }
    } catch (error) {
      console.error('Error loading modal chart data:', error);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Fetch data on mount and when timeView changes
  useEffect(() => {
    fetchData(timeView);
  }, [fetchData, timeView]);

  // Initialize modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setModalTimeView(timeView);
      setModalLoading(true);
      if (data.length > 0) {
        setModalData(data);
        setModalLoading(false);
      } else {
        fetchTxnStatsData(timeView)
          .then(txnStatsData => {
            setModalData(txnStatsData);
          })
          .catch(err => {
            console.error('Error loading modal chart data:', err);
          })
          .finally(() => {
            setModalLoading(false);
          });
      }
    }
  }, [isModalOpen, data, timeView]);

  // Format date based on timeView
  const formatDate = useCallback((dateStr: string, view: 'M' | 'Q' | 'Y') => {
    const date = new Date(dateStr);
    if (view === 'M') {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else if (view === 'Q') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    } else {
      return date.getFullYear().toString();
    }
  }, []);

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback(
    (
      event: React.MouseEvent<SVGRectElement>,
      xScale: any,
      transactionsScale: any,
      percentageScale: any,
      chartData: TxnStatsDataPoint[],
      width: number,
      height: number,
      margin: { left: number, right: number, top: number, bottom: number },
      isModal: boolean
    ) => {
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
        const left = xScale(new Date(dataPoint.block_date));
        
        // Calculate a reasonable tooltip position
        const top = percentageScale(Math.max(
          activeLines.Succeesful_Transactions_perc && dataPoint.Succeesful_Transactions_perc ? dataPoint.Succeesful_Transactions_perc : 0,
          activeLines.Successful_Non_Vote_Transactiosn_perc && dataPoint.Successful_Non_Vote_Transactiosn_perc ? dataPoint.Successful_Non_Vote_Transactiosn_perc : 0
        ));
        
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
    
    // Update axis visibility based on which lines are active
    if (key === 'Total_Vote_Transactions' || key === 'Total_Non_Vote_Transactions') {
      const otherTransactionKey = key === 'Total_Vote_Transactions' 
        ? 'Total_Non_Vote_Transactions'
        : 'Total_Vote_Transactions';
      
      if (!activeLines[key] && !activeLines[otherTransactionKey]) {
        setShowTransactions(true);
      } else if (activeLines[key] && !activeLines[otherTransactionKey]) {
        setShowTransactions(false);
      }
    } else if (key === 'Succeesful_Transactions_perc' || key === 'Successful_Non_Vote_Transactiosn_perc') {
      const otherPercentageKey = key === 'Succeesful_Transactions_perc'
        ? 'Successful_Non_Vote_Transactiosn_perc'
        : 'Succeesful_Transactions_perc';
      
      if (!activeLines[key] && !activeLines[otherPercentageKey]) {
        setShowPercentages(true);
      } else if (activeLines[key] && !activeLines[otherPercentageKey]) {
        setShowPercentages(false);
      }
    }
  };

  // Handle time view change in modal
  const handleModalTimeViewChange = (view: 'M' | 'Q' | 'Y') => {
    setModalTimeView(view);
    fetchModalData(view);
  };

  // Render the chart content
  const renderChartContent = (isModal: boolean = false) => {
    const chartData = isModal ? modalData : data;
    const isChartLoading = isModal ? modalLoading : loading;
    const currentTimeView = isModal ? modalTimeView : timeView;
    
    // Set margin
    const margin = { top: 20, right: 60, bottom: 50, left: isModal ? 80 : 60 };
    
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
          <ButtonSecondary onClick={isModal ? () => fetchModalData(modalTimeView) : () => fetchData(timeView)}>
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
            
            // Transactions scale (left y-axis)
            const transactionsScale = scaleLinear({
              domain: [0, max(chartData, d => Math.max(
                activeLines.Total_Vote_Transactions && d.Total_Vote_Transactions ? d.Total_Vote_Transactions : 0,
                activeLines.Total_Non_Vote_Transactions && d.Total_Non_Vote_Transactions ? d.Total_Non_Vote_Transactions : 0
              )) as number * 1.1],
              range: [yMax, 0],
              nice: true,
            });
            
            // Percentage scale (right y-axis)
            const percentageScale = scaleLinear({
              domain: [0, 100], // Percentages from 0 to 100
              range: [yMax, 0],
              nice: true,
            });
            
            // Band scale for bars
            const bandScale = scaleBand({
              domain: chartData.map(d => d.block_date),
              range: [0, xMax],
              padding: 0.2,
            });
            
            const barWidth = Math.min(bandScale.bandwidth() / 2, 15); // Limit bar width
            
            return (
              <div>
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid */}
                    <GridRows
                      scale={transactionsScale}
                      width={xMax}
                      height={yMax}
                      stroke={gridColor}
                      numTicks={5}
                    />
                    
                    {/* Transaction Bars */}
                    {chartData.map((d, i) => {
                      const date = new Date(d.block_date);
                      const xPos = xScale(date);
                      
                      return (
                        <React.Fragment key={`bars-${i}`}>
                          {activeLines.Total_Vote_Transactions && (
                            <Bar
                              x={xPos - barWidth - 1}
                              y={transactionsScale(d.Total_Vote_Transactions || 0)}
                              width={barWidth}
                              height={yMax - transactionsScale(d.Total_Vote_Transactions || 0)}
                              fill={colorMap.Total_Vote_Transactions}
                              opacity={0.8}
                            />
                          )}
                          
                          {activeLines.Total_Non_Vote_Transactions && (
                            <Bar
                              x={xPos + 1}
                              y={transactionsScale(d.Total_Non_Vote_Transactions || 0)}
                              width={barWidth}
                              height={yMax - transactionsScale(d.Total_Non_Vote_Transactions || 0)}
                              fill={colorMap.Total_Non_Vote_Transactions}
                              opacity={0.8}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Percentage Lines */}
                    {activeLines.Succeesful_Transactions_perc && (
                      <LinePath
                        data={chartData}
                        x={d => xScale(new Date(d.block_date))}
                        y={d => percentageScale(d.Succeesful_Transactions_perc || 0)}
                        stroke={colorMap.Succeesful_Transactions_perc}
                        strokeWidth={2.5}
                        strokeDasharray="4,4"
                        curve={curveMonotoneX}
                      />
                    )}
                    
                    {activeLines.Successful_Non_Vote_Transactiosn_perc && (
                      <LinePath
                        data={chartData}
                        x={d => xScale(new Date(d.block_date))}
                        y={d => percentageScale(d.Successful_Non_Vote_Transactiosn_perc || 0)}
                        stroke={colorMap.Successful_Non_Vote_Transactiosn_perc}
                        strokeWidth={2.5}
                        strokeDasharray="4,4"
                        curve={curveMonotoneX}
                      />
                    )}
                    
                    {/* X-Axis */}
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
                          return formatDate(date.toISOString(), currentTimeView);
                        }
                        return '';
                      }}
                    />
                    
                    {/* Left Y-Axis (Transactions) */}
                    {showTransactions && (
                      <AxisLeft
                        scale={transactionsScale}
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
                          return formatNumber(typeof value === 'number' ? value : Number(value));
                        }}
                      />
                    )}
                    
                    {/* Right Y-Axis (Percentages) */}
                    {showPercentages && (
                      <Group left={xMax}>
                        <AxisLeft
                          scale={percentageScale}
                          numTicks={5}
                          stroke={axisColor}
                          tickStroke={axisColor}
                          tickLabelProps={() => ({
                            fill: axisColor,
                            fontSize: 10,
                            textAnchor: 'start',
                            dx: '0.5em',
                            dy: '0.3em',
                          })}
                          tickFormat={(value) => {
                            return `${value}%`;
                          }}
                        />
                      </Group>
                    )}
                    
                    {/* Tooltip overlay */}
                    <rect
                      x={0}
                      y={0}
                      width={xMax}
                      height={yMax}
                      fill="transparent"
                      onMouseMove={(event) => handleMouseMove(
                        event,
                        xScale,
                        transactionsScale,
                        percentageScale,
                        chartData,
                        width,
                        height,
                        margin,
                        isModal
                      )}
                      onMouseLeave={() => hideTooltip()}
                    />
                    
                    {/* Tooltip markers */}
                    {tooltipOpen && tooltipData && (
                      <>
                        {activeLines.Succeesful_Transactions_perc && (
                          <circle
                            cx={xScale(new Date(tooltipData.block_date))}
                            cy={percentageScale(tooltipData.Succeesful_Transactions_perc || 0)}
                            r={4}
                            fill={colorMap.Succeesful_Transactions_perc}
                            stroke="white"
                            strokeWidth={2}
                            pointerEvents="none"
                          />
                        )}
                        {activeLines.Successful_Non_Vote_Transactiosn_perc && (
                          <circle
                            cx={xScale(new Date(tooltipData.block_date))}
                            cy={percentageScale(tooltipData.Successful_Non_Vote_Transactiosn_perc || 0)}
                            r={4}
                            fill={colorMap.Successful_Non_Vote_Transactiosn_perc}
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
                  Number of Transactions
                </div>
                {showPercentages && (
                  <div 
                    className="absolute text-gray-400 text-xs" 
                    style={{ 
                      right: 0, 
                      top: '50%', 
                      transform: 'rotate(90deg) translateX(-50%)', 
                      transformOrigin: 'right center' 
                    }}
                  >
                    Success Rate (%)
                  </div>
                )}
                
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
                      {formatDate(tooltipData.block_date, currentTimeView)}
                    </div>
                    {activeLines.Total_Vote_Transactions && (
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colorMap.Total_Vote_Transactions }}></div>
                        <span className="text-xs">Vote Txns: {formatNumber(tooltipData.Total_Vote_Transactions)}</span>
                      </div>
                    )}
                    {activeLines.Total_Non_Vote_Transactions && (
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colorMap.Total_Non_Vote_Transactions }}></div>
                        <span className="text-xs">Non-Vote Txns: {formatNumber(tooltipData.Total_Non_Vote_Transactions)}</span>
                      </div>
                    )}
                    {activeLines.Succeesful_Transactions_perc && (
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap.Succeesful_Transactions_perc }}></div>
                        <span className="text-xs">Success Rate: {formatPercentage(tooltipData.Succeesful_Transactions_perc)}</span>
                      </div>
                    )}
                    {activeLines.Successful_Non_Vote_Transactiosn_perc && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap.Successful_Non_Vote_Transactiosn_perc }}></div>
                        <span className="text-xs">Non-Vote Success: {formatPercentage(tooltipData.Successful_Non_Vote_Transactiosn_perc)}</span>
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
                  className={`w-3 h-3 ${
                    key.includes('perc') ? 'rounded-full border border-current bg-transparent' : 'rounded-sm'
                  }`}
                  style={{ 
                    backgroundColor: key.includes('perc') ? 'transparent' : colorMap[key as keyof typeof colorMap],
                    borderColor: key.includes('perc') ? colorMap[key as keyof typeof colorMap] : 'transparent'
                  }}
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
    const currentTimeView = isModalOpen ? modalTimeView : timeView;
    
    // Create CSV content
    const headers = [
      "Date", 
      "Total Transactions", 
      "Vote Transactions", 
      "Non-Vote Transactions", 
      "Success Rate (%)",
      "Non-Vote Success Rate (%)"
    ];
    
    const csvContent = [
      headers.join(","),
      ...chartData.map(item => {
        return [
          formatDate(item.block_date, currentTimeView),
          item.Total_Transactions,
          item.Total_Vote_Transactions,
          item.Total_Non_Vote_Transactions,
          item.Succeesful_Transactions_perc,
          item.Successful_Non_Vote_Transactiosn_perc
        ].join(",");
      })
    ].join("\n");

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `solana_txn_stats_${currentTimeView}_${new Date().toISOString().split("T")[0]}.csv`);
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
          title="Transaction Statistics" 
          subtitle="Transaction volumes and success rates over time"
        >
          <div className="h-[70vh]">
            <div className="flex justify-between mb-4">
              <TimeFilterSelector
                value={modalTimeView}
                onChange={handleModalTimeViewChange}
                options={[
                  { value: 'M', label: 'M' },
                  { value: 'Q', label: 'Q' },
                  { value: 'Y', label: 'Y' }
                ]}
              />
              
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

export default TxnStatsChart; 