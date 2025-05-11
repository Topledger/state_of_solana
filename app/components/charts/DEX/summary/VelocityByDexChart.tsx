import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleBand, scaleTime, scaleOrdinal } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { LinePath } from '@visx/shape';
import { Brush } from '@visx/brush';
import { fetchVelocityByDexData, TimeFilter, VelocityByDexDataPoint, getUniqueProgramTypes, getUniqueDates } from '../../../../api/dex/summary/velocityByDexData';
import Loader from '../../../shared/Loader';
import ChartTooltip from '../../../shared/ChartTooltip';
import ButtonSecondary from '../../../shared/buttons/ButtonSecondary';
import Modal from '../../../shared/Modal';
import TimeFilterSelector from '../../../shared/filters/TimeFilter';
import { tvlVelocityColors } from './TvlVelocityChart';
import BrushTimeScale from '../../../shared/BrushTimeScale';

// Define RefreshIcon component directly in this file
const RefreshIcon = ({ className = "w-4 h-4" }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 2v6h-6"></path>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
      <path d="M3 22v-6h6"></path>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
    </svg>
  );
};

interface VelocityByDexChartProps {
  timeFilter: TimeFilter;
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

// Helper functions
const formatVelocity = (value: number) => Number.isInteger(value) ? value.toString() : value.toFixed(1);
const formatDate = (dateStr: string, timeFilter?: TimeFilter) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    switch(timeFilter) {
      case 'Y': return date.getFullYear().toString();
      case 'Q': return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      case 'M': return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'D':
      default: return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (e) {
    return dateStr;
  }
};

// Define colors with opacity versions for the chart lines
const baseColors = [
  '#60a5fa', // blue
  '#a78bfa', // purple
  '#34d399', // green
  '#f97316', // orange
  '#f43f5e', // red
  '#facc15', // yellow
];

const getColorForProgramType = (programType: string, programTypes: string[]) => {
  const index = programTypes.indexOf(programType) % baseColors.length;
  return baseColors[index];
};

const colors = {
  axisLines: '#374151',
  tickLabels: '#6b7280',
  grid: '#1f2937',
};

const VelocityByDexChart: React.FC<VelocityByDexChartProps> = ({ 
  timeFilter, 
  isModalOpen = false, 
  onModalClose = () => {} 
}) => {
  // Main chart data
  const [data, setData] = useState<VelocityByDexDataPoint[]>([]);
  const [programTypes, setProgramTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<VelocityByDexDataPoint[]>([]);
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  // Modal specific data
  const [modalData, setModalData] = useState<VelocityByDexDataPoint[]>([]);
  const [modalProgramTypes, setModalProgramTypes] = useState<string[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalTimeFilter, setModalTimeFilter] = useState<TimeFilter>(timeFilter);
  const [modalBrushDomain, setModalBrushDomain] = useState<[Date, Date] | null>(null);
  const [isModalBrushActive, setIsModalBrushActive] = useState(false);
  const [modalFilteredData, setModalFilteredData] = useState<VelocityByDexDataPoint[]>([]);
  
  // Shared tooltip state
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    date: '', 
    velocities: [] as {programType: string, velocity: number}[],
    left: 0, 
    top: 0 
  });

  // Add refs for throttling
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateFilteredDataRef = useRef<boolean>(true);
  const modalThrottleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canUpdateModalFilteredDataRef = useRef<boolean>(true);
  
  // Create a fetchData function that can be called to refresh data for main chart
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const chartData = await fetchVelocityByDexData(timeFilter);
      console.log(`Fetched ${chartData.length} data points for main chart with filter ${timeFilter}`);
      
      if (chartData.length > 0) {
        console.log('Sample data:', chartData.slice(0, 2));
        const types = getUniqueProgramTypes(chartData);
        console.log(`Program types: ${types.join(', ')}`);
      }
      
