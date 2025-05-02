import React from 'react';

interface TooltipItem {
  color: string;
  label: string;
  value: string;
  shape?: 'square' | 'circle';
}

interface ChartTooltipProps {
  title: string;
  items: TooltipItem[];
  top?: number;
  left?: number;
  isModal?: boolean;
}

// Simple tooltip component with relative positioning
const ChartTooltip: React.FC<ChartTooltipProps> = ({ 
  title, 
  items, 
  top = 0, 
  left = 0,
  isModal = false
}) => {
  return (
    <div 
      className="absolute pointer-events-none z-[9999]"
      style={{
        top: top,
        left: left,
      }}
    >
      <div
        className="bg-gray-900/95 text-gray-400 border-[0.5px] border-gray-700 rounded-md p-2 text-[10px] tracking-wider shadow-xl"
        style={{
          width: 'max-content',
          maxWidth: '200px',
          transform: 'translate(-50%, -100%)', // Center above cursor
        }}
      >
        <div className="font-medium mb-1.5 text-gray-200">{title}</div>
        {items.map((item, index) => (
          <div key={index} className="flex items-center mb-0.5 last:mb-0">
            <div 
              className={`w-2 h-2 mr-1.5 ${item.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`} 
              style={{ backgroundColor: item.color }}
            />
            <span>
              {item.label}: <span className="text-gray-300 ml-1 font-medium">{item.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartTooltip; 