import React from 'react';

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
}

export const DriveEmptyState: React.FC<DriveEmptyStateProps> = ({
  type,
  searchQuery
}) => {
  const renderIllustration = () => {
    switch (type) {
      case 'starred':
        return (
          <svg className="w-40 h-40" viewBox="0 0 160 160" fill="none">
            <circle cx="80" cy="80" r="60" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />
            <path
              d="M80 44L91 66L115 70L98 86L102 110L80 98L58 110L62 86L45 70L69 66L80 44Z"
              className="fill-amber-400/80 stroke-amber-500"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'trash':
        return (
          <svg className="w-40 h-40" viewBox="0 0 160 160" fill="none">
            <circle cx="80" cy="80" r="60" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />
            <path
              d="M56 64H104M64 64V104C64 108 68 112 72 112H88C92 112 96 108 96 104V64M72 64V54C72 50 76 48 80 48C84 48 88 50 88 54V64"
              className="stroke-[#5F6368] dark:stroke-[#9AA0A6]"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'search':
        return (
          <svg className="w-40 h-40" viewBox="0 0 160 160" fill="none">
            <circle cx="80" cy="80" r="60" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />
            <circle cx="75" cy="75" r="24" className="stroke-accent" strokeWidth="4" />
            <path
              d="M93 93L112 112"
              className="stroke-accent"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        );
      case 'recent':
        return (
          <svg className="w-40 h-40" viewBox="0 0 160 160" fill="none">
            <circle cx="80" cy="80" r="60" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />
            <circle cx="80" cy="80" r="30" className="stroke-accent" strokeWidth="4" />
            <path
              d="M80 62V80L94 88"
              className="stroke-accent"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        );
      case 'folder':
      case 'drive':
      default:
        return (
          <svg className="w-44 h-44" viewBox="0 0 180 180" fill="none">
            <circle cx="90" cy="90" r="68" className="fill-[#F0F4F9] dark:fill-[#282A2C]" />
            <rect
              x="54"
              y="60"
              width="72"
              height="54"
              rx="8"
              className="fill-surface stroke-divider"
              strokeWidth="2"
            />
            <path
              d="M54 72H82L90 80H126V114H54V72Z"
              className="fill-accent/10 stroke-accent/40"
              strokeWidth="2"
            />
            <path
              d="M90 75V100M78 88L90 75L102 88"
              className="stroke-accent"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none space-y-3">
      {renderIllustration()}
      <h3 className="text-base font-semibold text-text-primary tracking-tight">{copy.title}</h3>
      <p className="text-xs text-text-secondary max-w-sm leading-normal">{copy.desc}</p>
    </div>
  );
};
