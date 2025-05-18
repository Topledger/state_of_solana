# Chart Colors System Documentation

## Overview
This document describes how to use the centralized chart colors system for the State of Solana application. The system provides consistent colors across all charts and visualizations.

## Color File Location
All chart colors are defined in:
```
app/utils/chartColors.ts
```

## Available Color Palettes

### Base Colors
The `baseColors` object contains fundamental colors used throughout the application:
- Main colors: blue, purple, green, orange, red, yellow, pink, indigo, teal, cyan, gray
- Shades: light/dark variants of main colors
- Common chart elements: background, grid, axisLines, tickLabels

### Specialized Color Palettes
The following specialized color palettes are available:

1. **overviewChartColors**: For Overview section charts
2. **balanceCohortColors**: For wallet balance cohort charts
3. **txnsCohortColors**: For transaction cohort charts
4. **solChangeCohortColors**: For SOL change cohort charts
5. **dexChartColors**: For DEX-related charts
6. **revChartColors**: For REV-related charts
7. **protocolRevenueColors**: For protocol revenue charts
8. **stablecoinColors**: For stablecoin charts
9. **chartStyleColors**: Common styling elements for all charts

## Helper Functions
- `getDynamicColorPalette(count)`: Returns a specified number of colors from the palette

## How to Use in a Chart Component

### 1. Import the Required Color Palettes
```typescript
import { dexChartColors, chartStyleColors } from '../../../../utils/chartColors';
```

### 2. Define Chart Component Colors
```typescript
export const chartColors = {
  myChartElement: dexChartColors.volumeBar,
  grid: chartStyleColors.grid,
  axisLines: chartStyleColors.axisLines,
  tickLabels: chartStyleColors.tickLabels,
};
```

### 3. Use Colors in Chart Rendering
```typescript
<Bar fill={chartColors.myChartElement} />
<AxisBottom tickStroke={chartColors.axisLines} />
```

## Example: Updating Existing Chart 

Before:
```typescript
export const myChartColors = {
  bar: '#60a5fa', // blue
  grid: '#1f2937',
  axisLines: '#374151',
  tickLabels: '#6b7280',
};
```

After:
```typescript
import { dexChartColors, chartStyleColors } from '../../../../utils/chartColors';

export const myChartColors = {
  bar: dexChartColors.volumeBar,
  grid: chartStyleColors.grid,
  axisLines: chartStyleColors.axisLines,
  tickLabels: chartStyleColors.tickLabels,
};
```

## Adding New Colors
When adding new colors:

1. Decide which color palette the new color belongs to
2. Update the appropriate palette in `chartColors.ts`
3. Use a descriptive name that indicates its purpose
4. Follow the existing naming patterns

## Dynamic Color Scaling
For charts with variable numbers of elements:

```typescript
import { getDynamicColorPalette } from '../../../../utils/chartColors';

const colorPalette = getDynamicColorPalette(items.length); 
```

## Best Practices
1. Always import colors from the central color file
2. Don't hardcode hex values in chart components
3. Group related colors in logical palettes
4. Use consistent naming patterns
5. For sections with many charts, create section-specific color objects
6. Keep the color palette limited to maintain visual consistency 