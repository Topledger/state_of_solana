"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface StablecoinsTabsHeaderProps {
  activeTab?: string;
}

export default function StablecoinsTabsHeader({ activeTab = "stablecoin-usage" }: StablecoinsTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Stablecoin Usage", 
      path: "/stablecoins/stablecoin-usage",
      key: "stablecoin-usage",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Transaction Activity", 
      path: "/stablecoins/transaction-activity",
      key: "transaction-activity",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    { 
      name: "Liquidity Velocity", 
      path: "/stablecoins/liquidity-velocity",
      key: "liquidity-velocity",
      icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    },
    { 
      name: "Mint & Burn", 
      path: "/stablecoins/mint-burn",
      key: "mint-burn",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    },
    { 
      name: "Platform & Exchange", 
      path: "/stablecoins/platform-exchange",
      key: "platform-exchange",
      icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    },
    { 
      name: "TVL", 
      path: "/stablecoins/tvl",
      key: "tvl",
      icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Stablecoins"
      description="Stablecoin metrics and statistics on Solana"
      showDivider={true}
    />
  );
} 