"use client";

import React, { useState, useEffect } from "react";
import CostCapacityChart, { costCapacityColors } from "../../components/charts/REV/cost-capacity/CostCapacityChart";
import TransactionMetricsChart, { transactionMetricsColors } from "../../components/charts/REV/cost-capacity/TransactionMetricsChart";
import { TimeFilter, CurrencyType, fetchCostCapacityData, formatDate, CostCapacityDataPoint } from "../../api/REV/cost-capacity";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import CurrencyFilter from "../../components/shared/filters/CurrencyFilter";
import DisplayModeFilter, { DisplayMode } from "../../components/shared/filters/DisplayModeFilter";
import ChartCard from "../../components/shared/ChartCard";
import LegendItem from "../../components/shared/LegendItem";

// Define fee types - MUST match stackKeys used in chart and data
const feeTypes = ['base_fee', 'priority_fee', 'jito_total_tips', 'vote_fees'];

// Define transaction metrics types
const transactionSuccessVolumeTypes = [
  { key: 'successful_transactions_perc', label: 'Success Rate', shape: 'circle', color: transactionMetricsColors.successful_transactions_perc },
  { key: 'successful_non_vote_transactions_perc', label: 'Non-Vote Success Rate', shape: 'circle', color: transactionMetricsColors.successful_non_vote_transactions_perc },
  { key: 'total_vote_transactions', label: 'Vote Transactions', shape: 'square', color: transactionMetricsColors.total_vote_transactions },
  { key: 'total_non_vote_transactions', label: 'Non-Vote Transactions', shape: 'square', color: transactionMetricsColors.total_non_vote_transactions }
];

// Define TPS metrics types
const tpsMetricsTypes = [
  { key: 'total_tps', label: 'Total TPS', shape: 'square', color: '#60a5fa' }, // blue
  { key: 'success_tps', label: 'Success TPS', shape: 'square', color: '#34d399' }, // green
  { key: 'failed_tps', label: 'Failed TPS', shape: 'square', color: '#f43f5e' }, // red
  { key: 'real_tps', label: 'Real TPS', shape: 'square', color: '#a78bfa' } // purple
];

export interface TransactionDataPoint {
  date: string;
  
  // Transaction counts
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  total_vote_transactions: number;
  total_non_vote_transactions: number;
  successful_vote_transactions: number;
  successful_non_vote_transactions: number;
  failed_vote_transactions: number;
  failed_non_vote_transactions: number;
  
  // Percentages
  successful_transactions_perc: number;
  non_vote_transactions_perc: number;
  successful_non_vote_transactions_perc: number;
  
  // TPS metrics
  total_tps: number;
  success_tps: number;
  failed_tps: number;
  real_tps: number;
  
  // Fee metrics
  total_fees: number;
  non_vote_transactions_fees: number;
  vote_transactions_fees: number;
  priority_fees: number;
}

