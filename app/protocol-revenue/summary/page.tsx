"use client";

import React, { useState, useEffect, useMemo } from "react";
import Counter from "../../components/shared/Counter";
import { VolumeIcon, TvlIcon, UsersIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import Loader from "../../components/shared/Loader";
import ProtocolRevenueChart from "../../components/charts/protocol-revenue/summary/ProtocolRevenueChart";
import PlatformRevenueStacked from "../../components/charts/protocol-revenue/summary/PlatformRevenueStacked";
import DashboardRenderer from "@/app/admin/components/dashboard-renderer";

import { getLatestProtocolRevenueStats, prepareProtocolRevenueCSV } from "../../api/protocol-revenue/summary/chartData";
import { TimeFilter } from "../../api/protocol-revenue/summary/chartData";
import { DisplayMode } from "@/app/components/shared/filters/DisplayModeFilter";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import DisplayModeFilter from "@/app/components/shared/filters/DisplayModeFilter";
import { normalizePlatformName, formatCurrency, preparePlatformRevenueCSV } from "@/app/api/protocol-revenue/summary/platformRevenueData";
import { handleCSVDownload } from "@/app/utils/csvDownload";

// Define colors for charts
const protocolRevenueColors = {
  base_fee: '#60a5fa', // blue
  priority_fee: '#a78bfa', // purple
  jito_total_tips: '#34d399', // green
  vote_fees: '#f97316', // orange
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium mb-3">{title}</h2>
      {children}
    </div>
  );
};

export default function ProtocolRevenueSummaryPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('M');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');
  const [protocolRevenueChartModalOpen, setProtocolRevenueChartModalOpen] = useState(false);
  const [distributionChartModalOpen, setDistributionChartModalOpen] = useState(false);
  const [platformRevenueChartModalOpen, setPlatformRevenueChartModalOpen] = useState(false);
  const [platformStackedChartModalOpen, setPlatformStackedChartModalOpen] = useState(false);
  
  // State for stats
  const [totalProtocolRevenueStats, setTotalProtocolRevenueStats] = useState({
    totalRevenue: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isTotalProtocolRevenueLoading, setIsTotalProtocolRevenueLoading] = useState(true);
  
  const [totalSolanaRevenueStats, setTotalSolanaRevenueStats] = useState({
    totalRevenue: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isTotalSolanaRevenueLoading, setIsTotalSolanaRevenueLoading] = useState(true);
  
  const [userCountStats, setUserCountStats] = useState({
    userCount: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isUserCountLoading, setIsUserCountLoading] = useState(true);
  
  // Add state for platforms data
  const [platformsData, setPlatformsData] = useState<any[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  
  // Add state for download button loading
  const [isRevenueDownloading, setIsRevenueDownloading] = useState(false);
  const [isDistributionDownloading, setIsDistributionDownloading] = useState(false);
  const [isPlatformRevenueDownloading, setIsPlatformRevenueDownloading] = useState(false);

  // Add state to store platforms from the chart component
  const [chartPlatforms, setChartPlatforms] = useState<{platform: string, color: string, revenue: number}[]>([]);
  const [stackedChartPlatforms, setStackedChartPlatforms] = useState<{platform: string, color: string, revenue: number}[]>([]);

  // Fetch data for counters
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsTotalProtocolRevenueLoading(true);
        setIsTotalSolanaRevenueLoading(true);
        
        const { 
          totalProtocolRevenue, 
          totalSolanaRevenue, 
          protocolRevenuePercentChange,
          solanaRevenuePercentChange,
          isProtocolRevenueIncreasing,
          isSolanaRevenueIncreasing
        } = await getLatestProtocolRevenueStats();
        
        // Set protocol revenue stats
        setTotalProtocolRevenueStats({
          totalRevenue: totalProtocolRevenue,
          percentChange: protocolRevenuePercentChange,
          isPositive: isProtocolRevenueIncreasing
        });
        setIsTotalProtocolRevenueLoading(false);
        
        // Set Solana revenue stats
        setTotalSolanaRevenueStats({
          totalRevenue: totalSolanaRevenue,
          percentChange: solanaRevenuePercentChange,
          isPositive: isSolanaRevenueIncreasing
        });
        setIsTotalSolanaRevenueLoading(false);
        
        // Set user count stats (can be replaced with real API data later)
        setUserCountStats({
          userCount: 142000,
          percentChange: 8.7,
          isPositive: true
        });
        setIsUserCountLoading(false);
      } catch (error) {
        console.error('Error fetching revenue stats:', error);
        setIsTotalProtocolRevenueLoading(false);
        setIsTotalSolanaRevenueLoading(false);
        setIsUserCountLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Format functions
  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
  };
  
  const formatUserCount = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
  };

  // Download functions
  const downloadRevenueCSV = async () => {
    if (isRevenueDownloading) return;
    await handleCSVDownload(
      () => prepareProtocolRevenueCSV(timeFilter),
      `protocol-revenue-${timeFilter.toLowerCase()}.csv`,
      setIsRevenueDownloading
    );
  };
  
  const downloadDistributionCSV = async () => {
    if (isDistributionDownloading) return;
    await handleCSVDownload(
      async () => {
        // Simulate download delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Downloading distribution data as CSV...');
        // TODO: Implement actual CSV download
        alert('CSV download functionality will be implemented soon.');
        return '';
      },
      `distribution-data-${timeFilter.toLowerCase()}.csv`,
      setIsDistributionDownloading
    );
  };

  const downloadPlatformRevenueCSV = async () => {
    if (isPlatformRevenueDownloading) return;
    await handleCSVDownload(
      () => preparePlatformRevenueCSV(timeFilter),
      `platform-revenue-${timeFilter.toLowerCase()}.csv`,
      setIsPlatformRevenueDownloading
    );
  };

  return (
    <main className="pb-12">
      <div className="space-y-4">
        {/* Stats Cards Row */}
        <section className="grid grid-cols-2 md:grid-cols-2 gap-4">
          {/* Total Protocol Revenue Card */}
          <Counter
            title="Protocol Revenue (Since Jan'24)"
            value={isTotalProtocolRevenueLoading ? "Loading..." : formatCurrencyValue(totalProtocolRevenueStats.totalRevenue)}
            //trend={isTotalProtocolRevenueLoading ? undefined : {
              //value: Math.abs(totalProtocolRevenueStats.percentChange),
              //label: "vs previous month"
            //}}
            variant="indigo"
            icon={<VolumeIcon />}
            isLoading={isTotalProtocolRevenueLoading}
          />
          
          {/* Total Solana Revenue Card */}
          <Counter
            title="Solana Core Revenue"
            value={isTotalSolanaRevenueLoading ? "Loading..." : formatCurrencyValue(totalSolanaRevenueStats.totalRevenue)}
            //trend={isTotalSolanaRevenueLoading ? undefined : {
              //value: Math.abs(totalSolanaRevenueStats.percentChange),
              //label: "vs previous month"
            //}}
            variant="blue"
            icon={<TvlIcon />}
            isLoading={isTotalSolanaRevenueLoading}
          />
        </section>
        
        {/* Charts Section */}
        <section className="space-y-4">
          {/* Protocol Revenue Sources */}
          <div className="grid grid-cols-2 gap-4">
          <ChartCard
            title="Protocol Revenue Sources"
            description="Breakdown of revenue by source (Base Fees, Priority Fees, Jito Tips, Vote Fees)"
            accentColor="indigo"
            onExpandClick={() => setProtocolRevenueChartModalOpen(true)}
            onDownloadClick={downloadRevenueCSV}
            isDownloading={isRevenueDownloading}
            legendWidth="1/5"
            className="h-[500px]"
            
            legend={
              <>
                <LegendItem label="Base Fees" color={protocolRevenueColors.base_fee} />
                <LegendItem label="Priority Fees" color={protocolRevenueColors.priority_fee} />
                <LegendItem label="Jito Tips" color={protocolRevenueColors.jito_total_tips} />
                <LegendItem label="Vote Fees" color={protocolRevenueColors.vote_fees} />
              </>
            }
          >
            <ProtocolRevenueChart 
              
              isModalOpen={protocolRevenueChartModalOpen}
              onModalClose={() => setProtocolRevenueChartModalOpen(false)}
              
            />
          </ChartCard>
          
          {/* Platform Revenue Chart - Stacked View */}
          <ChartCard
            title="Platform Revenue Over Time"
            description="Stacked view of revenue generated by platforms"
            accentColor="green"
            onExpandClick={() => setPlatformStackedChartModalOpen(true)}
            onDownloadClick={downloadPlatformRevenueCSV}
            isDownloading={isPlatformRevenueDownloading}
            legendWidth="1/5"
            className="h-[500px]"
            filterBar={
              <div className="flex flex-wrap gap-3 items-center">
                <TimeFilterSelector 
                  value={timeFilter} 
                  onChange={(val: TimeFilter) => setTimeFilter(val)}
                  options={[
                    { value: 'W', label: 'W' },
                    { value: 'M', label: 'M' },
                    { value: 'Q', label: 'Q' },
                    { value: 'Y', label: 'Y' }
                  ]}
                />
                <DisplayModeFilter 
                  mode={displayMode} 
                  onChange={(val: DisplayMode) => setDisplayMode(val)} 
                />
              </div>
            }
            legend={
              <>
                {isLoadingPlatforms && stackedChartPlatforms.length === 0 ? (
                  // Loading state
                  <>
                    <LegendItem label="Loading..." color="#60a5fa" isLoading={true} />
                    <LegendItem label="Loading..." color="#a78bfa" isLoading={true} />
                    <LegendItem label="Loading..." color="#34d399" isLoading={true} />
                  </>
                ) : (
                  // Show top platforms
                  stackedChartPlatforms.slice(0, 10).map(({ platform, color, revenue }) => (
                    <LegendItem
                      key={platform}
                      label={normalizePlatformName(platform)}
                      color={color}
                      shape="square"
                      tooltipText={revenue > 0 ? formatCurrency(revenue) : undefined}
                    />
                  ))
                )}
              </>
            }
          >
            <PlatformRevenueStacked
              timeFilter={timeFilter}
              isModalOpen={platformStackedChartModalOpen}
              onModalClose={() => setPlatformStackedChartModalOpen(false)}
              onTimeFilterChange={(val: TimeFilter) => setTimeFilter(val)}
              platformsChanged={setStackedChartPlatforms}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
            />
          </ChartCard>
          </div>
        </section>
      </div>
      
      {/* dynamic charts from admin section */}
      <DashboardRenderer pageId="summary" />
    </main>
  );
} 