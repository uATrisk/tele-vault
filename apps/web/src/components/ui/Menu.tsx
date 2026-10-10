import React, { useEffect, useRef } from 'react';
import { Icon, IconName } from './Icon';

export interface MenuItemProps {
  label: string;
  icon?: IconName;
  iconColor?: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  dividerAbove?: boolean;
}

export interface MenuProps {
  items: MenuItemProps[];
  isOpen: boolean;
  onClose: () => void;
  anchorPoint?: { x: number; y: number } | null;
  className?: string;
  headerContent?: React.ReactNode;
}

export const Menu: React.FC<MenuProps> = ({
  items,
  isOpen,
  onClose,
  anchorPoint,
  className = '',
  headerContent
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Clamp position to viewport bounds
  let style: React.CSSProperties = {};
  if (anchorPoint) {
    const x = Math.min(anchorPoint.x, window.innerWidth - 260);
    const y = Math.min(anchorPoint.y, window.innerHeight - (items.length * 44 + 60));
    style = {
      position: 'fixed',
      left: `${Math.max(8, x)}px`,
      top: `${Math.max(8, y)}px`
    };
  }

  return (
    <div
      ref={menuRef}
      style={style}
      role="menu"
      className={`z-50 min-w-[240px] p-1.5 bg-surface text-text-primary rounded-2xl shadow-[0_6px_28px_rgba(0,0,0,0.15)] border border-divider/50 select-none animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {headerContent}
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {item.dividerAbove && <div className="my-1.5 mx-2 border-t border-divider/40" />}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
            className={`w-full h-9.5 px-3 rounded-xl flex items-center gap-3 text-[13.5px] font-medium text-left transition-colors ${
              item.disabled
                ? 'opacity-40 cursor-not-allowed'
                : item.danger
                ? 'text-danger hover:bg-danger/10 active:bg-danger/15'
                : 'text-text-primary hover:bg-hover active:bg-hover'
            }`}
          >
            {item.icon && (
              <span className={`shrink-0 ${item.iconColor || (item.danger ? 'text-danger' : 'text-text-secondary')}`}>
                <Icon name={item.icon} size={18} />
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-text-secondary/80 font-mono tracking-tighter">
                {item.shortcut}
              </span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
