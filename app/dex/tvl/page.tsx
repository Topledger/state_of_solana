"use client";

import { useState, useEffect } from "react";
import { ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import TvlByPoolChart from "../../components/charts/TvlByPoolChart";
import { TvlByPoolDataPoint, fetchTvlByPoolDataWithFallback } from "../../api/dex/tvl/tvlByPoolData";
import TvlHistoryChart from "../../components/charts/TvlHistoryChart";
import { fetchTvlHistoryDataWithFallback, fetchTvlByDexDataWithFallback } from "../../api/dex/tvl/tvlHistoryData";
import TvlByDexChart from "../../components/charts/TvlByDexChart";

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
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">TVL History</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Tracking total value locked across the Solana ecosystem</p>
            </div>
            {/* Action buttons */}
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className={`p-1.5 ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'} rounded-md transition-colors`}
                onClick={downloadTvlDataCSV}
                disabled={isDownloading}
                title="Download CSV Data"
              >
                {isDownloading ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors"
                onClick={() => setTvlChartModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
        
         
          
          {/* Content Area - TVL History Chart */}
          <div className="h-[360px] lg:h-80">
            <TvlHistoryChart 
              timeFilter={timeFilter}
              isModalOpen={tvlChartModalOpen}
              onModalClose={() => setTvlChartModalOpen(false)}
            />
          </div>
        </div>
        
        {/* TVL by Pool container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">TVL by Pool</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Breakdown of TVL by liquidity pool</p>
            </div>
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className={`p-1.5 ${isTvlByPoolDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'} rounded-md transition-colors`}
                onClick={downloadTvlByPoolDataCSV}
                disabled={isTvlByPoolDownloading}
                title="Download CSV Data"
              >
                {isTvlByPoolDownloading ? (
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-purple-500/10 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors"
                onClick={() => setTvlByPoolModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns on desktop, stacked on mobile */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-64 lg:h-auto">
              <TvlByPoolChart 
                isModalOpen={tvlByPoolModalOpen}
                onModalClose={() => setTvlByPoolModalOpen(false)}
              />
            </div>
            
            {/* Legend Area - horizontal on mobile, vertical on desktop with scrolling */}
            <div className="w-full lg:w-1/4 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
              <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 pt-1 pb-0 h-full w-full overflow-hidden">
                <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 w-full h-full overflow-y-auto
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {tvlByPoolData.length === 0 ? (
                    // Loading state
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                      <span className="text-xs text-gray-300">Loading...</span>
                    </div>
                  ) : (
                    // Dynamically generated legends based on actual data
                    tvlByPoolData.map((item, index) => (
                      <div key={`pool-legend-${index}`} className="flex items-start">
                        <div 
                          className="w-2 h-2 mr-2 rounded-sm mt-0.5 flex-shrink-0" 
                          style={{ background: colors[index % colors.length] }}
                        ></div>
                        <span className="text-xs text-gray-300 break-words max-w-full">
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
      </div>
      
      {/* Row with one full-width chart container */}
     <div className="mb-4">
        {/* TVL by DEX container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-green-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">TVL by DEX</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Distribution of value locked across decentralized exchanges</p>
            </div>
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className={`p-1.5 ${isTvlByDexDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'} rounded-md transition-colors`}
                onClick={downloadTvlByDexDataCSV}
                disabled={isTvlByDexDownloading}
                title="Download CSV Data"
              >
                {isTvlByDexDownloading ? (
                  <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-green-500/10 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
                onClick={() => setTvlByDexModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns on desktop, stacked on mobile */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-64 lg:h-auto">
              <TvlByDexChart 
                timeFilter={timeFilter}
                isModalOpen={tvlByDexModalOpen}
                onModalClose={() => setTvlByDexModalOpen(false)}
              />
            </div>
            
            {/* Legend Area - horizontal on mobile, vertical on desktop with scrolling */}
            <div className="w-full lg:w-1/7 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
              <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 pt-1 pb-0 h-full w-full overflow-hidden">
                <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 w-full h-full overflow-y-auto
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {tvlByDexData.length === 0 ? (
                    // Loading state
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                      <span className="text-xs text-gray-300">Loading...</span>
                    </div>
                  ) : (
                    // Dynamically generated legends based on actual data
                    tvlByDexData.map((item, index) => (
                      <div key={`dex-legend-${index}`} className="flex items-start">
                        <div 
                          className="w-2 h-2 mr-2 rounded-sm mt-0.5 flex-shrink-0" 
                          style={{ background: colors[index % colors.length] }}
                        ></div>
                        <span className="text-xs text-gray-300 break-words max-w-full">
                          {item.dex} 
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 