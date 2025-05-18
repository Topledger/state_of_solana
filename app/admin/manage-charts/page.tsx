"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllChartConfigs, deleteChartConfig, getChartConfigsByPage } from '../utils';
import { AVAILABLE_PAGES, ChartConfig } from '../types';
import ChartRenderer from '../components/ChartRenderer';
import Button from '../components/Button';

// Add a helper function to format the Y-Axis display value
const formatYAxisValue = (yAxis: string | string[] | any[] | { field: string } | Array<string | { field: string }>): string => {
  if (typeof yAxis === 'string') {
    return yAxis;
  } 
  
  // Handle case where it's an object with a field property (YAxisConfig)
  if (typeof yAxis === 'object' && !Array.isArray(yAxis) && yAxis && 'field' in yAxis) {
    return yAxis.field;
  }
  
  if (Array.isArray(yAxis)) {
    return yAxis.map((field) => {
      if (typeof field === 'string') {
        return field;
      }
      // Handle YAxisConfig objects
      if (field && typeof field === 'object' && 'field' in field) {
        return field.field;
      }
      return 'unknown';
    }).join(', ');
  }
  
  return 'unknown';
};

export default function ManageChartsPage() {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [isClient, setIsClient] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<Record<string, boolean>>({});

  // Load charts from local storage when component mounts
  useEffect(() => {
    setIsClient(true);
    
    const loadCharts = async () => {
      try {
        let allCharts;
        if (selectedPage === 'all') {
          allCharts = await getAllChartConfigs();
        } else {
          allCharts = await getChartConfigsByPage(selectedPage);
        }
        
        // Ensure we're always setting an array, even if the API returns something else
        setCharts(Array.isArray(allCharts) ? allCharts : []);
      } catch (error) {
        console.error('Error loading charts:', error);
        setCharts([]);
      }
    };
    
    loadCharts();
  }, [selectedPage]);

  // Handle chart deletion
  const handleDeleteChart = async (chartId: string) => {
    if (window.confirm('Are you sure you want to delete this chart?')) {
      try {
        const success = await deleteChartConfig(chartId);
        if (success) {
          setCharts(prevCharts => prevCharts.filter(chart => chart.id !== chartId));
        } else {
          throw new Error("Failed to delete chart");
        }
      } catch (error) {
        console.error('Error deleting chart:', error);
        alert(`Failed to delete chart: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // Toggle chart preview
  const togglePreview = (chartId: string) => {
    setIsPreviewOpen(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading charts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Charts</h1>
          <p className="mt-2 text-sm text-gray-500">View, preview, and manage charts you've created</p>
        </div>
        <Link href="/admin/chart-creator">
          <Button variant="primary">
            Create New Chart
          </Button>
        </Link>
      </div>
      
      {/* Filter by page */}
      <div className="mb-6">
        <label htmlFor="pageFilter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Page
        </label>
        <select
          id="pageFilter"
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="all">All Pages</option>
          {AVAILABLE_PAGES.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Charts list */}
      {charts.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No charts found</h3>
          <p className="text-gray-500 mb-4">
            {selectedPage === 'all' 
              ? "You haven't created any charts yet." 
              : `No charts found for the selected page: ${AVAILABLE_PAGES.find(p => p.id === selectedPage)?.name}`}
          </p>
          <Link href="/admin/chart-creator">
            <Button variant="primary">
              Create your first chart
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {charts.map((chart) => (
            <div key={chart.id} className="bg-white shadow rounded-lg">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{chart.title}</h3>
                  <p className="text-sm text-gray-500">
                    {chart.subtitle || 'No subtitle'} • 
                    <span className="ml-1">{AVAILABLE_PAGES.find(p => p.id === chart.page)?.name}</span>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => togglePreview(chart.id)}
                  >
                    {isPreviewOpen[chart.id] ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                  <Link 
                    href={AVAILABLE_PAGES.find(p => p.id === chart.page)?.path || '#'}
                    target="_blank"
                  >
                    <Button
                      variant="primary"
                      size="sm"
                    >
                      View on Page
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteChart(chart.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              
              {/* Chart details */}
              <div className="p-4 bg-gray-50 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>{' '}
                    <span className="text-gray-900">{chart.chartType}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>{' '}
                    <span className="text-gray-900">{new Date(chart.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">X-Axis:</span>{' '}
                    <span className="text-gray-900">{chart.dataMapping.xAxis}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Y-Axis:</span>{' '}
                    <span className="text-gray-900">{formatYAxisValue(chart.dataMapping.yAxis)}</span>
                  </div>
                </div>
              </div>
              
              {/* Chart preview */}
              {isPreviewOpen[chart.id] && (
                <div className="p-4 border-t border-gray-200">
                  <ChartRenderer chartConfig={chart} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 