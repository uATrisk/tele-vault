import type { Transition, Variants } from 'motion/react';

/**
 * Standard durations for TeleVault motion system.
 * Nothing user-triggered exceeds 400ms.
 */
export const durations = {
  instant: 0.08, // 80ms
  fast: 0.12,    // 120ms
  base: 0.2,     // 200ms
  slow: 0.32     // 320ms
} as const;

/**
 * Easing curves
 */
export const easings = {
  standard: [0.2, 0, 0, 1] as const, // Material 3 Emphasized Decelerate
  exit: [0.4, 0, 1, 1] as const,     // Material 3 Emphasized Accelerate
  linear: [0, 0, 1, 1] as const
} as const;

/**
 * Spring configurations for layout and gestures
 */
export const springs = {
  snappy: { type: 'spring', stiffness: 500, damping: 36 } as const,
  soft: { type: 'spring', stiffness: 300, damping: 30 } as const,
  gentle: { type: 'spring', stiffness: 180, damping: 24 } as const
} as const;

/**
 * Standard transition presets
 */
export const transitions: Record<string, Transition> = {
  instant: { duration: durations.instant, ease: easings.standard },
  fast: { duration: durations.fast, ease: easings.standard },
  base: { duration: durations.base, ease: easings.standard },
  slow: { duration: durations.slow, ease: easings.standard },
  snappySpring: springs.snappy,
  softSpring: springs.soft
};

/**
 * Stagger calculation capped to first 8 visible items
 */
export function getStaggerDelay(index: number, step = 0.025, maxItems = 8): number {
  return Math.min(index, maxItems) * step;
}

/**
 * Check if user prefers reduced motion
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Variants for optimistic element exit (deleting / trashing)
 */
export const optimisticExitVariants: Variants = {
  initial: { opacity: 1, scale: 1 },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: durations.fast, ease: easings.exit }
  }
};

/**
 * Variants for modal / dialog entrance
 */
export const dialogVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.base, ease: easings.standard }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: durations.fast, ease: easings.exit }
  }
};

/**
 * Variants for dropdown menu & popover micro-entrance
 */
export const popoverVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: durations.fast, ease: easings.standard }
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -2,
    transition: { duration: durations.instant, ease: easings.exit }
  }
};

/**
 * Variants for upload drop overlay
 */
export const dropOverlayVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.fast, ease: easings.standard }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: durations.fast, ease: easings.exit }
  }
};
