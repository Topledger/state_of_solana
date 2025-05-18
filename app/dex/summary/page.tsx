"use client";

import React, { useState, useEffect } from "react";
import Counter from "../../components/shared/Counter";
import { VolumeIcon, TvlIcon, UsersIcon, ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TvlVelocityChart, { getTvlVelocityChartColors } from "../../components/charts/DEX/summary/TvlVelocityChart";
import VelocityByDexChart from "../../components/charts/DEX/summary/VelocityByDexChart";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import { TimeFilter as TVLTimeFilter, fetchTvlVelocityData, TvlVelocityDataPoint } from "../../api/dex/summary/chartData";
import { fetchVelocityByDexData, getUniqueProgramTypes, getUniqueDates, TimeFilter, VelocityByDexDataPoint } from "../../api/dex/summary/velocityByDexData";
import { getLatestVolumeStats } from "../../api/dex/summary/volumeData";
import { getLatestTvlStats } from "../../api/dex/summary/tvlData";
import { getLatestTradersStats } from "../../api/dex/summary/tradersData";
import ChartCard from "../../components/shared/ChartCard";
import LegendItem from "../../components/shared/LegendItem";
import { getColorByIndex, allColors } from "../../utils/chartColors";

// Use the standardized color palette for consistent coloring
const baseColors = allColors;

// Get TVL and Velocity colors from the chart component
const tvlVelocityColors = getTvlVelocityChartColors();

const getColorForProgramType = (programType: string, programTypes: string[]) => {
  const index = programTypes.indexOf(programType);
  return getColorByIndex(index);
};

// Function to get available metrics from TVL velocity data
const getAvailableMetrics = (data: TvlVelocityDataPoint[]) => {
  if (!data || data.length === 0) return [];
  
  // Get the first data point to extract property names
  const samplePoint = data[0];
  
  // Define proper display names for metrics
  const displayNames: Record<string, string> = {
    tvl: 'TVL',
    velocity: 'Velocity'
  };
  
  // Filter out date and any other non-metric properties
  return Object.keys(samplePoint)
    .filter(key => key !== 'date')
    .map(key => {
      // Use the mapped display name or fallback to capitalized key
      const displayName = displayNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
      
      // Determine shape and color based on metric name
      const isLine = key === 'velocity';
      return {
        key,
        displayName,
        shape: isLine ? 'circle' : 'square',
        color: isLine ? tvlVelocityColors.velocity : tvlVelocityColors.tvl
      };
    });
};

export default function DexSummaryPage() {
  const [tvlTimeFilter, setTvlTimeFilter] = useState<TVLTimeFilter>('M');
  const [velocityTimeFilter, setVelocityTimeFilter] = useState<TimeFilter>('M');
  const [tvlChartModalOpen, setTvlChartModalOpen] = useState(false);
  const [velocityChartModalOpen, setVelocityChartModalOpen] = useState(false);
  const [programTypes, setProgramTypes] = useState<string[]>([]);
  const [isLoadingDexVelocity, setIsLoadingDexVelocity] = useState(true);
  
  // Add state for actual chart data
  const [tvlVelocityData, setTvlVelocityData] = useState<TvlVelocityDataPoint[]>([]);
  const [velocityByDexData, setVelocityByDexData] = useState<VelocityByDexDataPoint[]>([]);
  const [isTvlDataLoading, setIsTvlDataLoading] = useState(true);
  
  // New state for volume data
  const [volumeStats, setVolumeStats] = useState({
    cumulativeVolume: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isVolumeLoading, setIsVolumeLoading] = useState(true);
  
  // New state for TVL data
  const [tvlStats, setTvlStats] = useState({
    currentTvl: 0,
    percentChange: 0,
    isPositive: false
  });
  const [isTvlStatsLoading, setIsTvlStatsLoading] = useState(true);

  // Add state for traders data
  const [tradersStats, setTradersStats] = useState({
    cumulativeTraders: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isTradersLoading, setIsTradersLoading] = useState(true);

  // Add state for download button loading
  const [isTvlDownloading, setIsTvlDownloading] = useState(false);
  const [isDexDownloading, setIsDexDownloading] = useState(false);

  // Fetch TVL velocity data
  useEffect(() => {
    const fetchTvlData = async () => {
      setIsTvlDataLoading(true);
      try {
        const data = await fetchTvlVelocityData(tvlTimeFilter);
        setTvlVelocityData(data);
      } catch (error) {
        console.error('Error fetching TVL velocity data:', error);
      } finally {
        setIsTvlDataLoading(false);
      }
    };

    fetchTvlData();
  }, [tvlTimeFilter]);

  // Fetch velocity data for programs
  useEffect(() => {
    const fetchDexVelocityData = async () => {
      setIsLoadingDexVelocity(true);
      try {
        const data = await fetchVelocityByDexData(velocityTimeFilter);
        setProgramTypes(getUniqueProgramTypes(data));
        setVelocityByDexData(data);
      } catch (error) {
        console.error('Error fetching DEX velocity data:', error);
      } finally {
        setIsLoadingDexVelocity(false);
      }
    };

    fetchDexVelocityData();
  }, [velocityTimeFilter]);

  // Fetch volume data
  useEffect(() => {
    const fetchVolumeData = async () => {
      setIsVolumeLoading(true);
      try {
        const stats = await getLatestVolumeStats();
        setVolumeStats(stats);
      } catch (error) {
        console.error('Error fetching volume data:', error);
      } finally {
        setIsVolumeLoading(false);
      }
    };

    fetchVolumeData();
  }, []);
  
  // Fetch TVL data
  useEffect(() => {
    const fetchTvlStats = async () => {
      setIsTvlStatsLoading(true);
      try {
        console.log('Fetching TVL stats from new implementation...');
        const stats = await getLatestTvlStats();
        console.log('TVL stats received:', stats);
        
        if (stats && typeof stats.currentTvl === 'number') {
          setTvlStats(stats);
          console.log('TVL percent change:', stats.percentChange);
        } else {
          console.error('Invalid TVL stats format:', stats);
          // Set default values when the data format is invalid
          setTvlStats({
            currentTvl: 0,
            percentChange: 0,
            isPositive: false
          });
        }
      } catch (error) {
        console.error('Error fetching TVL stats:', error);
        // Set default values when there's an error
        setTvlStats({
          currentTvl: 0,
          percentChange: 0,
          isPositive: false
        });
      } finally {
        setIsTvlStatsLoading(false);
      }
    };

    fetchTvlStats();
  }, []);

  // Fetch traders data
  useEffect(() => {
    const fetchTradersData = async () => {
      setIsTradersLoading(true);
      try {
        const stats = await getLatestTradersStats();
        setTradersStats(stats);
      } catch (error) {
        console.error('Error fetching traders data:', error);
      } finally {
        setIsTradersLoading(false);
      }
    };

    fetchTradersData();
  }, []);

  // Format the cumulative volume for display in trillions
  const formatCumulativeVolume = (value: number) => {
    if (value >= 1) {
      return `$${value.toFixed(2)}T`;
    } else {
      // Convert to billions if less than 1 trillion
      return `$${(value * 1000).toFixed(2)}B`;
    }
  };

  // Format the current TVL for display in billions
  const formatCurrentTvl = (value: number) => {
    return `$${value.toFixed(2)}B`;
  };

  // Format the cumulative traders in millions
  const formatCumulativeTraders = (value: number) => {
    return `${value.toFixed(1)}M`;
  };

  // Function to download TVL velocity data as CSV
  const downloadTvlVelocityCSV = async () => {
    // Prevent multiple clicks
    if (isTvlDownloading) return;
    
    setIsTvlDownloading(true);
    
    try {
      // Check if data is available
      if (tvlVelocityData.length === 0) {
        console.error('No TVL velocity data available for download');
        // Try to fetch it now
        const data = await fetchTvlVelocityData(tvlTimeFilter);
        if (data.length === 0) {
          console.error('Failed to fetch TVL velocity data for download');
          return;
        }
        setTvlVelocityData(data);
      }
      
      // Create a CSV header
      const csvContent = "data:text/csv;charset=utf-8,Date,TVL,Velocity\n";
      
      // Convert data to CSV rows
      const rows = tvlVelocityData.map(item => 
        `${item.date},${item.tvl},${item.velocity}`
      ).join("\n");
      
      // Create the full CSV content
      const encodedUri = encodeURI(csvContent + rows);
      
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `tvl-velocity-${tvlTimeFilter}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading TVL velocity data:', error);
    } finally {
      setIsTvlDownloading(false);
    }
  };
  
  // Function to download DEX velocity data as CSV
  const downloadDexVelocityCSV = async () => {
    // Prevent multiple clicks
    if (isDexDownloading) return;
    
    setIsDexDownloading(true);
    
    try {
      // Check if data is available
      if (velocityByDexData.length === 0 || programTypes.length === 0) {
        console.error('No DEX velocity data available for download');
        // Try to fetch it now
        const data = await fetchVelocityByDexData(velocityTimeFilter);
        if (data.length === 0) {
          console.error('Failed to fetch DEX velocity data for download');
          return;
        }
        setVelocityByDexData(data);
        setProgramTypes(getUniqueProgramTypes(data));
      }
      
      // Get unique dates to organize the data
      const uniqueDates = getUniqueDates(velocityByDexData);
      
      // Create a CSV header with program types
      let header = "Date";
      programTypes.forEach(type => {
        header += `,${type}`;
      });
      
      const csvContent = `data:text/csv;charset=utf-8,${header}\n`;
      
      // Create rows with proper data organization
      const rows = uniqueDates.map(date => {
        let row = date;
        
        // For each program type, find the corresponding velocity for this date
        programTypes.forEach(programType => {
          const dataPoint = velocityByDexData.find(d => 
            d.date === date && d.program_type === programType
          );
          
          // Add the velocity or 0 if no data
          row += `,${dataPoint ? dataPoint.velocity : 0}`;
        });
        
        return row;
      }).join("\n");
      
      // Create the full CSV content
      const encodedUri = encodeURI(csvContent + rows);
      
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `dex-velocity-${velocityTimeFilter}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading DEX velocity data:', error);
    } finally {
      setIsDexDownloading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Counter 
          title="All-time Volume"
          value={isVolumeLoading ? "0" : formatCumulativeVolume(volumeStats.cumulativeVolume)}
          trend={isVolumeLoading ? undefined : { 
            value: parseFloat(volumeStats.percentChange.toFixed(1)), 
            label: "vs last year" 
          }}
          icon={<VolumeIcon />}
          variant="indigo"
          isLoading={isVolumeLoading}
        />
        
        <Counter 
          title="Current TVL"
          value={isTvlStatsLoading ? "Loading..." : (tvlStats.currentTvl ? formatCurrentTvl(tvlStats.currentTvl) : "$0.00B")}
          trend={isTvlStatsLoading ? undefined : { 
            value: parseFloat(tvlStats.percentChange.toFixed(1)), 
            label: "vs last day" 
          }}
          icon={<TvlIcon />}
          variant="blue"
          isLoading={isTvlStatsLoading}
        />
        
        <Counter 
          title="All-time Traders"
          value={isTradersLoading ? "0" : formatCumulativeTraders(tradersStats.cumulativeTraders)}
          trend={isTradersLoading ? undefined : { 
            value: parseFloat(tradersStats.percentChange.toFixed(1)), 
            label: "vs last day" 
          }}
          icon={<UsersIcon />}
          variant="purple"
          isLoading={isTradersLoading}
        />
      </div>
      
      {/* Two chart containers stacked on mobile, side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* TVL and Velocity Chart Container */}
        <ChartCard
          title="TVL and Velocity Trends"
          description="Tracking value locked and market velocity across the ecosystem"
          accentColor="blue"
          onExpandClick={() => setTvlChartModalOpen(true)}
          onDownloadClick={downloadTvlVelocityCSV}
          isDownloading={isTvlDownloading}
          filterBar={<TimeFilterSelector value={tvlTimeFilter} onChange={setTvlTimeFilter} />}
          legend={
            !isTvlDataLoading && tvlVelocityData.length > 0 ? (
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                {getAvailableMetrics(tvlVelocityData).map(metric => (
                  <LegendItem
                    key={metric.key}
                    label={metric.displayName}
                    color={metric.color}
                    shape={metric.shape === 'circle' ? 'circle' : 'square'}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                <LegendItem label="Loading..." color="#60a5fa" isLoading={true} />
                <LegendItem label="Loading..." color="#a78bfa" shape="circle" isLoading={true} />
              </div>
            )
          }
        >
          <TvlVelocityChart 
            timeFilter={tvlTimeFilter} 
            isModalOpen={tvlChartModalOpen}
            onModalClose={() => setTvlChartModalOpen(false)}
          />
        </ChartCard>
        
        {/* Velocity By DEX Program Category Chart Container */}
        <ChartCard
          title="Velocity By DEX Program Category"
          description="Tracking velocity trends across different DEX program types"
          accentColor="purple"
          onExpandClick={() => setVelocityChartModalOpen(true)}
          onDownloadClick={downloadDexVelocityCSV}
          isDownloading={isDexDownloading}
          filterBar={<TimeFilterSelector value={velocityTimeFilter} onChange={setVelocityTimeFilter} />}
          legend={
            !isLoadingDexVelocity && programTypes.length > 0 ? (
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                {programTypes.map((programType, index) => (
                  <LegendItem
                    key={programType}
                    label={programType}
                    color={getColorForProgramType(programType, programTypes)}
                    tooltipText={programType}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                <LegendItem label="Loading..." color="#60a5fa" isLoading={true} />
                <LegendItem label="Loading..." color="#a78bfa" isLoading={true} />
                <LegendItem label="Loading..." color="#34d399" isLoading={true} />
              </div>
            )
          }
        >
          <VelocityByDexChart
            timeFilter={velocityTimeFilter}
            isModalOpen={velocityChartModalOpen}
            onModalClose={() => setVelocityChartModalOpen(false)}
          />
        </ChartCard>
      </div>
    </>
  );
} 