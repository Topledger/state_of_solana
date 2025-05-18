"use client";

import React, { useState, useEffect } from "react";
import Counter from "../../components/shared/Counter";
import { fetchProtocolRevData, formatCurrency, getLatestValidatorData } from "../../api/overview/protocol-rev/protocolData";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import DisplayModeFilter, { DisplayMode } from "../../components/shared/filters/DisplayModeFilter";
import ChartCard from "../../components/shared/ChartCard";
import LegendItem from "../../components/shared/LegendItem";
//import PlatformRevenueChart from "../../components/charts/protocol-revenue/summary/PlatformRevenueChartStacked";
import { TimeFilter as RevenueTimeFilter, normalizePlatformName } from "../../api/protocol-revenue/summary/platformRevenueData";

// Icons
const TEVIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13.5 17.25H10.5V10.5H13.5V17.25ZM12 9C11.17 9 10.5 8.33 10.5 7.5C10.5 6.67 11.17 6 12 6C12.83 6 13.5 6.67 13.5 7.5C13.5 8.33 12.83 9 12 9Z" fill="currentColor" />
  </svg>
);

const REVIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="currentColor" />
  </svg>
);

const ValidatorIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
  </svg>
);

/**
 * Format number with commas (e.g., 1,364)
 * @param value Number to format
 * @returns Formatted string with commas
 */
function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export default function ProtocolRevPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isValidatorsLoading, setIsValidatorsLoading] = useState(true);
  const [protocolData, setProtocolData] = useState({
    TEV: 0,
    REV: 0
  });
  const [validatorData, setValidatorData] = useState({
    activeValidators: 0
  });

  // Chart state
  const [timeFilter, setTimeFilter] = useState<RevenueTimeFilter>('M');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');
  const [platformRevenueChartModalOpen, setPlatformRevenueChartModalOpen] = useState(false);
  const [chartPlatforms, setChartPlatforms] = useState<Array<{platform: string, color: string, revenue: number}>>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);

  // Fetch protocol revenue data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProtocolRevData();
        setProtocolData({
          TEV: data.TEV,
          REV: data.REV
        });
      } catch (error) {
        console.error("Error fetching protocol revenue data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch validator data
  useEffect(() => {
    const fetchData = async () => {
      setIsValidatorsLoading(true);
      try {
        const data = await getLatestValidatorData();
        if (data) {
          setValidatorData({
            activeValidators: data.active_validators
          });
        }
      } catch (error) {
        console.error("Error fetching validator data:", error);
      } finally {
        setIsValidatorsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Set loading status for platforms from child component
  useEffect(() => {
    setIsLoadingPlatforms(chartPlatforms.length === 0);
  }, [chartPlatforms]);

  return (
    <div className="space-y-6">
      

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Counter
          title="Total Economic Value (TEV)"
          value={isLoading ? "Loading..." : formatCurrency(protocolData.TEV)}
          icon={<TEVIcon />}
          variant="blue"
          isLoading={isLoading}
        />
        
        <Counter
          title="Real Economic Value (REV)"
          value={isLoading ? "Loading..." : formatCurrency(protocolData.REV)}
          icon={<REVIcon />}
          variant="emerald"
          isLoading={isLoading}
        />

        <Counter
          title="Current Active Validators"
          value={isValidatorsLoading ? "Loading..." : formatNumber(validatorData.activeValidators)}
          icon={<ValidatorIcon />}
          variant="purple"
          isLoading={isValidatorsLoading}
        />
      </div>

      <div>
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
                onChange={(val: RevenueTimeFilter) => setTimeFilter(val)}
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
            onTimeFilterChange={(val: RevenueTimeFilter) => setTimeFilter(val)}
            onDisplayModeChange={(val: DisplayMode) => setDisplayMode(val)}
            platformsChanged={setChartPlatforms}
          />
        </ChartCard>
      </div>

      
    </div>
  );
} 