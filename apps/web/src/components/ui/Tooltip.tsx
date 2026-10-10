import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'center' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  text,
  children,
  position = 'bottom',
  align = 'center'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPosStyle = () => {
    if (position === 'bottom') {
      if (align === 'right') return 'top-full right-0 mt-1.5';
      if (align === 'left') return 'top-full left-0 mt-1.5';
      return 'top-full left-1/2 -translate-x-1/2 mt-1.5';
    }
    if (position === 'top') {
      if (align === 'right') return 'bottom-full right-0 mb-1.5';
      if (align === 'left') return 'bottom-full left-0 mb-1.5';
      return 'bottom-full left-1/2 -translate-x-1/2 mb-1.5';
    }
    if (position === 'left') return 'right-full top-1/2 -translate-y-1/2 mr-1.5';
    if (position === 'right') return 'left-full top-1/2 -translate-y-1/2 ml-1.5';
    return 'top-full left-1/2 -translate-x-1/2 mt-1.5';
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && text && (
        <div
          role="tooltip"
          className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-md whitespace-nowrap pointer-events-none select-none transition-opacity duration-150 max-w-[220px] truncate ${getPosStyle()}`}
        >
          {text}
        </div>
      )}
    </div>
  );
};
