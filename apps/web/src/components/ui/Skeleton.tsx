import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-md bg-hover/60 animate-shimmer',
        className
      )}
      {...props}
    />
  );
};

/**
 * Grid Tile Skeleton matching exact DriveFileCard dimensions
 */
export const FileCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col rounded-2xl bg-surface border border-divider/20 p-2.5 space-y-2.5 shadow-xs">
      <Skeleton className="w-full aspect-square rounded-xl" />
      <div className="space-y-1.5 px-1 py-0.5">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>
    </div>
  );
};

/**
 * List Row Skeleton matching DriveListView rows
 */
export const FileRowSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-4 px-4 h-12 rounded-xl bg-surface border-b border-divider/10">
      <Skeleton className="w-5 h-5 rounded" />
      <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
      <Skeleton className="h-4 w-48 rounded" />
      <div className="ml-auto flex items-center gap-6">
        <Skeleton className="h-3.5 w-20 rounded hidden md:block" />
        <Skeleton className="h-3.5 w-16 rounded" />
      </div>
    </div>
  );
};
