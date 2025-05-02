"use client";

import { useState, useEffect } from "react";
import VolumeHistoryChart from "../../components/charts/VolumeHistoryChart";
import VolumeByProgramChart from "../../components/charts/VolumeByProgramChart";
import MemecoinVolumeChart from "../../components/charts/MemecoinVolumeChart";
import { ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import { VolumeTimeFilter, fetchVolumeHistoryData, formatVolumeDate } from "../../api/dex/volume/volumeHistoryData";
import { VolumeByProgramDataPoint, fetchVolumeByProgramDataWithFallback, formatVolume } from "../../api/dex/volume/volumeByProgramData";
import { MemecoinVolumeTimeFilter, fetchMemecoinVolumeDataWithFallback } from "../../api/dex/volume/memecoinVolumeData";

// Define color palette (same as in VolumeByProgramChart)
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

// Memecoin color palette - same as in MemecoinVolumeChart
const memecoinColors = [
  '#f59e0b', // amber-500
  '#fbbf24', // amber-400
  '#fcd34d', // amber-300
  '#d97706', // amber-600
  '#92400e', // amber-800
  '#78350f', // amber-900
  '#b45309', // amber-700
  '#a16207', // yellow-800
  '#ca8a04', // yellow-600
  '#eab308', // yellow-500
  '#facc15', // yellow-400
  '#fef08a', // yellow-200
  '#854d0e', // yellow-900
  '#713f12', // yellow-950
  '#f97316', // orange-500
  '#ea580c', // orange-600
];

export default function DexVolumePage() {
  const [timeFilter, setTimeFilter] = useState<VolumeTimeFilter>('W');
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [programChartModalOpen, setProgramChartModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProgramDataDownloading, setIsProgramDataDownloading] = useState(false);
  
  // Additional time filters for other charts
  const [tokenVolumeTimeFilter, setTokenVolumeTimeFilter] = useState<VolumeTimeFilter>('W');
  const [memecoinVolumeTimeFilter, setMemecoinVolumeTimeFilter] = useState<MemecoinVolumeTimeFilter>('W');
  const [memecoinModalOpen, setMemecoinModalOpen] = useState(false);
  const [isMemecoinDataDownloading, setIsMemecoinDataDownloading] = useState(false);
  
  // Add state for volume by program data for the legend
  const [volumeByProgramData, setVolumeByProgramData] = useState<VolumeByProgramDataPoint[]>([]);
  const [isVolumeByProgramLoading, setIsVolumeByProgramLoading] = useState(true);

  // Add state for memecoin volume data for the legend
  const [memecoinVolumeData, setMemecoinVolumeData] = useState<any[]>([]);
  const [isMemecoinVolumeLoading, setIsMemecoinVolumeLoading] = useState(true);

  // Fetch volume by program data for the legend
  useEffect(() => {
    const fetchVolumeByProgramData = async () => {
      setIsVolumeByProgramLoading(true);
      try {
        const data = await fetchVolumeByProgramDataWithFallback();
        setVolumeByProgramData(data);
      } catch (error) {
        console.error("Error fetching volume by program data:", error);
      } finally {
        setIsVolumeByProgramLoading(false);
      }
    };

    fetchVolumeByProgramData();
  }, []);

  // Function to download volume data as CSV
  const downloadVolumeDataCSV = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      // Fetch data with current timeFilter
      const volumeData = await fetchVolumeHistoryData(timeFilter);
      
      if (volumeData.length === 0) {
        alert("No data available to download");
        return;
      }
      
      // Convert data to CSV format
      const headers = ["Date", "Volume ($)"];
      const csvRows = [
        headers.join(","), // CSV header row
        ...volumeData.map(row => {
          const formattedDate = formatVolumeDate(row.date, timeFilter);
          const formattedVolume = row.volume.toString();
          return [formattedDate, formattedVolume].join(",");
        })
      ];
      
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_dex_volume_${timeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Error downloading volume data:", error);
      alert("Failed to download data. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Function to download volume by program data as CSV
  const downloadVolumeByProgramDataCSV = async () => {
    if (isProgramDataDownloading) return;
    
    setIsProgramDataDownloading(true);
    try {
      // Fetch data
      const volumeData = await fetchVolumeByProgramDataWithFallback();
      
      if (volumeData.length === 0) {
        alert("No data available to download");
        return;
      }
      
      // Convert data to CSV format
      const headers = ["DEX", "Volume ($)", "Share (%)"];
      const csvRows = [
        headers.join(","), // CSV header row
        ...volumeData.map(row => {
          return [
            row.dex,
            row.volume.toString(),
            row.percentage.toFixed(2)
          ].join(",");
        })
      ];
      
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_dex_volume_by_program_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Error downloading volume by program data:", error);
      alert("Failed to download data. Please try again.");
    } finally {
      setIsProgramDataDownloading(false);
    }
  };

  // Function to download memecoin volume data as CSV
  const downloadMemecoinVolumeDataCSV = async () => {
    if (isMemecoinDataDownloading) return;
    
    setIsMemecoinDataDownloading(true);
    try {
      // Fetch data with current timeFilter
      const volumeData = await fetchMemecoinVolumeDataWithFallback(memecoinVolumeTimeFilter);
      
      if (volumeData.dates.length === 0 || volumeData.series.length === 0) {
        alert("No data available to download");
        return;
      }
      
      // Transform the stacked data format to a flat CSV structure
      const headers = ["Date", ...volumeData.series.map(s => s.name)];
      
      // Create rows with date and volume for each token
      const rows = volumeData.dates.map((date, dateIndex) => {
        const rowData = [date];
        
        // Add volume for each token
        volumeData.series.forEach(series => {
          rowData.push(series.data[dateIndex]?.toString() || "0");
        });
        
        return rowData;
      });
      
      // Generate CSV content
      const csvRows = [
        headers.join(","), // CSV header row
        ...rows.map(row => row.join(","))
      ];
      
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_memecoin_volume_${memecoinVolumeTimeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Error downloading memecoin volume data:", error);
      alert("Failed to download data. Please try again.");
    } finally {
      setIsMemecoinDataDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* First row: Volume History and Volume by Program charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Trading Volume History Chart */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Trading Volume History</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Tracking trading volume trends across the Solana ecosystem</p>
            </div>
            {/* Action buttons */}
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className={`p-1.5 ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'} rounded-md transition-colors`}
                onClick={downloadVolumeDataCSV}
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
                onClick={() => setChartModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <TimeFilterSelector 
              value={timeFilter} 
              onChange={(val) => setTimeFilter(val as VolumeTimeFilter)}
              options={[
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' }
              ]}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Render the chart */}
          <div className="h-[360px] lg:h-80">
            <VolumeHistoryChart 
              timeFilter={timeFilter}
              isModalOpen={chartModalOpen}
              onModalClose={() => setChartModalOpen(false)}
            />
          </div>
        </div>
        
        {/* Volume by Program Chart */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Volume by Program</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Breakdown of trading volume by decentralized exchange</p>
            </div>
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className={`p-1.5 ${isProgramDataDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'} rounded-md transition-colors`}
                onClick={downloadVolumeByProgramDataCSV}
                disabled={isProgramDataDownloading}
                title="Download CSV Data"
              >
                {isProgramDataDownloading ? (
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-purple-500/10 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors"
                onClick={() => setProgramChartModalOpen(true)}
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
              <VolumeByProgramChart
                isModalOpen={programChartModalOpen}
                onModalClose={() => setProgramChartModalOpen(false)}
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
                  {isVolumeByProgramLoading ? (
                    // Loading state
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                      <span className="text-xs text-gray-300">Loading...</span>
                    </div>
                  ) : (
                    // Dynamically generated legends based on actual data
                    volumeByProgramData.map((item, index) => (
                      <div key={`legend-${index}`} className="flex items-start">
                        <div 
                          className="w-2 h-2 mr-2 rounded-sm mt-0.5 flex-shrink-0" 
                          style={{ background: colors[index % colors.length] }}
                        ></div>
                        <span className="text-xs text-gray-300 break-words max-w-full">
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
      </div>
      
      {/* Second row: Volume by Token and New Chart Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Volume by Token Chart Container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-green-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Volume by Token</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Most traded tokens by volume over time</p>
            </div>
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className="p-1.5 bg-green-500/10 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
                onClick={() => {/* Placeholder for download function */}}
                title="Download CSV Data"
              >
                <DownloadIcon className="w-4 h-4" />
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-green-500/10 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
                onClick={() => {/* Placeholder for expand function */}}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <TimeFilterSelector 
              value={tokenVolumeTimeFilter} 
              onChange={(val) => setTokenVolumeTimeFilter(val as VolumeTimeFilter)}
              options={[
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' }
              ]}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Placeholder for chart */}
          <div className="h-[360px] lg:h-80 flex items-center justify-center">
            <div className="text-gray-500 text-sm">Token Volume Chart (Coming Soon)</div>
          </div>
        </div>
        
        {/* Top Memecoins by Volume */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-amber-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Top Memecoins by Volume</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Analysis of trading volume across memecoins</p>
            </div>
            <div className="flex space-x-2">
              {/* Download button */}
              <button 
                className={`p-1.5 ${isMemecoinDataDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'} rounded-md transition-colors`}
                onClick={downloadMemecoinVolumeDataCSV}
                disabled={isMemecoinDataDownloading}
                title="Download CSV Data"
              >
                {isMemecoinDataDownloading ? (
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              
              {/* Expand button */}
              <button 
                className="p-1.5 bg-amber-500/10 rounded-md text-amber-400 hover:bg-amber-500/20 transition-colors"
                onClick={() => setMemecoinModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <TimeFilterSelector 
              value={memecoinVolumeTimeFilter} 
              onChange={(val) => setMemecoinVolumeTimeFilter(val as MemecoinVolumeTimeFilter)}
              options={[
                { value: 'D', label: 'D' },
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },   
              ]}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - With Chart and Legend */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-64 lg:h-auto">
              <MemecoinVolumeChart 
                timeFilter={memecoinVolumeTimeFilter}
                isModalOpen={memecoinModalOpen}
                onModalClose={() => setMemecoinModalOpen(false)}
                onDataUpdate={(data) => {
                  setMemecoinVolumeData(data);
                  setIsMemecoinVolumeLoading(false);
                }}
              />
            </div>
            
            {/* Legend Area - horizontal on mobile, vertical on desktop with scrolling */}
            <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
              <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 pt-1 pb-0 h-full w-full overflow-hidden">
                <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 w-full h-full overflow-y-auto
                  [&::-webkit-scrollbar]:w-1.5 
                  [&::-webkit-scrollbar-track]:bg-transparent 
                  [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                  scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                  {isMemecoinVolumeLoading ? (
                    // Loading state
                    <>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-amber-500 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                        <span className="text-xs text-gray-300">Loading...</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-amber-400 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                        <span className="text-xs text-gray-300">Loading...</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-amber-300 mr-2 rounded-sm mt-0.5 animate-pulse"></div>
                        <span className="text-xs text-gray-300">Loading...</span>
                      </div>
                    </>
                  ) : (
                    // Use actual data from the chart component
                    memecoinVolumeData.map((item, index) => {
                      return (
                        <div key={`memecoin-legend-${index}`} className="flex items-start">
                          <div 
                            className="w-2 h-2 mr-2 rounded-sm mt-0.5 flex-shrink-0" 
                            style={{ background: memecoinColors[index % memecoinColors.length] }}
                          ></div>
                          <span className="text-xs text-gray-300 break-words max-w-full">
                            {item.token}
                          </span>
                        </div>
                      );
                    })
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