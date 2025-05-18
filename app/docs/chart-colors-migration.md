# Chart Colors Migration Guide

This guide explains how to migrate your chart components to use the centralized color system.

## Overview

The State of Solana application now uses a centralized color system for all charts. This system:

1. Provides consistent colors across all charts
2. Makes theme changes easier
3. Improves maintainability
4. Reduces duplicate code

## Migration Steps

### Automated Migration

We've created scripts to automatically update your chart components:

1. **General chart color replacements**
   - Adds imports for the color system
   - Replaces hardcoded hex values with references to the color system

2. **Specific chart component updates**
   - Updates specific chart components that need more precise mappings

### Running the Migration Scripts

```bash
# Create the scripts directory if it doesn't exist
mkdir -p scripts

# Run the combined update script
node scripts/update-all-chart-colors.js
```

The script will:
1. Process all chart files in the `app/components/charts` directory
2. Add the necessary imports
3. Replace hardcoded colors with references to the centralized system
4. Apply specific color mappings to certain charts

## Manual Migration

If you need to manually update a chart, follow these steps:

1. **Add the import**:
   ```typescript
   // For REV charts
   import { revChartColors, chartStyleColors } from '../../../../utils/chartColors';
   
   // For DEX charts
   import { dexChartColors, chartStyleColors } from '../../../../utils/chartColors';
   
   // For Overview charts
   import { overviewChartColors, chartStyleColors } from '../../../../utils/chartColors';
   
   // For Protocol Revenue charts
   import { protocolRevenueColors, chartStyleColors } from '../../../../utils/chartColors';
   
   // For Stablecoin charts
   import { stablecoinColors, chartStyleColors } from '../../../../utils/chartColors';
   ```

2. **Replace hardcoded colors**:
   ```typescript
   // Before
   export const myChartColors = {
     bar: '#60a5fa', // blue
     grid: '#1f2937',
     axisLines: '#374151',
     tickLabels: '#6b7280',
   };
   
   // After
   export const myChartColors = {
     bar: dexChartColors.volumeBar,
     grid: chartStyleColors.grid,
     axisLines: chartStyleColors.axisLines,
     tickLabels: chartStyleColors.tickLabels,
   };
   ```

3. **Use dynamic colors for charts with variable elements**:
   ```typescript
   import { getDynamicColorPalette } from '../../../../utils/chartColors';
   
   // Get a palette of colors based on the number needed
   const colors = getDynamicColorPalette(items.length);
   ```

## Verifying the Migration

After running the migration scripts:

1. Start your development server
2. Check that all charts render correctly
3. Verify colors are consistent across similar chart types
4. Fix any issues manually if needed

## Color Reference

All color definitions are in `app/utils/chartColors.ts`. Refer to this file for:

- Available color palettes
- Basic colors
- Chart-specific colors
- Common styling colors
- Helper functions

## Adding New Colors

When adding new charts or new color requirements:

1. First check if the color already exists in the system
2. If not, add it to the appropriate palette in `chartColors.ts`
3. Use descriptive names that indicate the color's purpose

## Getting Help

Refer to the detailed documentation in `app/docs/chart-colors.md` for more information on using the chart colors system. 