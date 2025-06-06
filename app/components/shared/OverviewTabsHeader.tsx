"use client";

import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface OverviewTabsHeaderProps {
  activeTab?: string;
}

export default function OverviewTabsHeader({ activeTab = "dashboard" }: OverviewTabsHeaderProps) {
  const tabs: Tab[] = [
    { 
      name: "Dashboard", 
      path: "/dashboard",
      key: "dashboard",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    },
    { 
      name: "Analytics", 
      path: "/analytics",
      key: "analytics",
      icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    },
    { 
      name: "Performance", 
      path: "/performance",
      key: "performance",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    },
    { 
      name: "Network", 
      path: "/network",
      key: "network",
      icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    }
  ];
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Overview"
      description="Welcome to the State of Solana dashboard"
      showDivider={true}
    />
  );
} 