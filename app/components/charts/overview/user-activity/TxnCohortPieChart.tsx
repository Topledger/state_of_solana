"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Pie } from '@visx/shape';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleOrdinal } from '@visx/scale';
import { TxnsCohortDataPoint, fetchTxnsCohortData, cohortOrder, cohortColors } from "@/app/api/overview/user-activity/txnsCohortData";
import Loader from "@/app/components/shared/Loader";
import ButtonSecondary from "@/app/components/shared/buttons/ButtonSecondary";
import ChartTooltip from "@/app/components/shared/ChartTooltip";
import Modal from "@/app/components/shared/Modal";

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface TxnCohortPieChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

const TxnCohortPieChart: React.FC<TxnCohortPieChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
}) => {
  // State for main chart
  const [data, setData] = useState<TxnsCohortDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for modal
  const [modalData, setModalData] = useState<TxnsCohortDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  
  // Refs for chart containers
  const chartRef = useRef<HTMLDivElement>(null);
  const modalChartRef = useRef<HTMLDivElement>(null);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({
    visible: false,
    data: null as TxnsCohortDataPoint | null,
    x: 0,
    y: 0
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cohortData = await fetchTxnsCohortData();
      
      if (cohortData.length === 0) {
        setError('No data available for transaction cohorts.');
        setData([]);
      } else {
        // Sort the data according to the defined order
        const sortedData = [...cohortData].sort((a, b) => {
          return cohortOrder.indexOf(a.Txns_Cohort) - cohortOrder.indexOf(b.Txns_Cohort);
        });
        setData(sortedData);
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
        fetchTxnsCohortData()
          .then(cohortData => {
            const sortedData = [...cohortData].sort((a, b) => {
              return cohortOrder.indexOf(a.Txns_Cohort) - cohortOrder.indexOf(b.Txns_Cohort);
            });
            setModalData(sortedData);
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

  // Format numbers for display
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toString();
    }
  };

  // Calculate percentage for display
  const calculatePercentage = (value: number, dataSet: TxnsCohortDataPoint[]) => {
    const total = dataSet.reduce((sum, item) => sum + item.Wallet_Count, 0);
    return total > 0 ? ((value / total) * 100) : 0;
  };

  // Get color scale
  const getColorScale = (chartData: TxnsCohortDataPoint[]) => {
    return scaleOrdinal({
      domain: chartData.map(d => d.Txns_Cohort),
      range: chartData.map(d => cohortColors[d.Txns_Cohort] || '#cccccc')
    });
  };

  // Handle tooltip
  const handleTooltip = (isVisible: boolean, dataPoint: TxnsCohortDataPoint | null, event: React.MouseEvent, isModal: boolean = false) => {
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

  // Render the chart content
  const renderChartContent = (isModal: boolean = false) => {
    const chartData = isModal ? modalData : data;
    const isChartLoading = isModal ? modalLoading : loading;
    
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
            fetchTxnsCohortData()
              .then(cohortData => {
                const sortedData = [...cohortData].sort((a, b) => {
                  return cohortOrder.indexOf(a.Txns_Cohort) - cohortOrder.indexOf(b.Txns_Cohort);
                });
                setModalData(sortedData);
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
    
    // Calculate dimensions
    const colorScale = getColorScale(chartData);
    
    // Get total for percentage calculation
    const total = chartData.reduce((sum, item) => sum + item.Wallet_Count, 0);

    return (
      <div className="relative h-full w-full" ref={isModal ? modalChartRef : chartRef}>
        {tooltip.visible && tooltip.data && (
          <ChartTooltip
            left={tooltip.x}
            top={tooltip.y}
            title={tooltip.data.Txns_Cohort}
            items={[
              {
                label: 'Wallets',
                value: formatNumber(tooltip.data.Wallet_Count),
                color: cohortColors[tooltip.data.Txns_Cohort]
              },
              {
                label: 'Percentage',
                value: `${calculatePercentage(tooltip.data.Wallet_Count, chartData).toFixed(1)}%`,
                color: cohortColors[tooltip.data.Txns_Cohort]
              }
            ]}
            isModal={isModal}
          />
        )}

        <ParentSize>
          {({ width, height }) => {
            // Define pie chart dimensions
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2.5;

            return (
              <svg width={width} height={height}>
                <Group top={centerY} left={centerX}>
                  <Pie
                    data={chartData}
                    pieValue={(d) => d.Wallet_Count}
                    outerRadius={radius}
                    innerRadius={radius * 0.3} // Create a donut chart
                    cornerRadius={3}
                    padAngle={0.005}
                  >
                    {(pie) => {
                      return pie.arcs.map((arc, index) => {
                        const { data: arcData } = arc;
                        const [centroidX, centroidY] = pie.path.centroid(arc);
                        const percentage = calculatePercentage(arcData.Wallet_Count, chartData);
                        const hasSpaceForLabel = percentage > 5;
                        const fillColor = colorScale(arcData.Txns_Cohort) as string;

                        return (
                          <g 
                            key={`pie-arc-${index}`}
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
                                {`${percentage.toFixed(0)}%`}
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

  // Render legends
  const renderLegends = (isModal: boolean = false) => {
    const chartData = isModal ? modalData : data;
    const isChartLoading = isModal ? modalLoading : loading;
    
    if (isChartLoading || chartData.length === 0) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-start">
            <div className="w-2.5 h-2.5 bg-blue-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
            <span className="text-[11px] text-gray-300">Loading...</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1">
        {chartData.map((item, index) => (
          <div key={`legend-${item.Txns_Cohort}-${index}`} className="flex items-start">
            <div 
              className="w-2.5 h-2.5 mr-2 rounded-sm mt-0.5 flex-shrink-0"
              style={{ background: cohortColors[item.Txns_Cohort] }}
            ></div>
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-300 break-words">
                {item.Txns_Cohort} <span className="text-gray-400">({calculatePercentage(item.Wallet_Count, chartData).toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Function to download data as CSV
  const downloadCSV = () => {
    const chartData = isModalOpen ? modalData : data;
    
    // Create CSV content
    const headers = ["Transaction Cohort", "Wallet Count", "Percentage"];
    const csvContent = [
      headers.join(","),
      ...chartData.map(item => {
        const percentage = calculatePercentage(item.Wallet_Count, chartData).toFixed(1);
        return [
          `"${item.Txns_Cohort}"`, // Add quotes to handle commas in cohort names
          item.Wallet_Count,
          `${percentage}%`
        ].join(",");
      })
    ].join("\n");

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transaction_cohorts_${new Date().toISOString().split("T")[0]}.csv`);
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
          title="Transaction Cohorts" 
          subtitle="Wallets grouped by number of transactions"
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
                  
                  
                  <div className="flex flex-col gap-2 max-h-[52vh] overflow-y-auto pr-1
                    [&::-webkit-scrollbar]:w-1.5 
                    [&::-webkit-scrollbar-track]:bg-transparent 
                    [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                    scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                    
                    {renderLegends(true)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TxnCohortPieChart; 