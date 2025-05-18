# Dashboard Renderer Component

The `DashboardRenderer` component allows you to display charts created in the Chart Creator on any page in your application.

## Usage

To add user-created charts to any page, follow these steps:

1. Import the DashboardRenderer component:
```tsx
import DashboardRenderer from "@/app/admin/components/dashboard-renderer";
```

2. Add the component to your page, passing the appropriate `pageId`:
```tsx
<DashboardRenderer pageId="your-page-id" />
```

The `pageId` should match one of the page IDs defined in the Chart Creator, such as:

- Dashboard pages: `dashboard`, `network-usage`, `protocol-rev`, `market-dynamics`
- DEX pages: `dex-summary`, `volume`, `tvl`, `traders`, `aggregators`
- REV pages: `rev-overview`, `cost-capacity`, `issuance-burn`, `total-economic-value`, `breakdown`
- Stablecoins pages: `stablecoin-usage`, `transaction-activity`, `liquidity-velocity`, `mint-burn`, `platform-exchange`, `tvl`
- Protocol Revenue pages: `protocol-revenue-summary`, `total`, `dex-ecosystem`, `nft-ecosystem`, `depin`

## Example

Here's how to add the DashboardRenderer to a page:

```tsx
"use client";
import { useState } from "react";
import DashboardRenderer from "@/app/admin/components/dashboard-renderer";

export default function MyPage() {
  // Your component logic here
  
  return (
    <div>
      <h1>My Page</h1>
      
      {/* Your existing content */}
      
      {/* User-created charts */}
      <div className="mt-10 border-t pt-8 border-gray-100">
        <h2 className="text-xl font-semibold mb-4">Additional Insights</h2>
        <p className="text-gray-500 mb-6">Charts created in the Chart Creator</p>
        <DashboardRenderer pageId="my-page-id" />
      </div>
    </div>
  );
}
```

## How It Works

The `DashboardRenderer` component:

1. Fetches all chart configurations for the specified `pageId` from local storage
2. Renders each chart using the appropriate chart component based on its configuration
3. Manages chart data loading, legends, and interactivity features like filters and expanded view
4. Provides download functionality for chart data

This approach allows content creators to design and add charts through the Chart Creator interface without requiring code changes to display them on the relevant pages. 