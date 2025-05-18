"use client";

import React, { useState, useCallback } from "react";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import CumulativeRevenueChart from "@/app/components/charts/protocol-revenue/total/CumulativeRevenueChart";
import TopProtocolsRevenueChart from "@/app/components/charts/protocol-revenue/total/TopProtocolsRevenueChart";
import RevenueBySegmentChart from "@/app/components/charts/protocol-revenue/total/RevenueBySegmentChart";
import DappRevenueChart from "@/app/components/charts/protocol-revenue/total/DappRevenueChart";
import TimeFilterSelector from "@/app/components/shared/filters/TimeFilter";
import DisplayModeFilter from "@/app/components/shared/filters/DisplayModeFilter";
import { DisplayMode } from "@/app/components/shared/filters/DisplayModeFilter";
import { TimeFilter } from "@/app/api/protocol-revenue/total/revenueBySegmentData";
import { prepareCumulativeRevenueCSV } from "@/app/api/protocol-revenue/summary/chartData";
import { prepareTopProtocolsCSV } from "@/app/api/protocol-revenue/total/topProtocolsData";
import { prepareRevenueBySegmentCSV } from "@/app/api/protocol-revenue/total/revenueBySegmentData";
import { prepareDappRevenueCSV } from "@/app/api/protocol-revenue/total/dappRevenueData";
import { handleCSVDownload } from "@/app/utils/csvDownload";
import DashboardRenderer from "@/app/admin/components/dashboard-renderer";

// Ensure we only use the valid time filters for our specific component
type RevenueTimeFilter = 'W' | 'M' | 'Q' | 'Y';

