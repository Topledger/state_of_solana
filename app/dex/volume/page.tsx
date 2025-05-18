"use client";

import { useState, useEffect } from "react";
import VolumeHistoryChart from "../../components/charts/DEX/volume/VolumeHistoryChart";
import VolumeByProgramChart from "../../components/charts/DEX/volume/VolumeByProgramChart";
import MemecoinVolumeChart from "../../components/charts/DEX/volume/MemecoinVolumeChart";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import { VolumeTimeFilter, fetchVolumeHistoryData, formatVolumeDate } from "../../api/dex/volume/volumeHistoryData";
import { VolumeByProgramDataPoint, fetchVolumeByProgramDataWithFallback, formatVolume } from "../../api/dex/volume/volumeByProgramData";
import { MemecoinVolumeTimeFilter, fetchMemecoinVolumeDataWithFallback } from "../../api/dex/volume/memecoinVolumeData";
import ChartCard from "../../components/shared/ChartCard";
import LegendItem from "../../components/shared/LegendItem";

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
const memecoinColors = colors.slice(0, 17);

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
        <ChartCard
          title="Trading Volume History"
          description="Tracking trading volume trends across the Solana ecosystem"
          accentColor="blue"
          onExpandClick={() => setChartModalOpen(true)}
          onDownloadClick={downloadVolumeDataCSV}
          isDownloading={isDownloading}
          filterBar={
            <TimeFilterSelector 
              value={timeFilter} 
              onChange={(val) => setTimeFilter(val as VolumeTimeFilter)}
              options={[
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' }
              ]}
            />
          }
        >
          <VolumeHistoryChart 
            timeFilter={timeFilter}
            isModalOpen={chartModalOpen}
            onModalClose={() => setChartModalOpen(false)}
          />
        </ChartCard>
        
        {/* Volume by Program Chart */}
        <ChartCard
          title="Volume by Program"
          description="Breakdown of trading volume by decentralized exchange"
          accentColor="purple"
          onExpandClick={() => setProgramChartModalOpen(true)}
          onDownloadClick={downloadVolumeByProgramDataCSV}
          isDownloading={isProgramDataDownloading}
          legendWidth="1/4"
          legend={
            isVolumeByProgramLoading ? (
              <LegendItem label="Loading..." color="#a78bfa" isLoading={true} />
            ) : (
              volumeByProgramData.map((item, index) => (
                <LegendItem
                  key={`legend-${index}`}
                  label={`${item.dex} (${item.percentage.toFixed(1)}%)`}
                  color={colors[index % colors.length]}
                  tooltipText={`${item.dex}: ${formatVolume(item.volume)} (${item.percentage.toFixed(1)}%)`}
                />
              ))
            )
          }
        >
          <VolumeByProgramChart
            isModalOpen={programChartModalOpen}
            onModalClose={() => setProgramChartModalOpen(false)}
          />
        </ChartCard>
      </div>
      
      {/* Second row: Volume by Token and Memecoin Volume charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Volume by Token Chart */}
        <ChartCard
          title="Volume by Token"
          description="Most traded tokens by volume over time"
          accentColor="green"
          filterBar={
            <TimeFilterSelector 
              value={tokenVolumeTimeFilter} 
              onChange={(val) => setTokenVolumeTimeFilter(val as VolumeTimeFilter)}
              options={[
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' }
              ]}
            />
          }
        >
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500 text-sm">Token Volume Chart (Coming Soon)</div>
          </div>
        </ChartCard>
        
        {/* Top Memecoins by Volume */}
        <ChartCard
          title="Top Memecoins by Volume"
          description="Analysis of trading volume across memecoins"
          accentColor="orange"
          onExpandClick={() => setMemecoinModalOpen(true)}
          onDownloadClick={downloadMemecoinVolumeDataCSV}
          isDownloading={isMemecoinDataDownloading}
          filterBar={
            <TimeFilterSelector 
              value={memecoinVolumeTimeFilter} 
              onChange={(val) => setMemecoinVolumeTimeFilter(val as MemecoinVolumeTimeFilter)}
              options={[
                { value: 'D', label: 'D' },
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },   
              ]}
            />
          }
          legend={
            isMemecoinVolumeLoading ? (
              <>
                <LegendItem label="Loading..." color="#f59e0b" isLoading={true} />
                <LegendItem label="Loading..." color="#fbbf24" isLoading={true} />
                <LegendItem label="Loading..." color="#fcd34d" isLoading={true} />
              </>
            ) : (
              memecoinVolumeData.map((item, index) => (
                <LegendItem
                  key={`memecoin-legend-${index}`}
                  label={item.token}
                  color={memecoinColors[index % memecoinColors.length]}
                  tooltipText={item.token}
                />
              ))
            )
          }
        >
          <MemecoinVolumeChart 
            timeFilter={memecoinVolumeTimeFilter}
            isModalOpen={memecoinModalOpen}
            onModalClose={() => setMemecoinModalOpen(false)}
            onDataUpdate={(data) => {
              setMemecoinVolumeData(data);
              setIsMemecoinVolumeLoading(false);
            }}
          />
        </ChartCard>
      </div>
    </div>
  );
} 