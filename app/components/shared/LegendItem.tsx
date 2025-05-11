import React from 'react';

interface LegendItemProps {
  label: string;
  color: string;
  shape?: 'circle' | 'square';
  isLoading?: boolean;
  tooltipText?: string;
}

const LegendItem: React.FC<LegendItemProps> = ({
  label,
  color,
  shape = 'square',
  isLoading = false,
  tooltipText,
}) => {
  return (
    <div className="flex items-start whitespace-nowrap">
      <div 
        className={`w-2 h-2 mr-2 ${shape === 'circle' ? 'rounded-full' : 'rounded-sm'} mt-0.5 ${isLoading ? 'animate-pulse' : ''}`}
        style={{ background: color }}
      ></div>
      <span 
        className="text-xs text-gray-300 truncate" 
        title={tooltipText || label}
      >
        {label.length > 20 && !tooltipText ? `${label.substring(0, 20)}...` : label}
      </span>
    </div>
  );
};

export default LegendItem; 