export default function ProtocolRevenueTotalPage() {
  const [timeFilter, setTimeFilter] = useState<RevenueTimeFilter>('M');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');
  const [chartPlatforms, setChartPlatforms] = useState<{platform: string, color: string, revenue: number}[]>([]);
  
  // Chart legend state
  const [cumulativeChartLegends, setCumulativeChartLegends] = useState<{label: string, color: string, value?: number}[]>([
    { label: 'Protocol Revenue', color: '#60a5fa' },
    { label: 'Solana Revenue', color: '#a78bfa' }
  ]);
  
  // Top protocols chart legends
  const [topProtocolsLegends, setTopProtocolsLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  
  // Revenue by segment chart legends
  const [revenueBySegmentLegends, setRevenueBySegmentLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  
  // Dapp revenue chart legends
  const [dappRevenueLegends, setDappRevenueLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  
  // Modal states
  const [chart1ModalOpen, setChart1ModalOpen] = useState(false);
  const [chart2ModalOpen, setChart2ModalOpen] = useState(false);
  const [chart3ModalOpen, setChart3ModalOpen] = useState(false);
  const [chart4ModalOpen, setChart4ModalOpen] = useState(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  // Add download loading state
  const [isCumulativeDownloading, setIsCumulativeDownloading] = useState(false);
  const [isTopProtocolsDownloading, setIsTopProtocolsDownloading] = useState(false);
  const [isRevenueBySegmentDownloading, setIsRevenueBySegmentDownloading] = useState(false);
  const [isDappRevenueDownloading, setIsDappRevenueDownloading] = useState(false);

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

  // Handle time filter change
  const handleTimeFilterChange = (newFilter: string) => {
    // Ensure we only set valid time filters
    if (newFilter === 'W' || newFilter === 'M' || newFilter === 'Q' || newFilter === 'Y') {
      setTimeFilter(newFilter);
    }
  };

  // Add download function for cumulative revenue chart
  const downloadCumulativeRevenueCSV = async () => {
    if (isCumulativeDownloading) return;
    await handleCSVDownload(
      () => prepareCumulativeRevenueCSV(timeFilter as any), 
      `cumulative-revenue-${timeFilter.toLowerCase()}.csv`,
      setIsCumulativeDownloading
    );
  };

  // Add download function for top protocols revenue chart
  const downloadTopProtocolsCSV = async () => {
    if (isTopProtocolsDownloading) return;
    await handleCSVDownload(
      prepareTopProtocolsCSV,
      `top-protocols-revenue.csv`,
      setIsTopProtocolsDownloading
    );
  };

  // Add download function for revenue by segment chart
  const downloadRevenueBySegmentCSV = async () => {
    if (isRevenueBySegmentDownloading) return;
    await handleCSVDownload(
      () => prepareRevenueBySegmentCSV(timeFilter),
      `revenue-by-segment-${timeFilter.toLowerCase()}.csv`,
      setIsRevenueBySegmentDownloading
    );
  };

  // Add download function for dapp revenue chart
  const downloadDappRevenueCSV = async () => {
    if (isDappRevenueDownloading) return;
    await handleCSVDownload(
      prepareDappRevenueCSV,
      `dapp-revenue.csv`,
      setIsDappRevenueDownloading
    );
  };

  return (
    <div className="space-y-6">
        
      {/* first row of charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1 - Cumulative Revenue Chart */}
        <ChartCard
          title="Cumulative Revenue Growth"
          description="Growth of cumulative protocol revenue and Solana revenue over time"
          accentColor="blue"
          onExpandClick={() => setChart1ModalOpen(true)}
          onDownloadClick={downloadCumulativeRevenueCSV}
          isDownloading={isCumulativeDownloading}
          legendWidth="1/4"
          className="h-[500px]"
          legend={
            <>
              {cumulativeChartLegends.map(legend => (
                <LegendItem 
                  key={legend.label}
                  label={legend.label} 
                  color={legend.color} 
                  shape="square"
                  tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                />
              ))}
            </>
          }
        >
          <CumulativeRevenueChart 
            timeFilter={timeFilter}
            isModalOpen={chart1ModalOpen}
            onModalClose={() => setChart1ModalOpen(false)}
            onTimeFilterChange={(newFilter) => handleTimeFilterChange(newFilter)}
            
          />
        </ChartCard>

        {/* Chart 2 - Top Protocols by Revenue */}
        <ChartCard
          title="Top Protocol by Revenue"
          description="Revenue generated by top protocols since January 2024"
          accentColor="green"
          onExpandClick={() => setChart2ModalOpen(true)}
          onDownloadClick={downloadTopProtocolsCSV}
          isDownloading={isTopProtocolsDownloading}
          legendWidth="1/4"
          className="h-[500px]"
          legend={
            <>
              {topProtocolsLegends.map(legend => (
                <LegendItem 
                  key={legend.label}
                  label={legend.label} 
                  color={legend.color} 
                  shape="square"
                  tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                />
              ))}
            </>
          }
        >
          <TopProtocolsRevenueChart
            isModalOpen={chart2ModalOpen}
            onModalClose={() => setChart2ModalOpen(false)}
            legendsChanged={setTopProtocolsLegends}
          />
        </ChartCard>
      </section>
        
      {/* second row of charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 3 - Revenue by Segment */}
        <ChartCard
          title="Revenue by Segment"
          description="Protocol revenue breakdown by segment over time"
          accentColor="purple"
          onExpandClick={() => setChart3ModalOpen(true)}
          onDownloadClick={downloadRevenueBySegmentCSV}
          isDownloading={isRevenueBySegmentDownloading}
          legendWidth="1/5"
          className="h-[500px]"
          filterBar={
            <div className="flex flex-wrap gap-3 items-center">
              <TimeFilterSelector 
                value={timeFilter} 
                onChange={handleTimeFilterChange}
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
              {revenueBySegmentLegends.map(legend => (
                <LegendItem 
                  key={legend.label}
                  label={legend.label} 
                  color={legend.color} 
                  shape="square"
                  tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                />
              ))}
            </>
          }
        >
          <RevenueBySegmentChart
            timeFilter={timeFilter}
            displayMode={displayMode}
            isModalOpen={chart3ModalOpen}
            onModalClose={() => setChart3ModalOpen(false)}
            onTimeFilterChange={handleTimeFilterChange}
            segmentsChanged={useCallback((segments: Array<{segment: string, color: string, revenue: number}>) => {
              // Convert segment data to legend format
              const legends = segments.map(segment => ({
                label: segment.segment,
                color: segment.color,
                value: segment.revenue
              }));
              setRevenueBySegmentLegends(legends);
            }, [])}
          />
        </ChartCard>

        {/* Chart 4 - Dapp Revenue by Segment */}
        <ChartCard
          title="Protocol Revenue by Segment"
          description="Revenue breakdown by segment, grouped by dapp"
          accentColor="orange"
          onExpandClick={() => setChart4ModalOpen(true)}
          onDownloadClick={downloadDappRevenueCSV}
          isDownloading={isDappRevenueDownloading}
          legendWidth="1/4"
          className="h-[500px]"
          legend={
            <>
              {dappRevenueLegends.length > 0 ? (
                dappRevenueLegends.map(legend => (
                  <LegendItem 
                    key={legend.label}
                    label={legend.label} 
                    color={legend.color} 
                    shape="square"
                    tooltipText={legend.value ? formatCurrency(legend.value) : undefined}
                  />
                ))
              ) : (
                <LegendItem label="Loading..." color="#ffc480" isLoading={true} />
              )}
            </>
          }
        >
          <DappRevenueChart
            isModalOpen={chart4ModalOpen}
            onModalClose={() => setChart4ModalOpen(false)}
            legendsChanged={setDappRevenueLegends}
          />
        </ChartCard>
      </section>

      {/* dynamic charts from admin section */}
      <DashboardRenderer pageId="total" />
    </div>
  );
}
