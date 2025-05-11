"use client";

import React, { ReactNode, useState, useMemo } from 'react';
import Loader from './Loader';

// Column definition
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

// Props for the DataTable component
export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  noDataMessage?: string;
  initialSortColumn?: string;
  initialSortDirection?: 'asc' | 'desc';
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  rowClassName?: (index: number) => string;
  cellClassName?: string;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}

// Sort direction type
type SortDirection = 'asc' | 'desc';

/**
 * A reusable data table component for displaying tabular data
 */
export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  error = null,
  noDataMessage = 'No data available',
  initialSortColumn,
  initialSortDirection = 'asc',
  className = '',
  containerClassName = 'overflow-x-auto',
  headerClassName = 'bg-gray-900/50',
  rowClassName = (index) => index % 2 === 0 ? 'bg-black/30' : 'bg-gray-900/10',
  cellClassName = 'px-3 py-2 text-[11px] text-gray-300',
  loadingComponent,
  errorComponent
}: DataTableProps<T>) {
  // State for sorting
  const [sortColumn, setSortColumn] = useState<string | undefined>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  // Get sorted data
  const sortedData = useMemo(() => {
    if (!sortColumn || !data.length) return data;
    
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortColumn];
      const bVal = (b as any)[sortColumn];
      
      // Handle undefined values
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === undefined) return sortDirection === 'asc' ? -1 : 1;
      
      // Handle different types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      // Default numeric comparison
      return sortDirection === 'asc' 
        ? (aVal > bVal ? 1 : -1)
        : (aVal < bVal ? 1 : -1);
    });
  }, [data, sortColumn, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    
    const columnKey = column.key;
    if (sortColumn === columnKey) {
      // Toggle direction if clicking on the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Render sort indicator
  const renderSortIndicator = (column: Column<T>) => {
    if (!column.sortable || sortColumn !== column.key) return null;
    
    return (
      <span className="ml-1 text-blue-400">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Render column header
  const renderColumnHeader = (column: Column<T>) => (
    <th 
      key={column.key}
      className={`text-${column.align || 'left'} text-[10px] font-medium text-gray-400 uppercase tracking-wider px-3 py-2 ${column.sortable ? 'cursor-pointer hover:text-gray-200 transition-colors' : ''}`}
      onClick={() => column.sortable && handleSort(column)}
    >
      {column.header}
      {renderSortIndicator(column)}
    </th>
  );

  // Render loading state
  if (isLoading) {
    return loadingComponent || (
      <div className="flex justify-center items-center h-64">
        <Loader size="sm" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return errorComponent || (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-400 text-[12px]">{error}</p>
      </div>
    );
  }

  // Render empty state
  if (!data.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-400 text-[12px]">{noDataMessage}</p>
      </div>
    );
  }

  // Render table
  return (
    <div className={containerClassName}>
      <table className={`min-w-full divide-y divide-gray-800 ${className}`}>
        <thead className={headerClassName}>
          <tr>
            {columns.map(renderColumnHeader)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {sortedData.map((row, index) => (
            <tr key={keyExtractor(row)} className={rowClassName(index)}>
              {columns.map(column => (
                <td 
                  key={`${keyExtractor(row)}-${column.key}`} 
                  className={`${cellClassName} ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {column.render ? column.render(row) : (row as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 