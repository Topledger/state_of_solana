// Modal.tsx
'use client';

import React, { useEffect, useRef, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import Loader from './Loader';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
}

// Interface for ScrollableLegend component
interface ScrollableLegendProps {
  title?: string;
  items: Array<{
    id: string | number;
    color: string;
    label: string;
    value?: string | number;
  }>;
  maxHeight?: number; // Optional max height in pixels
  maxItems?: number; // Optional max items before scrolling, defaults to 28
}

// Scrollable Legend component for use in modals
export const ScrollableLegend: React.FC<ScrollableLegendProps> = ({
  title,
  items,
  maxHeight = 600,
  maxItems = 28
}) => {
  const shouldScroll = items.length > maxItems;
  
  return (
    <div className="flex flex-col h-full">
      {title && <div className="text-[10px] text-gray-400 mb-2 uppercase">{title}</div>}
      <div 
        style={{ maxHeight: shouldScroll ? `${maxHeight}px` : 'none' }}
        className={`flex flex-col gap-3 pr-1 ${shouldScroll ? `overflow-y-auto 
          [&::-webkit-scrollbar]:w-1.5 
          [&::-webkit-scrollbar-track]:bg-transparent 
          [&::-webkit-scrollbar-thumb]:bg-gray-700/40
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
          scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40` : ''}`}
      >
        {items.map((item) => (
          <div key={item.id} className="flex items-center">
            <div 
              className="min-w-2 w-2 h-2 mr-1.5 rounded-sm mt-0 flex-shrink-0"
              style={{ backgroundColor: item.color }}
            ></div>
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-300 leading-none">{item.label}</span>
              {item.value && (
                <span className="text-[10px] text-gray-500">{item.value}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, subtitle, isLoading = false }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render into document.body to bypass any parent clipping/stacking contexts
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm modal-backdrop">
      <div
        ref={modalRef}
        className="relative bg-black/80 border border-gray-900 rounded-xl p-4 w-11/12 max-w-7xl flex flex-col shadow-xl"
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-900">
          <div>
            {title && (
              <h2 className="text-[16px] font-medium text-gray-100">{title}</h2>
            )}
            {subtitle && (
              <p className="text-gray-500 text-[12px] tracking-wide mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 rounded-full p-1.5 text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414
                   1.414L11.414 10l4.293 4.293a1 1 0 01-1.414
                   1.414L10 11.414l-4.293 4.293a1 1
                   0 01-1.414-1.414L8.586 10 4.293 5.707a1
                   1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 relative">
          {children}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10 rounded-md">
              <Loader size="md" />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
