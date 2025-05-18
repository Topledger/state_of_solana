import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleBand } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { LinePath, Bar } from '@visx/shape';
import { fetchIssuanceData, IssuanceDataPoint, CurrencyType, formatPercentage, formatDate } from '../../../../api/REV/issuance-burn/issuanceData';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import BrushTimeScale from '../../../shared/BrushTimeScale';
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

interface BurnRatioChartProps {
  currency: CurrencyType;
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

// Chart colors
export const burnRatioColors = {
  axisLines: '#374151',
  tickLabels: '#6b7280',
  burnRatio: '#f43f5e', // red
  grid: '#1f2937',
};

// Value-based color assignment
const getValueBasedColors = (data: IssuanceDataPoint[]) => {
  // For burn ratio, we just use a consistent color since it's a single metric chart
  // But we're keeping the function for consistency with other components
  return {
    ...burnRatioColors,
    burnRatio: '#f43f5e' // red - keeping the original color
  };
};

// Export colors for external use
export const getBurnRatioColors = () => {
  return {
    burnRatio: burnRatioColors.burnRatio
  };
};

// Helper function to get available metrics for legend
export const getBurnRatioChartMetrics = (colors: { burnRatio: string }) => {
  return [
    {
      key: 'burn_ratio',
      displayName: 'Burn Ratio',
      shape: 'square',
      color: colors.burnRatio
    }
  ];
};

// Internal version for the chart itself
const getAvailableChartMetrics = (data: IssuanceDataPoint[], colors: { burnRatio: string }) => {
  if (!data || data.length === 0) return [];
  
  return getBurnRatioChartMetrics(colors);
};

const BurnRatioChart: React.FC<BurnRatioChartProps> = ({ 
  currency, 
  isModalOpen = false, 
  onModalClose = () => {} 
}) => {
  // Main chart data
  const [data, setData] = useState<IssuanceDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<IssuanceDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific data
  const [modalData, setModalData] = useState<IssuanceDataPoint[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalCurrency, setModalCurrency] = useState<CurrencyType>(currency);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<IssuanceDataPoint[]>([]);
  
  // Chart container refs for tooltip positioning
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    dataPoint: null as IssuanceDataPoint | null, 
    left: 0, 
    top: 0 
  });
  
  // Create a fetchData function that can be called to refresh data for main chart
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chartData = await fetchIssuanceData(currency);
      
      if (chartData.length === 0) {
        setError('No data available.');
        setData([]);
        setFilteredData([]);
      } else {
        setData(chartData);
        setFilteredData(chartData);
        
        // Set brush as active but don't set a specific domain
        setIsBrushActive(true);
        setBrushDomain(null);
      }
    } catch (err) {
      console.error('[Chart] Error loading chart data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setError(message);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [currency]);

  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const chartData = await fetchIssuanceData(modalCurrency);
      if (chartData.length === 0) {
        setModalError('No data available.');
        setModalData([]);
        setModalFilteredData([]);
      } else {
        setModalData(chartData);
        setModalFilteredData(chartData);
        
        // Set brush as active but don't set a specific domain
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      }
    } catch (err) {
      console.error('[Chart] Error loading modal chart data:', err);
      let message = 'Failed to load data.';
      if (err instanceof Error) {
        message = err.message || message;
      }
      setModalError(message);
      setModalData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  }, [modalCurrency]);

  // Fetch data for main chart on mount and when currency changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle brush change
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    // Update brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setBrushDomain(newDomain);
    if (!isBrushActive) {
      setIsBrushActive(true);
    }
  }, [isBrushActive]);

  // Handle modal brush change
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return; // Ignore invalid dates
    }

    // Update brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setModalBrushDomain(newDomain);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }
  }, [isModalBrushActive]);

  // Apply brush domain to filter data
  useEffect(() => {
    if (data.length === 0) {
      if (filteredData.length > 0) setFilteredData([]);
      return;
    }

    // If brush domain is null but filter is active, use full date range
    if (!brushDomain && isBrushActive) {
      setFilteredData(data);
      return;
    }

    // If no brush domain is set or full range is selected, show all data
    if (!brushDomain || !isBrushActive) {
      if (filteredData.length !== data.length) {
        setFilteredData(data);
      }
      return;
    }

    const [start, end] = brushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = data.filter(d => {
      const itemDate = new Date(d.date).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Apply filter
    setFilteredData(filtered.length > 0 ? filtered : data);
  }, [brushDomain, data, isBrushActive]);

  // Apply modal brush domain to filter modal data
  useEffect(() => {
    if (modalData.length === 0) {
      if (modalFilteredData.length > 0) setModalFilteredData([]);
      return;
    }

    // If brush domain is null but filter is active, use full date range
    if (!modalBrushDomain && isModalBrushActive) {
      setModalFilteredData(modalData);
      return;
    }

    // If no brush domain is set or full range is selected, show all data
    if (!modalBrushDomain || !isModalBrushActive) {
      if (modalFilteredData.length !== modalData.length) {
        setModalFilteredData(modalData);
      }
      return;
    }

    const [start, end] = modalBrushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = modalData.filter(d => {
      const itemDate = new Date(d.date).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Apply filter
    setModalFilteredData(filtered.length > 0 ? filtered : modalData);
  }, [modalBrushDomain, modalData, isModalBrushActive]);

  // Create tooltip handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const margin = { left: 45 };
    const innerWidth = rect.width - margin.left - 20;
    
    if (mouseX < margin.left || mouseX > innerWidth + margin.left) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Use the current displayed data based on whether we're in modal or main view
    const currentData = isModal 
      ? (isModalBrushActive ? modalFilteredData : modalData)
      : (isBrushActive ? filteredData : data);
    
    // Find nearest data point
    const index = Math.floor((mouseX - margin.left) / (innerWidth / currentData.length));
    
    if (index >= 0 && index < currentData.length) {
      const dataPoint = currentData[index];
      if (!tooltip.visible || tooltip.dataPoint?.date !== dataPoint.date) {
        setTooltip({
          visible: true,
          dataPoint,
          left: mouseX,
          top: mouseY
        });
      }
    }
  }, [data, filteredData, modalData, modalFilteredData, isBrushActive, isModalBrushActive, tooltip.visible, tooltip.dataPoint?.date]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Update modalCurrency when currency changes
  useEffect(() => {
    // Only update modalCurrency from currency when the modal isn't open
    if (!isModalOpen) {
      setModalCurrency(currency);
    }
  }, [currency, isModalOpen]);

  // Initialize modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      // Initialize modal currency with main currency only on initial open
      setModalCurrency(currency);
      
      // If we already have data loaded for the main chart with the same currency,
      // we can just use that data for the modal initially
      if (data.length > 0) {
        setModalData(data);
        setModalFilteredData(data);
        setModalLoading(false);
        setModalError(null);
        
        // Set brush as active but don't set a specific domain
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      } else {
        // Otherwise fetch data specifically for the modal
        fetchModalData();
      }
    }
  }, [isModalOpen, currency, data, fetchModalData]);
  
  // Fetch modal data when modalCurrency changes and modal is open
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [modalCurrency, isModalOpen, fetchModalData]);

  // Handle modal currency change
  const handleModalCurrencyChange = useCallback((newCurrency: CurrencyType) => {
    setModalCurrency(newCurrency);
  }, []);

  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modal or main data based on context
    const activeCurrency = isModal ? modalCurrency : currency;
    const activeData = isModal ? modalData : data;
    const activeFilteredData = isModal ? (isModalBrushActive ? modalFilteredData : modalData) : (isBrushActive ? filteredData : data);
    const activeLoading = isModal ? modalLoading : loading;
    const activeError = isModal ? modalError : error;
    const activeBrushDomain = isModal ? modalBrushDomain : brushDomain;
    const activeIsBrushActive = isModal ? isModalBrushActive : isBrushActive;
    const activeHandleBrushChange = isModal ? handleModalBrushChange : handleBrushChange;
    const activeClearBrush = isModal 
      ? () => { setModalBrushDomain(null); setIsModalBrushActive(false); }
      : () => { setBrushDomain(null); setIsBrushActive(false); };
    
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
            title={formatDate(tooltip.dataPoint.date)}
            items={[
              { 
                color: burnRatioColors.burnRatio, 
                label: 'Burn Ratio', 
                value: formatPercentage(tooltip.dataPoint.burn_ratio), 
                shape: 'square' 
              }
            ]}
            top={tooltip.top}
            left={tooltip.left}
          />
        )}
        
        {/* Main chart */}
        <div className="h-[85%] w-full overflow-hidden relative"
          ref={isModal ? modalChartRef : chartRef}
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              // Add check to prevent rendering with invalid dimensions
              if (width < 10 || height < 10) return <div style={{ width: '100%', height: '100%' }}></div>;
              
              const margin = { top: 5, right: 25, bottom: 30, left: 45 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;

              // Use displayed data for this chart (modal or main)
              const displayData = activeFilteredData;
              
              // Create a date domain from the current data
              const dateDomain = displayData.map(d => new Date(d.date));
              
              // Use scaleBand for dates
              const dateScale = scaleBand<Date>({
                domain: dateDomain,
                range: [0, innerWidth],
                padding: 0.3,
              });

              // Find max/min for y-scale
              const burnRatios = displayData.map(d => d.burn_ratio);
              const maxRatio = Math.max(...burnRatios);
              // Make sure we include 0 in the domain
              const minRatio = Math.min(0, ...burnRatios);

              // Use a linear scale for the burn ratio
              const ratioScale = scaleLinear<number>({
                domain: [minRatio, maxRatio * 1.1], // Add 10% padding on top
                range: [innerHeight, 0],
                nice: true,
              });
              
              return (
                <svg width={width} height={height} className="overflow-visible">
                  <Group left={margin.left} top={margin.top}>
                    <GridRows 
                      scale={ratioScale} 
                      width={innerWidth} 
                      stroke={burnRatioColors.grid} 
                      strokeDasharray="2,3" 
                      strokeOpacity={0.5} 
                      numTicks={5} 
                    />
                    
                    {/* Display active brush status */}
                    {activeIsBrushActive && (
                      <text x={0} y={-8} fontSize={8} fill={burnRatioColors.burnRatio} textAnchor="start">
                        {`Filtered: ${displayData.length} item${displayData.length !== 1 ? 's' : ''}`}
                      </text>
                    )}
                    
                    {/* Line Chart for Burn Ratio instead of Bar Chart */}
                    <LinePath
                      data={displayData}
                      x={(d) => (dateScale(new Date(d.date)) ?? 0) + dateScale.bandwidth() / 2}
                      y={(d) => ratioScale(d.burn_ratio)}
                      stroke={burnRatioColors.burnRatio}
                      strokeWidth={2}
                      curve={curveMonotoneX}
                    />
                    
                    {/* Draw zero line */}
                    <line
                      x1={0}
                      x2={innerWidth}
                      y1={ratioScale(0)}
                      y2={ratioScale(0)}
                      stroke={burnRatioColors.axisLines}
                      strokeWidth={1}
                      strokeOpacity={0.5}
                    />
                    
                    <AxisBottom 
                      top={innerHeight} 
                      scale={dateScale}
                      tickFormat={(date) => {
                        const d = date as Date;
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                      stroke={burnRatioColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0}
                      hideZero={true}
                      numTicks={Math.min(5, displayData.length)}
                      tickLabelProps={() => ({ 
                        fill: burnRatioColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'middle', 
                        dy: '0.5em'
                      })}
                    />
                    
                    <AxisLeft 
                      scale={ratioScale} 
                      stroke={burnRatioColors.axisLines} 
                      strokeWidth={0.5} 
                      tickStroke="transparent" 
                      tickLength={0} 
                      numTicks={5}
                      tickFormat={(value) => {
                        // Format percentage without decimal places for better readability
                        return `${Math.round(Number(value))}%`;
                      }}
                      tickLabelProps={() => ({ 
                        fill: burnRatioColors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'end', 
                        dx: '-0.6em', 
                        dy: '0.25em' 
                      })} 
                    />
                  </Group>
                </svg>
              );
            }}
          </ParentSize>
        </div>
        
        {/* Brush component */}
        <div className="h-[15%] w-full mt-1">
          <BrushTimeScale 
            data={isModal ? modalData : data}
            isModal={isModal}
            activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
            onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
            onClearBrush={isModal 
              ? () => { setModalBrushDomain(null); setIsModalBrushActive(false); }
              : () => { setBrushDomain(null); setIsBrushActive(false); }
            }
            getDate={(d) => d.date}
            getValue={(d) => d.burn_ratio}
            lineColor={burnRatioColors.burnRatio}
            margin={{ top: 5, right: 25, bottom: 10, left: 45 }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="SOL Burn Ratio" 
        subtitle="Percentage of SOL burned relative to issuance"
      >
        {/* Currency filter - left aligned */}
        <div className="flex items-center justify-start pl-1 py-0 mb-3">
          <CurrencyFilter 
            currency={modalCurrency} 
            onChange={(val) => handleModalCurrencyChange(val as CurrencyType)}
            isCompact={true}
          />
        </div>
        
        {/* Horizontal line */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        <div className="h-[60vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 90% width */}
            <div className="w-[90%] h-full pr-3 border-r border-gray-900">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 10% width */}
            <div className="w-[10%] pl-3">
              <div className="flex flex-col gap-4 pt-4">
                {!modalLoading && modalData.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {getAvailableChartMetrics(modalData, { 
                      burnRatio: burnRatioColors.burnRatio
                    }).map(metric => (
                      <div key={metric.key} className="flex items-start">
                        <div 
                          className="w-2.5 h-2.5 mr-2 rounded-sm mt-0.5"
                          style={{ background: metric.color }}
                        ></div>
                        <span className="text-[11px] text-gray-300">{metric.displayName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Loading state */}
                    <div className="flex items-start">
                      <div className="w-2.5 h-2.5 bg-red-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                      <span className="text-[11px] text-gray-300">Loading...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BurnRatioChart; 