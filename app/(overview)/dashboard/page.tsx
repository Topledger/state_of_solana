"use client";
import { useState } from "react";
import { UsersIcon, ChartIcon } from "../../components/shared/Icons";
import ChartCard from "../../components/shared/ChartCard";
import LegendItem from "../../components/shared/LegendItem";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import dynamic from "next/dynamic";
import { cohortColors, cohortOrder } from "@/app/api/overview/user-activity/txnsCohortData";
import { balanceCohortColors, balanceCohortOrder } from "@/app/api/overview/user-activity/walletBalanceData";
import { solChangeCohortColors, solChangeCohortOrder } from "@/app/api/overview/user-activity/solChangeData";

// Dynamically import chart components with no SSR
const UserActivityChart = dynamic(
  () => import("@/app/components/charts/overview/user-activity/UserActivityChart"),
  { ssr: false }
);

const TxnCohortPieChart = dynamic(
  () => import("@/app/components/charts/overview/user-activity/TxnCohortPieChart"),
  { ssr: false }
);

const WalletBalancePieChart = dynamic(
  () => import("@/app/components/charts/overview/user-activity/WalletBalancePieChart"),
  { ssr: false }
);

const SolChangePieChart = dynamic(
  () => import("@/app/components/charts/overview/user-activity/SolChangePieChart"),
  { ssr: false }
);

