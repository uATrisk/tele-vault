import React from 'react';

interface BrandLogoProps {
  size?: number | string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 32,
  className = ''
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="TeleVault Logo"
    >
      <defs>
        <linearGradient id="tv-grad-bg" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#29B6F6" />
          <stop offset="55%" stopColor="#0288D1" />
          <stop offset="100%" stopColor="#01579B" />
        </linearGradient>
        <linearGradient id="tv-grad-vault" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#7DD3FC" />
        </linearGradient>
        <filter id="tv-plane-shadow" x="3" y="5" width="26" height="24" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor="#01579B" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Outer Vault Circular Base */}
      <circle cx="16" cy="16" r="14.5" fill="url(#tv-grad-bg)" />

      {/* Vault Combination Dial Ticks (Perimeter) */}
      <circle
        cx="16"
        cy="16"
        r="13.2"
        stroke="url(#tv-grad-vault)"
        strokeWidth="0.9"
        strokeDasharray="1.2 2.25"
        strokeOpacity="0.45"
      />

      {/* Inner Vault Chamber Rim */}
      <circle
        cx="16"
        cy="16"
        r="11.4"
        stroke="#FFFFFF"
        strokeWidth="0.6"
        strokeOpacity="0.25"
      />

      {/* 4 Vault Locking Bolt Studs (N, S, E, W) */}
      <circle cx="16" cy="2.8" r="0.8" fill="#FFFFFF" fillOpacity="0.85" />
      <circle cx="16" cy="29.2" r="0.8" fill="#FFFFFF" fillOpacity="0.85" />
      <circle cx="2.8" cy="16" r="0.8" fill="#FFFFFF" fillOpacity="0.85" />
      <circle cx="29.2" cy="16" r="0.8" fill="#FFFFFF" fillOpacity="0.85" />

      {/* 4 Diagonal Micro Nodes (NE, NW, SE, SW) */}
      <circle cx="6.67" cy="6.67" r="0.5" fill="#FFFFFF" fillOpacity="0.6" />
      <circle cx="25.33" cy="6.67" r="0.5" fill="#FFFFFF" fillOpacity="0.6" />
      <circle cx="6.67" cy="25.33" r="0.5" fill="#FFFFFF" fillOpacity="0.6" />
      <circle cx="25.33" cy="25.33" r="0.5" fill="#FFFFFF" fillOpacity="0.6" />

      {/* Telegram Paper Airplane with Vault Security Precision */}
      <g transform="translate(-0.5, 0.4)" filter="url(#tv-plane-shadow)">
        {/* Underside fold / shade */}
        <path
          d="M11.9 17.5L13.8 22.8c.25.7.65.8 1.15.35l2.45-2.35-5.5-3.3z"
          fill="#B0D8F3"
        />
        {/* Rudder accent */}
        <path
          d="M14.2 19.3l-.45 3.5c.35 0 .55-.15.75-.35l2.05-1.95-2.35-1.2z"
          fill="#D2E8F8"
        />
        {/* Main Wing / Fuselage */}
        <path
          d="M23.2 9.2L7.8 15.4c-1.05.42-1.05 1.05-.15 1.35l4.25 1.3 9.4-5.9c.45-.25.85-.1.5.2l-7.6 6.9 6.7 4.9c1.2.65 2.05.3 2.35-1.1l3.1-14.4c.4-1.6-.6-2.25-1.75-1.75z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
};
