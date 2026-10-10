import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  text: string;
  shortcut?: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end' | 'left' | 'right';
  delayDuration?: number;
}

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip: React.FC<TooltipProps> = ({
  text,
  shortcut,
  children,
  position = 'bottom',
  align = 'center',
  delayDuration = 250
}) => {
  if (!text) return <>{children}</>;

  const mappedAlign =
    align === 'left' ? 'start' : align === 'right' ? 'end' : align;

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={position}
            align={mappedAlign as 'start' | 'center' | 'end'}
            sideOffset={6}
            className={cn(
              'z-50 px-2.5 py-1 text-xs font-medium text-white bg-[#1F1F1F]/95 dark:bg-[#303030]/95 backdrop-blur-xs rounded-md shadow-md select-none pointer-events-none animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1.5 max-w-[260px]'
            )}
          >
            <span className="truncate">{text}</span>
            {shortcut && (
              <kbd className="px-1 py-0.2 text-[10px] font-mono tracking-tight bg-white/15 dark:bg-white/20 rounded text-white/90">
                {shortcut}
              </kbd>
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
