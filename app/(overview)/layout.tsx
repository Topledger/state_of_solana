"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import OverviewTabsHeader from "@/app/(overview)/components/OverviewTabsHeader";
import { usePathname } from "next/navigation";

interface OverviewLayoutProps {
  children: ReactNode;
}

export default function OverviewLayout({ children }: OverviewLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /dashboard -> dashboard, /analytics -> analytics, etc.
  let activeTab = "dashboard";
  
  if (pathname !== "/") {
    // Remove leading slash and get the first segment
    activeTab = pathname.substring(1).split('/')[0];
  }
  
  return (
    <Layout>
      <div className="space-y-6">
        <OverviewTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 