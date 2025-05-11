"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ProtocolRevenueTabsHeaderProps {
  activeTab?: string;
}

export default function ProtocolRevenueTabsHeader({ activeTab = "summary" }: ProtocolRevenueTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Summary", 
      path: "/protocol-revenue/summary",
      key: "summary",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Total", 
      path: "/protocol-revenue/total",
      key: "total",
      icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
    },
    
    { 
      name: "DEX Ecosystem", 
      path: "/protocol-revenue/dex-ecosystem",
      key: "dex-ecosystem",
      icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    },
    { 
      name: "NFT Ecosystem", 
      path: "/protocol-revenue/nft-ecosystem",
      key: "nft-ecosystem",
      icon: "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 0v12m4-12v12m4-12v12"
    },
    {
      name: "DePin",
      path: "/protocol-revenue/depin",
      key: "depin",
      icon: "M12 4v16m8-8H4"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Protocol Revenue"
      description="Protocol revenue statistics for the Solana blockchain"
      showDivider={true}
    />
  );
} 