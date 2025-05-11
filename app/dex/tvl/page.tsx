"use client";

import { useState, useEffect } from "react";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import TvlByPoolChart from "../../components/charts/DEX/TVL/TvlByPoolChart";
import { TvlByPoolDataPoint, fetchTvlByPoolDataWithFallback } from "../../api/dex/tvl/tvlByPoolData";
import TvlHistoryChart from "../../components/charts/DEX/TVL/TvlHistoryChart";
import { fetchTvlHistoryDataWithFallback, fetchTvlByDexDataWithFallback } from "../../api/dex/tvl/tvlHistoryData";
import TvlByDexChart from "../../components/charts/DEX/TVL/TvlByDexChart";
import ChartCard from "../../components/shared/ChartCard";
import LegendItem from "../../components/shared/LegendItem";

// Define colors for the chart legends
const colors = [
  '#a78bfa', // purple
  '#60a5fa', // blue
  '#34d399', // green
  '#f97316', // orange
  '#f43f5e', // rose
  '#facc15', // yellow
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

// Define a TimeFilter type similar to VolumeTimeFilter
type TimeFilter = 'W' | 'M' | 'Q' | 'Y';

export default function DexTvlPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('W');
  const [tvlChartModalOpen, setTvlChartModalOpen] = useState(false);
  const [tvlByPoolModalOpen, setTvlByPoolModalOpen] = useState(false);
  const [tvlByDexModalOpen, setTvlByDexModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTvlByPoolDownloading, setIsTvlByPoolDownloading] = useState(false);
  const [isTvlByDexDownloading, setIsTvlByDexDownloading] = useState(false);
  
  // Add state for TVL by Pool data for the legend
  const [tvlByPoolData, setTvlByPoolData] = useState<TvlByPoolDataPoint[]>([]);
  const [isTvlByPoolLoading, setIsTvlByPoolLoading] = useState(true);
  
  // Add state for TVL by DEX data for the legend
  const [tvlByDexData, setTvlByDexData] = useState<{dex: string; tvl: number; percentage: number}[]>([]);
  const [isTvlByDexLoading, setIsTvlByDexLoading] = useState(true);

  // Add console logging for debugging
  useEffect(() => {
    console.log('[DexTvlPage] Current timeFilter:', timeFilter);
    
    // Trigger a test fetch of the TVL history data to check if it's working
    const testFetchTvlHistory = async () => {
      try {
        console.log('[DexTvlPage] Testing TVL history data fetch...');
        const data = await fetchTvlHistoryDataWithFallback();
        console.log('[DexTvlPage] TVL history test fetch result:', data.length, 'data points');
      } catch (error) {
        console.error('[DexTvlPage] Error in test fetch:', error);
      }
    };
    
    testFetchTvlHistory();
  }, [timeFilter]);

  // Fetch TVL by Pool data for the legend
  useEffect(() => {
    const fetchTvlByPoolData = async () => {
      setIsTvlByPoolLoading(true);
      try {
        const data = await fetchTvlByPoolDataWithFallback();
        setTvlByPoolData(data);
      } catch (error) {
        console.error("Error fetching TVL by Pool data:", error);
      } finally {
        setIsTvlByPoolLoading(false);
      }
    };

    fetchTvlByPoolData();
  }, []);

  // Fetch TVL by DEX data for the legend
  useEffect(() => {
    const fetchTvlByDexData = async () => {
      setIsTvlByDexLoading(true);
      try {
        // Fetch the data from the API
        const data = await fetchTvlByDexDataWithFallback();
        
        // Transform the data to include percentage
        if (data && data.length > 0) {
          // Calculate total TVL
          const totalTvl = data.reduce((sum, item) => sum + item.tvl, 0);
          
          // Add percentage to each item
          const dataWithPercentage = data.map(item => ({
            dex: item.dex,
            tvl: item.tvl,
            percentage: (item.tvl / totalTvl) * 100
          }));
          
          setTvlByDexData(dataWithPercentage);
        }
      } catch (error) {
        console.error("Error fetching TVL by DEX data:", error);
      } finally {
        setIsTvlByDexLoading(false);
      }
    };

    fetchTvlByDexData();
  }, []);

  // Function to download TVL data as CSV - currently just a placeholder
  const downloadTvlDataCSV = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      console.log("Downloading TVL data...");
      // Implementation will go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      alert("Download feature coming soon!");
    } catch (error) {
      console.error("Error downloading TVL data:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Function to download TVL by Pool data as CSV - currently just a placeholder
  const downloadTvlByPoolDataCSV = async () => {
    if (isTvlByPoolDownloading) return;
    setIsTvlByPoolDownloading(true);
    try {
      console.log("Downloading TVL by Pool data...");
      // Implementation will go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      alert("Download feature coming soon!");
    } catch (error) {
      console.error("Error downloading TVL by Pool data:", error);
    } finally {
      setIsTvlByPoolDownloading(false);
    }
  };

  // Function to download TVL by DEX data as CSV - currently just a placeholder
  const downloadTvlByDexDataCSV = async () => {
    if (isTvlByDexDownloading) return;
    setIsTvlByDexDownloading(true);
    try {
      console.log("Downloading TVL by DEX data...");
      // Implementation will go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      alert("Download feature coming soon!");
    } catch (error) {
      console.error("Error downloading TVL by DEX data:", error);
    } finally {
      setIsTvlByDexDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Row with two chart containers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* TVL History container */}
        <ChartCard
          title="TVL History"
          description="Tracking total value locked across the Solana ecosystem"
          accentColor="blue"
          onExpandClick={() => setTvlChartModalOpen(true)}
          onDownloadClick={downloadTvlDataCSV}
          isDownloading={isDownloading}
        >
          <TvlHistoryChart 
            timeFilter={timeFilter}
            isModalOpen={tvlChartModalOpen}
            onModalClose={() => setTvlChartModalOpen(false)}
          />
        </ChartCard>
        
        {/* TVL by Pool container */}
        <ChartCard
          title="TVL by Pool"
          description="Breakdown of TVL by liquidity pool"
          accentColor="purple"
          onExpandClick={() => setTvlByPoolModalOpen(true)}
          onDownloadClick={downloadTvlByPoolDataCSV}
          isDownloading={isTvlByPoolDownloading}
          legendWidth="1/4"
          legend={
            isTvlByPoolLoading ? (
              <LegendItem label="Loading..." color="#a78bfa" isLoading={true} />
            ) : (
              tvlByPoolData.map((item, index) => (
                <LegendItem
                  key={`pool-legend-${index}`}
                  label={`${item.pool} (${item.percentage.toFixed(1)}%)`}
                  color={colors[index % colors.length]}
                  tooltipText={`${item.pool}: $${item.tvl.toLocaleString()} (${item.percentage.toFixed(1)}%)`}
                />
              ))
            )
          }
        >
          <TvlByPoolChart 
            isModalOpen={tvlByPoolModalOpen}
            onModalClose={() => setTvlByPoolModalOpen(false)}
          />
        </ChartCard>
      </div>
      
      {/* Row with one full-width chart container */}
      <div className="mb-4">
        {/* TVL by DEX container */}
        <ChartCard
          title="TVL by DEX"
          description="Distribution of value locked across decentralized exchanges"
          accentColor="green"
          onExpandClick={() => setTvlByDexModalOpen(true)}
          onDownloadClick={downloadTvlByDexDataCSV}
          isDownloading={isTvlByDexDownloading}
          legendWidth="1/4"
          legend={
            isTvlByDexLoading ? (
              <LegendItem label="Loading..." color="#34d399" isLoading={true} />
            ) : (
              tvlByDexData.map((item, index) => (
                <LegendItem
                  key={`dex-legend-${index}`}
                  label={`${item.dex} (${item.percentage.toFixed(1)}%)`}
                  color={colors[index % colors.length]}
                  tooltipText={`${item.dex}: $${item.tvl.toLocaleString()} (${item.percentage.toFixed(1)}%)`}
                />
              ))
            )
          }
        >
          <TvlByDexChart 
            timeFilter={timeFilter}
            isModalOpen={tvlByDexModalOpen}
            onModalClose={() => setTvlByDexModalOpen(false)}
          />
        </ChartCard>
      </div>
    </div>
  );
} 