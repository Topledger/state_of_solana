"use client";

import React, { useState } from 'react';
import TradersActivityChart from '../../components/charts/DEX/traders/TradersActivityChart';
import TradersStackedBarChart from '../../components/charts/DEX/traders/TradersStackedBarChart';
import TradersCategoryChart from '../../components/charts/DEX/traders/TradersCategoryChart';
import DataTypeFilter, { DataType } from '../../components/shared/filters/DataTypeFilter';
import DisplayModeFilter, { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';
import ChartCard from '../../components/shared/ChartCard';

export default function DexTradersPage() {
  const [isActivityChartModalOpen, setIsActivityChartModalOpen] = useState(false);
  const [isStackedChartModalOpen, setIsStackedChartModalOpen] = useState(false);
  const [isCategoryChartModalOpen, setIsCategoryChartModalOpen] = useState(false);
  
  // Separate state for each chart
  const [categoryChartDataType, setCategoryChartDataType] = useState<DataType>('volume');
  const [stackedChartDataType, setStackedChartDataType] = useState<DataType>('volume');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');

  // Toggle between volume and signers data for Category Chart
  const handleCategoryChartDataTypeChange = (type: DataType) => {
    setCategoryChartDataType(type);
  };

  // Toggle between volume and signers data for Stacked Bar Chart
  const handleStackedChartDataTypeChange = (type: DataType) => {
    setStackedChartDataType(type);
  };

  // Toggle between absolute and percentage view
  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
  };

  return (
    <div className="space-y-6">
      {/* Charts grid - initially stacked on mobile, grid on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Traders Activity Chart Container */}
        <ChartCard
          title="Traders Activity"
          description="Tracking active and new traders with activation ratio metrics"
          accentColor="blue"
          onExpandClick={() => setIsActivityChartModalOpen(true)}
        >
          <TradersActivityChart 
            isModalOpen={isActivityChartModalOpen}
            onModalClose={() => setIsActivityChartModalOpen(false)}
          />
        </ChartCard>

        {/* Traders by Category Chart */}
        <ChartCard
          title={categoryChartDataType === 'volume' ? 'Trading Volume by Trader Category' : 'Traders by Category'}
          description="Distribution of trading activity by trader lifetime volume"
          accentColor="green"
          onExpandClick={() => setIsCategoryChartModalOpen(true)}
          filterBar={
            <div className="flex items-center justify-between w-full">
              <DisplayModeFilter 
                mode={displayMode} 
                onChange={handleDisplayModeChange}
              />
              <DataTypeFilter 
                selectedDataType={categoryChartDataType} 
                onChange={handleCategoryChartDataTypeChange}
                isCompact={true}
              />
            </div>
          }
        >
          <TradersCategoryChart 
            dataType={categoryChartDataType}
            displayMode={displayMode}
            isModalOpen={isCategoryChartModalOpen}
            onModalClose={() => setIsCategoryChartModalOpen(false)}
          />
        </ChartCard>
      </div>

      {/* Row with one full-width chart */}
      <div className="mb-4">
        {/* Traders Stacked Bar Chart */}
        <ChartCard
          title={stackedChartDataType === 'volume' ? 'Trading Volume by Transaction Frequency' : 'Traders by Transaction Frequency'}
          description="Analyzing trading patterns across different user activity levels"
          accentColor="orange"
          onExpandClick={() => setIsStackedChartModalOpen(true)}
          filterBar={
            <div className="flex items-center justify-end w-full">
              <DataTypeFilter 
                selectedDataType={stackedChartDataType} 
                onChange={handleStackedChartDataTypeChange}
                isCompact={true}
              />
            </div>
          }
        >
          <TradersStackedBarChart 
            dataType={stackedChartDataType}
            onDataTypeChange={handleStackedChartDataTypeChange}
            isModalOpen={isStackedChartModalOpen}
            onModalClose={() => setIsStackedChartModalOpen(false)}
          />
        </ChartCard>
      </div>
    </div>
  );
} 