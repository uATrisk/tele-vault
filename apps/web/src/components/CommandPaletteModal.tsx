import React from 'react';
import { ItemManifest } from '@televault/crypto';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
} from './ui/Command';
import { Icon } from './ui/Icon';
import { truncateMiddle } from '../lib/utils';
import { NavRoute } from './DriveSidebar';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemManifest[];
  onNewFolder: () => void;
  onUploadFiles: () => void;
  onUploadFolder: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onLockVault: () => void;
  onNavigateRoute: (route: NavRoute) => void;
  onSelectItem: (item: ItemManifest) => void;
  isDark: boolean;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  items,
  onNewFolder,
  onUploadFiles,
  onUploadFolder,
  onToggleTheme,
  onOpenSettings,
  onLockVault,
  onNavigateRoute,
  onSelectItem,
  isDark
}) => {
  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <CommandInput placeholder="Type a command or search files..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onClose();
              onNewFolder();
            }}
          >
            <Icon name="folder" size={16} />
            <span>New folder</span>
            <CommandShortcut>Shift+N</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onClose();
              onUploadFiles();
            }}
          >
            <Icon name="upload" size={16} />
            <span>Upload files</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onClose();
              onUploadFolder();
            }}
          >
            <Icon name="drive_file_move" size={16} />
            <span>Upload folder</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onClose();
              onToggleTheme();
            }}
          >
            <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={16} />
            <span>Toggle theme ({isDark ? 'Switch to light' : 'Switch to dark'})</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onClose();
              onOpenSettings();
            }}
          >
            <Icon name="settings" size={16} />
            <span>Open settings</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onClose();
              onLockVault();
            }}
          >
            <Icon name="lock" size={16} />
            <span>Lock vault</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              onClose();
              onNavigateRoute('drive');
            }}
          >
            <Icon name="folder" size={16} />
            <span>My Drive</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onClose();
              onNavigateRoute('photos');
            }}
          >
            <Icon name="image" size={16} />
            <span>Photos</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onClose();
              onNavigateRoute('recent');
            }}
          >
            <Icon name="refresh" size={16} />
            <span>Recent</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onClose();
              onNavigateRoute('starred');
            }}
          >
            <Icon name="star" size={16} />
            <span>Starred</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onClose();
              onNavigateRoute('trash');
            }}
          >
            <Icon name="trash" size={16} />
            <span>Trash</span>
          </CommandItem>
        </CommandGroup>

        {items.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Vault Items">
              {items.slice(0, 10).map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    onClose();
                    onSelectItem(item);
                  }}
                >
                  <Icon name={item.kind === 'folder' ? 'folder' : 'file'} size={16} />
                  <span className="truncate">{truncateMiddle(item.name, 35)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};
