import React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { cn } from '../../lib/utils';
import { Icon, IconName } from './Icon';

export const ContextMenuRoot = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        'z-50 min-w-[210px] overflow-hidden rounded-xl border border-divider/40 bg-surface p-1.5 text-text-primary shadow-[0_6px_28px_rgba(0,0,0,0.18)] select-none duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

export const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    icon?: IconName;
    danger?: boolean;
    shortcut?: string;
  }
>(({ className, icon, danger, shortcut, children, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      danger
        ? 'text-danger focus:bg-danger/10 focus:text-danger'
        : 'text-text-primary focus:bg-hover focus:text-text-primary',
      className
    )}
    {...props}
  >
    {icon && (
      <Icon
        name={icon}
        size={18}
        className={cn('shrink-0', danger ? 'text-danger' : 'text-text-secondary')}
      />
    )}
    <span className="flex-1 truncate">{children}</span>
    {shortcut && (
      <kbd className="ml-auto text-[10px] font-mono tracking-tight text-text-secondary/70">
        {shortcut}
      </kbd>
    )}
  </ContextMenuPrimitive.Item>
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn('my-1.5 border-t border-divider/30', className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;
