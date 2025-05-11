"use client";
import { useState } from "react";
import ChartCard from "../../components/shared/ChartCard";
import LegendItem from "../../components/shared/LegendItem";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import dynamic from "next/dynamic";

// Dynamically import chart components with no SSR
const TxnFeesChart = dynamic(
  () => import("@/app/components/charts/overview/network-usage/TxnFeesChart"),
  { ssr: false }
);

const TPSChart = dynamic(
  () => import("@/app/components/charts/overview/network-usage/TPSChart"),
  { ssr: false }
);

const TxnStatsChart = dynamic(
  () => import("@/app/components/charts/overview/network-usage/TxnStatsChart"),
  { ssr: false }
);

export default function NetworkUsagePage() {
  // Transaction Fees Chart State
  const [txnFeesChartModalOpen, setTxnFeesChartModalOpen] = useState(false);
  const [isTxnFeesDownloading, setIsTxnFeesDownloading] = useState(false);

  // TPS Chart State
  const [tpsChartModalOpen, setTpsChartModalOpen] = useState(false);
  const [isTpsDownloading, setIsTpsDownloading] = useState(false);
  
  // Transaction Stats Chart State
  const [txnStatsChartModalOpen, setTxnStatsChartModalOpen] = useState(false);
  const [txnStatsTimeView, setTxnStatsTimeView] = useState<'M' | 'Q' | 'Y'>('M');
  const [isTxnStatsDownloading, setIsTxnStatsDownloading] = useState(false);

  // Define chart data types
  const txnFeesTypes = [
    { key: 'avg_txn_fees', label: 'Average Transaction Fees', color: '#4682b4', shape: 'square' }
  ];

  const tpsTypes = [
    { key: 'total_tps', label: 'Total TPS', color: '#4682b4', shape: 'square' },
    { key: 'success_tps', label: 'Success TPS', color: '#2ecc71', shape: 'square' },
    { key: 'failed_tps', label: 'Failed TPS', color: '#e74c3c', shape: 'square' },
    { key: 'real_tps', label: 'Real TPS', color: '#9b59b6', shape: 'square' }
  ];
  
  const txnStatsTypes = [
    { key: 'vote_txns', label: 'Vote Transactions', color: '#4682b4', shape: 'square' },
    { key: 'non_vote_txns', label: 'Non-Vote Transactions', color: '#2ecc71', shape: 'square' },
    { key: 'success_rate', label: 'Success Rate (%)', color: '#e74c3c', shape: 'line' },
    { key: 'non_vote_success_rate', label: 'Non-Vote Success Rate (%)', color: '#9b59b6', shape: 'line' }
  ];

  // Download function for transaction fees data
  const downloadTxnFeesCSV = async () => {
    if (isTxnFeesDownloading) return;
    setIsTxnFeesDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchTxnFeesData } = await import('@/app/api/overview/network-usage/txnFeesData');
      
      // Fetch data
      const data = await fetchTxnFeesData();
      
      if (data.length === 0) {
        console.error('No transaction fees data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const headers = ["Date", "Average Transaction Fees"];
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...data.map(item => {
          return [
            item.block_date,
            item.Average_Transaction_Fees
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_txn_fees_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading transaction fees data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsTxnFeesDownloading(false);
    }
  };

  // Download function for TPS data
  const downloadTPSCSV = async () => {
    if (isTpsDownloading) return;
    setIsTpsDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchTPSData } = await import('@/app/api/overview/network-usage/tpsData');
      
      // Fetch data
      const data = await fetchTPSData();
      
      if (data.length === 0) {
        console.error('No TPS data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const headers = ["Date", "Total TPS", "Success TPS", "Failed TPS", "Real TPS"];
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...data.map(item => {
          return [
            item.block_date,
            item.Total_TPS,
            item.Success_TPS,
            item.Failed_TPS,
            item.Real_TPS
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_tps_data_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading TPS data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsTpsDownloading(false);
    }
  };
  
  // Download function for transaction stats data
  const downloadTxnStatsCSV = async () => {
    if (isTxnStatsDownloading) return;
    setIsTxnStatsDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchTxnStatsData } = await import('@/app/api/overview/network-usage/txnStatsData');
      
      // Fetch data
      const data = await fetchTxnStatsData(txnStatsTimeView);
      
      if (data.length === 0) {
        console.error('No transaction statistics data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const headers = [
        "Date", 
        "Total Transactions", 
        "Vote Transactions", 
        "Non-Vote Transactions", 
        "Success Rate (%)", 
        "Non-Vote Success Rate (%)"
      ];
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...data.map(item => {
          return [
            item.block_date,
            item.Total_Transactions,
            item.Total_Vote_Transactions,
            item.Total_Non_Vote_Transactions,
            item.Succeesful_Transactions_perc,
            item.Successful_Non_Vote_Transactiosn_perc
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_txn_stats_${txnStatsTimeView}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading transaction statistics data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsTxnStatsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      
      {/* Transaction Stats Chart */}
      <ChartCard
        title="Transaction Volume & Success Rate"
        description="Distribution of vote vs non-vote transactions and their success rates"
        accentColor="green"
        onExpandClick={() => setTxnStatsChartModalOpen(true)}
        onDownloadClick={downloadTxnStatsCSV}
        isDownloading={isTxnStatsDownloading}
        filterBar={
          <TimeFilterSelector
            value={txnStatsTimeView}
            onChange={(value) => setTxnStatsTimeView(value as 'M' | 'Q' | 'Y')}
            options={[
              { value: 'M', label: 'M' },
              { value: 'Q', label: 'Q' },
              { value: 'Y', label: 'Y' }
            ]}
          />
        }
        legend={
          txnStatsTypes.map((type) => (
            <LegendItem 
              key={type.key}
              label={type.label}
              color={type.color}
              shape={type.shape as any}
            />
          ))
        }
      >
        
          <TxnStatsChart
            isModalOpen={txnStatsChartModalOpen}
            onModalClose={() => setTxnStatsChartModalOpen(false)}
            timeView={txnStatsTimeView}
            onTimeViewChange={setTxnStatsTimeView}
          />
        
      </ChartCard>
      
      {/* TPS Chart */}
      <ChartCard
        title="Transactions Per Second (TPS)"
        description="Rate of transactions processed by the Solana network"
        accentColor="purple"
        onExpandClick={() => setTpsChartModalOpen(true)}
        onDownloadClick={downloadTPSCSV}
        isDownloading={isTpsDownloading}
        legend={
          tpsTypes.map((type) => (
            <LegendItem 
              key={type.key}
              label={type.label}
              color={type.color}
              shape="square"
            />
          ))
        }
      >
        
          <TPSChart
            isModalOpen={tpsChartModalOpen}
            onModalClose={() => setTpsChartModalOpen(false)}
          />
        
      </ChartCard>
      
      {/* Transaction Fees Chart */}
      <ChartCard
        title="Average Transaction Fees"
        description="Average fees paid per transaction over time"
        accentColor="blue"
        onExpandClick={() => setTxnFeesChartModalOpen(true)}
        onDownloadClick={downloadTxnFeesCSV}
        isDownloading={isTxnFeesDownloading}
        legend={
          txnFeesTypes.map((type) => (
            <LegendItem 
              key={type.key}
              label={type.label}
              color={type.color}
              shape="square"
            />
          ))
        }
      >
        
          <TxnFeesChart
            isModalOpen={txnFeesChartModalOpen}
            onModalClose={() => setTxnFeesChartModalOpen(false)}
          />
        
      </ChartCard>
    </div>
  );
} 