      if (chartData.length === 0) {
        setError('No data available for this period.');
        setData([]);
        setProgramTypes([]);
      } else {
        setData(chartData);
        setFilteredData(chartData);
        setProgramTypes(getUniqueProgramTypes(chartData));
        
        // Set brush as active but don't set a specific domain
        // This will result in the full range being selected
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
      setProgramTypes([]);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  // Create a separate fetchData function for modal
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const chartData = await fetchVelocityByDexData(modalTimeFilter);
      if (chartData.length === 0) {
        setModalError('No data available for this period.');
        setModalData([]);
        setModalFilteredData([]);
        setModalProgramTypes([]);
      } else {
        setModalData(chartData);
        setModalFilteredData(chartData);
        setModalProgramTypes(getUniqueProgramTypes(chartData));
        
        // Set brush as active but don't set a specific domain
        // This will result in the full range being selected
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
      setModalProgramTypes([]);
    } finally {
      setModalLoading(false);
    }
  }, [modalTimeFilter]);

  // Fetch data for main chart on mount and when timeFilter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Update modalTimeFilter when timeFilter changes
  useEffect(() => {
    // Only update modalTimeFilter from timeFilter when the modal isn't open
    // This prevents overriding user selections in the modal
    if (!isModalOpen) {
      setModalTimeFilter(timeFilter);
    }
  }, [timeFilter, isModalOpen]);

  // Initialize modal data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      // Initialize modal time filter with main time filter only on initial open
      // not on every render while modal is open
      setModalTimeFilter(timeFilter);
      
      // If we already have data loaded for the main chart with the same filter,
      // we can just use that data for the modal initially
      if (data.length > 0) {
        setModalData(data);
        setModalFilteredData(data);
        setModalProgramTypes(programTypes);
        setModalLoading(false);
        setModalError(null);
        
        // Set brush as active but don't set a specific domain
        // This will result in the full range being selected
        setIsModalBrushActive(true);
        setModalBrushDomain(null);
      } else {
        // Otherwise fetch data specifically for the modal
        fetchModalData();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, timeFilter, data]);
  
  // Fetch modal data when modalTimeFilter changes and modal is open
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [modalTimeFilter, isModalOpen, fetchModalData]);

  // Handle brush change with throttling
  const handleBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isBrushActive) {
        setBrushDomain(null);
        setIsBrushActive(false);
      }
      // Clear any pending throttle timeout
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
        canUpdateFilteredDataRef.current = true; // Allow immediate update on clear
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return; // Ignore invalid dates
    }

    // Update immediate brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setBrushDomain(newDomain);
    if (!isBrushActive) {
      setIsBrushActive(true);
    }

    // Filtering update is handled by the useEffect based on brushDomain

  }, [isBrushActive]);

  // Handle modal brush change with throttling
  const handleModalBrushChange = useCallback((domain: any) => {
    if (!domain) {
      if (isModalBrushActive) {
        setModalBrushDomain(null);
        setIsModalBrushActive(false);
      }
      // Clear any pending throttle timeout
      if (modalThrottleTimeoutRef.current) {
        clearTimeout(modalThrottleTimeoutRef.current);
        modalThrottleTimeoutRef.current = null;
        canUpdateModalFilteredDataRef.current = true; // Allow immediate update on clear
      }
      return;
    }
    
    const { x0, x1 } = domain;
    const startDate = new Date(x0);
    const endDate = new Date(x1);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return; // Ignore invalid dates
    }

    // Update immediate brush domain for visual feedback
    const newDomain: [Date, Date] = [startDate, endDate];
    setModalBrushDomain(newDomain);
    if (!isModalBrushActive) {
      setIsModalBrushActive(true);
    }

    // Filtering update is handled by the useEffect based on modalBrushDomain

  }, [isModalBrushActive]);

  // Apply throttled brush domain to filter data
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
    
    // Throttle the actual filtering logic
    if (!canUpdateFilteredDataRef.current) {
        // Skip update if throttled
        return;
    }

    const [start, end] = brushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = data.filter(d => {
      const itemDate = new Date(d.date).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Apply filter and start throttle period
    setFilteredData(filtered.length > 0 ? filtered : data);
    canUpdateFilteredDataRef.current = false; // Prevent updates during throttle period

    // Clear previous timeout just in case
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    // Set timeout to allow updates again after interval
    throttleTimeoutRef.current = setTimeout(() => {
      canUpdateFilteredDataRef.current = true;
    }, 100); // 100ms throttle interval

  }, [brushDomain, data, isBrushActive]);

  // Apply throttled brush domain to filter modal data
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
    
    // Throttle the actual filtering logic
    if (!canUpdateModalFilteredDataRef.current) {
        // Skip update if throttled
        return;
    }

    const [start, end] = modalBrushDomain;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filtered = modalData.filter(d => {
      const itemDate = new Date(d.date).getTime();
      return itemDate >= startTime && itemDate <= endTime;
    });
    
    // Apply filter and start throttle period
    setModalFilteredData(filtered.length > 0 ? filtered : modalData);
    canUpdateModalFilteredDataRef.current = false; // Prevent updates during throttle period

    // Clear previous timeout just in case
    if (modalThrottleTimeoutRef.current) {
      clearTimeout(modalThrottleTimeoutRef.current);
    }

    // Set timeout to allow updates again after interval
    modalThrottleTimeoutRef.current = setTimeout(() => {
      canUpdateModalFilteredDataRef.current = true;
    }, 100); // 100ms throttle interval

  }, [modalBrushDomain, modalData, isModalBrushActive]);

  // Create tooltip handler 
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isModal = false) => {
    console.log('VelocityByDex - Mouse move event', { isModal, clientX: e.clientX, clientY: e.clientY });
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top; // Get Y position relative to chart
    const margin = { left: 45 };
    const innerWidth = rect.width - margin.left - 20;
    
    if (mouseX < margin.left || mouseX > innerWidth + margin.left) {
      if (tooltip.visible) {
        console.log('VelocityByDex - Mouse outside chart area, hiding tooltip');
        setTooltip(prev => ({ ...prev, visible: false }));
      }
      return;
    }
    
    // Get the active data and program types
    const activeData = isModal ? modalFilteredData : filteredData;
    const activeProgramTypes = isModal ? modalProgramTypes : programTypes;
    
    // Get unique dates from the active data
    const uniqueDates = getUniqueDates(activeData);
    
    // Find nearest date based on mouse position
    const dateIndex = Math.min(
      Math.floor((mouseX - margin.left) / (innerWidth / uniqueDates.length)),
      uniqueDates.length - 1
    );
    
    if (dateIndex >= 0 && dateIndex < uniqueDates.length) {
      const date = uniqueDates[dateIndex];
      
      // Get all velocities for this date
      const velocities = activeProgramTypes.map(programType => {
        const dataPoint = activeData.find(d => d.date === date && d.program_type === programType);
        return {
          programType,
          velocity: dataPoint ? dataPoint.velocity : 0
        };
      }).filter(v => v.velocity > 0); // Only show program types with non-zero velocity
      
      if (velocities.length > 0) {
        console.log('VelocityByDex - Setting tooltip data', { 
          date, 
          velocities,
          left: mouseX,
          top: mouseY
        });
        
        setTooltip({
          visible: true,
          date, 
          velocities,
          left: mouseX,
          top: mouseY
        });
      }
    }
  }, [filteredData, modalFilteredData, programTypes, modalProgramTypes, tooltip.visible]);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (tooltip.visible) {
      console.log('VelocityByDex - Mouse leave, hiding tooltip');
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [tooltip.visible]);

  // Handle modal time filter change
  const handleModalTimeFilterChange = useCallback((newFilter: TimeFilter) => {
    console.log('Time filter changed to:', newFilter);
    setModalTimeFilter(newFilter);
  }, []);

  // Cleanup throttle timeouts on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      if (modalThrottleTimeoutRef.current) {
        clearTimeout(modalThrottleTimeoutRef.current);
      }
    };
  }, []);

  // Render chart content
  const renderChartContent = (height: number, width: number, isModal = false) => {
    // Use modalTimeFilter and modalData if in modal mode, otherwise use the main timeFilter and data
    const activeTimeFilter = isModal ? modalTimeFilter : timeFilter;
    const activeData = isModal ? modalData : data;
    const activeFilteredData = isModal ? (isModalBrushActive ? modalFilteredData : modalData) : (isBrushActive ? filteredData : data);
    const activeProgramTypes = isModal ? modalProgramTypes : programTypes;
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
          <ButtonSecondary onClick={isModal ? fetchModalData : () => fetchData()}>
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
        {tooltip.visible && tooltip.date && (
          <ChartTooltip
            title={formatDate(tooltip.date, activeTimeFilter)}
            items={tooltip.velocities.map(v => ({
              color: getColorForProgramType(v.programType, activeProgramTypes),
              label: v.programType,
              value: formatVelocity(v.velocity),
              shape: 'circle'
            }))}
            top={tooltip.top}
            left={tooltip.left}
            isModal={isModal}
          />
        )}
        
        {/* Main chart */}
        <div className="h-[85%] w-full overflow-hidden"
          onMouseMove={(e) => handleMouseMove(e, isModal)}
          onMouseLeave={handleMouseLeave}
        >
          <ParentSize>
            {({ width, height }) => {
              if (width <= 0 || height <= 0) return null; 
              
              const margin = { top: 10, right: 25, bottom: 30, left: 45 };
              const innerWidth = width - margin.left - margin.right;
              const innerHeight = height - margin.top - margin.bottom;
              if (innerWidth <= 0 || innerHeight <= 0) return null;

              // Get unique dates for the x-axis
              const uniqueDates = getUniqueDates(activeFilteredData);
              
              // Handle case with no data
              if (uniqueDates.length === 0) {
                return (
                  <svg width={width} height={height} className="overflow-visible">
                    <text
                      x={width/2}
                      y={height/2}
                      textAnchor="middle"
                      fill="#6b7280"
                      fontSize={12}
                    >
                      No data available for selected time period
                    </text>
                  </svg>
                );
              }
              
              // Create a time domain from the unique dates
              const dateDomain = uniqueDates.map(d => {
                try {
                  return new Date(d);
                } catch (e) {
                  console.error('Invalid date:', d);
                  return new Date(); // Fallback to current date
                }
              });
              
              // Use consistent scaleTime for both chart and brush
              const dateScale = scaleBand<Date>({
                domain: dateDomain,
                range: [0, innerWidth],
                padding: 0.3,
              });

              // Find max velocity across all program types for y-axis scale
              const maxVelocity = Math.max(
                ...activeFilteredData.map(d => d.velocity),
                1 // Ensure minimum scale even if all values are 0
              );

              const velocityScale = scaleLinear<number>({
                domain: [0, maxVelocity * 1.1], // Add 10% headroom
                range: [innerHeight, 0],
                nice: true,
              });
              
              // Create color scale for program types
              const colorScale = scaleOrdinal<string>({
                domain: activeProgramTypes,
                range: baseColors,
              });
              
              return (
                <svg width={width} height={height} className="overflow-visible">
                  <Group left={margin.left} top={margin.top}>
                    <GridRows scale={velocityScale} width={innerWidth} stroke={colors.grid} strokeDasharray="2,3" strokeOpacity={0.5} numTicks={5} />
                    
                    {/* Render line for each program type */}
                    {activeProgramTypes.map((programType) => {
                      // Filter data for this program type
                      const programData = activeFilteredData.filter(d => d.program_type === programType);
                      
                      // Only render if we have data points
                      if (programData.length === 0) return null;
                      
                      // Group and organize data by date to ensure continuous lines
                      const lineData = uniqueDates.map(date => {
                        const dataPoint = programData.find(d => d.date === date);
                        return {
                          date,
                          velocity: dataPoint ? dataPoint.velocity : 0
                        };
                      });
                      
                      return (
                        <LinePath 
                          key={`line-${programType}`}
                          data={lineData}
                          x={(d) => (dateScale(new Date(d.date)) ?? 0) + dateScale.bandwidth() / 2}
                          y={(d) => velocityScale(d.velocity)}
                          stroke={getColorForProgramType(programType, activeProgramTypes)}
                          strokeWidth={1.5}
                          curve={curveMonotoneX}
                        />
                      );
                    })}
                    
                    <AxisBottom top={innerHeight} scale={dateScale}
                      tickFormat={(date) => {
                        const d = date as Date;
                        // Custom formatting to exclude year
                        switch(activeTimeFilter) {
                          case 'Y': return d.getFullYear().toString();
                          case 'Q': return `Q${Math.floor(d.getMonth() / 3) + 1}`;
                          case 'M': return d.toLocaleDateString('en-US', { month: 'short' });
                          case 'D':
                          default: return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                      }}
                      stroke={colors.axisLines} strokeWidth={0.5} tickStroke="transparent" tickLength={0}
                      hideZero={true}
                      tickLabelProps={(value, index) => ({ 
                        fill: colors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: index === 0 ? 'start' : 'middle', 
                        dy: '0.5em',
                        dx: index === 0 ? '0.5em' : 0
                      })}
                      numTicks={Math.min(5, uniqueDates.length)} />
                    
                    <AxisLeft scale={velocityScale} stroke={colors.axisLines} strokeWidth={0.5} tickStroke="transparent" tickLength={0} numTicks={5}
                      tickFormat={(value) => formatVelocity(Number(value))}
                      tickLabelProps={() => ({ 
                        fill: colors.tickLabels, 
                        fontSize: 11, 
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textAnchor: 'end', 
                        dx: '-0.6em', 
                        dy: '0.25em' 
                      })} />
                  </Group>
                </svg>
              );
            }}
          </ParentSize>
        </div>
        
        {/* Brush component - now shown for both main chart and modal */}
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
            getValue={(d) => d.velocity}
            getUniqueDates={getUniqueDates}
            lineColor={tvlVelocityColors.tvlBar}
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
      <Modal isOpen={isModalOpen} onClose={onModalClose} title="Velocity By DEX Program Category" subtitle="Tracking velocity trends across different DEX program types">
        
        {/* Time filter */}
        <div className="flex items-center justify-start pl-1 py-0 mb-3">
          <TimeFilterSelector value={modalTimeFilter} onChange={handleModalTimeFilterChange} />
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
              <div className="flex flex-col gap-5 pt-4">
                <div className="flex flex-col gap-2">
                 
                  {modalProgramTypes.length > 0 && modalProgramTypes.map((programType, index) => (
                    <div key={programType} className="flex items-start">
                      <div className="w-2.5 h-2.5 mr-2 rounded-sm mt-0.5" 
                          style={{ background: getColorForProgramType(programType, modalProgramTypes) }}></div>
                      <span className="text-[11px] text-gray-300 truncate" title={programType}>
                        {programType.length > 10 ? `${programType.substring(0, 10)}...` : programType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VelocityByDexChart; 