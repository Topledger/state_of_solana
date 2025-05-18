"use client";

import React from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">Manage and create charts for the State of Solana</p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard 
            title="Create New Chart" 
            description="Design a new chart and add it to a page" 
            link="/admin/chart-creator"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          
          <ActionCard 
            title="Manage Existing Charts" 
            description="Edit or delete existing charts" 
            link="/admin/manage-charts"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          
          <ActionCard 
            title="API Management" 
            description="Manage API endpoints and data sources" 
            link="/admin/api-management"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <p className="text-sm text-gray-600">Added DexRevenueChart to DEX Ecosystem page</p>
              <p className="text-xs text-gray-400">Today, 10:30 AM</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="text-sm text-gray-600">Updated API endpoint for NFT Marketplace data</p>
              <p className="text-xs text-gray-400">Yesterday, 3:15 PM</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <p className="text-sm text-gray-600">Created new visualization for DePIN revenue</p>
              <p className="text-xs text-gray-400">Jun 3, 2024, 11:45 AM</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Status</span>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database Status</span>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Chart Rendering Service</span>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Data Sync</span>
              <span className="text-sm text-gray-600">Today, 9:00 AM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
}

function ActionCard({ title, description, link, icon }: ActionCardProps) {
  return (
    <Link href={link}>
      <div className="bg-gray-50 hover:bg-gray-100 rounded-lg p-6 transition-colors duration-200 h-full flex flex-col">
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        <div className="mt-4 text-indigo-600 text-sm font-medium">
          Get started →
        </div>
      </div>
    </Link>
  );
} 