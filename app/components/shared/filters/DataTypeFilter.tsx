"use client";

import React from 'react';

export type DataType = 'volume' | 'signers';

interface DataTypeFilterProps {
  selectedDataType: DataType;
  onChange: (dataType: DataType) => void;
  className?: string;
  isCompact?: boolean;
}

/**
 * A reusable component for toggling between Volume and Traders data types
 */
export default function DataTypeFilter({ 
  selectedDataType, 
  onChange, 
  className = '',
  isCompact = false 
}: DataTypeFilterProps) {
  return (
    <div className={`flex items-center ${className}`}>
      {!isCompact && <span className="text-xs text-gray-400 mr-2">Data:</span>}
      <div className="flex space-x-1 bg-gray-900/60 rounded-md p-0.5">
        <button
          className={`text-xs px-1.5 py-0.5 rounded ${selectedDataType === 'volume' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => onChange('volume')}
        >
          Volume
        </button>
        <button
          className={`text-xs px-1.5 py-0.5 rounded ${selectedDataType === 'signers' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => onChange('signers')}
        >
          Traders
        </button>
      </div>
    </div>
  );
} 