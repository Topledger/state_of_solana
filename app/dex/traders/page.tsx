"use client";

import React, { useState } from 'react';
import TradersActivityChart from '../../components/charts/TradersActivityChart';
import TradersStackedBarChart from '../../components/charts/TradersStackedBarChart';
import TradersCategoryChart from '../../components/charts/TradersCategoryChart';
import { ExpandIcon } from '../../components/shared/Icons';
import DataTypeFilter, { DataType } from '../../components/shared/filters/DataTypeFilter';
import DisplayModeFilter, { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';

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
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
          {/* Header Section with Title and Expand Icon */}
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Traders Activity</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Tracking active and new traders with activation ratio metrics</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors"
                onClick={() => setIsActivityChartModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* No filter space - as per instructions */}
          
        
          
          {/* Content Area */}
          <div className="h-[360px] lg:h-80">
            <TradersActivityChart 
              isModalOpen={isActivityChartModalOpen}
              onModalClose={() => setIsActivityChartModalOpen(false)}
            />
          </div>
        </div>

        {/* Traders by Category Chart */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-green-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">
                {categoryChartDataType === 'volume' ? 'Trading Volume by Trader Category' : 'Traders by Category'}
              </h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Distribution of trading activity by trader lifetime volume</p>
            </div>
            
            {/* Expand button */}
            <button 
              className="p-1.5 bg-green-500/10 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
              onClick={() => setIsCategoryChartModalOpen(true)}
              title="Expand Chart"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>

          {/* Filter Space */}
          <div className="flex items-center justify-between px-2 py-2 overflow-x-auto">
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
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Traders Category Chart */}
          <div className="h-[360px] lg:h-80">
            <TradersCategoryChart 
              dataType={categoryChartDataType}
              displayMode={displayMode}
              isModalOpen={isCategoryChartModalOpen}
              onModalClose={() => setIsCategoryChartModalOpen(false)}
            />
          </div>
        </div>
      </div>

      {/* Row with one full-width chart */}
      <div className="mb-4">
        {/* Traders Stacked Bar Chart */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-amber-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">
                {stackedChartDataType === 'volume' ? 'Trading Volume by Transaction Frequency' : 'Traders by Transaction Frequency'}
              </h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Analyzing trading patterns across different user activity levels</p>
            </div>
            
            {/* Expand button */}
            <button 
              className="p-1.5 bg-amber-500/10 rounded-md text-amber-400 hover:bg-amber-500/20 transition-colors"
              onClick={() => setIsStackedChartModalOpen(true)}
              title="Expand Chart"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>

          {/* Filter Space */}
          <div className="flex items-center justify-end px-2 py-2 overflow-x-auto">
            <DataTypeFilter 
              selectedDataType={stackedChartDataType} 
              onChange={handleStackedChartDataTypeChange}
              isCompact={true}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Traders Stacked Bar Chart */}
          <div className="h-[360px] lg:h-80">
            <TradersStackedBarChart 
              dataType={stackedChartDataType}
              onDataTypeChange={handleStackedChartDataTypeChange}
              isModalOpen={isStackedChartModalOpen}
              onModalClose={() => setIsStackedChartModalOpen(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 