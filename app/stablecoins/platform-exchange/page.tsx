"use client";

import React, { useState, useEffect, useMemo } from "react";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import DataTable, { Column } from "@/app/components/shared/DataTable";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/app/api/stablecoins/platform-exchange/platformExchangeData";
import { fetchCexAddressData, CexAddressDataPoint } from "@/app/api/stablecoins/platform-exchange/cexAddressData";
import Loader from "@/app/components/shared/Loader";

// Dynamically import the chart components with no SSR
const ExchangeVolumeChart = dynamic(
  () => import("@/app/components/charts/stablecoins/platform-exchange/ExchangeVolumeChart"),
  { ssr: false }
);

const ExchangeTransfersChart = dynamic(
  () => import("@/app/components/charts/stablecoins/platform-exchange/ExchangeTransfersChart"),
  { ssr: false }
);

// Type for table sorting
type SortColumn = 'address' | 'cex_name' | 'distinct_name' | 'added_date';
type SortDirection = 'asc' | 'desc';

export default function PlatformExchangePage() {
  // State for modals
  const [volumeChartModalOpen, setVolumeChartModalOpen] = useState(false);
  const [transfersChartModalOpen, setTransfersChartModalOpen] = useState(false);
  
  // State for downloading data
  const [isVolumeDownloading, setIsVolumeDownloading] = useState(false);
  const [isTransfersDownloading, setIsTransfersDownloading] = useState(false);
  
  // State for legends
  const [volumeLegends, setVolumeLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  const [transfersLegends, setTransfersLegends] = useState<{label: string, color: string, value?: number}[]>([]);

  // State for CEX addresses table
  const [cexAddresses, setCexAddresses] = useState<CexAddressDataPoint[]>([]);
  const [isAddressDataLoading, setIsAddressDataLoading] = useState(true);
  const [addressDataError, setAddressDataError] = useState<string | null>(null);
  const [isAddressDownloading, setIsAddressDownloading] = useState(false);

  // Define table columns for CEX addresses
  const addressColumns = useMemo<Column<CexAddressDataPoint>[]>(() => [
    {
      key: 'address',
      header: 'Address',
      sortable: true,
      render: (row) => <span className="font-mono">{row.address}</span>
    },
    {
      key: 'cex_name',
      header: 'Exchange',
      sortable: true
    },
    {
      key: 'distinct_name',
      header: 'Distinct Name',
      sortable: true
    },
    {
      key: 'added_date',
      header: 'Added Date',
      sortable: true
    }
  ], []);

  // Fetch CEX address data
  useEffect(() => {
    const fetchAddressData = async () => {
      setIsAddressDataLoading(true);
      setAddressDataError(null);
      try {
        const data = await fetchCexAddressData();
        setCexAddresses(data);
      } catch (error) {
        console.error('Error fetching CEX address data:', error);
        setAddressDataError('Failed to load CEX address data. Please try again later.');
      } finally {
        setIsAddressDataLoading(false);
      }
    };

    fetchAddressData();
  }, []);

  // Download function for volume data CSV
  const downloadVolumeCSV = async () => {
    if (isVolumeDownloading) return;
    setIsVolumeDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchPlatformExchangeData } = await import('@/app/api/stablecoins/platform-exchange/platformExchangeData');
      
      // Fetch data
      const data = await fetchPlatformExchangeData();
      
      if (data.length === 0) {
        console.error('No exchange volume data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const exchangeNames = [...new Set(data.map(item => item.name))];
      const headers = ["Month", ...exchangeNames];
      
      // Group data by month
      const dataByMonth = data.reduce((acc, curr) => {
        if (!acc[curr.month]) {
          acc[curr.month] = { Month: curr.month };
          exchangeNames.forEach(name => acc[curr.month][name] = 0);
        }
        acc[curr.month][curr.name] = curr.volume;
        return acc;
      }, {} as Record<string, any>);
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...Object.values(dataByMonth).map((item: any) => {
          return [
            item.Month,
            ...exchangeNames.map(name => item[name] || 0)
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_exchange_volume_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading exchange volume data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsVolumeDownloading(false);
    }
  };

  // Download function for transfers data CSV
  const downloadTransfersCSV = async () => {
    if (isTransfersDownloading) return;
    setIsTransfersDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchExchangeTransfersData } = await import('@/app/api/stablecoins/platform-exchange/platformExchangeData');
      
      // Fetch data
      const data = await fetchExchangeTransfersData();
      
      if (data.length === 0) {
        console.error('No exchange transfers data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const exchangeNames = [...new Set(data.map(item => item.name))];
      const headers = ["Month", ...exchangeNames];
      
      // Group data by month
      const dataByMonth = data.reduce((acc, curr) => {
        if (!acc[curr.month]) {
          acc[curr.month] = { Month: curr.month };
          exchangeNames.forEach(name => acc[curr.month][name] = 0);
        }
        acc[curr.month][curr.name] = curr.volume;
        return acc;
      }, {} as Record<string, any>);
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...Object.values(dataByMonth).map((item: any) => {
          return [
            item.Month,
            ...exchangeNames.map(name => item[name] || 0)
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_exchange_transfers_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading exchange transfers data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsTransfersDownloading(false);
    }
  };
  
  // Download CEX addresses CSV
  const downloadAddressesCSV = async () => {
    if (isAddressDownloading) return;
    setIsAddressDownloading(true);
    
    try {
      if (cexAddresses.length === 0) {
        console.error('No CEX address data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV headers
      const headers = ["Blockchain", "Address", "Exchange", "Distinct Name", "Added Date"];
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...cexAddresses.map(item => {
          return [
            item.blockchain,
            item.address,
            item.cex_name,
            item.distinct_name,
            item.added_date
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_cex_addresses_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading CEX address data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsAddressDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Exchange Volume Chart (Transfers to Exchanges) */}
        <ChartCard
          title="Transfers to Exchanges"
          description="Monthly stablecoin transfer volume to exchanges"
          accentColor="blue"
          className="h-[500px]"
          onDownloadClick={downloadVolumeCSV}
          isDownloading={isVolumeDownloading}
          onExpandClick={() => setVolumeChartModalOpen(true)}
          legend={
            volumeLegends.slice(0, 10).map(legend => (
              <LegendItem
                key={legend.label}
                color={legend.color}
                label={legend.label}
                shape="square"
                tooltipText={legend.value !== undefined ? formatCurrency(legend.value) : undefined}
              />
            ))
          }
        >
          <ExchangeVolumeChart 
            isModalOpen={volumeChartModalOpen}
            onModalClose={() => setVolumeChartModalOpen(false)}
            onUpdateLegends={setVolumeLegends}
          />
        </ChartCard>

        {/* Exchange Transfers Chart (Transfers from Exchanges) */}
        <ChartCard
          title="Transfers from Exchanges"
          description="Monthly stablecoin transfer volume from exchanges"
          accentColor="purple"
          className="h-[500px]"
          onDownloadClick={downloadTransfersCSV}
          isDownloading={isTransfersDownloading}
          onExpandClick={() => setTransfersChartModalOpen(true)}
          legend={
            transfersLegends.slice(0, 10).map(legend => (
              <LegendItem
                key={legend.label}
                color={legend.color}
                label={legend.label}
                shape="square"
                tooltipText={legend.value !== undefined ? formatCurrency(legend.value) : undefined}
              />
            ))
          }
        >
          <ExchangeTransfersChart 
            isModalOpen={transfersChartModalOpen}
            onModalClose={() => setTransfersChartModalOpen(false)}
            onUpdateLegends={setTransfersLegends}
          />
        </ChartCard>
      </section>
      
      {/* CEX Addresses Table */}
      <section>
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Exchange Addresses</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Addresses of known exchanges on Solana</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors ${isAddressDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={downloadAddressesCSV}
                title="Download CSV"
                disabled={isAddressDownloading}
              >
                {isAddressDownloading ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Use the new DataTable component */}
          <DataTable
            columns={addressColumns}
            data={cexAddresses}
            keyExtractor={(row) => row.address}
            isLoading={isAddressDataLoading}
            error={addressDataError}
            noDataMessage="No exchange addresses available"
            initialSortColumn="cex_name"
            initialSortDirection="asc"
            containerClassName="overflow-x-auto"
          />
        </div>
      </section>
    </div>
  );
} 