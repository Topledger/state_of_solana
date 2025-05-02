"use client";

import React, { useState } from 'react';
import { ExpandIcon } from '../../components/shared/Icons';
import AggregatorsChart from '../../components/charts/AggregatorsChart';
import DexVolumeChart from '../../components/charts/DexVolumeChart';
import DataTypeFilter from '../../components/shared/filters/DataTypeFilter';
import DisplayModeFilter from '../../components/shared/filters/DisplayModeFilter';
import { DataType } from '../../components/shared/filters/DataTypeFilter';
import { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';

export default function AggregatorsPage() {
  // State for chart controls
  const [isAggregatorsModalOpen, setIsAggregatorsModalOpen] = useState(false);
  const [isDexVolumeModalOpen, setIsDexVolumeModalOpen] = useState(false);
  const [dataType, setDataType] = useState<DataType>('volume');
  
  // Separate display mode states for each chart
  const [aggregatorsDisplayMode, setAggregatorsDisplayMode] = useState<DisplayMode>('absolute');
  const [dexVolumeDisplayMode, setDexVolumeDisplayMode] = useState<DisplayMode>('absolute');

  // Handlers for chart controls
  const handleDataTypeChange = (type: DataType) => {
    setDataType(type);
  };

  const handleAggregatorsDisplayModeChange = (mode: DisplayMode) => {
    setAggregatorsDisplayMode(mode);
  };
  
  const handleDexVolumeDisplayModeChange = (mode: DisplayMode) => {
    setDexVolumeDisplayMode(mode);
  };

  return (
    <div className="space-y-6">
      {/* Aggregators Chart Container */}
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
        {/* Header section with title and expand icon */}
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">DEX Aggregators</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Trading volume and active traders by aggregator</p>
          </div>
          <button
            onClick={() => setIsAggregatorsModalOpen(true)}
            className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors"
            title="Expand Chart"
          >
            <ExpandIcon className="w-4 h-4" />
          </button>
        </div>

        {/* First Divider */}
        <div className="h-px bg-gray-900 w-full"></div>

        {/* Filters section */}
        <div className="px-1 py-2 flex justify-start items-center overflow-x-auto">
          <div className="flex space-x-4 items-center">
            <DataTypeFilter
              selectedDataType={dataType}
              onChange={handleDataTypeChange}
              isCompact={true}
            />
            <DisplayModeFilter
              mode={aggregatorsDisplayMode}
              onChange={handleAggregatorsDisplayModeChange}
              isCompact={true}
            />
          </div>
        </div>

        {/* Second Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>

        {/* Chart container - updated to match summary page height */}
        <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
          <div className="flex-grow">
            <AggregatorsChart
              dataType={dataType}
              displayMode={aggregatorsDisplayMode}
              isModalOpen={isAggregatorsModalOpen}
              onModalClose={() => setIsAggregatorsModalOpen(false)}
            />
          </div>
        </div>
      </div>

      {/* DEX Volume by Source Chart Container */}
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-amber-900/20 transition-all duration-300">
        {/* Header section with title and expand icon */}
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">DEX Volume by Source</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Volume distribution between direct trades and aggregator-routed trades</p>
          </div>
          <button
            onClick={() => setIsDexVolumeModalOpen(true)}
            className="p-1.5 bg-amber-500/10 rounded-md text-amber-400 hover:bg-amber-500/20 transition-colors"
            title="Expand Chart"
          >
            <ExpandIcon className="w-4 h-4" />
          </button>
        </div>

        {/* First Divider */}
        <div className="h-px bg-gray-900 w-full"></div>

        {/* Filters section */}
        <div className="px-1 py-2 flex justify-start items-center overflow-x-auto">
          <div className="flex space-x-4 items-center">
            <DisplayModeFilter
              mode={dexVolumeDisplayMode}
              onChange={handleDexVolumeDisplayModeChange}
              isCompact={true}
            />
          </div>
        </div>

        {/* Second Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>

        {/* Chart container - updated to match summary page height */}
        <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
          <div className="flex-grow">
            <DexVolumeChart
              displayMode={dexVolumeDisplayMode}
              isModalOpen={isDexVolumeModalOpen}
              onModalClose={() => setIsDexVolumeModalOpen(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 