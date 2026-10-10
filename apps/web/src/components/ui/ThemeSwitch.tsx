import React from 'react';
import { Icon } from './Icon';

export interface ThemeSwitchProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({
  isDark,
  onToggle,
  className = ''
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 select-none ${
        isDark
          ? 'bg-[#282A2C] border border-white/10 hover:border-white/25'
          : 'bg-[#E9EEF6] border border-[#747775]/25 hover:border-[#747775]/45'
      } ${className}`}
    >
      {/* Subtle Station Icons on Track */}
      <span className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none select-none">
        <Icon
          name="light_mode"
          size={14}
          className={`transition-opacity duration-200 ${
            isDark ? 'opacity-40 text-text-secondary' : 'opacity-0'
          }`}
        />
        <Icon
          name="dark_mode"
          size={14}
          className={`transition-opacity duration-200 ${
            isDark ? 'opacity-0' : 'opacity-40 text-text-secondary'
          }`}
        />
      </span>

      {/* Smooth Sliding Knob with Active Icon */}
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-flex h-6 w-6 items-center justify-center transform rounded-full bg-white dark:bg-[#1E1F20] shadow-[0_1px_3px_rgba(0,0,0,0.22)] ring-0 transition-transform duration-200 ease-in-out ${
          isDark ? 'translate-x-[29px]' : 'translate-x-[3px]'
        }`}
      >
        <Icon
          name={isDark ? 'dark_mode' : 'light_mode'}
          size={14}
          className={`transition-colors duration-200 ${
            isDark ? 'text-sky-300' : 'text-amber-500'
          }`}
        />
      </span>
    </button>
  );
};
