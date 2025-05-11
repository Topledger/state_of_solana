"use client";

import React, { useState } from "react";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import dynamic from "next/dynamic";

// Dynamically import the chart components with no SSR
const StablecoinSupplyChart = dynamic(
  () => import("@/app/components/charts/stablecoins/stablecoin-usage/StablecoinSupplyChart"),
  { ssr: false }
);

const StablecoinHoldersChart = dynamic(
  () => import("@/app/components/charts/stablecoins/stablecoin-usage/StablecoinHoldersChart"),
  { ssr: false }
);

const StablecoinVolumeChart = dynamic(
  () => import("@/app/components/charts/stablecoins/stablecoin-usage/StablecoinVolumeChart"),
  { ssr: false }
);

const StablecoinP2PChart = dynamic(
  () => import("@/app/components/charts/stablecoins/stablecoin-usage/StablecoinP2PChart"),
  { ssr: false }
);

// Define colors for stablecoin types
const stablecoinColors = {
  "USDC": "#2775ca", // Blue
  "USDT": "#26a17b", // Green
  "PYUSD": "#8a2be2", // Purple
  "DAI": "#f5ac37",  // Amber
  "BUSD": "#f0b90b", // Yellow
};

export default function StablecoinUsagePage() {
  // State for modals
  const [supplyChartModalOpen, setSupplyChartModalOpen] = useState(false);
  const [holdersChartModalOpen, setHoldersChartModalOpen] = useState(false);
  const [volumeChartModalOpen, setVolumeChartModalOpen] = useState(false);
  const [p2pChartModalOpen, setP2PChartModalOpen] = useState(false);
  
  // State for downloading data
  const [isSupplyDownloading, setIsSupplyDownloading] = useState(false);
  const [isHoldersDownloading, setIsHoldersDownloading] = useState(false);
  const [isVolumeDownloading, setIsVolumeDownloading] = useState(false);
  const [isP2PDownloading, setIsP2PDownloading] = useState(false);
  
  // State for legends
  const [supplyLegends, setSupplyLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  const [holdersLegends, setHoldersLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  const [volumeLegends, setVolumeLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  const [p2pLegends, setP2PLegends] = useState<{label: string, color: string, value?: number}[]>([]);

  // Download function for supply data
  const downloadSupplyCSV = async () => {
    if (isSupplyDownloading) return;
    setIsSupplyDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchStablecoinUsageData } = await import('@/app/api/stablecoins/stablecoin-usage/stablecoinUsageData');
      
      // Fetch data
      const data = await fetchStablecoinUsageData();
      
      if (data.length === 0) {
        console.error('No stablecoin supply data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const mintNames = [...new Set(data.map(item => item.mint_name))];
      const headers = ["Date", ...mintNames];
      
      // Group data by date
      const dataByDate = data.reduce((acc, curr) => {
        if (!acc[curr.block_date]) {
          acc[curr.block_date] = { date: curr.block_date };
          mintNames.forEach(name => acc[curr.block_date][name] = 0);
        }
        acc[curr.block_date][curr.mint_name] = curr.token_supply;
        return acc;
      }, {} as Record<string, any>);
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...Object.values(dataByDate).map((item: any) => {
          return [
            item.date,
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
      const fileName = `solana_stablecoin_supply_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin supply data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsSupplyDownloading(false);
    }
  };

  // Download function for holders data
  const downloadHoldersCSV = async () => {
    if (isHoldersDownloading) return;
    setIsHoldersDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchStablecoinUsageData } = await import('@/app/api/stablecoins/stablecoin-usage/stablecoinUsageData');
      
      // Fetch data
      const data = await fetchStablecoinUsageData();
      
      if (data.length === 0) {
        console.error('No stablecoin holders data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const mintNames = [...new Set(data.map(item => item.mint_name))];
      const headers = ["Date", ...mintNames];
      
      // Group data by date
      const dataByDate = data.reduce((acc, curr) => {
        if (!acc[curr.block_date]) {
          acc[curr.block_date] = { date: curr.block_date };
          mintNames.forEach(name => acc[curr.block_date][name] = 0);
        }
        acc[curr.block_date][curr.mint_name] = curr.holders;
        return acc;
      }, {} as Record<string, any>);
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...Object.values(dataByDate).map((item: any) => {
          return [
            item.date,
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
      const fileName = `solana_stablecoin_holders_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin holders data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsHoldersDownloading(false);
    }
  };

  // Download function for volume data
  const downloadVolumeCSV = async () => {
    if (isVolumeDownloading) return;
    setIsVolumeDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchStablecoinVolumeData } = await import('@/app/api/stablecoins/stablecoin-usage/stablecoinVolumeData');
      
      // Fetch data
      const data = await fetchStablecoinVolumeData();
      
      if (data.length === 0) {
        console.error('No stablecoin volume data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const mintNames = [...new Set(data.map(item => item.mint))];
      const headers = ["Month", ...mintNames];
      
      // Group data by month
      const dataByMonth = data.reduce((acc, curr) => {
        if (!acc[curr.Month]) {
          acc[curr.Month] = { Month: curr.Month };
          mintNames.forEach(name => acc[curr.Month][name] = 0);
        }
        acc[curr.Month][curr.mint] = curr.amount;
        return acc;
      }, {} as Record<string, any>);
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...Object.values(dataByMonth).map((item: any) => {
          return [
            item.Month,
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
      const fileName = `solana_stablecoin_volume_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin volume data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsVolumeDownloading(false);
    }
  };

  // Download function for P2P data
  const downloadP2PCSV = async () => {
    if (isP2PDownloading) return;
    setIsP2PDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchStablecoinP2PData } = await import('@/app/api/stablecoins/stablecoin-usage/stablecoinP2PData');
      
      // Fetch data
      const data = await fetchStablecoinP2PData();
      
      if (data.length === 0) {
        console.error('No stablecoin P2P data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const mintNames = [...new Set(data.map(item => item.mint))];
      const headers = ["Month", ...mintNames];
      
      // Group data by month
      const dataByMonth = data.reduce((acc, curr) => {
        if (!acc[curr.Month]) {
          acc[curr.Month] = { Month: curr.Month };
          mintNames.forEach(name => acc[curr.Month][name] = 0);
        }
        acc[curr.Month][curr.mint] = curr.Volume;
        return acc;
      }, {} as Record<string, any>);
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...Object.values(dataByMonth).map((item: any) => {
          return [
            item.Month,
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
      const fileName = `solana_stablecoin_p2p_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin P2P data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsP2PDownloading(false);
    }
  };

  // Format currency values
  const formatCurrency = (value?: number) => {
    if (value === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
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
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Volume Chart */}
      <ChartCard 
        title="Stablecoin Volume" 
        description="Transaction volume of stablecoins on Solana over time"
        accentColor="green"
        className="h-[500px]"
        onExpandClick={() => setVolumeChartModalOpen(true)}
        onDownloadClick={downloadVolumeCSV}
        isDownloading={isVolumeDownloading}
        legend={
          volumeLegends.map(legend => (
            <LegendItem 
              key={legend.label}
              label={legend.label} 
              color={legend.color} 
              shape="square"
              tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
            />
          ))
        }
      >
        <StablecoinVolumeChart 
          isModalOpen={volumeChartModalOpen}
          onModalClose={() => setVolumeChartModalOpen(false)}
          legendsChanged={setVolumeLegends}
        />
      </ChartCard>
      
      {/* P2P Transfer Chart */}
      <ChartCard 
        title="Stablecoin P2P Transfers" 
        description="Peer-to-peer transfer volume of stablecoins on Solana"
        accentColor="orange"
        className="h-[500px]"
        onExpandClick={() => setP2PChartModalOpen(true)}
        onDownloadClick={downloadP2PCSV}
        isDownloading={isP2PDownloading}
        legend={
          p2pLegends.map(legend => (
            <LegendItem 
              key={legend.label}
              label={legend.label} 
              color={legend.color} 
              shape="square"
              tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
            />
          ))
        }
      >
        <StablecoinP2PChart 
          isModalOpen={p2pChartModalOpen}
          onModalClose={() => setP2PChartModalOpen(false)}
          legendsChanged={setP2PLegends}
        />
      </ChartCard>
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Token Supply Chart */}
      <ChartCard 
        title="Stablecoin Supply" 
        description="Token supply of stablecoins on Solana over time"
        accentColor="blue"
        className="h-[500px]"
        onExpandClick={() => setSupplyChartModalOpen(true)}
        onDownloadClick={downloadSupplyCSV}
        isDownloading={isSupplyDownloading}
        legend={
          supplyLegends.map(legend => (
            <LegendItem 
              key={legend.label}
              label={legend.label} 
              color={legend.color} 
              shape="square"
              tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
            />
          ))
        }
      >
        <StablecoinSupplyChart 
          isModalOpen={supplyChartModalOpen}
          onModalClose={() => setSupplyChartModalOpen(false)}
          legendsChanged={setSupplyLegends}
        />
      </ChartCard>
      
      {/* Holders Chart */}
      <ChartCard 
        title="Stablecoin Holders" 
        description="Number of wallet holders for stablecoins on Solana over time"
        accentColor="purple"
        className="h-[500px]"
        onExpandClick={() => setHoldersChartModalOpen(true)}
        onDownloadClick={downloadHoldersCSV}
        isDownloading={isHoldersDownloading}
        legend={
          holdersLegends.map(legend => (
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
        <StablecoinHoldersChart 
          isModalOpen={holdersChartModalOpen}
          onModalClose={() => setHoldersChartModalOpen(false)}
          legendsChanged={setHoldersLegends}
        />
      </ChartCard>
      </section>
    </div>
  );
} 