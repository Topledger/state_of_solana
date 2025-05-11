"use client";

import React, { useState } from "react";
import CurrencyFilter from "../../components/shared/filters/CurrencyFilter";
import { CurrencyType } from '@/app/api/REV/issuance-burn/issuanceData';
import IssuanceChart, { getIssuanceChartColors, getIssuanceChartMetrics } from '@/app/components/charts/REV/issuance-burn/IssuanceChart';
import RewardsAndBurnChart, { getRewardsAndBurnColors, getRewardsAndBurnChartMetrics } from '@/app/components/charts/REV/issuance-burn/RewardsAndBurnChart';
import IssuanceBreakdownChart, { getIssuanceBreakdownColors, getIssuanceBreakdownChartMetrics } from '@/app/components/charts/REV/issuance-burn/IssuanceBreakdownChart';
import BurnRatioChart, { getBurnRatioColors, getBurnRatioChartMetrics } from '@/app/components/charts/REV/issuance-burn/BurnRatioChart';
import SolBurnChart, { getSolBurnChartColors, getSolBurnChartMetrics } from '@/app/components/charts/REV/issuance-burn/SolBurnChart';
import ChartCard from "../../components/shared/ChartCard";
import LegendItem from "../../components/shared/LegendItem";

// Get colors from charts for use in UI elements
const issuanceColors = getIssuanceChartColors();
const rewardsAndBurnColors = getRewardsAndBurnColors();
const issuanceBreakdownColors = getIssuanceBreakdownColors();
const burnRatioColors = getBurnRatioColors();
const solBurnColors = getSolBurnChartColors();

// Get metrics/legends from charts
const issuanceMetrics = getIssuanceChartMetrics(issuanceColors);
const rewardsAndBurnMetrics = getRewardsAndBurnChartMetrics(rewardsAndBurnColors);
const issuanceBreakdownMetrics = getIssuanceBreakdownChartMetrics(issuanceBreakdownColors);
const burnRatioMetrics = getBurnRatioChartMetrics(burnRatioColors);
const solBurnMetrics = getSolBurnChartMetrics(solBurnColors);

