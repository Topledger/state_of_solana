import React, { ReactNode } from 'react';
import { ExpandIcon, DownloadIcon } from './Icons';
import Loader from './Loader';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  filterBar?: ReactNode;
  legend?: ReactNode;
  onExpandClick?: () => void;
  onDownloadClick?: () => void;
  isDownloading?: boolean;
  accentColor?: 'blue' | 'purple' | 'green' | 'orange' | 'indigo';
  className?: string;
  legendWidth?: '1/4' | '1/5' | '1/6';
  isLoading?: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  children,
  filterBar,
  legend,
  onExpandClick,
  onDownloadClick,
  isDownloading = false,
  accentColor = 'blue',
  className = '',
  legendWidth = '1/5',
  isLoading = false,
}) => {
  // Define color variants
  const colorVariants = {
    blue: {
      hover: 'hover:shadow-blue-900/20',
      button: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
      border: 'border-blue-400',
    },
    purple: {
      hover: 'hover:shadow-purple-900/20',
      button: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
      border: 'border-purple-400',
    },
    green: {
      hover: 'hover:shadow-green-900/20',
      button: 'bg-green-500/10 text-green-400 hover:bg-green-500/20',
      border: 'border-green-400',
    },
    orange: {
      hover: 'hover:shadow-orange-900/20',
      button: 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
      border: 'border-orange-400',
    },
    indigo: {
      hover: 'hover:shadow-indigo-900/20',
      button: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
      border: 'border-indigo-400',
    },
  };

  // Map legendWidth to tailwind classes
  const legendWidthClasses = {
    '1/4': 'lg:w-1/4',
    '1/5': 'lg:w-1/5',
    '1/6': 'lg:w-1/6',
  };

  const colors = colorVariants[accentColor];

  return (
    <div className={`bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg ${colors.hover} transition-all duration-300 ${className}`}>
      {/* Header Section with Title and Action Buttons */}
      <div className="flex justify-between items-center mb-3">
        <div className="-mt-1">
          <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">{title}</h2>
          {description && <p className="text-gray-500 text-[10px] tracking-wide">{description}</p>}
        </div>
        <div className="flex space-x-2">
          {onDownloadClick && (
            <button 
              className={`p-1.5 ${colors.button} rounded-md transition-colors ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={onDownloadClick}
              title="Download CSV"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader size="xs" className="w-4 h-4" />
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
            </button>
          )}
          {onExpandClick && (
            <button 
              className={`p-1.5 ${colors.button} rounded-md transition-colors`}
              onClick={onExpandClick}
              title="Expand Chart"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* First Divider */}
      <div className="h-px bg-gray-900 w-full"></div>
      
      {/* Filter Bar */}
      {filterBar && (
        <>
          <div className="flex items-center justify-start pl-1 py-2 overflow-visible relative">
            {filterBar}
          </div>
          {/* Second Divider after filters */}
          <div className="h-px bg-gray-900 w-full"></div>
        </>
      )}
      
      {/* Content Area - Split into columns on desktop, stacked on mobile */}
      <div className="flex flex-col lg:flex-row mt-3 h-[360px] lg:h-[380px]">
        {/* Chart Area */}
        <div className={`flex-grow ${legend ? 'lg:pr-4 lg:border-r lg:border-gray-900' : ''} h-80 lg:h-auto relative`}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 rounded-md">
              <Loader size="md" />
            </div>
          )}
          {children}
        </div>
        
        {/* Legend Area - Only render if legend is provided */}
        {legend && (
          <div className={`w-full ${legendWidthClasses[legendWidth]} mt-2 lg:mt-0 lg:pl-4 flex flex-row lg:flex-col`}>
            <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 pt-1 pb-0 h-full w-full overflow-hidden">
              <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 w-full h-full overflow-y-auto overflow-x-auto lg:overflow-x-hidden
                [&::-webkit-scrollbar]:w-1.5 
                [&::-webkit-scrollbar-track]:bg-transparent 
                [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                {legend}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartCard; 