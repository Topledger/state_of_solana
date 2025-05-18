/**
 * Centralized color definitions for all charts in the application
 * Simple ordered color system - always use colors in sequence from this list
 */

// Define a sequential list of 25 colors that all charts will use in order
export const colors = [
  '#60a5fa', // blue - primary/first color
  '#a78bfa', // purple - secondary/second color
  '#34d399', // green - tertiary/third color
  '#f97316', // orange - fourth color
  '#f43f5e', // red - fifth color
  '#facc15', // yellow - sixth color
  '#10b981', // teal - seventh color
  '#8b5cf6', // dark purple - eighth color
  '#ec4899', // pink - ninth color
  '#6b7280', // gray - tenth color
  '#3b82f6', // blue (darker) - eleventh color
  '#059669', // green (darker) - twelfth color
  '#93c5fd', // blue (lighter) - thirteenth color
  '#c4b5fd', // purple (lighter) - fourteenth color
  '#fb923c', // orange (lighter) - fifteenth color
  '#f87171', // red (lighter) - sixteenth color
  '#fcd34d', // yellow (lighter) - seventeenth color
  '#64748b', // slate - eighteenth color
  '#0ea5e9', // sky blue - nineteenth color
  '#1e40af', // indigo - twentieth color
  '#4f46e5', // violet - twenty-first color
  '#7c3aed', // violet (darker) - twenty-second color
  '#be123c', // rose (darker) - twenty-third color
  '#0891b2', // cyan - twenty-fourth color
  '#ea580c', // orange (darker) - twenty-fifth color
];

// Named exports for the first 10 colors for semantic use
export const blue = colors[0];
export const purple = colors[1];
export const green = colors[2];
export const orange = colors[3];
export const red = colors[4];
export const yellow = colors[5];
export const teal = colors[6];
export const darkPurple = colors[7];
export const pink = colors[8];
export const gray = colors[9];

// Data type specific colors
export const volumeColor = colors[0];    // Always use for volume metrics
export const velocityColor = colors[1];  // Always use for velocity metrics
export const tvlColor = colors[2];       // Always use for TVL metrics
export const countColor = colors[3];     // Always use for count/number metrics

// Chart structural elements
export const grid = '#1f2937';
export const axisLines = '#374151';
export const tickLabels = '#6b7280';
export const background = 'rgba(255, 255, 255, 0.05)';

// Function to get a color by index (with wrapping)
export const getColorByIndex = (index: number): string => {
  return colors[index % colors.length];
};

// Utility function to get the first N colors from the palette
export const getFirstNColors = (n: number): string[] => {
  return colors.slice(0, Math.min(n, colors.length));
};

// Legacy for backward compatibility
export const allColors = colors;

// DEX-specific category colors - consistent mapping for DEX platforms
export const dexCategoryColors = {
  'Raydium': purple,
  'Orca': blue,
  'Meteora': green,
  'Phoenix': orange,
  'Ellipsis Labs': red,
  'OpenBook': yellow,
  'Crema Finance': teal,
  'Saros Finance': darkPurple,
  'Cropper Finance': pink,
  'Other': gray
};

// Transaction frequency category colors - consistent across all charts
export const transactionCategoryColors = {
  "1-3 transactions": blue,
  "4-5 transactions": green,
  "6-10 transactions": purple,
  "11-100 transactions": orange,
  "101-1000 transactions": red,
  ">1000 transactions": yellow
};

// Function to get a color for a specific entity with fallback
export const getEntityColor = (entity: string, entityMap: Record<string, string>): string => {
  return entityMap[entity] || gray;
};

// Export an array of all colors for convenience
export const allColorsArray = [
  blue, purple, green, orange, red, yellow, pink, darkPurple, teal, gray,
  colors[10], colors[11], colors[12], colors[13], colors[14], colors[15],
  colors[16], colors[17], colors[18], colors[19], colors[20],
  colors[21], colors[22], colors[23], colors[24]
]; 