export default function IssuanceInflationPage() {
  // Individual currency state for each chart
  const [issuanceCurrency, setIssuanceCurrency] = useState<CurrencyType>('USD');
  const [rewardsCurrency, setRewardsCurrency] = useState<CurrencyType>('USD');
  const [breakdownCurrency, setBreakdownCurrency] = useState<CurrencyType>('USD');
  const [burnRatioCurrency, setBurnRatioCurrency] = useState<CurrencyType>('USD');
  const [solBurnCurrency, setSolBurnCurrency] = useState<CurrencyType>('USD');
  
  // Modal states
  const [issuanceModalOpen, setIssuanceModalOpen] = useState(false);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [burnRatioModalOpen, setBurnRatioModalOpen] = useState(false);
  const [solBurnModalOpen, setSolBurnModalOpen] = useState(false);
  
  // Download state tracking
  const [isDownloading, setIsDownloading] = useState({
    issuance: false,
    rewards: false,
    breakdown: false,
    burnRatio: false,
    solBurn: false
  });
  
  // Function to download CSV data
  const downloadCSV = (chartType: string) => {
    // Set the specific chart's downloading state to true
    setIsDownloading(prev => ({ ...prev, [chartType]: true }));
    
    try {
      console.log(`Downloading ${chartType} data as CSV`);
      // Implementation would go here
      
      // Simulate a download delay
      setTimeout(() => {
        setIsDownloading(prev => ({ ...prev, [chartType]: false }));
      }, 1000);
    } catch (error) {
      console.error(`Error downloading ${chartType} data:`, error);
      setIsDownloading(prev => ({ ...prev, [chartType]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Charts grid - 2x2 on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* SOL Issuance Chart Container */}
        <ChartCard
          title="SOL Issuance"
          description="Gross and net SOL issuance over time"
          accentColor="blue"
          onExpandClick={() => setIssuanceModalOpen(true)}
          onDownloadClick={() => downloadCSV('issuance')}
          isDownloading={isDownloading.issuance}
          filterBar={
            <CurrencyFilter
              currency={issuanceCurrency}
              onChange={(value) => setIssuanceCurrency(value as CurrencyType)}
              isCompact={true}
            />
          }
          legend={
            issuanceMetrics.map(metric => (
              <LegendItem
                key={metric.key}
                label={metric.displayName}
                color={metric.color}
                shape={metric.shape === 'circle' ? 'circle' : 'square'}
              />
            ))
          }
        >
          <IssuanceChart 
            currency={issuanceCurrency} 
            isModalOpen={issuanceModalOpen} 
            onModalClose={() => setIssuanceModalOpen(false)}
          />
        </ChartCard>

        {/* SOL Rewards & Burns Chart Container */}
        <ChartCard
          title="SOL Rewards & Burns"
          description="Staking rewards, voting rewards, and burns"
          accentColor="purple"
          onExpandClick={() => setRewardsModalOpen(true)}
          onDownloadClick={() => downloadCSV('rewards')}
          isDownloading={isDownloading.rewards}
          filterBar={
            <CurrencyFilter
              currency={rewardsCurrency}
              onChange={(value) => setRewardsCurrency(value as CurrencyType)}
              isCompact={true}
            />
          }
          legend={
            rewardsAndBurnMetrics.map(metric => (
              <LegendItem
                key={metric.key}
                label={metric.displayName}
                color={metric.color}
                shape={metric.shape === 'circle' ? 'circle' : 'square'}
              />
            ))
          }
        >
          <RewardsAndBurnChart 
            currency={rewardsCurrency} 
            isModalOpen={rewardsModalOpen} 
            onModalClose={() => setRewardsModalOpen(false)}
          />
        </ChartCard>

        {/* SOL Issuance Breakdown Chart Container */}
        <ChartCard
          title="SOL Issuance Breakdown"
          description="Breakdown of different components of issuance"
          accentColor="green"
          onExpandClick={() => setBreakdownModalOpen(true)}
          onDownloadClick={() => downloadCSV('breakdown')}
          isDownloading={isDownloading.breakdown}
          filterBar={
            <CurrencyFilter
              currency={breakdownCurrency}
              onChange={(value) => setBreakdownCurrency(value as CurrencyType)}
              isCompact={true}
            />
          }
          legend={
            <>
              <LegendItem label="Jito Commission" color={issuanceBreakdownColors.jito} shape="square" />
              <LegendItem label="Staking Rewards" color={issuanceBreakdownColors.staking} shape="square" />
              <LegendItem label="Voting Rewards" color={issuanceBreakdownColors.voting} shape="square" />
              <LegendItem label="Gross Issuance" color={issuanceBreakdownColors.gross} shape="square" />
            </>
          }
        >
          <IssuanceBreakdownChart 
            currency={breakdownCurrency} 
            isModalOpen={breakdownModalOpen} 
            onModalClose={() => setBreakdownModalOpen(false)}
          />
        </ChartCard>

        {/* SOL Burn Ratio Chart Container */}
        <ChartCard
          title="SOL Burn Ratio"
          description="Percentage of SOL burned relative to issuance"
          accentColor="orange"
          onExpandClick={() => setBurnRatioModalOpen(true)}
          onDownloadClick={() => downloadCSV('burnRatio')}
          isDownloading={isDownloading.burnRatio}
          filterBar={
            <CurrencyFilter
              currency={burnRatioCurrency}
              onChange={(value) => setBurnRatioCurrency(value as CurrencyType)}
              isCompact={true}
            />
          }
          legend={
            burnRatioMetrics.map(metric => (
              <LegendItem
                key={metric.key}
                label={metric.displayName}
                color={metric.color}
                shape={metric.shape === 'circle' ? 'circle' : 'square'}
              />
            ))
          }
        >
          <BurnRatioChart 
            currency={burnRatioCurrency} 
            isModalOpen={burnRatioModalOpen} 
            onModalClose={() => setBurnRatioModalOpen(false)}
          />
        </ChartCard>

        {/* SOL Burn Chart Container */}
        <ChartCard
          title="SOL Burn Trends"
          description="Daily SOL burn and cumulative burn amount"
          accentColor="orange"
          onExpandClick={() => setSolBurnModalOpen(true)}
          onDownloadClick={() => downloadCSV('solBurn')}
          isDownloading={isDownloading.solBurn}
          filterBar={
            <CurrencyFilter
              currency={solBurnCurrency}
              onChange={(value) => setSolBurnCurrency(value as CurrencyType)}
              isCompact={true}
            />
          }
          legend={
            solBurnMetrics.map(metric => (
              <LegendItem
                key={metric.key}
                label={metric.displayName}
                color={metric.color}
                shape={metric.shape === 'circle' ? 'circle' : 'square'}
              />
            ))
          }
        >
          <SolBurnChart 
            currency={solBurnCurrency} 
            isModalOpen={solBurnModalOpen} 
            onModalClose={() => setSolBurnModalOpen(false)}
          />
        </ChartCard>
      </div>
    </div>
  );
} 