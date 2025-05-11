"use client";

import { ReactNode } from "react";
import Layout from "../components/Layout";
import ProtocolRevenueTabsHeader from "./components/ProtocolRevenueTabsHeader";
import { usePathname } from "next/navigation";

interface ProtocolRevenueLayoutProps {
  children: ReactNode;
}

export default function ProtocolRevenueLayout({ children }: ProtocolRevenueLayoutProps) {
  const pathname = usePathname();
  
  // Extract the active tab from pathname
  // /protocol-revenue -> summary, /protocol-revenue/distribution -> distribution, etc.
  const pathSegments = pathname.split('/');
  const activeTab = pathSegments.length > 2 ? pathSegments[2] : "summary";
  
  return (
    <Layout>
      <div className="space-y-6">
        <ProtocolRevenueTabsHeader activeTab={activeTab} />
        {children}
      </div>
    </Layout>
  );
} 