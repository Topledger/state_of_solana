"use client";

import React, { useState } from "react";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import dynamic from "next/dynamic";
import CurrencyFilter from "@/app/components/shared/filters/CurrencyFilter";
import { StablecoinType } from "@/app/api/stablecoins/liquidity-velocity/p2pTransferSizeData";
import AvgTransferSizeChart from "@/app/components/charts/stablecoins/liquidity-velocity/AvgTransferSizeChart";
import MedianTransferSizeChart from "@/app/components/charts/stablecoins/liquidity-velocity/MedianTransferSizeChart";

// Dynamically import the chart components with no SSR
const VelocityChart = dynamic(
  () => import("@/app/components/charts/stablecoins/liquidity-velocity/VelocityChart"),
  { ssr: false }
);

const P2PVelocityChart = dynamic(
  () => import("@/app/components/charts/stablecoins/liquidity-velocity/P2PVelocityChart"),
  { ssr: false }
);

export default function LiquidityVelocityPage() {
  // State for modals
  const [velocityChartModalOpen, setVelocityChartModalOpen] = useState(false);
  const [p2pVelocityChartModalOpen, setP2PVelocityChartModalOpen] = useState(false);
  
  // New chart modals
  const [avgTransferChartModalOpen, setAvgTransferChartModalOpen] = useState(false);
  const [medianTransferChartModalOpen, setMedianTransferChartModalOpen] = useState(false);
  
  // State for selected stablecoin
  const [selectedStablecoin, setSelectedStablecoin] = useState<StablecoinType>('USDC');
  
  // State for downloading data
  const [isVelocityDownloading, setIsVelocityDownloading] = useState(false);
  const [isP2PVelocityDownloading, setIsP2PVelocityDownloading] = useState(false);
  
  // State for legends
  const [velocityLegends, setVelocityLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  const [p2pVelocityLegends, setP2PVelocityLegends] = useState<{label: string, color: string, value?: number}[]>([]);

  // Available stablecoins for the filter
  const stablecoins: StablecoinType[] = [
    'USDC', 'USDT', 'PYUSD', 'EURC', 'EUROe', 
    'USDe', 'USDY', 'sUSD', 'USDS', 'FDUSD', 'AUSD', 'USDG'
  ];
  
  // Handle stablecoin change
  const handleStablecoinChange = (newStablecoin: string) => {
    console.log('Currency changed from', selectedStablecoin, 'to', newStablecoin);
    setSelectedStablecoin(newStablecoin as StablecoinType);
  };
  
  // Download function for velocity data
  const downloadVelocityCSV = async () => {
    if (isVelocityDownloading) return;
    setIsVelocityDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchLiquidityVelocityData, formatNumber } = await import('@/app/api/stablecoins/liquidity-velocity/liquidityVelocityData');
      
      // Fetch data
      const data = await fetchLiquidityVelocityData();
      
      if (data.length === 0) {
        console.error('No stablecoin velocity data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const mintNames = [...new Set(data.map(item => item.mint_name))];
      const headers = ["Month", ...mintNames];
      
      // Group data by month
      const dataByMonth = data.reduce((acc, curr) => {
        if (!acc[curr.month]) {
          acc[curr.month] = { month: curr.month };
          mintNames.forEach(name => acc[curr.month][name] = 0);
        }
        acc[curr.month][curr.mint_name] = curr.velocity;
        return acc;
      }, {} as Record<string, any>);
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...Object.values(dataByMonth).map((item: any) => {
          return [
            item.month,
            ...mintNames.map(name => item[name] || 0)
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_stablecoin_velocity_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin velocity data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsVelocityDownloading(false);
    }
  };

  // Download function for P2P velocity data
  const downloadP2PVelocityCSV = async () => {
    if (isP2PVelocityDownloading) return;
    setIsP2PVelocityDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchLiquidityVelocityData, formatNumber } = await import('@/app/api/stablecoins/liquidity-velocity/liquidityVelocityData');
      
      // Fetch data
      const data = await fetchLiquidityVelocityData();
      
      if (data.length === 0) {
        console.error('No stablecoin P2P velocity data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const mintNames = [...new Set(data.map(item => item.mint_name))];
      const headers = ["Month", ...mintNames];
      
      // Group data by month
      const dataByMonth = data.reduce((acc, curr) => {
        if (!acc[curr.month]) {
          acc[curr.month] = { month: curr.month };
          mintNames.forEach(name => acc[curr.month][name] = 0);
        }
        acc[curr.month][curr.mint_name] = curr.p2p_velocity;
        return acc;
      }, {} as Record<string, any>);
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...Object.values(dataByMonth).map((item: any) => {
          return [
            item.month,
            ...mintNames.map(name => item[name] || 0)
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_stablecoin_p2p_velocity_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin P2P velocity data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsP2PVelocityDownloading(false);
    }
  };

  // Format number values
  const formatNumber = (value?: number) => {
    if (value === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
  };

  return (
    <div className="space-y-6">
      
      
      {/* Filter row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex space-x-4 items-center">
          <CurrencyFilter 
            currency={selectedStablecoin}
            options={stablecoins}
            onChange={handleStablecoinChange}
            label="Stablecoin"
          />
        </div>
      </div>
      
      {/* Velocity Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Chart */}
        <ChartCard 
          title="Stablecoin Velocity" 
          description="Velocity indicators of stablecoins on Solana"
          accentColor="blue"
          className="h-[500px]"
          onExpandClick={() => setVelocityChartModalOpen(true)}
          onDownloadClick={downloadVelocityCSV}
          isDownloading={isVelocityDownloading}
          legend={
            velocityLegends.map(legend => (
              <LegendItem 
                key={legend.label}
                label={legend.label} 
                color={legend.color} 
                shape="square"
                tooltipText={legend.value ? formatNumber(legend.value) : undefined}
              />
            ))
          }
        >
          <VelocityChart 
            isModalOpen={velocityChartModalOpen}
            onModalClose={() => setVelocityChartModalOpen(false)}
            legendsChanged={setVelocityLegends}
          />
        </ChartCard>
        
        {/* P2P Velocity Chart */}
        <ChartCard 
          title="P2P Velocity" 
          description="Peer-to-peer velocity indicators of stablecoins on Solana"
          accentColor="green"
          className="h-[500px]"
          onExpandClick={() => setP2PVelocityChartModalOpen(true)}
          onDownloadClick={downloadP2PVelocityCSV}
          isDownloading={isP2PVelocityDownloading}
          legend={
            p2pVelocityLegends.map(legend => (
              <LegendItem 
                key={legend.label}
                label={legend.label} 
                color={legend.color} 
                shape="square"
                tooltipText={legend.value ? formatNumber(legend.value) : undefined}
              />
            ))
          }
        >
          <P2PVelocityChart 
            isModalOpen={p2pVelocityChartModalOpen}
            onModalClose={() => setP2PVelocityChartModalOpen(false)}
            legendsChanged={setP2PVelocityLegends}
          />
        </ChartCard>
      </section>
      
      {/* Transfer Size Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Average P2P Transfer Size Chart */}
        <ChartCard 
          title="Average P2P Transfer Size" 
          description="Mean value of peer-to-peer transfer size over time"
          accentColor="blue"
          
          onExpandClick={() => setAvgTransferChartModalOpen(true)}
          filterBar={
            <CurrencyFilter
              currency={selectedStablecoin}
              onChange={handleStablecoinChange}
              options={stablecoins}
              isCompact={true}
            />
          }
        >
          <AvgTransferSizeChart 
            key={`avg-${selectedStablecoin}`}
            stablecoin={selectedStablecoin}
            isModalOpen={avgTransferChartModalOpen}
            onModalClose={() => setAvgTransferChartModalOpen(false)}
          />
        </ChartCard>
        
        {/* Median P2P Transfer Size Chart */}
        <ChartCard 
          title="Median P2P Transfer Size" 
          description="Middle value of peer-to-peer transfer size over time"
          accentColor="orange"
         
          onExpandClick={() => setMedianTransferChartModalOpen(true)}
          filterBar={
            <CurrencyFilter
              currency={selectedStablecoin}
              onChange={handleStablecoinChange}
              options={stablecoins}
              isCompact={true}
            />
          }
        >
          <MedianTransferSizeChart 
            key={`median-${selectedStablecoin}`}
            stablecoin={selectedStablecoin}
            isModalOpen={medianTransferChartModalOpen}
            onModalClose={() => setMedianTransferChartModalOpen(false)}
          />
        </ChartCard>
      </section>
      
      {/* Additional context section */}
      
    </div>
  );
} 