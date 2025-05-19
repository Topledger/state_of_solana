import React from 'react';

// Shape options for legend items
type ShapeType = 'circle' | 'square';

// Tooltip item interface
interface TooltipItem {
  color: string;
  label: string;
  value: string | number;
  shape?: ShapeType;
  axis?: 'left' | 'right';
}

// Tooltip component props
interface ChartTooltipProps {
  title: string;
  items: TooltipItem[];
  top: number;
  left: number;
  isModal?: boolean;
  timeFilter?: string;
  currencyFilter?: string;
}

// Function to render the shape for a legend item
const LegendShape: React.FC<{ type: ShapeType; color: string }> = ({ type, color }) => {
  if (type === 'circle') {
    return <div className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: color }}></div>;
  }
  return <div className="h-2 w-2 rounded-sm mr-1.5" style={{ backgroundColor: color }}></div>;
};

// Function to format date title based on timeFilter
const formatTooltipTitle = (title: string, timeFilter?: string): string => {
  // Check if it's a date format
  if (/^\d{4}-\d{2}-\d{2}/.test(title) || /^\d{2}\/\d{2}\/\d{4}/.test(title)) {
    const d = new Date(title);
    if (!isNaN(d.getTime())) {
      // Weekly data
      if (timeFilter === 'W') {
        return `Week of ${d.toLocaleDateString('en-US', { 
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        })}`;
      } 
      // Monthly data
      else if (timeFilter === 'M') {
        return d.toLocaleDateString('en-US', { 
          month: 'short',
          year: 'numeric'
        });
      } 
      // Quarterly data
      else if (timeFilter === 'Q') {
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `Q${quarter}, ${d.getFullYear()}`;
      } 
      // Yearly data
      else if (timeFilter === 'Y') {
        return d.getFullYear().toString();
      }
      
      // Default format (daily)
      return d.toLocaleDateString('en-US', { 
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    }
  }
  
  // For month-year format like "Jan 2023"
  if (/^[A-Za-z]{3}\s\d{4}$/.test(title)) {
    return title;
  }
  
  // For quarterly format like "Q1 2023"
  if (/^Q[1-4]\s\d{4}$/.test(title)) {
    return title;
  }
  
  // For year only
  if (/^\d{4}$/.test(title)) {
    return title;
  }
  
  return title;
};

// Helper function to apply currency formatting based on the selected currency
const formatValueWithCurrency = (value: string | number, currencyFilter?: string): string => {
  // If value is already a string (possibly pre-formatted), return it as is
  if (typeof value === 'string') {
    // If a currency filter is selected and the value starts with a currency symbol
    // that doesn't match the selected currency, replace it
    if (currencyFilter) {
      // Common currency symbols to detect and replace
      const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'SOL': 'SOL'
      };
      
      // Get the selected currency symbol
      const selectedSymbol = currencySymbols[currencyFilter as keyof typeof currencySymbols] || currencyFilter;
      
      // Handle SOL currency specially because it goes after the number
      if (currencyFilter === 'SOL') {
        // Check if value already has SOL
        if (value.includes('SOL')) {
          return value;
        }
        
        // Check for other currency symbols at the beginning and remove them
        for (const [currency, symbol] of Object.entries(currencySymbols)) {
          if (currency !== 'SOL' && value.startsWith(symbol)) {
            // Remove the symbol and add SOL at the end with a space
            return `${value.substring(symbol.length)} SOL`;
          }
        }
        
        // If no currency symbol was found, just add SOL at the end
        return `${value} SOL`;
      }
      
      // For other currencies, use normal replacement
      // Check if the value starts with a different currency symbol
      for (const [currency, symbol] of Object.entries(currencySymbols)) {
        if (value.startsWith(symbol) && currency !== currencyFilter) {
          // Replace the symbol with the selected currency
          return value.replace(symbol, selectedSymbol);
        }
      }
    }
    return value;
  }
  
  // For numeric values without pre-formatting
  if (typeof value === 'number') {
    if (currencyFilter) {
      // Apply the selected currency to the number
      switch (currencyFilter) {
        case 'USD':
          return `$${value.toLocaleString()}`;
        case 'EUR':
          return `€${value.toLocaleString()}`;
        case 'GBP':
          return `£${value.toLocaleString()}`;
        case 'JPY':
        case 'CNY':
          return `¥${value.toLocaleString()}`;
        case 'SOL':
          return `${value.toLocaleString()} SOL`;
        default:
          return `${currencyFilter}${value.toLocaleString()}`;
      }
    }
    
    // Default formatting if no currency filter
    return value.toLocaleString();
  }
  
  // Fallback
  return String(value);
};

// Main tooltip component
const ChartTooltip: React.FC<ChartTooltipProps> = ({ 
  title, 
  items, 
  top, 
  left, 
  isModal = false,
  timeFilter,
  currencyFilter
}) => {
  // Calculate if tooltip should be positioned right to left (to avoid edge cutoff)
  const shouldFlipX = left > (isModal ? 500 : 250);
  
  // Check if we have any axis information (dual-axis chart)
  const hasDualAxisItems = items.some(item => item.axis);
  
  // Format the title based on timeFilter if provided
  const formattedTitle = formatTooltipTitle(title, timeFilter);

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
      <div className="text-gray-400 text-[10px] font-normal pb-1 mb-1 border-b border-gray-800">
        {formattedTitle}
      </div>
      
      {/* Items */}
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={`tooltip-item-${idx}`} className="flex items-center justify-between">
            <div className="flex items-center text-gray-400">
              <LegendShape type={item.shape || 'circle'} color={item.color} />
              <span className="text-gray-400 font-normal ml-2">{item.label}</span>
              
              {/* Show axis indicator for dual-axis charts */}
              {hasDualAxisItems && item.axis && (
                <span className="ml-1 text-[9px] text-gray-500">
                  ({item.axis} axis)
                </span>
              )}
            </div>
            <span className="text-gray-300 font-normal ml-4">
              {formatValueWithCurrency(item.value, currencyFilter)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartTooltip; 