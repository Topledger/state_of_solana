"use client";

import React, { useState } from "react";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/app/api/stablecoins/tvl/tvlData";

// Dynamically import the chart component with no SSR
const TvlChart = dynamic(
  () => import("@/app/components/charts/stablecoins/tvl/TvlChart"),
  { ssr: false }
);

export default function TvlPage() {
  // State for modal
  const [chartModalOpen, setChartModalOpen] = useState(false);
  
  // State for downloading data
  const [isDownloading, setIsDownloading] = useState(false);
  
  // State for legend data
  const [legendItems, setLegendItems] = useState<{ label: string, color: string, value?: number }[]>([]);

  // Download function for TVL data CSV
  const downloadCSV = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchTvlData } = await import('@/app/api/stablecoins/tvl/tvlData');
      
      // Fetch data
      const data = await fetchTvlData();
      
      if (data.length === 0) {
        console.error('No TVL data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV headers
      const headers = ["Date", "Amount_in_Pool"];
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...data.map(item => {
          return [
            item.block_date,
            item.Amount_in_Pool
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_stablecoin_tvl_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading TVL data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        {/* TVL Chart */}
        <ChartCard
          title="Stablecoin TVL"
          description="Total Value Locked in DeFi pools for stablecoins on Solana"
          accentColor="green"
          className="h-[500px]"
          onDownloadClick={downloadCSV}
          isDownloading={isDownloading}
          onExpandClick={() => setChartModalOpen(true)}
          legend={
            legendItems.map(item => (
              <LegendItem
                key={item.label}
                color={item.color}
                label={item.label}
                shape="square"
                tooltipText={item.value !== undefined ? formatCurrency(item.value) : undefined}
              />
            ))
          }
        >
          <TvlChart 
            isModalOpen={chartModalOpen}
            onModalClose={() => setChartModalOpen(false)}
            onUpdateLegends={setLegendItems}
          />
        </ChartCard>
      </section>
    </div>
  );
} 