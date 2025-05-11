"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface RevTabsHeaderProps {
  activeTab?: string;
}

export default function RevTabsHeader({ activeTab = "overview" }: RevTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Summary", 
      path: "/rev",
      key: "overview",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Cost & Capacity", 
      path: "/rev/cost-capacity",
      key: "cost-capacity",
      icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    },
    { 
      name: "Issuance & Burn", 
      path: "/rev/issuance-burn",
      key: "issuance-burn",
      icon: "M13 10V3L4 14h7v7l9-11h-7z"
    },
    { 
      name: "Total Economic Value", 
      path: "/rev/total-economic-value",
      key: "total-economic-value",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    },
    { 
      name: "Breakdown", 
      path: "/rev/breakdown",
      key: "breakdown",
      icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="REV"
      description="Revenue metrics and analytics for Solana"
      showDivider={true}
    />
  );
} 