"use client";

import React, { useState, useEffect, useMemo } from "react";
import Counter from "../../components/shared/Counter";
import { VolumeIcon, TvlIcon, UsersIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import Loader from "../../components/shared/Loader";
import ProtocolRevenueChart from "../../components/charts/protocol-revenue/summary/ProtocolRevenueChart";
import PlatformRevenueChart from "../../components/charts/protocol-revenue/summary/PlatformRevenueChart";
import { getLatestProtocolRevenueStats } from "../../api/protocol-revenue/summary/chartData";
import { TimeFilter } from "../../api/protocol-revenue/summary/chartData";
import { DisplayMode } from "@/app/components/shared/filters/DisplayModeFilter";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import DisplayModeFilter from "@/app/components/shared/filters/DisplayModeFilter";
import { platformColors, getPlatformColor, fetchPlatformRevenueData, normalizePlatformName } from "@/app/api/protocol-revenue/summary/platformRevenueData";

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

  // Add state to store platforms from the chart component
  const [chartPlatforms, setChartPlatforms] = useState<{platform: string, color: string, revenue: number}[]>([]);

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

  // Fetch platform data
  useEffect(() => {
    const fetchPlatforms = async () => {
      setIsLoadingPlatforms(true);
      try {
        const data = await fetchPlatformRevenueData(timeFilter);
        setPlatformsData(data);
      } catch (error) {
        console.error('Error fetching platform data:', error);
      } finally {
        setIsLoadingPlatforms(false);
      }
    };
    
    fetchPlatforms();
  }, [timeFilter]);

  // Extract top platforms for legend display - but ensure we always have data for display
  const topPlatforms = useMemo(() => {
    if (!platformsData || platformsData.length === 0) {
      // Return default/fallback data when no platformsData is available
      return Object.keys(platformColors)
        .filter(platform => platform !== 'default')
        .slice(0, 10)
        .map(platform => ({ 
          platform, 
          revenue: 0, 
          color: platformColors[platform] 
        }));
    }

    // Sort platforms by revenue (descending)
    return platformsData
      .sort((a, b) => b.protocol_revenue_usd - a.protocol_revenue_usd)
      .slice(0, 10)
      .map(platform => ({
        platform: platform.platform,
        revenue: platform.protocol_revenue_usd,
        color: getPlatformColor(platform.platform)
      }));
  }, [platformsData]);

  // Log topPlatforms whenever it changes (for debugging)
  useEffect(() => {
    console.log('Top platforms:', topPlatforms);
  }, [topPlatforms]);

  // Format functions
  const formatCurrency = (value: number) => {
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

  // Download functions - to be implemented
  const downloadRevenueCSV = async () => {
    if (isRevenueDownloading) return;
    setIsRevenueDownloading(true);
    
    try {
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Downloading revenue data as CSV...');
      // TODO: Implement actual CSV download
      
      alert('CSV download functionality will be implemented soon.');
    } catch (error) {
      console.error('Error downloading revenue data:', error);
    } finally {
      setIsRevenueDownloading(false);
    }
  };
  
  const downloadDistributionCSV = async () => {
    if (isDistributionDownloading) return;
    setIsDistributionDownloading(true);
    
    try {
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Downloading distribution data as CSV...');
      // TODO: Implement actual CSV download
      
      alert('CSV download functionality will be implemented soon.');
    } catch (error) {
      console.error('Error downloading distribution data:', error);
    } finally {
      setIsDistributionDownloading(false);
    }
  };

  return (
    <main className="pb-12">
      <div className="space-y-4">
        {/* Stats Cards Row */}
        <section className="grid grid-cols-2 md:grid-cols-2 gap-4">
          {/* Total Protocol Revenue Card */}
          <Counter
            title="Protocol Revenue (Since Jan'24)"
            value={formatCurrency(totalProtocolRevenueStats.totalRevenue)}
            icon={<VolumeIcon />}
            variant="blue"
            isLoading={isTotalProtocolRevenueLoading}
            trend={!isTotalProtocolRevenueLoading ? {
              value: totalProtocolRevenueStats.percentChange,
              label: "vs previous month"
            } : undefined}
          />

          {/* Total Solana Revenue Card */}
          <Counter
            title="Solana Revenue (Since Jan'24)"
            value={formatCurrency(totalSolanaRevenueStats.totalRevenue)}
            icon={<TvlIcon />}
            variant="purple"
            isLoading={isTotalSolanaRevenueLoading}
            trend={!isTotalSolanaRevenueLoading ? {
              value: totalSolanaRevenueStats.percentChange,
              label: "vs previous month"
            } : undefined}
          />

          
        </section>

        {/* Protocol Revenue Charts Section - Both charts in one row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Protocol Revenue Chart */}
          <ChartCard
            title="Protocol Revenue vs Solana Revenue"
            description="Comparison of Protocol Revenue and Solana Revenue over time"
            accentColor="blue"
            onExpandClick={() => setProtocolRevenueChartModalOpen(true)}
            onDownloadClick={downloadRevenueCSV}
            isDownloading={isRevenueDownloading}
            legendWidth="1/5"
            className="h-[500px]"
           
            
            legend={
              <>
                <LegendItem
                  label="Protocol Revenue"
                  color="#60a5fa"
                  shape="square"
                />
                <LegendItem
                  label="Solana Revenue"
                  color="#a78bfa"
                  shape="circle"
                />
              </>
            }
          >
            <ProtocolRevenueChart 
              
              isModalOpen={protocolRevenueChartModalOpen}
              onModalClose={() => setProtocolRevenueChartModalOpen(false)}
              
            />
          </ChartCard>

          {/* Protocol Revenue by Platform Chart */}
          <ChartCard
            title="Protocol Revenue by Platform"
            description="Breakdown of protocol revenue by platform"
            accentColor="green"
            onExpandClick={() => setPlatformRevenueChartModalOpen(true)}
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
                  onChange={(val) => setDisplayMode(val)}
                  isCompact={true}
                />
              </div>
            }
            legend={
              <>
                {/* Always show platforms, with loading state if appropriate */}
                {isLoadingPlatforms && chartPlatforms.length === 0 ? (
                  // Loading state
                  <>
                    <LegendItem label="Loading..." color="#60a5fa" isLoading={true} />
                    <LegendItem label="Loading..." color="#a78bfa" isLoading={true} />
                    <LegendItem label="Loading..." color="#34d399" isLoading={true} />
                  </>
                ) : (
                  // Use chartPlatforms directly from the PlatformRevenueChart component
                  chartPlatforms.map(({ platform, color, revenue }) => (
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
            <PlatformRevenueChart
              timeFilter={timeFilter}
              displayMode={displayMode}
              isModalOpen={platformRevenueChartModalOpen}
              onModalClose={() => setPlatformRevenueChartModalOpen(false)}
              onTimeFilterChange={(val: TimeFilter) => setTimeFilter(val)}
              onDisplayModeChange={(val: DisplayMode) => setDisplayMode(val)}
              platformsChanged={setChartPlatforms}
            />
          </ChartCard>
        </section>
        
        
      </div>
    </main>
  );
} 