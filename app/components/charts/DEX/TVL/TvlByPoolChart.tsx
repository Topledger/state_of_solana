"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Pie } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleOrdinal } from '@visx/scale';
import { TvlByPoolDataPoint, fetchTvlByPoolDataWithFallback, formatTvl } from '../../../../api/dex/tvl/tvlByPoolData';
import Loader from '../../../shared/Loader';
import Modal from '../../../shared/Modal';
import ChartTooltip from '../../../shared/ChartTooltip';
import { DownloadIcon } from '../../../shared/Icons';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';

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

// Define color palette
const colors = [
  '#a78bfa', // purple
  '#60a5fa', // blue
  '#34d399', // green
  '#f97316', // orange
  '#f43f5e', // red
  '#facc15', // yellow
  '#14b8a6', // teal
  '#8b5cf6', // indigo
  '#ec4899', // pink
  '#6b7280', // gray
];

// Function to get legends for display
const getLegendItems = (data: TvlByPoolDataPoint[], colorScale: (pool: string) => string) => {
  return data.map(item => ({
    color: colorScale(item.pool) as string,
    label: item.pool,
    value: `${item.percentage.toFixed(1)}%`
  }));
};

interface TvlByPoolChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

const TvlByPoolChart: React.FC<TvlByPoolChartProps> = ({ 
  isModalOpen = false, 
  onModalClose = () => {} 
}) => {
  // State for chart data
  const [data, setData] = useState<TvlByPoolDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for modal
  const [modalData, setModalData] = useState<TvlByPoolDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  
  // Add refs for chart containers
  const chartRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // State for tooltip
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    data: TvlByPoolDataPoint | null;
    x: number;
    y: number;
  }>({
    visible: false,
    data: null,
    x: 0,
    y: 0
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chartData = await fetchTvlByPoolDataWithFallback();
      setData(chartData);
    } catch (err) {
      console.error('Error loading TVL by Pool chart data:', err);
      setError('No data available for this period.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data for main chart
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
        fetchTvlByPoolDataWithFallback()
          .then(chartData => {
            setModalData(chartData);
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

  // Color scale
  const getColorScale = (chartData: TvlByPoolDataPoint[]) => {
    return scaleOrdinal({
      domain: chartData.map(d => d.pool),
      range: colors.slice(0, chartData.length)
    });
  };

  // Handle tooltip
  const handleTooltip = (isVisible: boolean, dataPoint: TvlByPoolDataPoint | null, event: React.MouseEvent, isModal: boolean = false) => {
    if (isVisible && dataPoint) {
      // Get the chart element reference
      const chartEl = isModal ? modalChartRef.current : chartRef.current;
      
      if (chartEl) {
        // Get the bounding rectangle of the chart container
        const rect = chartEl.getBoundingClientRect();
        
        // Calculate x and y coordinates relative to the chart container
        const xInChart = event.clientX - rect.left;
        const yInChart = event.clientY - rect.top;
        
        setTooltip({
          visible: true,
          data: dataPoint,
          x: xInChart,
          y: yInChart
        });
      }
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  };

  // Render chart content
  const renderChartContent = (isModal: boolean = false) => {
    const chartData = isModal ? modalData : data;
    const isChartLoading = isModal ? modalLoading : loading;
    
    if (isChartLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    if (error || chartData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{error || 'No data available'}</div>
          <ButtonSecondary onClick={isModal ? () => {
            setModalLoading(true);
            fetchTvlByPoolDataWithFallback()
              .then(chartData => {
                setModalData(chartData);
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
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    const colorScale = getColorScale(chartData);
    
    return (
      <div className="h-full w-full relative" ref={isModal ? modalChartRef : chartRef}>
        {tooltip.visible && tooltip.data && (
          <ChartTooltip
            title={tooltip.data.pool}
            items={[
              { 
                color: colorScale(tooltip.data.pool) as string, 
                label: 'TVL', 
                value: formatTvl(tooltip.data.tvl), 
                shape: 'square' 
              },
              { 
                color: colorScale(tooltip.data.pool) as string, 
                label: 'Share', 
                value: `${tooltip.data.percentage.toFixed(1)}%`, 
                shape: 'square' 
              }
            ]}
            top={tooltip.y}
            left={tooltip.x}
            isModal={isModal}
          />
        )}
        
        <ParentSize>
          {({ width, height }) => {
            // Define pie chart dimensions
            const radius = Math.min(width, height) / 2.5;
            const centerX = width / 2;
            const centerY = height / 2;
            
            return (
              <svg width={width} height={height}>
                <Group top={centerY} left={centerX}>
                  <Pie
                    data={chartData}
                    pieValue={d => d.tvl}
                    outerRadius={radius}
                    innerRadius={radius * 0.3} // Creates a donut chart
                    cornerRadius={3}
                    padAngle={0.005}
                  >
                    {pie => {
                      return pie.arcs.map((arc, index) => {
                        const { data: arcData } = arc;
                        const [centroidX, centroidY] = pie.path.centroid(arc);
                        const hasSpaceForLabel = arcData.percentage > 5;
                        const fillColor = colorScale(arcData.pool) as string;
                        
                        return (
                          <g 
                            key={`arc-${arcData.pool}-${index}`}
                            onMouseMove={(e) => handleTooltip(true, arcData, e, isModal)}
                            onMouseLeave={() => handleTooltip(false, null, null as any, isModal)}
                          >
                            <path
                              d={pie.path(arc) || ''}
                              fill={fillColor}
                              stroke="#000"
                              strokeWidth={0.5}
                              strokeOpacity={0.3}
                            />
                            {hasSpaceForLabel && (
                              <text
                                fill="white"
                                x={centroidX}
                                y={centroidY}
                                dy=".33em"
                                fontSize={10}
                                textAnchor="middle"
                                pointerEvents="none"
                              >
                                {`${arcData.percentage.toFixed(0)}%`}
                              </text>
                            )}
                          </g>
                        );
                      });
                    }}
                  </Pie>
                </Group>
              </svg>
            );
          }}
        </ParentSize>
      </div>
    );
  };

  // Generate legend items
  const renderLegends = (isModal: boolean = false) => {
    const chartData = isModal ? modalData : data;
    const isChartLoading = isModal ? modalLoading : loading;
    
    if (isChartLoading || chartData.length === 0) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-start">
            <div className="w-2.5 h-2.5 bg-purple-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
            <span className="text-[11px] text-gray-300">Loading...</span>
          </div>
        </div>
      );
    }
    
    const colorScale = getColorScale(chartData);
    
    return (
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1">
        {chartData.map((item, index) => (
          <div key={`legend-${item.pool}-${index}`} className="flex items-start">
            <div 
              className="w-2.5 h-2.5 mr-2 rounded-sm mt-0.5 flex-shrink-0"
              style={{ background: colorScale(item.pool) }}
            ></div>
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-300 break-words">
                {item.pool} <span className="text-gray-400">({item.percentage.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Function to download data as CSV
  const downloadCSV = (modalData: TvlByPoolDataPoint[]) => {
    // Create CSV content
    const headers = ["pool", "tvl", "percentage"];
    const csvContent = [
      headers.join(","),
      ...modalData.map(item => 
        [
          item.pool,
          item.tvl,
          item.percentage
        ].join(",")
      )
    ].join("\n");

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'tvl_by_pool.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full w-full relative" ref={chartRef}>
      {renderChartContent(false)}
      
      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="TVL by Pool" 
        subtitle="Breakdown of Total Value Locked by liquidity pool"
      >
        <div className="h-[60vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - left side */}
            <div className="w-[80%] h-full pr-3 border-r border-gray-900 relative">
              {renderChartContent(true)}
            </div>
            
            {/* Legend area - right side */}
            <div className="w-[20%] pl-3">
              <div className="flex flex-col gap-5 pt-1 h-full overflow-hidden">
                <div className="flex flex-col gap-2 max-h-[58vh] overflow-y-auto pr-1
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  
                  {modalLoading ? (
                    <div className="flex items-start">
                      <div className="w-2.5 h-2.5 bg-purple-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                      <span className="text-[11px] text-gray-300">Loading...</span>
                    </div>
                  ) : (
                    modalData.map((item, index) => (
                      <div key={`legend-${index}`} className="flex items-start">
                        <div 
                          className="w-2.5 h-2.5 mr-2 rounded-sm mt-0.5" 
                          style={{ backgroundColor: getColorScale(modalData)(item.pool) }}
                        />
                        <span className="text-[11px] text-gray-300">
                          {item.pool} <span className="text-gray-400">({item.percentage.toFixed(1)}%)</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TvlByPoolChart; 