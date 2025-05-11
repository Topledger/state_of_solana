import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleBand } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Bar } from '@visx/shape';
import { TvlDataPoint, fetchTvlData, formatDate, formatCurrency } from '../../../../api/stablecoins/tvl/tvlData';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import BrushTimeScale from '../../../shared/BrushTimeScale';
import LegendItem from '../../../shared/LegendItem';

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

// Props for the TvlChart component
interface TvlChartProps {
  isModalOpen?: boolean;
  onModalClose?: () => void;
  onUpdateLegends?: (legends: { label: string, color: string, value?: number }[]) => void;
}

const TvlChart: React.FC<TvlChartProps> = ({
  isModalOpen = false,
  onModalClose = () => {},
  onUpdateLegends
}) => {
  // Main chart data
  const [data, setData] = useState<TvlDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [filteredData, setFilteredData] = useState<TvlDataPoint[]>([]);
  
  // Modal specific data
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<TvlDataPoint[]>([]);
  
  // Legend data
  const [legendData, setLegendData] = useState<{
    current: number;
    min: number;
    max: number;
    average: number;
  } | null>(null);
  
  // Refs for tooltip positioning
  const chartRef = useRef<HTMLDivElement | null>(null);
  const modalChartRef = useRef<HTMLDivElement | null>(null);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({
    visible: false,
    date: '',
    amount: 0,
    left: 0,
    top: 0
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chartData = await fetchTvlData();
      
      if (chartData.length === 0) {
        setError('No data available.');
        setData([]);
        return;
      }
      
      setData(chartData);
      setFilteredData(chartData);
      
      // Calculate legend data
      if (chartData.length > 0) {
        const amounts = chartData.map(d => d.Amount_in_Pool);
        const latest = chartData[chartData.length - 1].Amount_in_Pool;
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        const average = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
        
        setLegendData({
          current: latest,
          min,
          max,
          average
        });
        
        // Update parent component's legends if callback provided
        if (onUpdateLegends) {
          onUpdateLegends([
            { label: "Current TVL", color: "#10b981", value: latest }
          ]);
        }
      }
      
      // Set brush as active but don't set a specific domain
      setIsBrushActive(true);
      setBrushDomain(null);
    } catch (err) {
      console.error('[TvlChart] Error loading chart data:', err);
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
  }, [onUpdateLegends]);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply brush domain to filter data
  useEffect(() => {
    if (data.length === 0) {
      setFilteredData([]);
      return;
    }

    // If brush domain is null but filter is active, use full data range
    if (!brushDomain && isBrushActive) {
      setFilteredData(data);
      return;
    }

    // If no brush domain is set or full range is selected, show all data
    if (!brushDomain || !isBrushActive) {
      setFilteredData(data);
      return;
    }

    const [start, end] = brushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = data.filter(d => {
      if (!d.date) return false;
      const itemDate = d.date.getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Apply filter
    setFilteredData(filtered.length > 0 ? filtered : data);
  }, [brushDomain, data, isBrushActive]);

  // Apply modal brush domain to filter modal data
  useEffect(() => {
    if (data.length === 0) {
      setModalFilteredData([]);
      return;
    }

    // If brush domain is null but filter is active, use full data range
    if (!modalBrushDomain && isModalBrushActive) {
      setModalFilteredData(data);
      return;
    }

    // If no brush domain is set or full range is selected, show all data
    if (!modalBrushDomain || !isModalBrushActive) {
      setModalFilteredData(data);
      return;
    }

    const [start, end] = modalBrushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = data.filter(d => {
      if (!d.date) return false;
      const itemDate = d.date.getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Apply filter
    setModalFilteredData(filtered.length > 0 ? filtered : data);
  }, [modalBrushDomain, data, isModalBrushActive]);

  // Initialize modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      // Set modal filtered data to match main filter
      setModalFilteredData(filteredData);
      
      // Set brush as active with the same domain as main chart
      setIsModalBrushActive(isBrushActive);
      setModalBrushDomain(brushDomain);
    }
  }, [isModalOpen, filteredData, isBrushActive, brushDomain]);

  // Handle brush change for main chart
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

  // Handle brush change for modal chart
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

  // Mouse movement handler for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    const containerRef = isModal ? modalChartRef : chartRef;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const margin = { left: 60 };
    const innerWidth = rect.width - margin.left - 20;
    
    // Use the right data source based on context
    const displayData = isModal 
      ? (isModalBrushActive ? modalFilteredData : data)
      : (isBrushActive ? filteredData : data);
    
    if (mouseX < margin.left || mouseX > innerWidth + margin.left || displayData.length === 0) {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Find nearest data point
    const barWidth = innerWidth / displayData.length;
    const index = Math.floor((mouseX - margin.left) / barWidth);
    
    if (index >= 0 && index < displayData.length) {
      const barData = displayData[index];
      if (!tooltip.visible || tooltip.date !== barData.block_date) {
        setTooltip({
          visible: true,
          date: barData.block_date,
          amount: barData.Amount_in_Pool,
          left: mouseX,
          top: mouseY
        });
      }
    }
  }, [filteredData, modalFilteredData, data, isBrushActive, isModalBrushActive, tooltip.visible, tooltip.date]);
  
  // Handle mouse leave event to hide tooltip
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Format value for y-axis ticks
  const formatYAxisTick = useCallback((value: any) => {
    return formatCurrency(value);
  }, []);

  // Function to render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Choose the appropriate data and state based on context (modal or main)
    const displayData = isModal 
      ? (isModalBrushActive ? modalFilteredData : data)
      : (isBrushActive ? filteredData : data);
    
    // Show loading state
    if (loading) {
      return <div className="flex justify-center items-center h-full"><Loader size="sm" /></div>;
    }
    
    // Show error state
    if (error || displayData.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-gray-400/80 text-xs mb-2">{error || 'No data available'}</div>
          <ButtonSecondary onClick={fetchData}>
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
        {/* Chart tooltip */}
        {tooltip.visible && (
          <ChartTooltip
            title={formatDate(tooltip.date)}
            items={[
              {
                label: "Total Value Locked",
                value: formatCurrency(tooltip.amount),
                color: "#10b981", // Use a green color for TVL
                shape: "square"
              }
            ]}
            top={tooltip.top}
            left={tooltip.left}
          />
        )}
        
        {/* Main chart area */}
        <div 
          className="h-[85%] w-full overflow-hidden relative"
          ref={isModal ? modalChartRef : chartRef}
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null;
              
              const margin = { top: 5, right: 25, bottom: 30, left: 60 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;

              // Scale for x-axis (dates)
              const xScale = scaleBand<string>({
                domain: displayData.map(d => d.block_date),
                range: [0, innerWidth],
                padding: 0.3
              });

              // Calculate max value for y-scale
              const maxValue = Math.max(...displayData.map(d => d.Amount_in_Pool));

              // Scale for y-axis (TVL values)
              const yScale = scaleLinear<number>({
                domain: [0, maxValue * 1.1], // Add 10% padding at the top
                range: [innerHeight, 0],
                nice: true
              });

              // Width of each bar
              const barWidth = xScale.bandwidth();
              
              return (
                <svg width={width} height={height}>
                  <Group left={margin.left} top={margin.top}>
                    {/* Grid lines */}
                    <GridRows
                      scale={yScale}
                      width={innerWidth}
                      stroke="#1f2937"
                      strokeOpacity={0.5}
                      strokeDasharray="2,3"
                    />
                    
                    {/* Bars */}
                    {displayData.map((d, i) => {
                      const x = xScale(d.block_date) || 0;
                      const y = yScale(d.Amount_in_Pool);
                      const height = innerHeight - y;
                      
                      return (
                        <Bar
                          key={`bar-${i}`}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          fill="#10b981" // Green color for the bars
                          opacity={tooltip.date === d.block_date ? 1 : 0.8}
                          rx={2}
                        />
                      );
                    })}
                    
                    {/* X-axis (dates) */}
                    <AxisBottom
                      top={innerHeight}
                      scale={xScale}
                      tickFormat={formatDate}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      hideAxisLine={false}
                      numTicks={width > 500 ? 12 : 6}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        textAnchor: 'middle',
                        dy: '0.5em'
                      })}
                    />
                    
                    {/* Y-axis (values) */}
                    <AxisLeft
                      scale={yScale}
                      stroke="#374151"
                      strokeWidth={0.5}
                      tickStroke="transparent"
                      tickLength={0}
                      tickFormat={formatYAxisTick}
                      tickLabelProps={() => ({
                        fill: '#6b7280',
                        fontSize: 11,
                        fontWeight: 300,
                        textAnchor: 'end',
                        dx: '-0.5em',
                        dy: '0.25em'
                      })}
                    />
                  </Group>
                </svg>
              );
            }}
          </ParentSize>
        </div>
        
        {/* Brush component for time filtering */}
        <div className="h-[15%] w-full mt-1">
          <BrushTimeScale
            data={data}
            isModal={isModal}
            activeBrushDomain={isModal ? modalBrushDomain : brushDomain}
            onBrushChange={isModal ? handleModalBrushChange : handleBrushChange}
            onClearBrush={isModal 
              ? () => { setModalBrushDomain(null); setIsModalBrushActive(false); }
              : () => { setBrushDomain(null); setIsBrushActive(false); }
            }
            getDate={(d) => d.date}
            getValue={(d) => d.Amount_in_Pool}
            lineColor="#10b981"
            margin={{ top: 5, right: 25, bottom: 10, left: 60 }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full relative">
      {renderChartContent(0, 0)}
      
      {/* Modal for expanded view */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        title="Stablecoin TVL" 
        subtitle="Total Value Locked in DeFi Pools"
      >
        <div className="h-[60vh]">
          {/* Chart with legends in modal */}
          <div className="flex h-full">
            {/* Chart area - 85% width */}
            <div className="w-[85%] h-full pr-3 border-r border-gray-900">
              {renderChartContent(0, 0, true)}
            </div>
            
            {/* Legend area - 15% width */}
            <div className="w-[15%] h-full pl-3">
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-gray-400 mb-2">TVL STATISTICS</div>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-1">
                  {legendData && (
                    <>
                      <LegendItem
                        key="current"
                        color="#10b981"
                        label="Current TVL"
                        shape="square"
                        tooltipText={formatCurrency(legendData.current)}
                      />
                      
                    </>
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

export default TvlChart; 