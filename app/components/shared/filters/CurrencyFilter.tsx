import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CurrencyType } from '../../../api/REV/cost-capacity';

interface CurrencyFilterProps {
  currency: string | CurrencyType;
  options?: string[];
  onChange: (currency: string | CurrencyType) => void;
  isCompact?: boolean;
  label?: string;
}

/**
 * A reusable component for toggling between currency options
 * Displays as buttons for 1-2 options, or a dropdown for 3+ options
 */
const CurrencyFilter: React.FC<CurrencyFilterProps> = ({ 
  currency, 
  options = ['USD', 'SOL'],
  onChange, 
  isCompact = false,
  label = "Currency"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  // Setup portal container on mount
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // Update dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 2,
      left: rect.left
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen, updateDropdownPosition]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Close dropdown on scroll - with debounce to avoid interfering with click events
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        setIsOpen(false);
      }, 100);
    };

    // Handle wheel events with same debounce
    const handleWheel = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        setIsOpen(false);
      }, 100);
    };

    const handleTouchMove = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        setIsOpen(false);
      }, 100);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Close on arrow keys, page up/down, home/end, space, etc.
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
        setIsOpen(false);
      }
      // Handle enter key on trigger element
      if (event.key === 'Enter' && document.activeElement === triggerRef.current) {
        setIsOpen(prev => !prev);
      }
    };

    if (isOpen) {
      // Use a slight delay before attaching scroll handlers
      const handlerTimer = setTimeout(() => {
        window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
        window.addEventListener('wheel', handleWheel, { capture: true, passive: true });
        window.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
      }, 300);

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        if (handlerTimer) clearTimeout(handlerTimer);
        if (scrollTimer) clearTimeout(scrollTimer);
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, { capture: true });
        window.removeEventListener('wheel', handleWheel, { capture: true });
        window.removeEventListener('touchmove', handleTouchMove, { capture: true });
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
    
    // Always listen for keyboard events
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);
  
  // Handle option selection
  const handleOptionSelect = useCallback((option: string) => {
    console.log('Option selected:', option);
    // Set timeout to ensure the click event is fully processed before onChange
    setTimeout(() => {
      onChange(option);
    }, 0);
    setIsOpen(false);
  }, [onChange]);

  // If 2 or fewer options, display as buttons
  if (options.length <= 2) {
    return (
      <div className="flex items-center">
        
        <div className="flex space-x-1 bg-gray-900/60 rounded-md p-0.5">
          {options.map((option) => (
            <button
              key={option}
              className={`text-xs px-1.5 py-0.5 rounded ${
                currency === option 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // For 3 or more options, display as dropdown
  return (
    <div className="flex items-center">
      {!isCompact && <span className="text-xs text-gray-400"></span>}
      <div 
        ref={triggerRef}
        className="flex items-center space-x-1 bg-gray-800/60 rounded-md py-0.5 px-2 cursor-pointer"
        onClick={() => {
          updateDropdownPosition();
          setIsOpen(!isOpen);
        }}
        tabIndex={0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-xs text-white">{currency}</span>
        <svg 
          className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && portalContainer && createPortal(
        <div 
          className="fixed shadow-xl py-1 min-w-[5rem] z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '0.375rem',
            width: `${triggerRef.current?.offsetWidth || 100}px`
          }}
          role="listbox"
        >
          {options.map((option) => (
            <div 
              key={option}
              className={`px-3 py-1 text-xs cursor-pointer ${
                currency === option 
                  ? 'bg-gray-800 text-white' 
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white active:bg-gray-600'
              }`}
              // Use mousedown instead of click to avoid conflict with scroll handlers
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent focus blur
                e.stopPropagation(); // Prevent event bubbling
                handleOptionSelect(option);
              }}
              role="option"
              aria-selected={currency === option}
            >
              {option}
            </div>
          ))}
        </div>,
        portalContainer
      )}
    </div>
  );
};

export default CurrencyFilter; 