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
        {/* Top Vault Facet: Sky to Azure Cyan */}
        <linearGradient id="tv-hex-top" x1="16" y1="3" x2="16" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Right Vault Facet: Deep Azure to Sapphire */}
        <linearGradient id="tv-hex-right" x1="17" y1="16" x2="27" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0F52BA" />
        </linearGradient>

        {/* Left Vault Facet: Royal Blue to Cobalt */}
        <linearGradient id="tv-hex-left" x1="5" y1="16" x2="15" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Floating Core Gradient */}
        <linearGradient id="tv-hex-core" x1="14" y1="13" x2="18" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>

        {/* Ambient Drop Shadow for Floating Core */}
        <filter id="tv-core-shadow" x="11" y="11" width="10" height="10" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="#0F172A" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* 1. Top Interlocking Vault Plate */}
      <path
        d="M16 3.2L26.6 9.32L16.6 15.1L6 9.32L16 3.2Z"
        fill="url(#tv-hex-top)"
      />
      {/* Top Plate Inner Architectural Bevel */}
      <path
        d="M16 5.8L23.8 10.3L16.4 14.57L8.6 10.3L16 5.8Z"
        fill="#FFFFFF"
        fillOpacity="0.22"
      />

      {/* 2. Right Interlocking Vault Plate */}
      <path
        d="M16.8 16.2L27.2 10.2V22.2L16.8 28.2V16.2Z"
        fill="url(#tv-hex-right)"
      />
      {/* Right Plate Inner Shadowed Bevel */}
      <path
        d="M18.8 17.5L25.2 12V21.1L18.8 24.8V17.5Z"
        fill="#000000"
        fillOpacity="0.18"
      />

      {/* 3. Left Interlocking Vault Plate */}
      <path
        d="M4.8 10.2L15.2 16.2V28.2L4.8 22.2V10.2Z"
        fill="url(#tv-hex-left)"
      />
      {/* Left Plate Inner Ambient Bevel */}
      <path
        d="M6.8 12L13.2 17.5V24.8L6.8 21.1V12Z"
        fill="#FFFFFF"
        fillOpacity="0.14"
      />

      {/* 4. Central Cryptographic Core / Floating Hexagonal Node */}
      <g filter="url(#tv-core-shadow)">
        <polygon
          points="16,13.2 18.4,14.6 18.4,17.4 16,18.8 13.6,17.4 13.6,14.6"
          fill="url(#tv-hex-core)"
        />
        <circle cx="16" cy="16" r="1.1" fill="#0F52BA" />
      </g>
    </svg>
  );
};
