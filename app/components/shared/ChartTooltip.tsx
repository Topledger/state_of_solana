import React from 'react';

// Shape options for legend items
type ShapeType = 'circle' | 'square';

// Tooltip item interface
interface TooltipItem {
  color: string;
  label: string;
  value: string | number;
  shape?: ShapeType;
}

// Tooltip component props
interface ChartTooltipProps {
  title: string;
  items: TooltipItem[];
  top: number;
  left: number;
  isModal?: boolean;
}

// Function to render the shape for a legend item
const LegendShape: React.FC<{ type: ShapeType; color: string }> = ({ type, color }) => {
  if (type === 'circle') {
    return <div className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: color }}></div>;
  }
  return <div className="h-2 w-2 rounded-sm mr-1.5" style={{ backgroundColor: color }}></div>;
};

// Main tooltip component
const ChartTooltip: React.FC<ChartTooltipProps> = ({ 
  title, 
  items, 
  top, 
  left, 
  isModal = false 
}) => {
  // Calculate if tooltip should be positioned right to left (to avoid edge cutoff)
  const shouldFlipX = left > (isModal ? 500 : 250);

  return (
    <div 
      className="absolute z-10 pointer-events-none bg-gray-900/95 shadow-lg border border-gray-800 rounded-md p-2 text-xs min-w-[120px]"
      style={{
        top: `${top}px`,
        left: shouldFlipX ? `${left - 160}px` : `${left + 10}px`,
        transform: `translateY(-100%)`,
      }}
    >
      {/* Title */}
      <div className="text-gray-200 font-normal pb-1 mb-1 border-b border-gray-800">
        {title}
      </div>
      
      {/* Items */}
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={`tooltip-item-${idx}`} className="flex items-center justify-between">
            <div className="flex items-center text-gray-400">
              <LegendShape type={item.shape || 'circle'} color={item.color} />
              <span className="text-gray-400 font-normal ml-2">{item.label}</span>
            </div>
            <span className="text-gray-300 font-normal ml-4">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartTooltip; 