"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleBand } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar, BarStack } from '@visx/shape';
import { fetchEconomicValueChartData, EconomicValueChartData } from '../../../../api/REV/total-economic-value/economicValueChart';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import CurrencyFilter from '../../../shared/filters/CurrencyFilter';

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

// Props interface
interface EconomicValueChartProps {
  currency: 'USD' | 'SOL';
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onCurrencyChange?: (currency: 'USD' | 'SOL') => void;
}

// Chart colors
export const economicValueColors = {
  real_economic_value_sol: '#9F7AEA', // Purple for SOL
  total_economic_value_sol: '#10B981', // Green for SOL
  real_economic_value_usd: '#8B5CF6', // Darker purple for USD
  total_economic_value_usd: '#0EA5E9', // Blue for USD
  grid: '#1f2937',
  axisLines: '#374151',
  tickLabels: '#6b7280',
  background: 'rgba(255, 255, 255, 0.05)'
};

// Stack keys
export const stackKeys = ['real_economic_value', 'total_economic_value'];

// Format display name - export this for reuse
export const getValueTypeDisplayName = (valueType: string) => {
  switch (valueType) {
    case 'real_economic_value':
      return 'Real Economic Value';
    case 'total_economic_value':
      return 'Total Economic Value';
    default:
      return valueType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
};

// Get color for value type based on currency
export const getValueTypeColor = (valueType: string, currencyType: 'USD' | 'SOL'): string => {
  if (valueType === 'real_economic_value') {
    return currencyType === 'USD' 
      ? economicValueColors.real_economic_value_usd 
      : economicValueColors.real_economic_value_sol;
  } else if (valueType === 'total_economic_value') {
    return currencyType === 'USD' 
      ? economicValueColors.total_economic_value_usd 
      : economicValueColors.total_economic_value_sol;
  }
  return '#cccccc'; // fallback
};

export default function EconomicValueChart({ 
  currency, 
  isModalOpen = false, 
  onModalClose = () => {},
  onCurrencyChange
}: EconomicValueChartProps) {
  // Main chart data
  const [chartData, setChartData] = useState<EconomicValueChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal specific data
  const [modalChartData, setModalChartData] = useState<EconomicValueChartData[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalCurrency, setModalCurrency] = useState<'USD' | 'SOL'>(currency);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as EconomicValueChartData | null, 
    left: 0, 
    top: 0 
  });
  
  // Chart container refs
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);

  // Fetch data for the main chart
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEconomicValueChartData();
      setChartData(data);
    } catch (err) {
      console.error('Error loading economic value chart data:', err);
      setError('Failed to load chart data');
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data for the modal chart
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const data = await fetchEconomicValueChartData();
      setModalChartData(data);
    } catch (err) {
      console.error('Error loading modal economic value chart data:', err);
      setModalError('Failed to load chart data');
      setModalChartData([]);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle modal-related effects
  useEffect(() => {
    if (isModalOpen) {
      setModalCurrency(currency);
      setModalChartData(chartData);
      fetchModalData();
    }
  }, [isModalOpen, currency, chartData, fetchModalData]);

  // Format values for display
  const formatValue = useCallback((value: number, currencyType: 'USD' | 'SOL'): string => {
    if (currencyType === 'USD') {
      // For USD in billions/millions
      if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(1)}B`;
      } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(1)}M`;
      } else {
        return `$${value.toFixed(0)}`;
      }
    } else {
      // For SOL in millions/thousands
      if (value >= 1e6) {
        return `${(value / 1e6).toFixed(1)}M`;
      } else if (value >= 1e3) {
        return `${(value / 1e3).toFixed(1)}K`;
      } else {
        return value.toFixed(1);
      }
    }
  }, []);

  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const margin = { left: 70, right: 30 };
    const innerWidth = rect.width - margin.left - margin.right;
    
    if (mouseX < margin.left || mouseX > innerWidth + margin.left) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Use the current displayed data based on whether we're in modal or main view
    const currentData = isModal ? modalChartData : chartData;
    
    // Find nearest data point
    const barWidth = innerWidth / currentData.length;
    const index = Math.floor((mouseX - margin.left) / barWidth);
    
    if (index >= 0 && index < currentData.length) {
      const dataPoint = currentData[index];
      if (!tooltip.visible || tooltip.dataPoint?.year !== dataPoint.year) {
        setTooltip({
          visible: true,
          dataPoint,
          left: mouseX,
          top: mouseY - 10
        });
      }
    }
  }, [chartData, modalChartData, tooltip.visible, tooltip.dataPoint?.year]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);
  
  // Handle modal currency filter change
  const handleModalCurrencyChange = useCallback((newCurrency: 'USD' | 'SOL') => {
    setModalCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  }, [onCurrencyChange]);

  // Get the color for the key based on currency
  const getKeyColor = useCallback((key: string, currencyType: 'USD' | 'SOL') => {
    return getValueTypeColor(key, currencyType);
  }, []);

  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modal data/filters if in modal mode, otherwise use the main data/filters
    const activeCurrency = isModal ? modalCurrency : currency;
    const activeData = isModal ? modalChartData : chartData;
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    
    // Show loading state
    if (activeLoading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state with refresh button
    if (activeError || activeData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{activeError || 'No data available'}</div>
          <ButtonSecondary onClick={isModal ? fetchModalData : fetchData}>
            <div className="flex items-center gap-1.5">
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </div>
          </ButtonSecondary>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col h-full">
        {tooltip.visible && tooltip.dataPoint && (
          <ChartTooltip
            title={`Year: ${tooltip.dataPoint.year}`}
            items={[
              {
                color: getKeyColor('real_economic_value', activeCurrency),
                label: getValueTypeDisplayName('real_economic_value'),
                value: formatValue(
                  activeCurrency === 'USD' 
                    ? tooltip.dataPoint.real_economic_value_usd 
                    : tooltip.dataPoint.real_economic_value, 
                  activeCurrency
                ),
                shape: 'square'
              },
              {
                color: getKeyColor('total_economic_value', activeCurrency),
                label: getValueTypeDisplayName('total_economic_value'),
                value: formatValue(
                  activeCurrency === 'USD' 
                    ? tooltip.dataPoint.total_economic_value_usd 
                    : tooltip.dataPoint.total_economic_value, 
                  activeCurrency
                ),
                shape: 'square'
              }
            ]}
            top={tooltip.top}
            left={tooltip.left}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div className={`h-full w-full overflow-hidden relative ${isModal ? 'pt-2' : ''}`}
          ref={isModal ? modalChartRef : chartRef}
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null; 
              
              const margin = { top: 20, right: 30, bottom: 40, left: 70 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;

              // Create scales
              const xScale = scaleBand({
                domain: activeData.map(d => d.year.toString()),
                range: [0, innerWidth],
                padding: 0.35
              });

              // Calculate max value for y-axis scale
              const maxValue = Math.max(
                ...activeData.map(d => 
                  activeCurrency === 'USD' 
                    ? Math.max(d.total_economic_value_usd, d.real_economic_value_usd)
                    : Math.max(d.total_economic_value, d.real_economic_value)
                )
              );
              
              const yScale = scaleLinear({
                domain: [0, maxValue * 1.15], // Add 15% padding
                range: [innerHeight, 0],
                nice: true
              });

              return (
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Background */}
                    <rect
                      x={0}
                      y={0}
                      width={innerWidth}
                      height={innerHeight}
                      fill="transparent"
                      rx={4}
                    />
                    
                    {/* Grid lines */}
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      height={innerHeight}
                      stroke={economicValueColors.grid}
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                      numTicks={6}
                    />
                    
                    {/* Render bars for each data point */}
                    {activeData.map((d, i) => {
                      const barWidth = xScale.bandwidth();
                      const x = xScale(d.year.toString()) || 0;
                      
                      // Highlight the bar when it's the one in the tooltip
                      const isHighlighted = tooltip.visible && tooltip.dataPoint?.year === d.year;
                      const opacity = isHighlighted ? 1 : 0.75;
                      
                      return (
                        <g key={`bar-group-${i}`}>
                          {/* Real Economic Value Bar */}
                          <Bar
                            x={x}
                            y={yScale(activeCurrency === 'USD' ? d.real_economic_value_usd : d.real_economic_value)}
                            width={barWidth * 0.45}
                            height={innerHeight - yScale(activeCurrency === 'USD' ? d.real_economic_value_usd : d.real_economic_value)}
                            fill={getKeyColor('real_economic_value', activeCurrency)}
                            rx={4}
                            opacity={opacity}
                          />

                          {/* Total Economic Value Bar - positioned to the right */}
                          <Bar
                            x={x + barWidth * 0.55}
                            y={yScale(activeCurrency === 'USD' ? d.total_economic_value_usd : d.total_economic_value)}
                            width={barWidth * 0.45}
                            height={innerHeight - yScale(activeCurrency === 'USD' ? d.total_economic_value_usd : d.total_economic_value)}
                            fill={getKeyColor('total_economic_value', activeCurrency)}
                            rx={4}
                            opacity={opacity}
                          />
                        </g>
                      );
                    })}
                    
                    {/* Y-axis */}
                    <AxisLeft 
                      scale={yScale}
                      stroke={economicValueColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={6}
                      tickFormat={(value) => formatValue(value as number, activeCurrency)}
                      label={activeCurrency}
                      labelProps={{
                        fill: economicValueColors.tickLabels,
                        fontSize: 11,
                        textAnchor: 'middle',
                        dy: -40,
                        dx: -45
                      }}
                      tickLabelProps={() => ({ 
                        fill: economicValueColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300, 
                        letterSpacing: '0.05em',
                        textAnchor: 'end', 
                        dx: '-0.6em', 
                        dy: '0.25em' 
                      })}
                    />

                    {/* X-axis */}
                    <AxisBottom 
                      top={innerHeight}
                      scale={xScale}
                      stroke={economicValueColors.axisLines}
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideZero={true}
                      tickLabelProps={() => ({
                        fill: economicValueColors.tickLabels,
                        fontSize: 11,
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'middle',
                        dy: '0.5em'
                      })}
                    />
                  </Group>
                </svg>
              );
            }}
          </ParentSize>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="Economic Value" subtitle="Real vs Total Economic Value in the Solana Ecosystem">
        
        {/* Filters */}
        <div className="flex items-center justify-between pl-1 py-0 mb-3">
          <div className="flex space-x-4 items-center">
            <CurrencyFilter 
              currency={modalCurrency}
              onChange={(val) => handleModalCurrencyChange(val as 'USD' | 'SOL')}
            />
          </div>
        </div>
        
        {/* Horizontal line */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        <div className="h-[65vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 85% width */}
            <div className="w-[86%] h-full pr-4 border-r border-gray-900">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 15% width */}
            <div className="w-[14%] h-full pl-4 flex flex-col justify-start items-start">
              
              {stackKeys.map((key: string) => (
                <div key={key} className="flex items-center mb-2.5 w-full">
                  <div 
                    className="w-2.5 h-2.5 rounded-sm mr-2" 
                    style={{ backgroundColor: getKeyColor(key, modalCurrency) }}
                  ></div>
                  <span className="text-xs text-gray-300">{getValueTypeDisplayName(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
} 