export default function CostCapacityPage() {
  // State for Transaction Fees chart
  const [feeTimeFilter, setFeeTimeFilter] = useState<TimeFilter>('D');
  const [feeCurrencyFilter, setFeeCurrencyFilter] = useState<CurrencyType>('USD');
  const [feeDisplayMode, setFeeDisplayMode] = useState<DisplayMode>('absolute');
  const [chartModalOpen, setChartModalOpen] = useState(false);
  
  // State for Transaction Success & Volume chart
  const [successVolumeTimeFilter, setSuccessVolumeTimeFilter] = useState<TimeFilter>('M');
  const [successVolumeDisplayMode, setSuccessVolumeDisplayMode] = useState<DisplayMode>('absolute');
  const [successVolumeChartModalOpen, setSuccessVolumeChartModalOpen] = useState(false);
  const [isSuccessVolumeDownloading, setIsSuccessVolumeDownloading] = useState(false);
  
  // State for TPS Metrics chart
  const [tpsTimeFilter, setTpsTimeFilter] = useState<TimeFilter>('M');
  const [tpsDisplayMode, setTpsDisplayMode] = useState<DisplayMode>('absolute');
  const [tpsChartModalOpen, setTpsChartModalOpen] = useState(false);
  const [isTpsDownloading, setIsTpsDownloading] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false);

  // Download function - would need to be implemented with actual data export functionality
  const downloadCostCapacityCSV = async () => {
    // Prevent multiple clicks
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      // Fetch data with current timeFilter and currencyFilter
      const costCapacityData = await fetchCostCapacityData(feeTimeFilter, feeCurrencyFilter);
      
      if (costCapacityData.length === 0) {
        console.error('No cost capacity data available for download');
        alert('No data available to download. Please try a different time range.');
        return;
      }
      
      // Create CSV header with fee types
      const headers = ["Date", "Base Fee", "Priority Fee", "Jito MEV Tips", "Vote Fees"];
      
      // Convert data to CSV rows
      const csvRows = [
        headers.join(","), // CSV header row
        ...costCapacityData.map((item: CostCapacityDataPoint) => {
          // Format the date according to the selected time filter
          const formattedDate = formatDate(item.date, feeTimeFilter);
          // Include all fee metrics in the CSV
          return [
            formattedDate,
            item.base_fee,
            item.priority_fee,
            item.jito_total_tips,
            item.vote_fees
          ].join(",");
        })
      ];
      
      // Create the full CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const currencyText = feeCurrencyFilter === 'USD' ? 'usd' : 'sol';
      const fileName = `solana_transaction_fees_${feeTimeFilter}_${currencyText}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Cost Capacity data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download function for Transaction Success & Volume data
  const downloadSuccessVolumeCSV = async () => {
    // Prevent multiple clicks
    if (isSuccessVolumeDownloading) return;
    
    setIsSuccessVolumeDownloading(true);
    
    try {
      // Import the fetchTransactionsData function
      const { fetchTransactionsData } = await import('../../api/REV/cost-capacity/transactionsData');
      
      // Fetch data with current timeFilter
      const transactionsData = await fetchTransactionsData(successVolumeTimeFilter);
      
      if (transactionsData.length === 0) {
        console.error('No transaction data available for download');
        alert('No data available to download. Please try a different time range.');
        return;
      }
      
      // Create CSV header with transaction metrics types
      const headers = [
        "Date", 
        "Success Rate (%)", 
        "Non-Vote Success Rate (%)", 
        "Vote Transactions", 
        "Non-Vote Transactions"
      ];
      
      // Convert data to CSV rows
      const csvRows = [
        headers.join(","), // CSV header row
        ...transactionsData.map((item: TransactionDataPoint) => {
          // Format the date according to the selected time filter
          const formattedDate = formatDate(item.date, successVolumeTimeFilter);
          // Include all relevant metrics in the CSV
          return [
            formattedDate,
            item.successful_transactions_perc.toFixed(2),
            item.successful_non_vote_transactions_perc.toFixed(2),
            item.total_vote_transactions,
            item.total_non_vote_transactions
          ].join(",");
        })
      ];
      
      // Create the full CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_transaction_volume_${successVolumeTimeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Transaction Success & Volume data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsSuccessVolumeDownloading(false);
    }
  };

  // Download function for TPS Metrics data
  const downloadTpsMetricsCSV = async () => {
    // Prevent multiple clicks
    if (isTpsDownloading) return;
    
    setIsTpsDownloading(true);
    
    try {
      // Import the fetchTransactionsData function
      const { fetchTransactionsData } = await import('../../api/REV/cost-capacity/transactionsData');
      
      // Fetch data with current timeFilter
      const transactionsData = await fetchTransactionsData(tpsTimeFilter);
      
      if (transactionsData.length === 0) {
        console.error('No TPS metrics data available for download');
        alert('No data available to download. Please try a different time range.');
        return;
      }
      
      // Create CSV header with TPS metrics types
      const headers = [
        "Date", 
        "Total TPS", 
        "Success TPS", 
        "Failed TPS", 
        "Real TPS"
      ];
      
      // Convert data to CSV rows
      const csvRows = [
        headers.join(","), // CSV header row
        ...transactionsData.map((item: TransactionDataPoint) => {
          // Format the date according to the selected time filter
          const formattedDate = formatDate(item.date, tpsTimeFilter);
          // Include all relevant metrics in the CSV
          return [
            formattedDate,
            item.total_tps.toFixed(2),
            item.success_tps.toFixed(2),
            item.failed_tps.toFixed(2),
            item.real_tps.toFixed(2)
          ].join(",");
        })
      ];
      
      // Create the full CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_tps_metrics_${tpsTimeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading TPS Metrics data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsTpsDownloading(false);
    }
  };

  // Helper function to get display names for fee types
  const getFeeTypeDisplayName = (feeType: string) => {
    switch (feeType) {
      case 'base_fee':
        return 'Base Fee';
      case 'priority_fee':
        return 'Priority Fee';
      case 'jito_total_tips':
        return 'Jito MEV Tips';
      case 'vote_fees':
        return 'Vote Fees';
      default:
        return feeType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };

  return (
    
    <div className="space-y-6">
      {/* Transaction Fees Chart */}
      <ChartCard
        title="Transaction Fees"
        description="Tracking different fee components in Solana ecosystem"
        accentColor="blue"
        onExpandClick={() => setChartModalOpen(true)}
        onDownloadClick={downloadCostCapacityCSV}
        isDownloading={isDownloading}
        filterBar={
          <div className="flex flex-wrap gap-3 items-center">
            {/* Time filter */}
            <TimeFilterSelector 
              value={feeTimeFilter} 
              onChange={(val) => setFeeTimeFilter(val as TimeFilter)}
              options={[
                { value: 'D', label: 'D' },
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' },
                { value: 'Y', label: 'Y' }
              ]}
            />
            
            {/* Currency filter */}
            <CurrencyFilter 
              currency={feeCurrencyFilter} 
              onChange={(val) => setFeeCurrencyFilter(val as CurrencyType)}
              isCompact={true}
            />
            
            {/* Display mode filter */}
            <DisplayModeFilter 
              mode={feeDisplayMode} 
              onChange={(val) => setFeeDisplayMode(val)}
              isCompact={true}
            />
          </div>
        }
        legend={
          feeTypes.map((key: string) => (
            <LegendItem 
              key={key}
              label={getFeeTypeDisplayName(key)}
              color={costCapacityColors[key as keyof typeof costCapacityColors] || '#ccc'}
              shape="square"
            />
          ))
        }
      >
        <CostCapacityChart
          timeFilter={feeTimeFilter}
          currencyFilter={feeCurrencyFilter}
          displayMode={feeDisplayMode}
          isModalOpen={chartModalOpen}
          onModalClose={() => setChartModalOpen(false)}
          onTimeFilterChange={setFeeTimeFilter}
          onCurrencyChange={setFeeCurrencyFilter}
          onDisplayModeChange={setFeeDisplayMode}
        />
      </ChartCard>

      {/* Transaction Success & Volume Chart */}
      <ChartCard
        title="Transaction Success & Volume"
        description="Success rates and transaction volumes"
        accentColor="blue"
        onExpandClick={() => setSuccessVolumeChartModalOpen(true)}
        onDownloadClick={downloadSuccessVolumeCSV}
        isDownloading={isSuccessVolumeDownloading}
        legend={
          transactionSuccessVolumeTypes.map((type) => (
            <LegendItem 
              key={type.key}
              label={type.label}
              color={type.color}
              shape={type.shape === 'circle' ? 'circle' : 'square'}
            />
          ))
        }
      >
        <TransactionMetricsChart
          timeFilter={successVolumeTimeFilter}
          displayMode={successVolumeDisplayMode}
          isModalOpen={successVolumeChartModalOpen}
          onModalClose={() => setSuccessVolumeChartModalOpen(false)}
          onTimeFilterChange={setSuccessVolumeTimeFilter}
          onDisplayModeChange={setSuccessVolumeDisplayMode}
          chartType="success-volume"
        />
      </ChartCard>

      {/* TPS Metrics Chart */}
      <ChartCard
        title="TPS Metrics"
        description="Transactions per second over time"
        accentColor="purple"
        onExpandClick={() => setTpsChartModalOpen(true)}
        onDownloadClick={downloadTpsMetricsCSV}
        isDownloading={isTpsDownloading}
        legend={
          tpsMetricsTypes.map((type) => (
            <LegendItem 
              key={type.key}
              label={type.label}
              color={type.color}
              shape={type.shape === 'circle' ? 'circle' : 'square'}
            />
          ))
        }
      >
        <TransactionMetricsChart
          timeFilter={tpsTimeFilter}
          displayMode={tpsDisplayMode}
          isModalOpen={tpsChartModalOpen}
          onModalClose={() => setTpsChartModalOpen(false)}
          onTimeFilterChange={setTpsTimeFilter}
          onDisplayModeChange={setTpsDisplayMode}
          chartType="tps"
        />
      </ChartCard>
    </div>
  );
} 