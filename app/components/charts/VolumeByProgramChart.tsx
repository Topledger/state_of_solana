"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Pie } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleOrdinal } from '@visx/scale';
import { VolumeByProgramDataPoint, fetchVolumeByProgramDataWithFallback, formatVolume } from '../../api/dex/volume/volumeByProgramData';
import Loader from '../shared/Loader';
import Modal from '../shared/Modal';
import ChartTooltip from '../shared/ChartTooltip';
import ButtonSecondary from '../shared/buttons/ButtonSecondary';
import { DownloadIcon } from '../../components/shared/Icons';

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

// Define color palette (same colors as used in the legend)
const colors = [
  '#a78bfa', // purple - Jupiter
  '#60a5fa', // blue - Raydium
  '#9ca3af', // gray - Others
  '#f97316', // orange - OKX
  '#34d399', // green - Orca
  '#f43f5e', // red - Meteora
  '#facc15', // yellow - Pump Fun
  '#14b8a6', // teal - SolFi
  '#8b5cf6', // indigo - Lifinity
  '#6b7280', // darker gray - Others (Low Volume)
];

// Function to get legends for display
const getLegendItems = (data: VolumeByProgramDataPoint[], colorScale: (dex: string) => string) => {
  return data.map(item => ({
    color: colorScale(item.dex) as string,
    label: item.dex,
    value: `${item.percentage.toFixed(1)}%`
  }));
};

interface VolumeByProgramChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

const VolumeByProgramChart: React.FC<VolumeByProgramChartProps> = ({ 
  isModalOpen = false, 
  onModalClose = () => {} 
}) => {
  // State for chart data
  const [data, setData] = useState<VolumeByProgramDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for modal
  const [modalData, setModalData] = useState<VolumeByProgramDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  
  // State for tooltip
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    data: VolumeByProgramDataPoint | null;
    x: number;
    y: number;
  }>({
    visible: false,
    data: null,
    x: 0,
    y: 0
  });
  
  // Reference to the chart container
  const chartRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chartData = await fetchVolumeByProgramDataWithFallback();
      setData(chartData);
    } catch (err) {
      console.error('Error loading chart data:', err);
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
        fetchVolumeByProgramDataWithFallback()
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
  const getColorScale = (chartData: VolumeByProgramDataPoint[]) => {
    return scaleOrdinal({
      domain: chartData.map(d => d.dex),
      range: colors.slice(0, chartData.length)
    });
  };

  // Get the global color scale for the component
  const mainColorScale = data.length > 0 ? getColorScale(data) : null;

  // Handle tooltip
  const handleTooltip = (isVisible: boolean, dataPoint: VolumeByProgramDataPoint | null, event: React.MouseEvent, isModal: boolean = false) => {
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

  // Function to download CSV data
  const downloadCSV = (modalData: VolumeByProgramDataPoint[]) => {
    try {
      // Create CSV content
      const headers = ['DEX', 'Volume ($)', 'Share (%)'];
      const rows = modalData.map(item => (
        `${item.dex},${item.volume},${item.percentage.toFixed(2)}`
      ));
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      // Create blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'volume_by_program.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  // Render chart content
  const renderChartContent = (isModal: boolean = false) => {
    const chartData = isModal ? modalData : data;
    const isChartLoading = isModal ? modalLoading : loading;
    const currentRef = isModal ? modalChartRef : chartRef;
    
    if (isChartLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    if (error || chartData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{error || 'No data available'}</div>
          <ButtonSecondary onClick={isModal ? () => {
            setModalLoading(true);
            fetchVolumeByProgramDataWithFallback()
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
      <div className="h-full w-full relative" ref={currentRef}>
        {tooltip.visible && tooltip.data && (
          <ChartTooltip
            title={tooltip.data.dex}
            items={[
              { 
                color: colorScale(tooltip.data.dex) as string, 
                label: 'Volume', 
                value: formatVolume(tooltip.data.volume), 
                shape: 'square' 
              },
              { 
                color: colorScale(tooltip.data.dex) as string, 
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
                    pieValue={d => d.volume}
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
                        const fillColor = colorScale(arcData.dex) as string;
                        
                        return (
                          <g 
                            key={`arc-${arcData.dex}-${index}`}
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
          <div key={`legend-${item.dex}-${index}`} className="flex items-start">
            <div 
              className="w-2.5 h-2.5 mr-2 rounded-sm mt-0.5 flex-shrink-0"
              style={{ background: colorScale(item.dex) }}
            ></div>
            <div className="flex flex-col">
            <span className="text-[11px] text-gray-300 break-words">
              {item.dex} <span className="text-gray-400">({item.percentage.toFixed(1)}%)</span>
            </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full w-full relative" ref={chartRef}>
      {/* Tooltip for the main chart */}
      {tooltip.visible && tooltip.data && mainColorScale && (
        <ChartTooltip
          title={tooltip.data.dex}
          items={[
            { 
              color: mainColorScale(tooltip.data.dex) as string, 
              label: 'Volume', 
              value: formatVolume(tooltip.data.volume), 
              shape: 'square' 
            },
            { 
              color: mainColorScale(tooltip.data.dex) as string, 
              label: 'Share', 
              value: `${tooltip.data.percentage.toFixed(1)}%`, 
              shape: 'square' 
            }
          ]}
          top={tooltip.y}
          left={tooltip.x}
          isModal={false}
        />
      )}
      
      {renderChartContent(false)}
      
      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="Volume by Program" 
        subtitle="Breakdown of trading volume by decentralized exchange"
      >
        <div className="h-[60vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - left side */}
            <div className="w-[80%] h-full pr-3 border-r border-gray-900" ref={modalChartRef}>
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
                          style={{ backgroundColor: getColorScale(modalData)(item.dex) }}
                        />
                        <span className="text-[11px] text-gray-300">
                          {item.dex} <span className="text-gray-400">({item.percentage.toFixed(1)}%)</span>
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

export default VolumeByProgramChart; 