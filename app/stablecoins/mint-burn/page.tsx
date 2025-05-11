"use client";

import React, { useState } from "react";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import dynamic from "next/dynamic";

// Dynamically import the chart components with no SSR
const MintChart = dynamic(
  () => import("@/app/components/charts/stablecoins/mint-burn/MintChart"),
  { ssr: false }
);

const BurnChart = dynamic(
  () => import("@/app/components/charts/stablecoins/mint-burn/BurnChart"),
  { ssr: false }
);

export default function MintBurnPage() {
  // State for modals
  const [mintChartModalOpen, setMintChartModalOpen] = useState(false);
  const [burnChartModalOpen, setBurnChartModalOpen] = useState(false);
  
  // State for downloading data
  const [isMintDownloading, setIsMintDownloading] = useState(false);
  const [isBurnDownloading, setIsBurnDownloading] = useState(false);
  
  // State for legends
  const [mintLegends, setMintLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  const [burnLegends, setBurnLegends] = useState<{label: string, color: string, value?: number}[]>([]);

  // Download function for mint data
  const downloadMintCSV = async () => {
    if (isMintDownloading) return;
    setIsMintDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchMintBurnData } = await import('@/app/api/stablecoins/mint-burn/mintBurnData');
      
      // Fetch data
      const data = await fetchMintBurnData();
      
      if (data.length === 0) {
        console.error('No stablecoin mint data available for download');
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
        acc[curr.Month][curr.mint] = curr.Mint_Amount;
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
      const fileName = `solana_stablecoin_mint_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin mint data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsMintDownloading(false);
    }
  };

  // Download function for burn data
  const downloadBurnCSV = async () => {
    if (isBurnDownloading) return;
    setIsBurnDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchMintBurnData } = await import('@/app/api/stablecoins/mint-burn/mintBurnData');
      
      // Fetch data
      const data = await fetchMintBurnData();
      
      if (data.length === 0) {
        console.error('No stablecoin burn data available for download');
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
        acc[curr.Month][curr.mint] = curr.Burn_Amount;
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
      const fileName = `solana_stablecoin_burn_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading stablecoin burn data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsBurnDownloading(false);
    }
  };

  // Format currency for display
  const formatCurrency = (value?: number) => {
    if (value === undefined) return "$0";
    
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-medium text-white">Stablecoin Mint and Burn Activity</h1>
        <p className="text-gray-400 text-sm">
          Monitor stablecoin mint and burn activities across different issuers on Solana
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mint Chart */}
        <ChartCard
          title="Mint Amount"
          description="Monthly stablecoin mint amounts"
          onDownloadClick={downloadMintCSV}
          isDownloading={isMintDownloading}
          onExpandClick={() => setMintChartModalOpen(true)}
          legend={
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {mintLegends.slice(0, 5).map((legend) => (
                <LegendItem
                  key={legend.label}
                  color={legend.color}
                  label={legend.label}
                  tooltipText={legend.value !== undefined ? `${legend.label}: ${formatCurrency(legend.value)}` : undefined}
                />
              ))}
              {mintLegends.length > 5 && (
                <LegendItem
                  color="#6b7280"
                  label={`+${mintLegends.length - 5} more`}
                />
              )}
            </div>
          }
        >
          <MintChart 
            isModalOpen={mintChartModalOpen}
            onModalClose={() => setMintChartModalOpen(false)}
            onUpdateLegends={setMintLegends}
          />
        </ChartCard>
        
        {/* Burn Chart */}
        <ChartCard
          title="Burn Amount"
          description="Monthly stablecoin burn amounts"
          onDownloadClick={downloadBurnCSV}
          isDownloading={isBurnDownloading}
          onExpandClick={() => setBurnChartModalOpen(true)}
          legend={
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {burnLegends.slice(0, 5).map((legend) => (
                <LegendItem
                  key={legend.label}
                  color={legend.color}
                  label={legend.label}
                  tooltipText={legend.value !== undefined ? `${legend.label}: ${formatCurrency(legend.value)}` : undefined}
                />
              ))}
              {burnLegends.length > 5 && (
                <LegendItem
                  color="#6b7280"
                  label={`+${burnLegends.length - 5} more`}
                />
              )}
            </div>
          }
        >
          <BurnChart 
            isModalOpen={burnChartModalOpen}
            onModalClose={() => setBurnChartModalOpen(false)}
            onUpdateLegends={setBurnLegends}
          />
        </ChartCard>
      </div>
    </div>
  );
} 