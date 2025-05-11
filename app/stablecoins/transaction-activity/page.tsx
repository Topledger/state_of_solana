"use client";

import React, { useState } from "react";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import dynamic from "next/dynamic";

// Dynamically import the chart components with no SSR
const TransfersChart = dynamic(
  () => import("@/app/components/charts/stablecoins/transaction-activity/TransfersChart"),
  { ssr: false }
);

const P2PTransfersChart = dynamic(
  () => import("@/app/components/charts/stablecoins/transaction-activity/P2PTransfersChart"),
  { ssr: false }
);

// Dynamically import the chart component with no SSR
const DexVolumeChart = dynamic(
  () => import("@/app/components/charts/stablecoins/transaction-activity/DexVolumeChart"),
  { ssr: false }
);

export default function StablecoinTransactionActivityPage() {
  // State for modals
  const [transfersChartModalOpen, setTransfersChartModalOpen] = useState(false);
  const [p2pTransfersChartModalOpen, setP2PTransfersChartModalOpen] = useState(false);
  const [dexVolumeChartModalOpen, setDexVolumeChartModalOpen] = useState(false);
  
  // State for downloading data
  const [isTransfersDownloading, setIsTransfersDownloading] = useState(false);
  const [isP2PTransfersDownloading, setIsP2PTransfersDownloading] = useState(false);
  const [isDexVolumeDownloading, setIsDexVolumeDownloading] = useState(false);
  
  // State for legends
  const [transfersLegends, setTransfersLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  const [p2pTransfersLegends, setP2PTransfersLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  const [dexVolumeLegends, setDexVolumeLegends] = useState<{label: string, color: string, value?: number}[]>([]);

  // Download function for transfers data
  const downloadTransfersCSV = async () => {
    if (isTransfersDownloading) return;
    setIsTransfersDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchTransactionActivityData, formatNumber } = await import('@/app/api/stablecoins/transaction-activity/transactionActivityData');
      
      // Fetch data
      const data = await fetchTransactionActivityData();
      
      if (data.length === 0) {
        console.error('No stablecoin transfers data available for download');
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
        acc[curr.month][curr.mint_name] = curr.transfers;
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
      const fileName = `solana_stablecoin_transfers_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin transfers data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsTransfersDownloading(false);
    }
  };

  // Download function for P2P transfers data
  const downloadP2PTransfersCSV = async () => {
    if (isP2PTransfersDownloading) return;
    setIsP2PTransfersDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchTransactionActivityData, formatNumber } = await import('@/app/api/stablecoins/transaction-activity/transactionActivityData');
      
      // Fetch data
      const data = await fetchTransactionActivityData();
      
      if (data.length === 0) {
        console.error('No stablecoin P2P transfers data available for download');
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
        acc[curr.month][curr.mint_name] = curr.p2p_transfers;
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
      const fileName = `solana_stablecoin_p2p_transfers_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin P2P transfers data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsP2PTransfersDownloading(false);
    }
  };

  // Download function for DEX volume data
  const downloadDexVolumeCSV = async () => {
    if (isDexVolumeDownloading) return;
    setIsDexVolumeDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchDexVolumeData, formatCurrency } = await import('@/app/api/stablecoins/transaction-activity/dexVolumeData');
      
      // Fetch data
      const data = await fetchDexVolumeData();
      
      if (data.length === 0) {
        console.error('No DEX volume data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const mintNames = [...new Set(data.map(item => item.mint))];
      const headers = ["Month", ...mintNames];
      
      // Group data by month
      const dataByMonth = data.reduce((acc, curr) => {
        if (!acc[curr.month]) {
          acc[curr.month] = { month: curr.month };
          mintNames.forEach(name => acc[curr.month][name] = 0);
        }
        acc[curr.month][curr.mint] = curr.Dex_Volume;
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
      const fileName = `solana_stablecoin_dex_volume_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading DEX volume data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsDexVolumeDownloading(false);
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

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transfers Chart */}
        <ChartCard 
          title="Stablecoin Transfers" 
          description="Total transaction count of stablecoins on Solana"
          accentColor="blue"
          className="h-[500px]"
          onExpandClick={() => setTransfersChartModalOpen(true)}
          onDownloadClick={downloadTransfersCSV}
          isDownloading={isTransfersDownloading}
          legend={
            transfersLegends.map(legend => (
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
          <TransfersChart 
            isModalOpen={transfersChartModalOpen}
            onModalClose={() => setTransfersChartModalOpen(false)}
            legendsChanged={setTransfersLegends}
          />
        </ChartCard>

        {/* P2P Transfers Chart */}
        <ChartCard 
          title="Stablecoin P2P Transfers" 
          description="Peer-to-peer transaction count of stablecoins on Solana"
          accentColor="green"
          className="h-[500px]"
          onExpandClick={() => setP2PTransfersChartModalOpen(true)}
          onDownloadClick={downloadP2PTransfersCSV}
          isDownloading={isP2PTransfersDownloading}
          legend={
            p2pTransfersLegends.map(legend => (
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
          <P2PTransfersChart 
            isModalOpen={p2pTransfersChartModalOpen}
            onModalClose={() => setP2PTransfersChartModalOpen(false)}
            legendsChanged={setP2PTransfersLegends}
          />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4">
        {/* DEX Volume Chart */}
        <ChartCard 
          title="Stablecoin DEX Volume" 
          description="Monthly DEX trading volume of stablecoins on Solana"
          accentColor="blue"
          className="h-[500px]"
          onExpandClick={() => setDexVolumeChartModalOpen(true)}
          onDownloadClick={downloadDexVolumeCSV}
          isDownloading={isDexVolumeDownloading}
          legend={
            dexVolumeLegends.map(legend => (
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
          <DexVolumeChart 
            isModalOpen={dexVolumeChartModalOpen}
            onModalClose={() => setDexVolumeChartModalOpen(false)}
            legendsChanged={setDexVolumeLegends}
          />
        </ChartCard>
      </section>
    </div>
  );
} 