import React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '../../lib/utils';

export const SheetRoot = ({
  shouldScaleBackground = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
SheetRoot.displayName = 'SheetRoot';

export const SheetTrigger = DrawerPrimitive.Trigger;
export const SheetPortal = DrawerPrimitive.Portal;
export const SheetClose = DrawerPrimitive.Close;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-xs', className)}
    {...props}
  />
));
SheetOverlay.displayName = DrawerPrimitive.Overlay.displayName;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-3xl border-t border-divider/40 bg-surface text-text-primary p-5 pb-8 shadow-dialog outline-none select-none',
        className
      )}
      {...props}
    >
      {/* Grab handle */}
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-divider/80" />
      {children}
    </DrawerPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DrawerPrimitive.Content.displayName;

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold text-text-primary tracking-tight', className)}
    {...props}
  />
));
SheetTitle.displayName = DrawerPrimitive.Title.displayName;

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-xs text-text-secondary leading-relaxed', className)}
    {...props}
  />
));
SheetDescription.displayName = DrawerPrimitive.Description.displayName;