export default function DashboardPage() {
  // State for UserActivityChart
  const [userActivityChartModalOpen, setUserActivityChartModalOpen] = useState(false);
  const [userActivityTimeView, setUserActivityTimeView] = useState<'W' | 'M' | 'Q' | 'Y'>('M');
  const [isUserActivityDownloading, setIsUserActivityDownloading] = useState(false);

  // State for TxnCohortPieChart
  const [txnCohortChartModalOpen, setTxnCohortChartModalOpen] = useState(false);
  const [isTxnCohortDownloading, setIsTxnCohortDownloading] = useState(false);

  // State for WalletBalancePieChart
  const [walletBalanceChartModalOpen, setWalletBalanceChartModalOpen] = useState(false);
  const [isWalletBalanceDownloading, setIsWalletBalanceDownloading] = useState(false);

  // State for SolChangePieChart
  const [solChangeChartModalOpen, setSolChangeChartModalOpen] = useState(false);
  const [isSolChangeDownloading, setIsSolChangeDownloading] = useState(false);

  // Define user activity data types
  const userActivityTypes = [
    { key: 'active_wallets', label: 'Active Wallets', color: '#3b82f6', shape: 'square' },
    { key: 'new_wallets', label: 'New Wallets', color: '#10b981', shape: 'square' }
  ];

  // Create transaction cohort data types from the cohort order and colors
  const txnCohortTypes = cohortOrder.map((cohort: string) => ({
    key: cohort.replace(/\s+/g, '_').toLowerCase(),
    label: cohort,
    color: cohortColors[cohort],
    shape: 'square'
  }));

  // Create wallet balance cohort data types from the cohort order and colors
  const walletBalanceTypes = balanceCohortOrder.map((cohort: string) => ({
    key: cohort.replace(/\s+/g, '_').toLowerCase(),
    label: cohort,
    color: balanceCohortColors[cohort],
    shape: 'square'
  }));

  // Create SOL change cohort data types from the cohort order and colors
  const solChangeTypes = solChangeCohortOrder.map((cohort: string) => ({
    key: cohort.replace(/\s+/g, '_').toLowerCase(),
    label: cohort,
    color: solChangeCohortColors[cohort],
    shape: 'square'
  }));

  // Download function for user activity data
  const downloadUserActivityCSV = async () => {
    if (isUserActivityDownloading) return;
    setIsUserActivityDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchUserActivityData } = await import('@/app/api/overview/user-activity/userActivityData');
      
      // Fetch data
      const data = await fetchUserActivityData(userActivityTimeView);
      
      if (data.length === 0) {
        console.error('No user activity data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const headers = ["Date", "Active Wallets", "New Wallets"];
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...data.map(item => {
          return [
            item.block_date,
            item.Active_Wallets,
            item.New_Wallets
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_user_activity_${userActivityTimeView}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading user activity data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsUserActivityDownloading(false);
    }
  };

  // Download function for transaction cohort data
  const downloadTxnCohortCSV = async () => {
    if (isTxnCohortDownloading) return;
    setIsTxnCohortDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchTxnsCohortData } = await import('@/app/api/overview/user-activity/txnsCohortData');
      
      // Fetch data
      const data = await fetchTxnsCohortData();
      
      if (data.length === 0) {
        console.error('No transaction cohort data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const headers = ["Transaction Cohort", "Wallet Count"];
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...data.map(item => {
          return [
            `"${item.Txns_Cohort}"`, // Add quotes to handle commas in cohort names
            item.Wallet_Count
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_txn_cohorts_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading transaction cohort data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsTxnCohortDownloading(false);
    }
  };

  // Download function for wallet balance data
  const downloadWalletBalanceCSV = async () => {
    if (isWalletBalanceDownloading) return;
    setIsWalletBalanceDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchWalletBalanceData } = await import('@/app/api/overview/user-activity/walletBalanceData');
      
      // Fetch data
      const data = await fetchWalletBalanceData();
      
      if (data.length === 0) {
        console.error('No wallet balance data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const headers = ["Balance Cohort", "Wallets"];
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...data.map(item => {
          return [
            `"${item.Balance_Cohort}"`, // Add quotes to handle commas in cohort names
            item.Wallets
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_wallet_balances_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading wallet balance data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsWalletBalanceDownloading(false);
    }
  };

  // Download function for SOL change data
  const downloadSolChangeCSV = async () => {
    if (isSolChangeDownloading) return;
    setIsSolChangeDownloading(true);
    
    try {
      // Import the fetch function
      const { fetchSolChangeData } = await import('@/app/api/overview/user-activity/solChangeData');
      
      // Fetch data
      const data = await fetchSolChangeData();
      
      if (data.length === 0) {
        console.error('No SOL change data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const headers = ["SOL Change Cohort", "Wallets"];
      
      // Convert to rows
      const csvRows = [
        headers.join(","), // Header row
        ...data.map(item => {
          return [
            `"${item.Sol_change_cohort}"`, // Add quotes to handle commas in cohort names
            item.Wallets
          ].join(",");
        })
      ];
      
      // Create CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement("a");
      const fileName = `solana_sol_change_distribution_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading SOL change data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsSolChangeDownloading(false);
    }
  };

  // Function to format large numbers with commas
  const formatNumber = (value?: number) => {
    if (!value) return "0";
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="space-y-6">
      {/* User Activity Chart */}
      <ChartCard
        title="User Activity"
        description="Active and new wallets over time"
        accentColor="blue"
        onExpandClick={() => setUserActivityChartModalOpen(true)}
        onDownloadClick={downloadUserActivityCSV}
        isDownloading={isUserActivityDownloading}
        filterBar={
          <TimeFilterSelector
            value={userActivityTimeView}
            onChange={(value) => setUserActivityTimeView(value as 'W' | 'M' | 'Q' | 'Y')}
            options={[
              { value: 'W', label: 'W' },
              { value: 'M', label: 'M' },
              { value: 'Q', label: 'Q' },
              { value: 'Y', label: 'Y' }
            ]}
          />
        }
        legend={
          userActivityTypes.map((type) => (
            <LegendItem 
              key={type.key}
              label={type.label}
              color={type.color}
              shape={type.shape === 'circle' ? 'circle' : 'square'}
            />
          ))
        }
      >
        <UserActivityChart
          isModalOpen={userActivityChartModalOpen}
          onModalClose={() => setUserActivityChartModalOpen(false)}
          timeView={userActivityTimeView}
          onTimeViewChange={(value) => setUserActivityTimeView(value)}
        />
      </ChartCard>
      
      {/* Transaction Cohort Pie Chart */}
      <ChartCard
        title="Transaction Cohorts"
        description="Wallets grouped by transaction count"
        accentColor="purple"
        onExpandClick={() => setTxnCohortChartModalOpen(true)}
        onDownloadClick={downloadTxnCohortCSV}
        isDownloading={isTxnCohortDownloading}
        legend={
          txnCohortTypes.slice(0, 7).map((type) => (
            <LegendItem 
              key={type.key}
              label={type.label}
              color={type.color}
              shape="square"
            />
          ))
        }
      >
        <div className="h-[400px]">
          <TxnCohortPieChart
            isModalOpen={txnCohortChartModalOpen}
            onModalClose={() => setTxnCohortChartModalOpen(false)}
          />
        </div>
      </ChartCard>

      {/* Wallet Balance Pie Chart */}
      <ChartCard
        title="Wallet Balance Distribution"
        description="Wallets grouped by SOL balance"
        accentColor="green"
        onExpandClick={() => setWalletBalanceChartModalOpen(true)}
        onDownloadClick={downloadWalletBalanceCSV}
        isDownloading={isWalletBalanceDownloading}
        legend={
          walletBalanceTypes.map((type) => (
            <LegendItem 
              key={type.key}
              label={type.label}
              color={type.color}
              shape="square"
            />
          ))
        }
      >
        <div className="h-[400px]">
          <WalletBalancePieChart
            isModalOpen={walletBalanceChartModalOpen}
            onModalClose={() => setWalletBalanceChartModalOpen(false)}
          />
        </div>
      </ChartCard>

      {/* SOL Change Pie Chart */}
      <ChartCard
        title="SOL Balance Change Distribution"
        description="Wallets grouped by SOL balance change"
        accentColor="orange"
        onExpandClick={() => setSolChangeChartModalOpen(true)}
        onDownloadClick={downloadSolChangeCSV}
        isDownloading={isSolChangeDownloading}
        legend={
          solChangeTypes.map((type) => (
            <LegendItem 
              key={type.key}
              label={type.label}
              color={type.color}
              shape="square"
            />
          ))
        }
      >
        <div className="h-[400px]">
          <SolChangePieChart
            isModalOpen={solChangeChartModalOpen}
            onModalClose={() => setSolChangeChartModalOpen(false)}
          />
        </div>
      </ChartCard>
    </div>
  );
} 