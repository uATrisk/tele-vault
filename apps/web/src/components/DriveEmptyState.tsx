import React from 'react';

import { Icon } from './ui/Icon';

export type EmptyStateType =
  | 'drive'
  | 'folder'
  | 'starred'
  | 'recent'
  | 'trash'
  | 'search'
  | 'offline';

interface DriveEmptyStateProps {
  type: EmptyStateType;
  searchQuery?: string;
  onUpload?: () => void;
}

export const DriveEmptyState: React.FC<DriveEmptyStateProps> = ({
  type,
  searchQuery,
  onUpload
}) => {
  const renderIllustration = () => {
    switch (type) {
      case 'trash':
        return (
          <svg className="w-48 h-48 drop-shadow-sm" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="es-trash-glow" x1="100" y1="30" x2="100" y2="170" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4285F4" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#4285F4" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="es-trash-lid-grad" x1="62" y1="70" x2="138" y2="78" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4285F4" />
                <stop offset="100%" stopColor="#1A73E8" />
              </linearGradient>
            </defs>

            {/* Ambient circular backdrop */}
            <circle cx="100" cy="100" r="76" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />
            <circle cx="100" cy="100" r="64" fill="url(#es-trash-glow)" />

            {/* Soft grounding shadow */}
            <ellipse cx="100" cy="162" rx="42" ry="6.5" className="fill-black/5 dark:fill-black/30" />

            {/* Floating cleanliness sparkles */}
            <path d="M148 58L150.5 65.5L158 68L150.5 70.5L148 78L145.5 70.5L138 68L145.5 65.5Z" fill="#FBBC04" />
            <path d="M52 82L53.5 86.5L58 88L53.5 89.5L52 94L50.5 89.5L46 88L50.5 86.5Z" fill="#4285F4" opacity="0.85" />
            <circle cx="156" cy="90" r="3" fill="#34A853" opacity="0.85" />

            {/* Trash Bin Body */}
            {/* Inner rim depth */}
            <ellipse cx="100" cy="98" rx="30" ry="6.5" className="fill-[#BDC1C6] dark:fill-[#323639]" />

            {/* Bucket body */}
            <path
              d="M70 98 L76 146 C76.5 151 80.5 155 85.5 155 H114.5 C119.5 155 123.5 151 124 146 L130 98 Z"
              className="fill-[#E8EAED] dark:fill-[#3C4043]"
            />

            {/* Left bevel shade */}
            <path
              d="M70 98 L76 146 C76.5 151 80.5 155 85.5 155 H93 L84 98 Z"
              className="fill-[#DADCE0] dark:fill-[#303336] opacity-60"
            />

            {/* Modern vertical fluted ribs */}
            <rect x="86" y="108" width="4" height="34" rx="2" className="fill-[#BDC1C6] dark:fill-[#5F6368]" opacity="0.85" />
            <rect x="98" y="108" width="4" height="34" rx="2" className="fill-[#BDC1C6] dark:fill-[#5F6368]" opacity="0.85" />
            <rect x="110" y="108" width="4" height="34" rx="2" className="fill-[#BDC1C6] dark:fill-[#5F6368]" opacity="0.85" />

            {/* Upper rim collar */}
            <ellipse cx="100" cy="98" rx="32" ry="5.5" className="fill-[#DADCE0] dark:fill-[#4E5155]" />

            {/* Floating tilted lid */}
            <g transform="rotate(-12 100 80)">
              {/* Lid handle */}
              <path
                d="M92 70 C92 65 95.5 62 100 62 C104.5 62 108 65 108 70"
                stroke="#1A73E8"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Lid main disc */}
              <rect x="62" y="70" width="76" height="8" rx="4" fill="url(#es-trash-lid-grad)" />
              {/* Lid highlight rim */}
              <rect x="70" y="67" width="60" height="4" rx="2" fill="#8AB4F8" />
            </g>
          </svg>
        );

      case 'starred':
        return (
          <svg className="w-48 h-48 drop-shadow-sm" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <defs>
              <radialGradient id="es-star-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FBBC04" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#FBBC04" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="es-star-lit" x1="100" y1="46" x2="60" y2="140" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFE082" />
                <stop offset="100%" stopColor="#FFC107" />
              </linearGradient>
              <linearGradient id="es-star-shade" x1="100" y1="46" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFB300" />
                <stop offset="100%" stopColor="#F57F17" />
              </linearGradient>
            </defs>

            {/* Ambient circular backdrop */}
            <circle cx="100" cy="100" r="76" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />
            <circle cx="100" cy="100" r="68" fill="url(#es-star-glow)" />

            {/* Ground shadow */}
            <ellipse cx="100" cy="162" rx="38" ry="6" className="fill-black/5 dark:fill-black/30" />

            {/* Ambient Sparkles */}
            <path d="M148 54L150.5 61L157.5 63.5L150.5 66L148 73L145.5 66L138.5 63.5L145.5 61Z" fill="#FBBC04" />
            <path d="M50 72L51.5 76L55.5 77.5L51.5 79L50 83L48.5 79L44.5 77.5L48.5 76Z" fill="#F9AB00" opacity="0.85" />
            <circle cx="152" cy="132" r="3" fill="#4285F4" opacity="0.85" />
            <circle cx="54" cy="126" r="2.5" fill="#34A853" opacity="0.85" />

            {/* Dimensional Faceted Star (Center: 100, 97) */}
            {/* Left lit facets */}
            <path d="M100 48L100 97L86 82Z" fill="#FFF8E1" />
            <path d="M50 85L100 97L86 82Z" fill="url(#es-star-lit)" />
            <path d="M50 85L100 97L78 107Z" fill="#FFD54F" />
            <path d="M69 144L100 97L78 107Z" fill="url(#es-star-lit)" />
            <path d="M69 144L100 97L100 123Z" fill="#FFC107" />

            {/* Right shaded facets */}
            <path d="M100 48L100 97L114 82Z" fill="#FFD54F" />
            <path d="M150 85L100 97L114 82Z" fill="url(#es-star-shade)" />
            <path d="M150 85L100 97L122 107Z" fill="#FFB300" />
            <path d="M131 144L100 97L122 107Z" fill="url(#es-star-shade)" />
            <path d="M131 144L100 97L100 123Z" fill="#F57F17" />
          </svg>
        );

      case 'search':
        return (
          <svg className="w-48 h-48 drop-shadow-sm" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="es-search-lens" x1="70" y1="65" x2="115" y2="110" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4285F4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#1A73E8" stopOpacity="0.06" />
              </linearGradient>
              <linearGradient id="es-search-rim" x1="60" y1="55" x2="120" y2="115" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4285F4" />
                <stop offset="100%" stopColor="#1A73E8" />
              </linearGradient>
            </defs>

            {/* Ambient circular backdrop */}
            <circle cx="100" cy="100" r="76" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />

            {/* Ground shadow */}
            <ellipse cx="100" cy="162" rx="40" ry="6" className="fill-black/5 dark:fill-black/30" />

            {/* Document sheet behind */}
            <g transform="rotate(-8 90 95)">
              <rect
                x="52"
                y="52"
                width="62"
                height="78"
                rx="8"
                className="fill-white dark:fill-[#2A2B2E] stroke-[#DADCE0] dark:stroke-[#3C4043]"
                strokeWidth="2"
              />
              <rect x="62" y="66" width="32" height="4" rx="2" className="fill-[#E8EAED] dark:fill-[#3C4043]" />
              <rect x="62" y="76" width="42" height="4" rx="2" className="fill-[#E8EAED] dark:fill-[#3C4043]" />
              <rect x="62" y="86" width="24" height="4" rx="2" className="fill-[#E8EAED] dark:fill-[#3C4043]" />
              <circle cx="70" cy="106" r="6" className="fill-[#E8EAED] dark:fill-[#3C4043]" />
              <rect x="82" y="104" width="22" height="4" rx="2" className="fill-[#E8EAED] dark:fill-[#3C4043]" />
            </g>

            {/* Modern Loupe */}
            <g transform="translate(10, 0)">
              {/* Glass fill */}
              <circle cx="96" cy="92" r="28" fill="url(#es-search-lens)" />
              {/* Glare arc */}
              <path d="M78 84C82 76 90 72 100 72" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
              {/* Bezel Rim */}
              <circle cx="96" cy="92" r="28" stroke="url(#es-search-rim)" strokeWidth="6" />
              {/* Metallic neck */}
              <path d="M116 112L121 117" stroke="#1A73E8" strokeWidth="7" strokeLinecap="round" />
              {/* Soft touch ergonomic handle */}
              <path d="M121 117L142 138" stroke="#5F6368" strokeWidth="8" strokeLinecap="round" />
              <path d="M139 135L142 138" stroke="#80868B" strokeWidth="8" strokeLinecap="round" />
            </g>

            {/* Playful sparkles */}
            <path d="M148 56L150 61L155 63L150 65L148 70L146 65L141 63L146 61Z" fill="#FBBC04" />
            <circle cx="48" cy="96" r="2.5" fill="#34A853" opacity="0.85" />
          </svg>
        );

      case 'recent':
        return (
          <svg className="w-48 h-48 drop-shadow-sm" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            {/* Ambient circular backdrop */}
            <circle cx="100" cy="100" r="76" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />

            {/* Ground shadow */}
            <ellipse cx="100" cy="162" rx="42" ry="6" className="fill-black/5 dark:fill-black/30" />

            {/* Rotated background sheet */}
            <g transform="rotate(-6 100 100)">
              <rect
                x="62"
                y="52"
                width="60"
                height="74"
                rx="8"
                className="fill-white dark:fill-[#2A2B2E] stroke-[#DADCE0] dark:stroke-[#3C4043]"
                strokeWidth="2"
              />
              <path d="M106 52L122 68H106V52Z" className="fill-[#E8EAED] dark:fill-[#3C4043]" />
              <rect x="72" y="72" width="24" height="4" rx="2" className="fill-[#E8EAED] dark:fill-[#3C4043]" />
              <rect x="72" y="82" width="36" height="4" rx="2" className="fill-[#E8EAED] dark:fill-[#3C4043]" />
              <rect x="72" y="92" width="28" height="4" rx="2" className="fill-[#E8EAED] dark:fill-[#3C4043]" />
            </g>

            {/* Modern Clock */}
            <g transform="translate(18, 12)">
              <circle cx="95" cy="95" r="36" className="fill-white dark:fill-[#1E1F22] stroke-[#E8EAED] dark:stroke-[#3C4043]" strokeWidth="4" />
              <circle cx="95" cy="95" r="30" className="fill-[#F8F9FA] dark:fill-[#282A2C]" />
              {/* Hour dots */}
              <circle cx="95" cy="71" r="2" className="fill-[#BDC1C6] dark:fill-[#5F6368]" />
              <circle cx="119" cy="95" r="2" className="fill-[#BDC1C6] dark:fill-[#5F6368]" />
              <circle cx="95" cy="119" r="2" className="fill-[#BDC1C6] dark:fill-[#5F6368]" />
              <circle cx="71" cy="95" r="2" className="fill-[#BDC1C6] dark:fill-[#5F6368]" />
              {/* Hands: 10:10 */}
              <path d="M95 95L82 78" stroke="#1A73E8" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M95 95L112 88" stroke="#4285F4" strokeWidth="3.5" strokeLinecap="round" />
              {/* Center pin */}
              <circle cx="95" cy="95" r="4.5" fill="#1A73E8" />
              <circle cx="95" cy="95" r="2" fill="#FFFFFF" />
            </g>

            {/* Sparkle */}
            <path d="M152 64L153.5 68.5L158 70L153.5 71.5L152 76L150.5 71.5L146 70L150.5 68.5Z" fill="#4285F4" />
          </svg>
        );

      case 'offline':
        return (
          <svg className="w-48 h-48 drop-shadow-sm" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <circle cx="100" cy="100" r="76" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />
            <ellipse cx="100" cy="162" rx="40" ry="6" className="fill-black/5 dark:fill-black/30" />
            {/* Cloud shape */}
            <path
              d="M72 128C64.27 128 58 121.73 58 114C58 107.03 63.09 101.24 69.83 100.2C71.39 88.66 81.25 80 93 80C101.44 80 108.82 84.45 112.98 91.13C115.52 89.17 118.66 88 122 88C130.84 88 138 95.16 138 104C138 105.13 137.88 106.24 137.66 107.31C142.38 109.11 146 113.68 146 119C146 125.63 140.63 131 134 131H72Z"
              className="fill-[#BDC1C6] dark:fill-[#3C4043]"
            />
            {/* Disconnect stroke */}
            <line x1="68" y1="138" x2="132" y2="72" stroke="#EA4335" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
        );

      case 'folder':
      case 'drive':
      default:
        return (
          <svg className="w-48 h-48 drop-shadow-sm" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="es-folder-back" x1="60" y1="65" x2="140" y2="135" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1A73E8" />
                <stop offset="100%" stopColor="#1557B0" />
              </linearGradient>
              <linearGradient id="es-folder-front" x1="60" y1="88" x2="140" y2="145" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4285F4" />
                <stop offset="100%" stopColor="#1A73E8" />
              </linearGradient>
              <linearGradient id="es-doc-grad" x1="75" y1="50" x2="125" y2="110" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#F1F3F4" />
              </linearGradient>
            </defs>

            {/* Ambient circular backdrop */}
            <circle cx="100" cy="100" r="76" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />

            {/* Ground shadow */}
            <ellipse cx="100" cy="162" rx="44" ry="6.5" className="fill-black/5 dark:fill-black/30" />

            {/* Back folder plate with tab */}
            <path
              d="M52 74C52 69.58 55.58 66 60 66H82C84.5 66 86.8 67.2 88.2 69.2L93.5 76.8C94.8 78.8 97.1 80 99.6 80H140C144.42 80 148 83.58 148 88V134C148 138.42 144.42 142 140 142H60C55.58 142 52 138.42 52 134V74Z"
              fill="url(#es-folder-back)"
            />

            {/* Emerging document sheet */}
            <g transform="translate(18, -4)">
              <rect
                x="68"
                y="56"
                width="46"
                height="58"
                rx="6"
                fill="url(#es-doc-grad)"
                className="stroke-[#DADCE0] dark:stroke-[#3C4043]"
                strokeWidth="1.5"
              />
              <path d="M102 56L114 68H102V56Z" className="fill-[#E8EAED]" />
              <rect x="76" y="70" width="20" height="3" rx="1.5" className="fill-[#BDC1C6]" />
              <rect x="76" y="78" width="28" height="3" rx="1.5" className="fill-[#BDC1C6]" />
              <rect x="76" y="86" width="24" height="3" rx="1.5" className="fill-[#BDC1C6]" />
            </g>

            {/* Front pocket flap */}
            <path
              d="M48 94C48 89.58 51.58 86 56 86H144C148.42 86 152 89.58 152 94L148.5 137C148.1 141.4 144.4 144.8 140 144.8H60C55.6 144.8 51.9 141.4 51.5 137L48 94Z"
              fill="url(#es-folder-front)"
            />

            {/* Floating upload badge */}
            <g transform="translate(100, 116)">
              <circle cx="0" cy="0" r="14" className="fill-white dark:fill-[#202124] shadow-md" />
              <path d="M0 -6V4M-4 0L0 -4L4 0" stroke="#1A73E8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Playful sparkles */}
            <path d="M154 62L156 66.5L160.5 68.5L156 70.5L154 75L152 70.5L147.5 68.5L152 66.5Z" fill="#FBBC04" />
            <circle cx="44" cy="74" r="3" fill="#34A853" opacity="0.85" />
          </svg>
        );
    }
  };

  const getCopy = () => {
    switch (type) {
      case 'starred':
        return {
          title: 'No starred items',
          desc: 'Add stars to items that you want to easily find later'
        };
      case 'trash':
        return {
          title: 'Nothing in trash',
          desc: 'Items moved to trash will appear here'
        };
      case 'search':
        return {
          title: `No results found for "${searchQuery || ''}"`,
          desc: 'Check your spelling or try different keywords'
        };
      case 'recent':
        return {
          title: 'No recent files',
          desc: 'Files uploaded or modified recently will show up here'
        };
      case 'folder':
        return {
          title: 'This folder is empty',
          desc: 'Drop files here or use the New button to upload'
        };
      case 'offline':
        return {
          title: "You're currently offline",
          desc: 'Check your internet connection to sync changes'
        };
      case 'drive':
      default:
        return {
          title: 'Welcome to your private vault',
          desc: 'Drop files or folders here or use the New button to start'
        };
    }
  };

  const copy = getCopy();

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4 text-center select-none space-y-3">
      {renderIllustration()}
      <h3 className="text-base font-semibold text-text-primary tracking-tight">{copy.title}</h3>
      <p className="text-xs text-text-secondary max-w-sm leading-normal">{copy.desc}</p>
      {onUpload && (type === 'drive' || type === 'folder') && (
        <button
          type="button"
          onClick={onUpload}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white font-medium text-sm shadow-md hover:bg-accent/90 active:scale-95 transition-all cursor-pointer"
        >
          <Icon name="upload" size={18} />
          <span>Upload files</span>
        </button>
      )}
    </div>
  );
};
