"use client";

import React, { useState } from 'react';
import AggregatorsChart from '../../components/charts/DEX/aggregators/AggregatorsChart';
import DexVolumeChart from '../../components/charts/DEX/aggregators/DexVolumeChart';
import DataTypeFilter from '../../components/shared/filters/DataTypeFilter';
import DisplayModeFilter from '../../components/shared/filters/DisplayModeFilter';
import { DataType } from '../../components/shared/filters/DataTypeFilter';
import { DisplayMode } from '../../components/shared/filters/DisplayModeFilter';
import ChartCard from '../../components/shared/ChartCard';

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
      <ChartCard
        title="DEX Aggregators"
        description="Trading volume and active traders by aggregator"
        accentColor="blue"
        onExpandClick={() => setIsAggregatorsModalOpen(true)}
        filterBar={
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
        }
      >
        <AggregatorsChart
          dataType={dataType}
          displayMode={aggregatorsDisplayMode}
          isModalOpen={isAggregatorsModalOpen}
          onModalClose={() => setIsAggregatorsModalOpen(false)}
        />
      </ChartCard>

      {/* DEX Volume by Source Chart Container */}
      <ChartCard
        title="DEX Volume by Source"
        description="Volume distribution between direct trades and aggregator-routed trades"
        accentColor="orange"
        onExpandClick={() => setIsDexVolumeModalOpen(true)}
        filterBar={
          <div className="flex space-x-4 items-center">
            <DisplayModeFilter
              mode={dexVolumeDisplayMode}
              onChange={handleDexVolumeDisplayModeChange}
              isCompact={true}
            />
          </div>
        }
      >
        <DexVolumeChart
          displayMode={dexVolumeDisplayMode}
          isModalOpen={isDexVolumeModalOpen}
          onModalClose={() => setIsDexVolumeModalOpen(false)}
        />
      </ChartCard>
    </div>
  );
} 