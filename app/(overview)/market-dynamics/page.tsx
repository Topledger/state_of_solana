"use client";
import { VolumeIcon, TvlIcon, UsersIcon, ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import React, { useState, useEffect } from "react";
import Counter from "../../components/shared/Counter";

// Import the VolumeIcon from shared icons


interface VolumeStats {
  cumulativeVolume: number;
  percentChange: number;
  isPositive: boolean;
}

export default function MarketDynamicsPage() {
  const [volumeStats, setVolumeStats] = useState<VolumeStats>({
    cumulativeVolume: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isVolumeLoading, setIsVolumeLoading] = useState(true);

  // Fetch volume data
  useEffect(() => {
    const fetchVolumeData = async () => {
      setIsVolumeLoading(true);
      try {
        // Import the function dynamically to avoid issues
        const { getLatestVolumeStats } = await import("../../api/dex/summary/volumeData");
        const stats = await getLatestVolumeStats();
        setVolumeStats(stats);
      } catch (error) {
        console.error('Error fetching volume data:', error);
      } finally {
        setIsVolumeLoading(false);
      }
    };

    fetchVolumeData();
  }, []);

  // Format the cumulative volume for display in trillions
  const formatCumulativeVolume = (value: number) => {
    if (value >= 1) {
      return `$${value.toFixed(2)}T`;
    } else {
      // Convert to billions if less than 1 trillion
      return `$${(value * 1000).toFixed(2)}B`;
    }
  };

  return (
    <div className="space-y-6">
      

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Counter 
          title="All-time Volume"
          value={isVolumeLoading ? "0" : formatCumulativeVolume(volumeStats.cumulativeVolume)}
          trend={isVolumeLoading ? undefined : { 
            value: parseFloat(volumeStats.percentChange.toFixed(1)), 
            label: "vs last year" 
          }}
          icon={<VolumeIcon />}
          variant="indigo"
          isLoading={isVolumeLoading}
        />
      </div>
    </div>
  );
} 