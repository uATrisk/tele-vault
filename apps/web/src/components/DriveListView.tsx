import React from 'react';
import { ItemManifest } from '@televault/crypto';
import { Icon } from './ui/Icon';
import { Checkbox } from './ui/Checkbox';
import { getFileTypeMeta } from '../utils/fileType';
import { formatBytes, formatDriveDate } from '../utils/folderTree';

export type SortField = 'name' | 'modified' | 'size';
export type SortOrder = 'asc' | 'desc';

interface DriveListViewProps {
  items: ItemManifest[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpenItem: (item: ItemManifest) => void;
  onDownload: (item: ItemManifest) => void;
  onRename: (item: ItemManifest) => void;
  onToggleStar: (item: ItemManifest) => void;
  onTrash: (item: ItemManifest) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField) => void;
}

export const DriveListView: React.FC<DriveListViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onOpenItem,
  onDownload,
  onRename,
  onToggleStar,
  onTrash,
  sortField,
  sortOrder,
  onSortChange
}) => {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return (
      <Icon
        name={sortOrder === 'asc' ? 'chevron_down' : 'chevron_down'}
        size={16}
        className={`inline-block transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
      />
    );
  };

  return (
    <div className="w-full select-none overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        {/* Sticky Table Header */}
        <thead className="sticky top-0 z-10 bg-surface border-b border-divider/60 text-text-secondary text-xs font-medium">
          <tr>
            <th className="w-12 px-3 py-3 text-center">
              <Checkbox
                checked={allSelected}
                onChange={() => (allSelected ? onClearSelection() : onSelectAll())}
                ariaLabel="Select all files"
              />
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-text-primary"
              onClick={() => onSortChange('name')}
            >
              <div className="flex items-center gap-1">
                <span>Name</span>
                {renderSortIndicator('name')}
              </div>
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-text-primary w-40 hidden sm:table-cell"
              onClick={() => onSortChange('modified')}
            >
              <div className="flex items-center gap-1">
                <span>Last modified</span>
                {renderSortIndicator('modified')}
              </div>
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-text-primary w-28 hidden md:table-cell"
              onClick={() => onSortChange('size')}
            >
              <div className="flex items-center gap-1">
                <span>File size</span>
                {renderSortIndicator('size')}
              </div>
            </th>
            <th className="w-24 px-3 py-3 text-right"></th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-divider/30">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const meta = getFileTypeMeta(item.mime, item.kind, item.name);
            const isStarred = item.starred || item.favorite;

            return (
              <tr
                key={item.id}
                role="row"
                tabIndex={0}
                onClick={(e) => {
                  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
                  if (isTouch && selectedIds.size === 0 && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                    onOpenItem(item);
                  } else {
                    onToggleSelect(item.id, e);
                  }
                }}
                onDoubleClick={() => onOpenItem(item)}
                className={`group h-12 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-selected text-text-on-selected'
                    : 'hover:bg-hover text-text-primary'
                }`}
              >
                {/* Checkbox column */}
                <td
                  className="px-3 py-2 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(item.id);
                  }}
                >
                  <div className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.id)}
                      ariaLabel={`Select ${item.name}`}
                    />
                  </div>
                </td>

                {/* Name column */}
                <td className="px-4 py-2 font-medium">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Icon name={meta.icon} size={20} className={meta.color} />
                    <span className="truncate max-w-xs sm:max-w-md lg:max-w-lg">{item.name}</span>
                    {isStarred && (
                      <Icon name="star_filled" size={14} className="text-amber-500 shrink-0" />
                    )}
                  </div>
                </td>

                {/* Last modified column */}
                <td className="px-4 py-2 text-text-secondary text-xs hidden sm:table-cell">
                  {formatDriveDate(item.uploadedAt)}
                </td>

                {/* File size column */}
                <td className="px-4 py-2 text-text-secondary text-xs hidden md:table-cell">
                  {item.kind === 'folder' ? '—' : formatBytes(item.size)}
                </td>

                {/* Quick actions on hover */}
                <td className="px-3 py-2 text-right">
                  <div
                    className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.kind !== 'folder' && (
                      <button
                        type="button"
                        aria-label="Download"
                        onClick={() => onDownload(item)}
                        className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10"
                        title="Download"
                      >
                        <Icon name="download" size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Rename"
                      onClick={() => onRename(item)}
                      className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10"
                      title="Rename"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={isStarred ? 'Remove from starred' : 'Add to starred'}
                      onClick={() => onToggleStar(item)}
                      className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10"
                      title="Star"
                    >
                      <Icon name={isStarred ? 'star_filled' : 'star'} size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Move to trash"
                      onClick={() => onTrash(item)}
                      className="p-1.5 rounded-full text-text-secondary hover:text-danger hover:bg-black/10 dark:hover:bg-white/10"
                      title="Move to trash"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
