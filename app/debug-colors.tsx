"use client";

import React from 'react';
import { colors, getColorByIndex } from '@/app/utils/chartColors';
import { getPlatformColor } from '@/app/api/protocol-revenue/summary/platformRevenueData';

const platforms = [
  'Magic Eden', 'Jupiter', 'Metaplex', 'Raydium', 'Orca',
  'Phantom', 'Marinade Finance', 'Tensor', 'Helio', 'Lifinity',
  'Pump Fun', 'Drift', 'Mango Markets', 'Zeta Markets', 'Jito',
  'Photon', 'Bloxroute', 'Trojan', 'BullX', 'Other'
];

export default function DebugColors() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Chart Colors Debug</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Base Colors Array</h2>
        <div className="flex flex-wrap gap-2">
          {colors.map((color, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className="w-12 h-12 rounded border border-gray-700" 
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-xs mt-1">{index}: {color}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Platform Colors</h2>
        <div className="flex flex-col gap-2">
          {platforms.map((platform, index) => {
            const color = getPlatformColor(platform);
            return (
              <div key={index} className="flex items-center gap-4">
                <div 
                  className="w-8 h-8 rounded border border-gray-700" 
                  style={{ backgroundColor: color }}
                ></div>
                <span>
                  <strong>{platform}:</strong> {color}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Direct getColorByIndex Test</h2>
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5, 10, 15, 20, 24].map((index) => {
            const color = getColorByIndex(index);
            return (
              <div key={index} className="flex items-center gap-4">
                <div 
                  className="w-8 h-8 rounded border border-gray-700" 
                  style={{ backgroundColor: color }}
                ></div>
                <span>
                  <strong>Index {index}:</strong> {color}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 